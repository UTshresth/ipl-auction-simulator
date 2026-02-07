import React from 'react';
import './SquadReview.css'; // We will create this CSS next

const SquadReview = ({ teamName, submittedSquad }) => {
  // If for some reason squad is missing, show safe fallback
  const squad = submittedSquad || [];

  return (
    <div className="squad-review-container">
      
      {/* 1. HEADER SECTION */}
      <div className="review-header">
        <div className="pulse-icon">⏳</div>
        <div>
           <h2>SQUAD SUBMITTED</h2>
           <p>Waiting for Auctioneer to announce results...</p>
        </div>
      </div>

      {/* 2. TEAM SHEET CARD */}
      <div className="team-sheet">
         <div className="sheet-header">
            <h3>{teamName} PLAYING XI</h3>
            <span>OFFICIAL LINEUP</span>
         </div>

         <div className="sheet-list">
            {squad.map((p, index) => (
               <div key={p.id} className="sheet-row">
                  <div className="sheet-num">{index + 1}</div>
                  <div className="sheet-name">{p.name}</div>
                  <div className="sheet-role">
                     {p.role} {p.country !== "India" && <span className="os-badge">✈️</span>}
                  </div>
                  <div className="sheet-price">₹{(p.soldPrice / 10000000).toFixed(2)} Cr</div>
               </div>
            ))}
         </div>

         <div className="sheet-footer">
            TOTAL SPEND: ₹{(squad.reduce((acc, p) => acc + p.soldPrice, 0) / 10000000).toFixed(2)} Cr
         </div>
      </div>

    </div>
  );
};

export default SquadReview;