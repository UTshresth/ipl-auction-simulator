import React from 'react';
import './PlayerListModal.css';

const PlayerListModal = ({ title, players, onClose, type }) => {
  // No state needed since stats are always visible

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Stop click propagation so clicking the box doesn't close it */}
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header">
          <h2>{title} ({players.length})</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* SCROLLABLE HORIZONTAL SLIDER */}
        <div className="modal-grid">
          {players.map((p) => (
            <div key={p.id} className="player-card-item">
              
              {/* TOP SECTION: IMAGE & INFO */}
              <div className="card-top">
                <img 
                  src={p.image_url} 
                  alt={p.name} 
                  onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/166/166248.png"} 
                />
                <div className="card-info">
                  <h3>{p.name}</h3>
                  <span className="role-tag">{p.role}</span>
                  
                  {/* DYNAMIC PRICE DISPLAY */}
                  {type === 'HISTORY' ? (
                    <div className="status-row">
                      {p.status === 'SOLD' ? (
                        <>
                          <span className="sold-badge">SOLD TO {p.winner}</span>
                          <span className="price-tag">₹{(p.soldPrice / 10000000).toFixed(2)} Cr</span>
                        </>
                      ) : (
                        <span className="unsold-badge">UNSOLD</span>
                      )}
                    </div>
                  ) : (
                    <div className="status-row">
                      <span className="base-price">Base Price: ₹{(p.base_price / 10000000).toFixed(2)} Cr</span>
                    </div>
                  )}
                </div>
              </div>

              {/* STATS SECTION (ALWAYS VISIBLE) */}
              <div className="card-stats">
                {p.stats ? (
                  <>
                    <div className="stat-box"><div>Matches</div><div>{p.stats.matches}</div></div>
                    <div className="stat-box"><div>Runs</div><div>{p.stats.runs}</div></div>
                    <div className="stat-box"><div>Wickets</div><div>{p.stats.wickets}</div></div>
                    <div className="stat-box"><div>Economy</div><div>{p.stats.economy}</div></div>
                  </>
                ) : (
                  <div style={{gridColumn: '1 / -1', color: '#666', textAlign: 'center', padding: '10px', fontSize: '0.8rem'}}>
                    No Stats Available
                  </div>
                )}
              </div>
              
            </div>
          ))}
          
          {players.length === 0 && (
            <div style={{color: '#666', fontSize: '1.5rem', textAlign: 'center', margin: 'auto'}}>
              No players in this list yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerListModal;