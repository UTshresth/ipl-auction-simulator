import React, { useState, useRef } from 'react';
import './SquadSelection.css'; 

const SquadSelection = ({ teamName, myPlayers, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const toggleSelection = (playerId) => {
    if (selectedIds.includes(playerId)) {
      setSelectedIds(prev => prev.filter(id => id !== playerId));
    } else {
      if (selectedIds.length >= 11) { alert("Maximum 11 players allowed."); return; }
      setSelectedIds(prev => [...prev, playerId]);
    }
  };

  const handleSort = () => {
    let _selectedIds = [...selectedIds];
    const draggedItemContent = _selectedIds.splice(dragItem.current, 1)[0];
    _selectedIds.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setSelectedIds(_selectedIds);
  };

  const handleSubmit = () => {
    const orderedSquad = selectedIds.map(id => myPlayers.find(p => p.id === id));
    if (orderedSquad.length === 0) { alert("Please select at least 1 player."); return; }
    
    const osCount = orderedSquad.filter(p => p.country !== "India").length;
    if (osCount > 4) { alert(`Too many Overseas players (${osCount}). Max 4 allowed.`); return; }

    onSubmit(orderedSquad);
  };

  const selectedCount = selectedIds.length;
  const osCount = myPlayers.filter(p => selectedIds.includes(p.id) && p.country !== "India").length;
  const selectedPlayersList = selectedIds.map(id => myPlayers.find(p => p.id === id));
  
  return (
    <div className="squad-builder-container">
      
      {/* LEFT COLUMN: BATTING ORDER (Fixed Height) */}
      <div className="batting-order-panel">
        <div className="panel-header">
           <h3>PLAYING XI ({selectedCount}/11)</h3>
           {/* 🆕 INSTRUCTION NOTE */}
           <div className="drag-note">
             <span>✋ Drag cards to set batting order</span>
             <span className={osCount <= 4 ? "stat-ok" : "stat-error"}>✈️ {osCount}/4</span>
           </div>
        </div>

        <div className="batting-list">
          {selectedPlayersList.length === 0 && (
             <div className="empty-state">Select players from the bench</div>
          )}

          {selectedPlayersList.map((p, index) => (
            <div 
              key={p.id}
              className="batting-card compact-card" // Added 'compact-card' class
              draggable
              onDragStart={(e) => (dragItem.current = index)}
              onDragEnter={(e) => (dragOverItem.current = index)}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="batting-number">{index + 1}</div>
              <div className="batting-info">
                 <span className="p-name">{p.name}</span>
                 <span className="p-role">{p.role}</span>
              </div>
              <div className="batting-actions">
                 {p.country !== "India" && <span className="os-badge">✈️</span>}
                 <button className="remove-btn" onClick={() => toggleSelection(p.id)}>✖</button>
              </div>
            </div>
          ))}
        </div>

        <button 
          className="confirm-xi-btn"
          onClick={handleSubmit}
          disabled={selectedCount === 0 || osCount > 4}
        >
          CONFIRM TEAM
        </button>
      </div>

      {/* RIGHT COLUMN: SQUAD POOL */}
      <div className="player-pool-panel">
        <div className="panel-header">
           <h3>BENCH ({myPlayers.length - selectedCount})</h3>
           <p className="subtitle">Click to Add</p>
        </div>

        <div className="pool-grid">
          {myPlayers
            .filter(p => !selectedIds.includes(p.id))
            .map(p => (
              <div key={p.id} className="pool-card" onClick={() => toggleSelection(p.id)}>
                <img src={p.image_url} alt={p.name} onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/166/166248.png"} />
                <div className="pool-info">
                   <div className="pool-name">{p.name}</div>
                   <div className="pool-meta">
                     <span className="role-tag">{p.role}</span>
                     {p.country !== "India" && <span className="os-tag-mini">OS</span>}
                   </div>
                </div>
                <div className="add-icon">+</div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SquadSelection;