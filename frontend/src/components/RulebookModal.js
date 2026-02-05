import React from 'react';
import './RulebookModal.css';

const RulebookModal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rulebook-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="rulebook-header">
          <h2>📜 OFFICIAL AUCTION RULES</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* CONTENT */}
        <div className="rulebook-content">
          
          <div className="rule-section">
            <h3>👥 PLAYER POOL</h3>
            <ul>
              <li>Total Players: <strong>125</strong></li>
              <li>Overseas Players: <strong>45</strong></li>
            </ul>
          </div>

          <div className="rule-section">
            <h3>💰 BUDGET & SQUAD</h3>
            <ul>
              <li>Total Purse: <span style={{color: '#d4af37'}}>₹120 Crores</span></li>
              <li>Squad Size: <strong>Min 13 - Max 16</strong> players</li>
              <li>Overseas Limit: <strong>Min 4 - Max 6</strong> players</li>
            </ul>
          </div>

          <div className="rule-section">
            <h3>⚖️ TEAM BALANCE</h3>
            <p>Teams must build a balanced squad containing:</p>
            <div className="tags-row">
              <span>Openers</span>
              <span>Bowlers</span>
              <span>Wicket Keepers</span>
              <span>All-Rounders</span>
            </div>
          </div>

          <div className="rule-section warning-box">
            <h3>⚠️ JUDGEMENT CRITERIA</h3>
            <ul>
              <li>After the auction, teams must submit their <strong>BEST XI</strong>.</li>
              <li>The Best XI can contain a maximum of <strong>4 Overseas</strong> players.</li>
              <li><strong>PENALTY:</strong> Failing to meet any criteria (squad size, overseas limits, role balance) will result in <span style={{color:'#dc3545'}}>Negative Ratings</span>.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RulebookModal;