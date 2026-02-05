import React from 'react';
import './TeamSquadModal.css';

const TeamSquadModal = ({ teamName, teamLogo, purseLeft, squad, onClose }) => {
  
  // 1. Calculate Stats
  const totalPlayers = squad.length;
  const overseasCount = squad.filter(p => p.country !== "India").length; // Assuming 'India' is the home country logic

  // 2. Define Categories
  const categories = {
    "OPENER": [],
    "MIDDLE ORDER": [],
    "WICKET KEEPER": [],
    "ALL ROUNDER": [],
    "SPINNER": [],
    "FAST BOWLER": []
  };

  // 3. Sort Players into Categories
  squad.forEach(player => {
    // Normalize role string to upper case for matching
    const role = player.role.toUpperCase();
    
    if (role.includes("OPENER") || role.includes("BATSMAN")) {
      // Simple logic: If strict 'Opener' role exists, use it. Otherwise, put generic batsmen in Middle Order
      if(role.includes("OPENER")) categories["OPENER"].push(player);
      else categories["MIDDLE ORDER"].push(player);
    } 
    else if (role.includes("WICKET") || role.includes("KEEPER")) categories["WICKET KEEPER"].push(player);
    else if (role.includes("ALL")) categories["ALL ROUNDER"].push(player);
    else if (role.includes("SPIN")) categories["SPINNER"].push(player);
    else if (role.includes("FAST") || role.includes("PACE") || role.includes("BOWLER")) categories["FAST BOWLER"].push(player);
    else categories["MIDDLE ORDER"].push(player); // Fallback
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="squad-modal-container" onClick={e => e.stopPropagation()}>
        
        {/* HEADER: Logo, Name, Stats */}
        <div className="squad-header">
          <div className="header-left">
            <img src={teamLogo} alt={teamName} className="header-logo" />
            <div>
              <h2>{teamName}</h2>
              <div className="header-stats">
                <span>Players: <strong>{totalPlayers}</strong></span>
                <span className="divider">|</span>
                <span>Overseas: <strong>{overseasCount}</strong></span>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="purse-display">
              <small>REMAINING PURSE</small>
              <span>₹{(purseLeft / 10000000).toFixed(2)} Cr</span>
            </div>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* SQUAD GRID */}
        <div className="squad-grid-container">
          {Object.entries(categories).map(([category, players]) => (
            <div key={category} className="category-column">
              <h4 className="category-title">{category} <span className="count-badge">{players.length}</span></h4>
              <div className="player-list">
                {players.length > 0 ? (
                  players.map(p => (
                    <div key={p.id} className="squad-player-card">
                       <div className="p-row">
                         <span className="p-name">{p.name}</span>
                         <span className="p-price">₹{(p.soldPrice / 10000000).toFixed(2)} Cr</span>
                       </div>
                       <div className="p-sub-row">
                         {p.country !== "India" && <span className="os-badge">✈️ OS</span>}
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-slot">- Empty -</div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TeamSquadModal;