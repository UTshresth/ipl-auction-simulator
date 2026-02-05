import React from 'react';
import './PlayerCard.css'; // We will update this CSS next

const PlayerCard = ({ player }) => {
  if (!player) return null;

  const handleImageError = (e) => {
    e.target.src = "https://cdn-icons-png.flaticon.com/512/166/166248.png";
  };

  return (
    <div className="broadcast-card">
      {/* LEFT SIDE: HERO IMAGE */}
      <div className="broadcast-left">
        <div className="player-role-badge">{player.role.toUpperCase()}</div>
        <img 
          src={player.image_url} 
          alt={player.name} 
          className="hero-image" 
          onError={handleImageError}
        />
        <div className="hero-name">
          <h1>{player.name}</h1>
          <h3>{player.country}</h3>
        </div>
      </div>

      {/* RIGHT SIDE: STATS BOARD */}
      <div className="broadcast-right">
        <div className="stats-header">
          <h2>PLAYER STATISTICS</h2>
          <span className="set-info">Set: {player.set_name || "Marquee"}</span>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="label">MATCHES</span>
            <span className="value">{player.stats.matches}</span>
          </div>
          <div className="stat-item">
            <span className="label">RUNS</span>
            <span className="value">{player.stats.runs}</span>
          </div>
          <div className="stat-item">
            <span className="label">STRIKE RATE</span>
            <span className="value">{player.stats.sr}</span>
          </div>
          <div className="stat-item">
            <span className="label">WICKETS</span>
            <span className="value">{player.stats.wickets}</span>
          </div>
          <div className="stat-item">
            <span className="label">ECONOMY</span>
            <span className="value">{player.stats.economy}</span>
          </div>
          <div className="stat-item highlight">
            <span className="label">BASE PRICE</span>
            <span className="value">₹{(player.base_price / 10000000).toFixed(2)} Cr</span>
          </div>
        </div>

        <div className="specialism-box">
          Expertise: <strong>{player.specialism}</strong>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;