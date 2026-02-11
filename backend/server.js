const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] } // Allow ALL connections
});

// --- MULTI-ROOM STATE ---
const rooms = {}; 

const OFFICIAL_TEAMS = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "LSG", "GT"];

// --- HELPER: Generate Random IDs ---
const generateId = () => Math.floor(1000 + Math.random() * 9000).toString();

// --- HELPER: Create Fresh Game State ---
const createInitialState = () => ({
  adminSocketId: null,
  adminSecret: null, 
  teams: {},         
  connectedClients: [], 
  
  // Game State
  currentBid: 0,
  highestBidder: null,
  playerIndex: 0,
  isAuctionStarted: false,
  submittedSquads: [],
  round: 1,

  // --- NEW: PERSISTENT STORAGE ---
  phase: "BIDDING",    // Stores 'BIDDING', 'SQUAD_SELECTION', 'COMPLETED'
  logs: [],            // Stores the Live Feed text
  history: []          // Stores Past Players (Sold & Unsold) for the slider
});

// --- HELPER: Add Log to Room ---
const addLog = (room, text, type) => {
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    const logEntry = { text, type, time };
    // Add to beginning of array (newest first)
    room.logs.unshift(logEntry);
    // Keep only last 50 logs to save memory
    if (room.logs.length > 50) room.logs.pop();
};

// --- AI BOT BRAIN (Scoped to Room ID) ---
function triggerBotBid(roomId, io) {
  const room = rooms[roomId];
  if (!room) return; // Stop if room destroyed

  const botTeams = Object.keys(room.teams).filter(name => 
    room.teams[name].isBot && 
    room.teams[name].purse > room.currentBid + 2000000
  );

  if (botTeams.length === 0) return; 

  // Random Chance to Bid (30% chance they don't bid immediately)
  if (Math.random() > 0.7) return; 

  const randomBot = botTeams[Math.floor(Math.random() * botTeams.length)];
  
  // Artificial Delay
  setTimeout(() => {
    // Re-fetch room in case it changed/closed during timeout
    const currentRoom = rooms[roomId];
    if (!currentRoom) return;

    // Check if auction is still active for this player
    if (currentRoom.teams[randomBot].purse > currentRoom.currentBid + 2000000) {
      const newBid = currentRoom.currentBid + 2000000;
      
      currentRoom.currentBid = newBid;
      currentRoom.highestBidder = randomBot;

      // Log the bot bid
      addLog(currentRoom, `🤖 ${randomBot} bids ₹${(newBid/10000000).toFixed(2)} Cr`, 'bid');

      io.to(roomId).emit("update_bid", {
        currentBid: currentRoom.currentBid,
        highestBidder: currentRoom.highestBidder
      });

      // Recursive: Trigger another bot bid?
      triggerBotBid(roomId, io); 
    }
  }, Math.floor(Math.random() * 3000) + 1000); 
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- 1. CREATE NEW ROOM ---
  socket.on("create_room", () => {
    const newRoomId = generateId();
    rooms[newRoomId] = createInitialState();
    console.log(`🏠 Room Created: ${newRoomId}`);
    socket.emit("room_created", newRoomId);
  });

  // --- 2. JOIN ROOM CHECK ---
  socket.on("join_room_check", (roomId) => {
    const room = rooms[roomId];
    
    if (room) {
      // 1. Tell Client: "Room Found"
      socket.emit("room_exists", true);
      
      // 2. Send the room data IMMEDIATELY so buttons update
      socket.emit("update_lobby", room.connectedClients);
      socket.emit("admin_status", !!room.adminSocketId); 
      
    } else {
      socket.emit("room_exists", false);
    }
  });

  // --- // --- 3. REGISTER ROLE (Login) ---
  socket.on('register_role', ({ roomId, role }) => {
    const room = rooms[roomId];
    if (!room) {
        socket.emit("error_message", "Room does not exist.");
        return;
    }

    // A. ADMIN JOIN
    if (role === "ADMIN") {
      if (room.adminSocketId) {
        socket.emit("error_message", "⚠️ Auctioneer exists!");
        return;
      }
      const secretId = generateId(); 
      room.adminSocketId = socket.id;
      room.adminSecret = secretId;

      if (!room.connectedClients.includes("ADMIN")) {
        room.connectedClients.push("ADMIN");
      }
      
      socket.join(roomId);
      socket.emit("role_registered", { secretId, role: "ADMIN" });
      io.to(roomId).emit("update_lobby", room.connectedClients);
    } 

    // B. TEAM JOIN
    else {
      // 🔒 NEW: LOCK THE ROOM IF AUCTION STARTED
      if (room.isAuctionStarted) {
         socket.emit("error_message", "⛔ AUCTION STARTED: No new teams allowed!");
         return;
      }

      if (!room.connectedClients.includes(role)) {
        const secretId = generateId(); 
        room.connectedClients.push(role);
        
        // Initialize team state
        if (!room.teams[role]) {
            room.teams[role] = { 
                purse: 1200000000, 
                squad: [], 
                isBot: false,
                secretId: secretId 
            };
        }
        socket.join(roomId);
        socket.emit("role_registered", { secretId, role });
        io.to(roomId).emit("update_lobby", room.connectedClients);
      } else {
        socket.emit("error_message", "⚠️ Team is already taken!");
      }
    }
  });

  // Store the current mode in a variable (default to online)
let auctionMode = "online"; 



  // 1. Send current mode to new users
  socket.emit("mode_update", auctionMode);

  // 2. Admin changes the mode
  socket.on("toggle_mode", (newMode) => {
    auctionMode = newMode;
    io.emit("mode_update", auctionMode); // Tell everyone (to hide/show buttons)
  });

  // --- 📝 HANDLE MANUAL / OFFLINE SALE (FIXED to match 'history') ---
  socket.on("admin_sell_manual", ({ roomId, teamName, soldPrice, player }) => {
    const room = rooms[roomId];
    if (!room) return;

    console.log(`📝 Manual Sale: ${player.name} -> ${teamName}`);

    // 1. Create Result Object
    const resultObj = {
      ...player,
      status: teamName === "Unsold" ? "UNSOLD" : "SOLD",
      soldPrice: Number(soldPrice),
      winner: teamName === "Unsold" ? null : teamName
    };

    // 2. 💾 SAVE TO HISTORY (Renamed to match rest of code)
    if (!room.history) room.history = []; // Initialize if missing
    room.history.unshift(resultObj);      // Save to the main history list

    // 3. 💾 SAVE LOG
    if (!room.logs) room.logs = [];
    const logMsg = { 
      text: teamName === "Unsold" 
        ? `⚠️: ${player.name} marked UNSOLD`
        : `🔨: ${player.name} sold to ${teamName} (₹${(soldPrice/10000000).toFixed(2)} Cr)`,
      type: teamName === "Unsold" ? 'unsold' : 'sold',
      time: new Date().toLocaleTimeString()
    };
    room.logs.unshift(logMsg); 

    // 4. Deduct Money
    if (teamName !== "Unsold" && room.teams[teamName]) {
      room.teams[teamName].purse -= Number(soldPrice);
      // Optional: Update squad list if you use it
      if(room.teams[teamName].squad) {
          room.teams[teamName].squad.push(resultObj);
      }
    }

    // 5. Broadcast
    io.to(roomId).emit("player_result", {
      playerName: player.name,
      status: resultObj.status,
      price: resultObj.soldPrice,
      winner: resultObj.winner,
      playerData: player 
    });
  });

  // --- 4. REJOIN GAME (Handle Page Refresh) ---
  socket.on("rejoin_game", ({ roomId, role, secretId }) => {
    const room = rooms[roomId];
    if (!room) {
        socket.emit("rejoin_failed", "Room not found");
        return;
    }

    let success = false;

    // Verify Secret ID
    if (role === "ADMIN") {
        if (room.adminSecret === secretId) {
            room.adminSocketId = socket.id; // Update socket ID
            success = true;
        }
    } else {
        if (room.teams[role] && room.teams[role].secretId === secretId) {
            success = true;
        }
    }

    if (success) {
        socket.join(roomId);

        // --- SEND FULL SYNC DATA ---
        socket.emit("rejoin_success", { 
            gameState: {
                currentBid: room.currentBid,
                highestBidder: room.highestBidder,
                playerIndex: room.playerIndex,
                myPurse: role === "ADMIN" ? 0 : room.teams[role].purse,
                teams: room.teams,
                
                // CRITICAL: Send persistent state
                isAuctionStarted: room.isAuctionStarted, 
                round: room.round || 1,       
                pastPlayers: room.history, // Send saved history (Sold + Unsold)
                logs: room.logs,           // Send saved logs
                submittedSquads: room.submittedSquads
            },
            phase: room.phase, // Send saved phase
            myRole: role
        });
        io.to(roomId).emit("update_lobby", room.connectedClients);
        console.log(`♻️ ${role} rejoined Room ${roomId}`);
    } else {
        socket.emit("rejoin_failed", "Invalid Credentials");
    }
  });

  // --- 5. FILL BOTS (Scoped to Room) ---
  socket.on('admin_fill_bots', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    OFFICIAL_TEAMS.forEach(team => {
      if (!room.connectedClients.includes(team)) {
        room.connectedClients.push(team);
        // Bots also get a dummy secret ID
        room.teams[team] = { purse: 1200000000, squad: [], isBot: true, secretId: generateId() };
      }
    });
    io.to(roomId).emit("update_lobby", room.connectedClients);
  });

  // --- 6. START GAME (Scoped to Room) ---
  socket.on('admin_start_game', ({ roomId, mode }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.isAuctionStarted = true;
    addLog(room, "📢 AUCTION STARTED!", "info");
    io.to(roomId).emit("start_game", mode || "CURRENT");
  });

  // --- 7. PLACE BID (Scoped to Room) ---
  socket.on('place_bid', (data) => {
    const { roomId, teamName, amount } = data; // Now requires roomId
    const room = rooms[roomId];
    if (!room) return;

    console.log(`[Room ${roomId}] Bid Received: ${teamName} for ${amount}`);

    if (amount > room.currentBid) {
      room.currentBid = amount;
      room.highestBidder = teamName;
      
      // Log the bid
      addLog(room, `🖐 ${teamName} bids ₹${(amount/10000000).toFixed(2)} Cr`, 'bid');

      io.to(roomId).emit("update_bid", {
        currentBid: room.currentBid,
        highestBidder: room.highestBidder
      });

      triggerBotBid(roomId, io); 
    }
  });

  // --- 8. SELL PLAYER (Scoped to Room) ---
  socket.on('sell_player', ({ roomId, playerData }) => {
    const room = rooms[roomId];
    if (!room) return;

    console.log(`[Room ${roomId}] Processing Sale:`, playerData.name);
    
    const winner = room.highestBidder;
    const price = room.currentBid;
    let soldStatus = "UNSOLD";

    if (winner && winner !== "No Bids" && price > 0) {
      soldStatus = "SOLD";
      if (room.teams[winner]) {
        room.teams[winner].squad.push({ ...playerData, soldPrice: price });
        room.teams[winner].purse -= price;
      }
      addLog(room, `🔨 SOLD! ${playerData.name} ➔ ${winner}`, 'sold');
    } else {
      addLog(room, `⚠️ UNSOLD - ${playerData.name}`, 'unsold');
    }

    // SAVE TO HISTORY (Fixes the Slider on Refresh)
    room.history.unshift({ ...playerData, status: soldStatus, winner, soldPrice: price });

    io.to(roomId).emit("player_result", {
      status: soldStatus,
      winner: winner || "None",
      price: price,
      playerName: playerData.name
    });
  });

  // --- 9. NEXT PLAYER (Scoped to Room) ---
  socket.on('admin_next_player', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.currentBid = 0;
    room.highestBidder = null;
    room.playerIndex++;

    io.to(roomId).emit("next_player", { nextIndex: room.playerIndex });
    setTimeout(() => triggerBotBid(roomId, io), 2000);
  });

  // --- 10. ROUND 2 LIST UPDATE (Scoped to Room) ---
  socket.on("admin_update_list", ({ roomId, newList }) => {
    const room = rooms[roomId];
    if (!room) return;

    console.log(`[Room ${roomId}] 🔄 Round 2 Started`);
    room.playerIndex = 0; 
    room.currentBid = 0;
    room.highestBidder = null;
    room.round = 2; // Update server state
    addLog(room, "🔄 ROUND 2 STARTED (Unsold Players)", "info");

    io.to(roomId).emit("update_player_list", newList);
  });

  // --- 11. CHANGE PHASE (Scoped to Room) ---
  socket.on("admin_change_phase", ({ roomId, newPhase }) => {
    const room = rooms[roomId];
    if (!room) return;

    console.log(`[Room ${roomId}] Phase Changing to:`, newPhase);
    room.phase = newPhase; // Save phase permanently
    io.to(roomId).emit("phase_change", newPhase);
  });

  // --- 12. SUBMIT SQUAD (Scoped to Room) ---
  socket.on("submit_squad", (data) => {
    const { roomId, teamName, squad } = data;
    const room = rooms[roomId];
    if (!room) return;

    console.log(`[Room ${roomId}] Squad Received from:`, teamName);
    
    const existingIndex = room.submittedSquads.findIndex(s => s.teamName === teamName);
    if (existingIndex !== -1) {
       room.submittedSquads[existingIndex] = data; 
    } else {
       room.submittedSquads.push(data); 
    }

    io.to(roomId).emit("squad_submission_update", room.submittedSquads);
  });
const axios = require('axios'); // Import at the top if not already there

  // ... inside io.on('connection', (socket) => { ...

 // --- 🏆 TARGETED AI EVALUATION ---
  socket.on("admin_evaluate_teams", async (data) => {
    // 1. Extract Room ID and Teams
    // Support both old format (array) and new format (object) for safety
    const roomId = data.roomId || null;
    const teamsList = Array.isArray(data) ? data : data.teams;

    if (!roomId) {
        console.error("❌ Error: No Room ID provided for evaluation!");
        return;
    }

    console.log(`👮‍♂️ Admin evaluating Room ${roomId}...`);
    
    try {
      const results = [];

      // 2. Loop through teams
      for (const team of teamsList) {
        const pythonPayload = {
          teamName: team.teamName,
          squad: team.squad.map(p => ({
            name: p.name,
            role: p.role,
            country: p.country || "India", // Pass country for overseas check
            avg: p.stats.avg || 0,
            sr: p.stats.sr || 0,
            wickets: p.stats.wickets || 0,
            economy: p.stats.economy || 0,
            matches: p.stats.matches || 1
          }))
        };

        try {
            const response = await axios.post('http://127.0.0.1:8000/analyze_squad', pythonPayload);
            results.push(response.data);
        } catch (err) {
            console.error(`⚠️ Python Error for ${team.teamName}:`, err.message);
        }
      }

      results.sort((a, b) => b.team_rating - a.team_rating);

      // 3. BROADCAST ONLY TO THIS ROOM 🎯
      // Use 'io.to(roomId)' instead of 'io.emit'
      io.to(roomId).emit("show_ai_results", results);
      
      console.log(`✅ AI Results sent ONLY to Room ${roomId}`);

    } catch (error) {
      console.error("❌ AI Engine Error:", error.message);
    }
  });

}); // <--- End of io.on connection block
// OLD:
// server.listen(3001, () => {

// NEW:
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});