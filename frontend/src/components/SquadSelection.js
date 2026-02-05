import React, { useState } from 'react';
import './SquadSelection.css'; 

const SquadSelection = ({ teamName, myPlayers, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelection = (playerId) => {
    if (selectedIds.includes(playerId)) {
      setSelectedIds(prev => prev.filter(id => id !== playerId));
    } else {
      if (selectedIds.length >= 11) { alert("Maximum 11 players allowed."); return; }
      setSelectedIds(prev => [...prev, playerId]);
    }
  };

  const handleSubmit = () => {
    const selectedPlayers = myPlayers.filter(p => selectedIds.includes(p.id));
    
    // UPDATED VALIDATION: Allow 1 to 11 players
    if (selectedPlayers.length === 0) { alert("Please select at least 1 player."); return; }
    
    const osCount = selectedPlayers.filter(p => p.country !== "India").length;
    if (osCount > 4) { alert(`Too many Overseas players (${osCount}). Max 4 allowed.`); return; }

    onSubmit(selectedPlayers);
  };

  const selectedCount = selectedIds.length;
  const osCount = myPlayers.filter(p => selectedIds.includes(p.id) && p.country !== "India").length;

  return (
    <div className="squad-selection-container">
      {/* HEADER */}
      <div className="selection-header">
        <div className="selection-title">
          <h2>SELECT SQUAD</h2>
          <p>Pick your final playing XI (Max 11)</p>
        </div>
        
        <div className="selection-stats">
          <div className="stat-item">
             <span className="stat-label">Selected</span>
             {/* Logic: Green if between 1 and 11 */}
             <span className="stat-value" style={{color: selectedCount > 0 && selectedCount <= 11 ? '#28a745' : '#dc3545'}}>
               {selectedCount} / 11
             </span>
          </div>
          <div className="stat-item">
             <span className="stat-label">Overseas</span>
             <span className="stat-value" style={{color: osCount <= 4 ? '#28a745' : '#dc3545'}}>
               {osCount} / 4
             </span>
          </div>
        </div>

        <button 
          className={`submit-squad-btn ${selectedCount > 0 && osCount <= 4 ? 'ready' : ''}`}
          onClick={handleSubmit}
          disabled={selectedCount === 0 || osCount > 4}
        >
          SUBMIT SQUAD
        </button>
      </div>

      {/* GRID */}
      <div className="selection-grid">
        {myPlayers.map(p => (
          <div 
            key={p.id} 
            className={`select-card ${selectedIds.includes(p.id) ? 'selected' : ''}`}
            onClick={() => toggleSelection(p.id)}
          >
            <img src={p.image_url} alt="" onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/166/166248.png"} />
            
            <div className="card-details">
              <h4>{p.name}</h4>
              <div className="card-meta">
                 <span className="role-badge">{p.role}</span>
                 {p.country !== "India" && <span className="os-tag">✈️ OS</span>}
              </div>
            </div>

            {selectedIds.includes(p.id) && <div className="checkmark">✔</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SquadSelection;