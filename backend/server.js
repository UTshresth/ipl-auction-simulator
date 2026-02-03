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

// --- GAME STATE ---
let gameState = {
  adminSocketId: null,
  teams: {}, 
  connectedClients: [], 
  currentBid: 0,
  highestBidder: null,
  playerIndex: 0,
  isAuctionStarted: false
};

const OFFICIAL_TEAMS = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "LSG", "GT"];

// --- AI BOT BRAIN (Required for Auto-Bidding) ---
function triggerBotBid(gameState, io) {
  // 1. Filter for teams that are BOTS and have money
  const botTeams = Object.keys(gameState.teams).filter(name => 
    gameState.teams[name].isBot && 
    gameState.teams[name].purse > gameState.currentBid + 2000000
  );

  if (botTeams.length === 0) return; 

  // 2. Random Chance to Bid
  const chanceToBid = Math.random(); 
  if (chanceToBid > 0.7) return; 

  // 3. Pick a random bot
  const randomBot = botTeams[Math.floor(Math.random() * botTeams.length)];
  
  // 4. Artificial Delay
  setTimeout(() => {
    if (gameState.teams[randomBot].purse > gameState.currentBid + 2000000) {
      const newBid = gameState.currentBid + 2000000;
      
      gameState.currentBid = newBid;
      gameState.highestBidder = randomBot;

      console.log(`🤖 BOT ACTION: ${randomBot} bids ₹${newBid}`);

      io.to("auction_room").emit("update_bid", {
        currentBid: gameState.currentBid,
        highestBidder: gameState.highestBidder
      });

      // Recursive: Trigger another bot bid?
      triggerBotBid(gameState, io); 
    }
  }, Math.floor(Math.random() * 3000) + 1000); 
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send initial state
  socket.emit("update_lobby", gameState.connectedClients);
  socket.emit("admin_status", !!gameState.adminSocketId);

  // 1. JOIN LOBBY
  socket.on('join_lobby', (role) => {
    if (role === "ADMIN") {
      if (gameState.adminSocketId) {
        socket.emit("error_message", "⚠️ Auctioneer exists!");
        return;
      }
      gameState.adminSocketId = socket.id;
      gameState.connectedClients.push("ADMIN");
      socket.emit("admin_status", true);
    } else {
      if (!gameState.connectedClients.includes(role)) {
        gameState.connectedClients.push(role);
        gameState.teams[role] = { purse: 1200000000, squad: [], isBot: false };
      }
    }
    socket.join("auction_room");
    io.to("auction_room").emit("update_lobby", gameState.connectedClients);
  });

  // 2. FILL BOTS
  socket.on('admin_fill_bots', () => {
    OFFICIAL_TEAMS.forEach(team => {
      if (!gameState.connectedClients.includes(team)) {
        gameState.connectedClients.push(team);
        gameState.teams[team] = { purse: 1200000000, squad: [], isBot: true };
      }
    });
    io.to("auction_room").emit("update_lobby", gameState.connectedClients);
  });

  // 3. START GAME
  socket.on('admin_start_game', (mode) => {
    gameState.isAuctionStarted = true;
    io.to("auction_room").emit("start_game", mode || "CURRENT");
 
  });

  // 4. PLACE BID
  socket.on('place_bid', (data) => {
    const { teamName, amount } = data;
    console.log(`Bid Recieved: ${teamName} for ${amount}`);

    if (amount > gameState.currentBid) {
      gameState.currentBid = amount;
      gameState.highestBidder = teamName;
      
      io.to("auction_room").emit("update_bid", {
        currentBid: gameState.currentBid,
        highestBidder: gameState.highestBidder
      });

      // Trigger Bots to fight back
      triggerBotBid(gameState, io); 
    }
  });

  // 5. SELL PLAYER (Transaction Only)
  socket.on('sell_player', (playerData) => {
    // ... (Keep the logic above the same) ...
    console.log("Processing Sale:", playerData.name);
    
    const winner = gameState.highestBidder;
    const price = gameState.currentBid;
    let soldStatus = "UNSOLD";

    if (winner && price > 0) {
      soldStatus = "SOLD";
      if (gameState.teams[winner]) {
        gameState.teams[winner].squad.push({ ...playerData, soldPrice: price });
        gameState.teams[winner].purse -= price;
      }
    }

    // UPDATED: Added 'playerName' to the result so Log can see it
    io.to("auction_room").emit("player_result", {
      status: soldStatus,
      winner: winner || "None",
      price: price,
      playerName: playerData.name // <--- ADDED THIS
    });
  });

  // 6. ADMIN MOVES TO NEXT PLAYER (Manual Trigger)
  socket.on('admin_next_player', () => {
    gameState.currentBid = 0;
    gameState.highestBidder = null;
    gameState.playerIndex++;

    io.to("auction_room").emit("next_player", { nextIndex: gameState.playerIndex });
    
    // Trigger bots for the new player
    setTimeout(() => triggerBotBid(gameState, io), 2000);
  });

});

server.listen(3001, () => {
  console.log('SERVER RUNNING ON PORT 3001');
});