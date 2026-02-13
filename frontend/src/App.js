import React, { useState, useEffect } from 'react';

import io from 'socket.io-client';
import RulebookModal from './components/RulebookModal'; // <--- NEW IMPORT
// Import BOTH datasets
import currentPlayers from './data/players_current.json'; 
import allTimePlayers from './data/players_alltime.json'; 
// ... existing imports
import PlayerListModal from './components/PlayerListModal'; // <--- NEW IMPORT
import './App.css';
import TeamSquadModal from './components/TeamSquadModal';
import SquadSelection from './components/SquadSelection'; // Your component
import AdminDashboard from './components/AdminDashboard';
import SquadReview from './components/SquadReview'; // <--- ADD THIS
// 1. Define the Backend URL dynamically
const BACKEND_URL = 
  process.env.NODE_ENV === "production"
    ? "https://ipl-auction-backend-shreshth.onrender.com"  // ☁️ Your Render URL (KEEP THIS)
    : "http://localhost:3001";                    // 🏠 Localhost (for experiments)

// 2. Connect to that URL
const socket = io.connect(BACKEND_URL);



// FIXED LOGO LINKS
const TEAM_LOGOS = {
  "CSK": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/200px-Chennai_Super_Kings_Logo.svg.png",
  "MI": "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/200px-Mumbai_Indians_Logo.svg.png",
  "RCB": "https://upload.wikimedia.org/wikipedia/commons/1/1e/%E0%A4%B0%E0%A5%89%E0%A4%AF%E0%A4%B2_%E0%A4%9A%E0%A5%88%E0%A4%B2%E0%A5%87%E0%A4%82%E0%A4%9C%E0%A4%B0%E0%A5%8D%E0%A4%B8_%E0%A4%AC%E0%A5%87%E0%A4%82%E0%A4%97%E0%A4%B2%E0%A5%81%E0%A4%B0%E0%A5%81_%E0%A4%B2%E0%A5%8B%E0%A4%97%E0%A5%8B.png",
  "KKR": "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/200px-Kolkata_Knight_Riders_Logo.svg.png",
  "SRH": "/logos/srh.png",
  "RR": "/logos/rr.png",
  "DC": "/logos/dc.png",
  "PBKS": "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/200px-Punjab_Kings_Logo.svg.png",
  "LSG": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/Lucknow_Super_Giants_IPL_Logo.svg/200px-Lucknow_Super_Giants_IPL_Logo.svg.png",
  "GT": "https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Gujarat_Titans_Logo.svg/200px-Gujarat_Titans_Logo.svg.png"
};
const OFFICIAL_TEAMS = Object.keys(TEAM_LOGOS);

function App() {

  const [roomId, setRoomId] = useState(""); // <--- NEW
 // <

  // --- STATE ---
  // NEW: Slider State
  // NEW: Rulebook State
  // Add this with your other state variables at the top of the App function
//const [aiResults, setAiResults] = useState(null); // Stores the ratings
//const [showAiModal, setShowAiModal] = useState(false);
  const [auctionMode, setAuctionMode] = useState("online"); // 'online' or 'offline'
const [showManualModal, setShowManualModal] = useState(false); // For Admin Popup
const [manualTeam, setManualTeam] = useState(""); // Selected winner in offline mode
const [manualPrice, setManualPrice] = useState(""); // Price entered manually
const [auctionPhase, setAuctionPhase] = useState('BIDDING'); 
const [submittedTeams, setSubmittedTeams] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState(0);
  const [view, setView] = useState("LANDING"); 
  const [teamName, setTeamName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectedTeams, setConnectedTeams] = useState([]);
  const [adminTaken, setAdminTaken] = useState(false);
  const [round, setRound] = useState(1);

  // NEW: Selected Team for Squad View
  const [selectedSquadTeam, setSelectedSquadTeam] = useState(null);
  // NEW: Track Modal State
  const [modalType, setModalType] = useState(null); // 'HISTORY' or 'UPCOMING' or null
  // Game Mode State
  const [gameMode, setGameMode] = useState("CURRENT"); 
  const [activeList, setActiveList] = useState(currentPlayers);

  // Auction State
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState("No Bids");
  const [playerIndex, setPlayerIndex] = useState(0);
  const [myPurse, setMyPurse] = useState(1200000000); 

  // UI State
  const [logs, setLogs] = useState([]); 
  const [overlayText, setOverlayText] = useState(""); 
  const [overlayType, setOverlayType] = useState(""); 
  
  // Track if the round is over
  const [isRoundOver, setIsRoundOver] = useState(false);

  // NEW: History State for the Slider
  const [pastPlayers, setPastPlayers] = useState([]);

  const currentPlayer = activeList[playerIndex];
  

  const getIncrementLabel = () => {
    if (currentBid === 0) return "BASE PRICE";
    if (currentBid >= 80000000) return "+1 Cr";
    if (currentBid >= 20000000) return "+50L";
    return "+20L";
  };

  const getOrderedTeams = () => {
    const onlineTeams = OFFICIAL_TEAMS.filter(team => connectedTeams.includes(team));
    if (isAdmin) return onlineTeams;
    return [teamName, ...onlineTeams.filter(t => t !== teamName)];
  };
  // Helper for Image Fallback
  const handleImageError = (e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/166/166248.png"; };

  // --- SOCKET LISTENERS ---


  // Helper to open squad modal
  const handleTeamClick = (team) => {
    setSelectedSquadTeam(team);
  };
const handleSquadSubmit = (selectedPlayers) => {
    // NEW: Send roomId
    socket.emit("submit_squad", { roomId, teamName, squad: selectedPlayers });
    setAuctionPhase("COMPLETED"); 
  };

  // Helper to calculate specific team's remaining purse
  const getTeamPurse = (targetTeam) => {
    // If it's me (the franchise owner), return my real-time purse state
    if (!isAdmin && targetTeam === teamName) return myPurse;
    
    // For others (or admin viewing others), calculate based on purchase history
    const spent = pastPlayers
      .filter(p => p.winner === targetTeam)
      .reduce((total, p) => total + p.soldPrice, 0);
      
    return 1200000000 - spent; // 120Cr - Spent
  };

  // Helper to get specific team's squad list
  const getTeamSquad = (targetTeam) => {
    return pastPlayers.filter(p => p.winner === targetTeam);
  };
  // Empty dependency = runs only once

  //// --- EFFECT 2: MAIN SOCKET LISTENERS ---
  useEffect(() => {

    // --- 0. ROOM ENTRY HANDLERS (Add these!) ---
    socket.on("room_created", (id) => {
       console.log("Created Room:", id);
       setRoomId(id);
       setView("ROLE_SELECT");
    });

    socket.on("room_exists", (exists) => { 
       if(exists) setView("ROLE_SELECT"); 
       else alert("Room not found! Check the ID.");
    });
    // 1. RECONNECTION HANDLERS
   // // 1. RECONNECTION HANDLERS
    // 1. RECONNECTION HANDLERS
    // 1. RECONNECTION HANDLERS
    // 1. RECONNECTION HANDLERS
    socket.on("rejoin_success", (data) => {
      const { gameState, phase, myRole } = data; 
      console.log("✅ Successfully Reconnected as:", myRole);
      
      // A. Restore Identity
      setTeamName(myRole); 
      setIsAdmin(myRole === "ADMIN");

      // B. Restore Game Data
      setCurrentBid(gameState.currentBid);
      setHighestBidder(gameState.highestBidder || "No Bids");
      setPlayerIndex(gameState.playerIndex);
      setMyPurse(gameState.myPurse);
      setConnectedTeams(Object.keys(gameState.teams)); 
      setRound(gameState.round || 1);

      // 👇 FIX 1: RESTORE SLIDER HISTORY
      setPastPlayers(gameState.pastPlayers || []);

      // 👇 FIX 2: RESTORE LOGS
      setLogs(gameState.logs || []);
      
      // C. Restore Phase
      setAuctionPhase(phase);

      // D. Decide Screen
      // If phase is SQUAD_SELECTION (End Auction), force AUCTION view (which renders dashboard)
      if (gameState.isAuctionStarted || phase === 'SQUAD_SELECTION' || phase === 'COMPLETED') {
        setView("AUCTION"); 
      } else {
        setView("LOBBY"); 
      }
    });

    // 2. ROLE REGISTRATION (The Missing Piece!)
    socket.on("role_registered", (data) => {
       console.log("Registered as:", data.role);
       // Save credentials to browser
       localStorage.setItem("ipl_room_id", roomId);
       localStorage.setItem("ipl_role", data.role === "ADMIN" ? "ADMIN" : teamName);
       localStorage.setItem("ipl_secret", data.secretId);
       
       setView("LOBBY");
    });
// ... inside useEffect
// Listen for AI Results from Server
    // Inside useEffect in App.js

    /*socket.on("show_ai_results", (data) => {
      console.log("🔥 FRONTEND RECEIVED DATA:", data); // <--- ADD THIS LOG
      setAiResults(data);
      setShowAiModal(true);
    });*/
// 🆕 Listen for Mode Changes
// 🆕 Listen for Mode Changes (FIXED)
    socket.on("mode_update", (data) => {
      console.log("Raw Mode Data:", data); // Debugging log

      // Safety Check: ensure we have a string
      let modeString = "online"; 
      
      if (typeof data === 'string') {
        modeString = data;
      } else if (data && data.mode) {
        // If server sent an object like { roomId: '1234', mode: 'offline' }
        modeString = data.mode;
      }

      setAuctionMode(modeString);

      setLogs(prev => [{ 
        text: `⚠️ MODE CHANGED TO: ${modeString.toUpperCase()}`, 
        type: 'info', 
        time: new Date().toLocaleTimeString()
      }, ...prev]);
    });
// ... existing listeners
    // 3. EXISTING GAME LISTENERS
    socket.on("update_lobby", (list) => setConnectedTeams(list));
    socket.on("admin_status", (isTaken) => setAdminTaken(isTaken));
    socket.on("error_message", (msg) => alert(msg));
    
    // Round 2 Sync
    socket.on("update_player_list", (newList) => {
      setActiveList(newList);
      setPlayerIndex(0);
      setCurrentBid(0);
      setHighestBidder("No Bids");
      setIsRoundOver(false);
      setRound(2);
      setOverlayText("ROUND 2 START");
      setOverlayType("sold");
    });

    // Phase Change (with Admin check)
    socket.on("phase_change", (newPhase) => {
      setAuctionPhase(newPhase);
      if(newPhase === 'SQUAD_SELECTION' && !isAdmin) { 
        alert("🛑 AUCTION ENDED! Please select your Best XI.");
      }
    });
    
    // Start Game & Logs
    socket.on("start_game", (mode) => {
      setGameMode(mode);
      const list = mode === "ALL_TIME" ? allTimePlayers : currentPlayers;
      setActiveList(list);
      setView("AUCTION");

      const firstPlayer = list[0]?.name || "First Player";
      
      setLogs(prev => [
        { 
          text: `🟢 BIDDING STARTED FOR: ${firstPlayer}`, 
          type: 'info', 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        },
        { 
          text: "📢 AUCTION STARTED!", 
          type: 'info', 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }, 
        ...prev
      ]);
    });

    // Bids
    socket.on("update_bid", (data) => {
      setCurrentBid(data.currentBid);
      setHighestBidder(data.highestBidder);
      
      const currentPlayerName = activeList[playerIndex]?.name || "Player";

      const newLog = { 
        text: `🖐 ${data.highestBidder} bids ₹${(data.currentBid/10000000).toFixed(2)} Cr for ${currentPlayerName}`, 
        type: 'bid', 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})
      };
      setLogs(prev => [newLog, ...prev]);
    });

    // Player Result
    socket.on("player_result", (data) => {
      setIsRoundOver(true);
      
      const resultObj = {
        ...currentPlayer,
        status: data.status,
        soldPrice: data.price,
        winner: data.winner
      };
      
      setPastPlayers(prev => [resultObj, ...prev]);

      if (data.status === "SOLD") {
        if (data.winner === teamName) {
           setMyPurse(prev => prev - data.price);
        }

        setOverlayText(`SOLD TO ${data.winner}`);
        setOverlayType("sold");
        setLogs(prev => [{ 
          text: `🔨 SOLD! ${data.playerName} ➔ ${data.winner} (₹${(data.price/10000000).toFixed(2)} Cr)`, 
          type: 'sold', 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
        }, ...prev]);
      } else {
        setOverlayText("UNSOLD");
        setOverlayType("unsold");
        setLogs(prev => [{ text: `⚠️ UNSOLD - ${data.playerName}`, type: 'unsold', time: new Date().toLocaleTimeString() }, ...prev]);
      }
    });
    
    // Next Player
    socket.on("next_player", (data) => {
      setPlayerIndex(data.nextIndex);
      setCurrentBid(0);
      setHighestBidder("No Bids");
      setIsRoundOver(false); 
      setOverlayText(""); 

      const nextName = activeList[data.nextIndex]?.name || "NEXT PLAYER";

      setLogs(prev => [{ 
        text: `🟢 BIDDING STARTED FOR: ${nextName}`, 
        type: 'info', 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }, ...prev]);
    });

    // Squad Submission Update
    socket.on("squad_submission_update", (teamsList) => {
      console.log("New Submission Received!", teamsList);
      setSubmittedTeams(teamsList);
    });

    // Notifications
    socket.on("notification", (msg) => {
      if (!msg.includes("SOLD") && !msg.includes("UNSOLD")) {
        setLogs(prev => [{ text: msg, type: 'info', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) }, ...prev]);
      }
    });

    // --- CLEANUP FUNCTION ---
    return () => { 
      
        socket.off("room_created"); // <--- ADD THIS
        socket.off("room_exists");  // <--- ADD THIS
        // ... (keep all your other cleanups: rejoin_success, role_registered, etc.)
    
        socket.off("rejoin_success");
        socket.off("rejoin_failed");
        socket.off("role_registered");       // <--- ADDED THIS
        socket.off("update_lobby"); 
        socket.off("admin_status");
        socket.off("error_message");
        socket.off("start_game");
        socket.off("update_bid");
        socket.off("notification");
        socket.off("next_player");
        socket.off("player_result");
        socket.off("phase_change");          
        socket.off("update_player_list");    
        socket.off("squad_submission_update");
        // Listen for AI Results from Server
   // socket.off("show_ai_results");
        socket.off("mode_update")
        
    }
  }, [activeList, playerIndex, currentPlayer, teamName, isAdmin, roomId]);


  // 2. NOW PASTE THE FUNCTIONS OUTSIDE (So the buttons can see them)
// --- ADMIN: Start Round 2 (Unsold Players) ---
  const startRound2 = () => {
  const unsoldPlayers = pastPlayers.filter(p => p.status === 'UNSOLD');
  if (unsoldPlayers.length === 0) { 
    alert("No Unsold Players available for Round 2."); 
    return; 
  }
  // ... existing functions


  const round2List = unsoldPlayers.map(p => ({
    ...p, status: null, soldPrice: 0, winner: null 
  }));

  setPastPlayers(prev => prev.filter(p => p.status !== 'UNSOLD')); 
  setActiveList(round2List); 
  setPlayerIndex(0); 
  setCurrentBid(0); 
  setHighestBidder("No Bids"); 
  setIsRoundOver(false);
  setRound(2);
  setOverlayText("ROUND 2"); 
  setOverlayType("sold");

  // SEND ROOM ID CORRECTLY
  socket.emit("admin_update_list", { roomId, newList: round2List }); 

    // 4. Broadcast to Server so ALL TEAMS see the new list
    // (Ensure your server listens for 'admin_update_list' and emits 'update_player_list')
   
   
  };

  // --- ADMIN: End Auction ---
 const endAuction = () => {
    if (window.confirm("Are you sure you want to END THE AUCTION? This cannot be undone.")) {
      // 1. Tell Server to switch everyone's phase
     socket.emit("admin_change_phase", { roomId, newPhase: "SQUAD_SELECTION" });
      
      // 2. Switch Admin's view immediately
      setAuctionPhase("SQUAD_SELECTION");
    }
  };
  // --- ACTIONS ---
  // --- ACTIONS ---
  const joinAsTeam = (name) => {
    setTeamName(name);
    // OLD: socket.emit("join_lobby", name);
    // NEW:
    socket.emit("register_role", { roomId, role: name });
  };

  const joinAsAdmin = () => {
    if (adminTaken) { alert("Admin active!"); return; }
    setTeamName("ADMIN");
    setIsAdmin(true);
    // OLD: socket.emit("join_lobby", "ADMIN");
    // NEW:
    socket.emit("register_role", { roomId, role: "ADMIN" });
  };
const triggerStart = () => {
    // NEW: Send roomId inside the object
    socket.emit("admin_start_game", { roomId, mode: gameMode });
  };

  const placeBid = (specificIncrement = null) => {
    if (isRoundOver) return; 
    const currentVal = currentBid === 0 ? currentPlayer.base_price : currentBid;
    let increment = 0;

    if (specificIncrement) {
      increment = specificIncrement;
    } else {
      if (currentBid === 0) increment = 0;
      else if (currentBid >= 80000000) increment = 10000000;
      else if (currentBid >= 20000000) increment = 5000000;
      else increment = 2000000;
    }

    const newBid = currentVal + increment;
    if (newBid > myPurse) { alert("Insufficient funds!"); return; }

    // NEW: Include roomId in the data object
    socket.emit("place_bid", { roomId, teamName, amount: newBid });
    setCustomBidAmount(0); 
  };

  const sellPlayer = () => {
    // NEW: Send roomId
    socket.emit("sell_player", { roomId, playerData: currentPlayer });
  };

  const nextPlayer = () => {
    // NEW: Send roomId
    socket.emit("admin_next_player", { roomId });
  };

// 🆕 TOGGLE MODE (Admin Only)
const toggleMode = () => {
  const newMode = auctionMode === "online" ? "offline" : "online";
  // Send roomId so it only affects THIS room
  socket.emit("toggle_mode", { roomId, mode: newMode });
};

// 🆕 HANDLE SELL BUTTON CLICK
// ✅ CORRECT (Empty Input)
const handleSellClick = () => {
  if (auctionMode === "online") {
    sellPlayer(); 
  } else {
    setManualTeam(""); 
    setManualPrice(""); // <--- NOW IT'S EMPTY
    setShowManualModal(true);
  }
};
const confirmManualSale = () => {
  if (!manualTeam) return;

  // 👇 THE FIX: Multiply the input by 1 Crore
  const finalPrice = manualTeam === 'Unsold' 
     ? 0 
     : Number(manualPrice) * 10000000; 

  socket.emit("admin_sell_manual", {
    roomId,
    teamName: manualTeam,
    soldPrice: finalPrice, 
    player: currentPlayer
  });
  
  setShowManualModal(false); 
  setManualTeam(""); 
  setManualPrice("");
};
  // --- RENDER ---

  //// --- NEW: ROOM ENTRY SCREEN (Step 1) ---
  if (view === "LANDING") {
    return (
      <div className="landing-container">
        <h1 className="main-title">EES IPL AUCTION 2026</h1>
        
        <div style={{background:'#222', padding:'30px', borderRadius:'10px', textAlign:'center'}}>
           <h2>ENTER AUCTION ROOM</h2>
           
           <div style={{display:'flex', gap:'10px', justifyContent:'center', marginTop:'20px'}}>
             <button 
               onClick={() => socket.emit("create_room")}
               style={{padding:'15px', background:'#d4af37', border:'none', fontWeight:'bold', cursor:'pointer'}}
             >
               ✨ CREATE NEW ROOM
             </button>
           </div>
           
           <p style={{color:'#888', margin:'20px 0'}}>- OR -</p>
           
           <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
             <input 
               type="text" 
               placeholder="Enter 4-Digit Room ID" 
               value={roomId}
               onChange={(e) => setRoomId(e.target.value)}
               maxLength={4}
               style={{padding:'10px', textAlign:'center', fontSize:'1.2rem', width:'150px'}}
             />
             <button 
               onClick={() => {
                 if(roomId.length !== 4) return alert("Please enter a valid 4-digit ID");

                 // --- SMART REJOIN LOGIC ---
                 const savedRoom = localStorage.getItem("ipl_room_id");
                 const savedRole = localStorage.getItem("ipl_role");
                 const savedSecret = localStorage.getItem("ipl_secret");

                 // If joining the SAME room you were just in, try to restore session
                 if (savedRoom === roomId && savedRole && savedSecret) {
                    console.log("🔄 Attempting Smart Rejoin...");
                    socket.emit("rejoin_game", { roomId, role: savedRole, secretId: savedSecret });
                 } else {
                    // Otherwise, join as a new user
                    socket.emit("join_room_check", roomId);
                 }
               }}
               style={{padding:'10px 20px', cursor:'pointer'}}
             >
               JOIN
             </button>
           </div>
        </div>
      </div>
    );
  }
// --- NEW: ROLE SELECTION (Step 2) ---
  if (view === "ROLE_SELECT") {
    return (
      <div className="landing-container">
        <h1>ROOM: <span style={{color:'#d4af37'}}>{roomId}</span></h1>
        
        <h1 className="main-title">EES IPL AUCTION 2026</h1>
        
        <div className="admin-section">
          <button 
            className={`join-admin-btn ${adminTaken ? 'disabled' : ''}`} 
            onClick={joinAsAdmin} disabled={adminTaken}>
            {adminTaken ? "⚠️ AUCTIONEER ACTIVE" : "👨‍⚖️ JOIN AS AUCTIONEER"}
          </button>
        </div>
        
        <div className="divider"><span>SELECT FRANCHISE</span></div>
        
        <div className="logo-grid">
          {OFFICIAL_TEAMS.map(team => {
            const isTaken = connectedTeams.includes(team);
            return (
              <div key={team} className={`team-card ${isTaken ? 'disabled-card' : ''}`}
                onClick={() => !isTaken && joinAsTeam(team)}>
                <img src={TEAM_LOGOS[team]} alt={team} />
                <div className="team-name">{team}</div>
                {isTaken && <div className="taken-badge">TAKEN</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. LOBBY VIEW
  if (view === "LOBBY") {
    const teamsJoinedCount = connectedTeams.filter(t => t !== "ADMIN").length;

    return (
      <div className="lobby-container">
        {isAdmin ? (
          <div className="lobby-dashboard">
            <div className="lobby-header-row">
              <div className="text-left">
                <h1 style={{margin:0}}>CONTROL ROOM</h1>
                <p style={{color: '#d4af37'}}>Waiting for franchises to connect...</p>
              </div>
              <div className="lobby-stats">
                <h2>{teamsJoinedCount} / 10</h2>
                <p>TEAMS READY</p>
              </div>
            </div>

            <div className="admin-grid">
              {OFFICIAL_TEAMS.map(team => {
                const isHere = connectedTeams.includes(team);
                return (
                  <div key={team} className={`admin-slot ${isHere ? 'online' : 'offline'}`}>
                    <img src={TEAM_LOGOS[team]} alt={team} />
                    <span>{team}</span>
                    <div className="status-dot"></div>
                  </div>
                );
              })}
            </div>

            <div className="admin-controls-panel">
              <h3>ACTION CENTER</h3>
              <div className="mode-selector">
                <button 
                  className={`mode-btn ${gameMode === 'CURRENT' ? 'active' : ''}`}
                  onClick={() => setGameMode('CURRENT')}>
                  CURRENT SQUADS
                </button>
                <button 
                  className={`mode-btn ${gameMode === 'ALL_TIME' ? 'active' : ''}`}
                  onClick={() => setGameMode('ALL_TIME')}>
                  ALL-TIME LEGENDS
                </button>
              </div>

              <div style={{display:'flex', gap:'20px', justifyContent:'center'}}>
                <button className="mode-btn" onClick={() => socket.emit("admin_fill_bots")}>
                  🤖 FILL MISSING ({10 - teamsJoinedCount}) WITH BOTS
                </button>
                <button className="start-btn" onClick={triggerStart}>
                  🚀 LAUNCH AUCTION
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lobby-dashboard">
            <div className="pulse-loader" style={{textAlign:'center', marginTop:'50px'}}>
              <img 
                src={TEAM_LOGOS[teamName]} 
                alt={teamName} 
                style={{width: '150px', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))'}} 
              />
              <h1 style={{fontSize:'3rem', marginTop:'20px'}}>WELCOME, {teamName}</h1>
              <p className="pulse-text" style={{color:'#d4af37', fontSize:'1.2rem'}}>
                Waiting for the Auctioneer to start...
              </p>
              <div style={{marginTop: '30px', background:'#222', padding:'10px', borderRadius:'10px'}}>
                 Current Lobby Status: <strong>{teamsJoinedCount} / 10 Teams</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 3. PHASE CHECK: SQUAD SELECTION / DASHBOARD ---
  if (auctionPhase === 'SQUAD_SELECTION' || auctionPhase === 'COMPLETED') {
    // CASE A: YOU ARE THE ADMIN
    if (isAdmin) {
      return (
        <AdminDashboard 
        socket={socket}  // <--- ADD THIS LINE
          connectedTeams={connectedTeams}
          submittedTeams={submittedTeams} // Updates as teams submit
          teamLogos={TEAM_LOGOS}
          onGenerateReport={() => alert("Report Generation Coming Soon")}
        />
      );
    } 
    // CASE B: YOU ARE A TEAM
    else {
      // If team already submitted, show waiting screen
      if (auctionPhase === 'COMPLETED') {
   // Find the squad specifically submitted by this team
   const mySubmittedSquad = submittedTeams.find(s => s.teamName === teamName)?.squad || [];

   return (
     <SquadReview 
       teamName={teamName} 
       submittedSquad={mySubmittedSquad} 
     />
   );
}//Otherwise, show selection screen
      return (
        <SquadSelection 
          teamName={teamName}
          // Filter history to find ONLY players this team won
          myPlayers={pastPlayers.filter(p => p.winner === teamName)} 
          onSubmit={handleSquadSubmit}
        />
      );
    }
  }

  // 3. MAIN GAME (AUCTION STUDIO)
// Handle EMPTY LIST (End of Round)
  if (!currentPlayer) {
    return (
      <div className="game-over">
        <h1>{round === 1 ? "ROUND 1 COMPLETED" : "ROUND 2 COMPLETED"}</h1>
        <p style={{color:'#888'}}>List exhausted.</p>
        
        {isAdmin && (
          <div style={{display:'flex', gap:'20px', marginTop:'20px'}}>
            
            {/* ONLY SHOW THIS BUTTON IN ROUND 1 */}
            {round === 1 && (
              <button 
                className="action-btn" 
                onClick={startRound2} 
                style={{border:'1px solid #d4af37', color:'#d4af37', background:'#333'}}
              >
                🔄 START ROUND 2 (UNSOLD)
              </button>
            )}

            {/* ALWAYS SHOW END AUCTION */}
            <button 
              className="action-btn hammer-down" 
              onClick={endAuction}
            >
              🛑 {round === 1 ? "END AUCTION NOW" : "FINALIZE AUCTION"}
            </button>
          </div>
        )}
      </div>
    );
  }
  
  const nextPlayers = activeList.slice(playerIndex + 1, playerIndex + 6);
  const orderedTeams = getOrderedTeams(); // Get Sorted List for Sidebar

  return (
    <div className="auction-studio">
      
      {/* 1. LEFT SIDEBAR: LIVE FEED (Column 1) */}
      <div className="live-feed-sidebar">
        <div className="feed-header">
          <span style={{color:'red'}}>●</span> LIVE ACTION LOG
        </div>
        <div className="feed-content">
  {/* 👇 FIX: Only slice the last 50 logs */}
  {logs.slice(0, 50).map((log, i) => (
    <div key={i} className={`log-item ${log.type}`}>
      <span style={{fontSize:'0.7rem', opacity:0.6, marginRight:'5px', display:'block'}}>{log.time}</span>
      {log.text}
    </div>
  ))}
</div>
      </div>
{/* 2. HEADER BAR (Spans Column 1 & 2) */}
      <div style={{
          gridColumn: '1 / 3', 
          gridRow:'1', 
          background:'#111', 
          display:'flex', 
          alignItems:'center', 
          padding:'0 20px', 
          borderBottom:'1px solid #333',
          boxShadow: '0 5px 10px rgba(0,0,0,0.5)',
          zIndex: 50
        }}>
        {/* LOGO & TITLE SECTION */}
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
           {isAdmin ? (
             <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
               <div style={{background:'white', borderRadius:'50%', padding:'5px', width:'40px', height:'40px', display:'flex', justifyContent:'center', alignItems:'center'}}>
                 <span style={{fontSize:'20px'}}>👨‍⚖️</span>
               </div>
               <h2 style={{color:'white', margin:0, fontSize:'1.2rem'}}>AUCTIONEER</h2>
               
               {/* --- NEW: ADMIN CONTROLS --- */}
               <div style={{marginLeft:'30px', display:'flex', gap:'10px'}}>
                  
                  {/* 👇 MOVED BUTTON HERE: NOW ONLY VISIBLE TO ADMIN 👇 */}
                  <button 
                    onClick={toggleMode}
                    style={{
                      background: auctionMode === 'online' ? '#28a745' : '#ffc107', 
                      color: auctionMode === 'online' ? 'white' : 'black',
                      border: 'none',
                      padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
                    }}
                  >
                    {auctionMode === 'online' ? "🟢 ONLINE MODE" : "🟠 OFFLINE MODE"}
                  </button>
                  {/* 👆 END OF MOVED BUTTON 👆 */}

                  <button 
                    onClick={startRound2} 
                    style={{
                      background:'#222', color:'#ccc', border:'1px solid #444', 
                      padding:'6px 12px', borderRadius:'4px', cursor:'pointer', 
                      fontWeight:'bold', fontSize:'0.8rem'
                    }}
                  >
                    🔄 ROUND 2
                  </button>
                  <button 
                    onClick={endAuction} 
                    style={{
                      background:'#721c24', color:'#f8d7da', border:'1px solid #f5c6cb', 
                      padding:'6px 12px', borderRadius:'4px', cursor:'pointer', 
                      fontWeight:'bold', fontSize:'0.8rem'
                    }}
                  >
                    🛑 END AUCTION
                  </button>
               </div>
             </div>
             
           ) : (
             <>
               <img 
                 src={TEAM_LOGOS[teamName]} 
                 alt={teamName} 
                 style={{height: '50px', width:'50px', objectFit:'contain', filter:'drop-shadow(0 0 5px rgba(255,255,255,0.2))'}} 
               />
               <h2 style={{color:'white', fontSize:'1.2rem'}}>{teamName}</h2>
             </>
           )}
           
           <button 
             onClick={() => setShowRules(true)}
             style={{
               marginLeft: '40px',
               background: 'transparent',
               border: '2px solid #f7e9e9',
               color: '#aaa',
               padding: '8px 12px',
               borderRadius: '4px',
               cursor: 'pointer',
               fontSize: '0.9rem'
             }}
           >
             📜 RULES
           </button>

        </div>



        {/* PURSE DISPLAY */}
        {!isAdmin && (
           <div style={{marginLeft:'auto', textAlign:'right'}}>
             <span style={{color:'#888', fontSize:'0.8rem', display:'block'}}>REMAINING PURSE</span>
             <div style={{display:'flex', alignItems:'baseline', gap:'8px', justifyContent:'flex-end'}}>
                {highestBidder === teamName && currentBid > 0 && !isRoundOver && (
                  <span style={{color:'#dc3545', fontSize:'1rem', fontWeight:'bold', marginRight:'5px'}}>
                     (₹{((myPurse - currentBid)/10000000).toFixed(2)} Cr)
                  </span>
                )}
                <span style={{color:'#d4af37', fontSize:'1.4rem', fontWeight:'bold'}}>
                  ₹{(myPurse/10000000).toFixed(2)} Cr
                </span>
             </div>
           </div>
        )}
      </div>

      {/* 3. MAIN STAGE (Column 2) */}
      <div className="main-stage">
        
        {/* WRAPPER FOR ALIGNMENT */}
        <div className="content-container">
            {/* Massive Overlay for SOLD / UNSOLD */}
            {overlayText && (
              <div className={`overlay-flash active ${overlayType}`}>
                {overlayText}
              </div>
            )}

            <img 
              // 👇 THIS IS THE FIX
              key={currentPlayer.id} 
              
              src={currentPlayer.image_url} 
              alt={currentPlayer.name} 
              className="stage-hero-image"
              onError={(e) => handleImageError(e, currentPlayer.name)}
            />

           {/* Floating Stats Panel */}
            <div className="stage-stats-panel">
              
              {/* HEADER: Role + Overseas Badge (No Box) */}
              <div style={{display:'flex', gap:'12px', alignItems:'center', marginBottom:'5px'}}>
                <div className="role-badge-large">{currentPlayer.role}</div>
                
                {/* UPDATED: Just Blue Text */}
                {currentPlayer.country !== "India" && (
                  <span style={{
                    color:'#4da6ff',        /* Bright Blue Text */
                    fontSize:'0.8rem',      /* Readable Size */
                    fontWeight:'bold', 
                    display:'flex', 
                    alignItems:'center', 
                    gap:'5px',
                    letterSpacing:'0.5px'
                  }}>
                    ✈️ OVERSEAS
                  </span>
                )}
              </div>

              <h2 style={{margin:'0 0 5px 0', color:'#d4af37', textTransform:'uppercase', fontSize:'2rem'}}>
                {currentPlayer.name}
              </h2>
              <p style={{margin:'0 0 20px 0', color:'#888', fontStyle:'italic'}}>
                {currentPlayer.country} • {currentPlayer.specialism || "Player"}
              </p>
              
              {/* DYNAMIC STATS GRID */}
              {(() => {
                const s = currentPlayer.stats;
                const r = currentPlayer.role.toUpperCase();
                
                // 1. BOWLER / SPINNER / FAST BOWLER
                if (r.includes("BOWLER") || r.includes("SPIN") || r.includes("FAST")) {
                  return (
                    <>
                      <div className="stat-row"><span>Matches</span><span>{s.matches}</span></div>
                      <div className="stat-row"><span>Wickets</span><span>{s.wickets}</span></div>
                      <div className="stat-row"><span>Economy</span><span>{s.economy}</span></div>
                      <div className="stat-row"><span>Best Figures</span><span>{s.best || "N/A"}</span></div>
                    </>
                  );
                }
                
                // 2. ALL ROUNDER
                if (r.includes("ALL")) {
                  return (
                    <>
                      <div className="stat-row"><span>Runs / SR</span><span>{s.runs} <small>({s.sr})</small></span></div>
                      <div className="stat-row"><span>Wickets</span><span>{s.wickets}</span></div>
                      <div className="stat-row"><span>Economy</span><span>{s.economy}</span></div>
                      <div className="stat-row"><span>Best / HS</span><span>{s.best || s.hs || "-"}</span></div>
                    </>
                  );
                }

                // 3. BATTER / OPENER / WICKET KEEPER (Default)
                return (
                  <>
                    <div className="stat-row"><span>Matches</span><span>{s.matches}</span></div>
                    <div className="stat-row"><span>Runs</span><span>{s.runs}</span></div>
                    <div className="stat-row"><span>Average</span><span>{s.avg}</span></div>
                    <div className="stat-row"><span>Strike Rate</span><span>{s.sr}</span></div>
                    <div className="stat-row"><span>High Score</span><span>{s.hs || "N/A"}</span></div>
                  </>
                );
              })()}
              
              <div className="stat-row" style={{borderBottom:'none', marginTop:'15px', paddingTop:'10px', borderTop:'1px solid #333'}}>
                <span>Base Price</span>
                <span style={{color:'#d4af37', fontSize:'1.3rem', fontWeight:'bold'}}>
                  ₹{(currentPlayer.base_price/10000000).toFixed(2)} Cr
                </span>
              </div>
            </div>
        </div>
      </div>
            
{/* --- 4. UPDATED BOTTOM DOCK (Strict Layout to prevent shifting) --- */}
      <div className="bottom-dock">
        
        {/* SECTION 1: PAST PLAYERS (COMPLETED SLIDER) */}
        <div style={{
            display:'flex', 
            flexDirection:'column', 
            width:'30%', 
            minWidth:'0', /* CRITICAL: Prevents flex item from overflowing */
            height:'100%', 
            justifyContent:'center', 
            borderRight:'1px solid #222', 
            paddingRight:'10px', 
            overflow: 'hidden' /* CRITICAL: Hides overflow */
        }}>
           <span 
             onClick={() => setModalType('HISTORY')} 
             style={{color:'#888', fontSize:'0.7rem', fontWeight:'bold', marginBottom:'5px', letterSpacing:'1px', cursor:'pointer', textDecoration:'underline'}}
           >
             COMPLETED (View All)
           </span>
           
           <div className="next-players-slider">
             {pastPlayers.map(p => (
               <div key={p.id} className={`mini-card ${p.status === 'SOLD' ? 'card-sold' : 'card-unsold'}`}>
                 <img src={p.image_url} onError={handleImageError} alt="p" />
                 <span>{p.name.split(' ')[1] || p.name}</span>
                 <div className="mini-status">
                   {p.status === 'SOLD' ? p.winner : 'UNSOLD'}
                 </div>
               </div>
             ))}
             {pastPlayers.length === 0 && <span style={{color:'#333'}}>No History</span>}
           </div>
        </div>

        {/* SECTION 2: UPCOMING PLAYERS */}
        <div style={{
            display:'flex', 
            flexDirection:'column', 
            width:'30%', 
            minWidth:'0', /* CRITICAL */
            height:'100%', 
            justifyContent:'center', 
            paddingLeft:'10px', 
            overflow: 'hidden' /* CRITICAL */
        }}>
           <span 
             onClick={() => setModalType('UPCOMING')}
             style={{color:'#666', fontSize:'0.7rem', fontWeight:'bold', marginBottom:'5px', letterSpacing:'1px', cursor:'pointer', textDecoration:'underline'}}
           >
             UPCOMING (View All)
           </span>
           <div className="next-players-slider">
             {nextPlayers.map(p => (
               <div key={p.id} className="mini-card">
                 <img src={p.image_url} onError={handleImageError} alt="p" />
                 <span>{p.name.split(' ')[1] || p.name}</span>
               </div>
             ))}
             {nextPlayers.length === 0 && <span style={{color:'#444'}}>End of List</span>}
           </div>
        </div>{/* SECTION 3: CONTROLS */}
     <div className="dock-controls" style={{width: '35%', minWidth: '0', position: 'relative'}}>
        
        {/* 1. PRICE BOX (Only visible in ONLINE mode) */}
        {auctionMode === 'online' && (
           <div className="live-price-box">
             <h4>CURRENT BID</h4>
             <div className="price">₹{(currentBid / 10000000).toFixed(2)} Cr</div>
             <div style={{color:'#d4af37', fontSize:'0.9rem', textAlign:'right', height:'20px'}}>
               {highestBidder !== "No Bids" ? `HELD BY ${highestBidder}` : "NO BIDS YET"}
             </div>
           </div>
        )}

        {/* 2. BUTTONS (Admin vs User) */}
        {isAdmin ? (
          // --- ADMIN VIEW ---
          isRoundOver ? (
            <button className="action-btn next-player-btn" onClick={nextPlayer}>NEXT PLAYER &gt;&gt;</button>
          ) : (
            <button 
               className="action-btn hammer-down" 
               onClick={handleSellClick} 
            >
               {auctionMode === 'online' ? "SELL 🔨" : "SELL 📝"}
            </button>
          )
        ) : (
          // --- USER VIEW ---
          auctionMode === 'offline' ? (
             // OFFLINE MESSAGE
             <div style={{
               width:'90%', height:'80px', background:'#333', color:'#888', 
               display:'flex', alignItems:'center', justifyContent:'center', 
               border:'2px dashed #555', borderRadius:'10px', fontSize:'1.2rem'
             }}>
               🚫 BIDDING DISABLED (MANUAL)
             </div>
          ) : (
             <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px', width:'100%'}}>
               
               {/* LOGIC: Check if I am already the highest bidder */}
               {(() => {
                 const isLeading = highestBidder === teamName;
                 const isDisabled = isRoundOver || isLeading;

                 return (
                   <>
                     {/* STANDARD DYNAMIC BUTTON */}
                     <button 
                        className="action-btn paddle-up" 
                        onClick={() => placeBid(null)} 
                        disabled={isDisabled} 
                        style={{
                            opacity: isDisabled ? 0.5 : 1, 
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            background: isLeading ? '#444' : '', // Darker if leading
                            width: '90%', 
                            height: isRoundOver ? '80px' : '60px', 
                            fontSize: '1rem' 
                        }}
                     >
                       {isLeading ? "YOU LEAD" : `BID (${getIncrementLabel()})`}
                     </button>

                     {/* SLIDER SECTION (Compact + Total Price Display) */}
                     {!isRoundOver && (
                       <div style={{
                           width:'82.50%', background:'#222', padding:'4px 8px', 
                           borderRadius:'5px', border:'1px solid #444',
                           pointerEvents: isLeading ? 'none' : 'auto', // Disable interaction if leading
                           opacity: isLeading ? 0.5 : 1
                       }}>
                         
                         <div style={{display:'flex', justifyContent:'space-between', marginBottom:'2px', alignItems:'center'}}>
                           <span style={{fontSize:'0.9rem', color:'#aaa'}}>
                              JUMP: <b style={{color:'#d30d0d'}}>+{(customBidAmount/10000000).toFixed(2)}</b>
                           </span>
                           <span style={{fontSize:'0.65rem', color:'#d4af37'}}>
                              TOTAL: <b>{(( (currentBid || currentPlayer.base_price) + customBidAmount ) / 10000000).toFixed(2)} Cr</b>
                           </span>
                         </div>
                         
                         <input 
                           type="range" 
                           min="0" 
                           max="200000000" 
                           step="10000000" 
                           value={customBidAmount} 
                           onChange={(e) => setCustomBidAmount(Number(e.target.value))}
                           disabled={isLeading}
                           style={{width:'100%', cursor: isLeading ? 'not-allowed' : 'pointer', height:'4px', accentColor:'#d4af37', margin:'3px 0'}}
                         />
                         
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'2px'}}>
                            <span style={{fontSize:'0.5rem', color:'#666', fontStyle:'italic'}}>
                              {isLeading ? "Wait for others..." : "⚠️ Consent Req.from auctioneer"}
                            </span>
                            <button 
                              onClick={() => placeBid(customBidAmount)}
                              disabled={customBidAmount === 0 || isLeading}
                              style={{
                                background: (customBidAmount > 0 && !isLeading) ? '#d4af37' : '#333', 
                                border:'none', borderRadius:'3px', 
                                padding:'2px 8px', fontSize:'0.65rem', fontWeight:'bold', 
                                cursor: (customBidAmount > 0 && !isLeading) ? 'pointer' : 'default',
                                color: (customBidAmount > 0 && !isLeading) ? 'black' : '#555',
                                transition: 'all 0.2s'
                              }}
                            >
                              ADD BID
                            </button>
                         </div>
                       </div>
                     )}
                   </>
                 );
               })()}
             </div>
             )
           )}
        </div>
      </div>
{/* 5. TEAM STRIP (Far Right Sidebar - Column 3) */}
      <div className="team-sidebar">
        {orderedTeams.map((team, index) => {
          const isMyTeam = !isAdmin && index === 0;
          const isConnected = connectedTeams.includes(team);
          return (
            <div 
              key={team} 
              className={`sidebar-icon ${isMyTeam ? 'my-team' : ''} ${isConnected ? 'online' : 'offline'}`}
              // NEW: Add Click Handler
              onClick={() => handleTeamClick(team)}
              style={{cursor: 'pointer'}} 
              title="View Squad"
            >
              <img src={TEAM_LOGOS[team]} alt={team} />
              {isMyTeam && <div className="my-team-dot">●</div>}
            </div>
          );
        })}
      </div>
      {/* 6. MODAL POPUP (Conditionally Rendered) */}
      {modalType && (
        <PlayerListModal 
          title={modalType === 'HISTORY' ? "COMPLETED AUCTIONS" : "UPCOMING PLAYERS"}
          players={modalType === 'HISTORY' ? pastPlayers : activeList.slice(playerIndex + 1)}
          type={modalType}
          onClose={() => setModalType(null)}
        />
      )}

      {showRules && <RulebookModal onClose={() => setShowRules(false)} />}


        {/* NEW: SQUAD MODAL */}
      {selectedSquadTeam && (
        <TeamSquadModal 
          teamName={selectedSquadTeam}
          teamLogo={TEAM_LOGOS[selectedSquadTeam]}
          purseLeft={getTeamPurse(selectedSquadTeam)}
          squad={getTeamSquad(selectedSquadTeam)}
          onClose={() => setSelectedSquadTeam(null)}
        />
      )}
{/* 🆕 COMPACT MANUAL SELL POPUP (Right-Aligned) */}
      {showManualModal && (
        <div className="manual-sell-popup">
          <button className="close-popup-btn" onClick={() => setShowManualModal(false)}>✖</button>
          
          <div style={{fontSize:'0.8rem', color:'#aaa', textAlign:'left'}}>
            MANUAL SALE: <strong style={{color:'white'}}>{currentPlayer.name}</strong>
          </div>

          {/* 1. TEAM GRID (Logos) */}
          <div className="mini-team-grid">
             {/* Unsold Button */}
             <button 
               className={`mini-circle-btn unsold-btn ${manualTeam === 'Unsold' ? 'selected' : ''}`}
               onClick={() => setManualTeam('Unsold')}
               title="Mark Unsold"
             >
               ❌
             </button>

             {/* Connected Teams Only */}
             {connectedTeams.filter(t => t !== "ADMIN").map(team => (
               <button
                 key={team}
                 className={`mini-circle-btn ${manualTeam === team ? 'selected' : ''}`}
                 onClick={() => setManualTeam(team)}
                 title={team}
               >
                 <img src={TEAM_LOGOS[team]} alt={team} />
               </button>
             ))}
          </div>

          {/* 2. FEEDBACK LABEL */}
          <div className="selected-team-label">
            {manualTeam === 'Unsold' ? "🔴 MARKED UNSOLD" : (manualTeam ? `🟢 ${manualTeam} SELECTED` : "SELECT A TEAM")}
          </div>

          {/* 3. PRICE INPUT (Clean, No Spinners) */}
          {manualTeam && manualTeam !== 'Unsold' && (
             <div className="compact-price-row">
                <span style={{color:'#d4af37', fontWeight:'bold'}}>₹</span>
                <input 
                   type="number" 
                   className="no-spinner" 
                   placeholder="Enter Amount" 
                   value={manualPrice} 
                   onChange={(e) => setManualPrice(e.target.value)}
                   autoFocus
                />
                <span style={{color:'#d4af37', fontSize:'0.9rem', fontWeight:'bold'}}>Cr</span>
             </div>
          )}

          {/* 4. CONFIRM BUTTON (Uses your logic function) */}
          <button 
             onClick={confirmManualSale}
             disabled={!manualTeam || (manualTeam !== 'Unsold' && !manualPrice)}
             style={{
               marginTop: '10px',
               width: '100%',
               padding: '10px',
               background: manualTeam ? '#d4af37' : '#333',
               border: 'none',
               borderRadius: '4px',
               fontWeight: 'bold',
               cursor: manualTeam ? 'pointer' : 'not-allowed',
               color: manualTeam ? 'black' : '#555',
               transition: 'background 0.2s'
             }}
          >
             CONFIRM
          </button>
        </div>
      )}
      
   
    </div>

    
  );
}

export default App;