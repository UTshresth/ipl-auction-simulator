import React, { useState } from 'react';

const AdminDashboard = ({ connectedTeams, submittedTeams, teamLogos, onGenerateReport }) => {
  // Local state to track which team's squad we are currently viewing
  const [viewingSubmission, setViewingSubmission] = useState(null);

  // Filter out ADMIN from connected list
  const teams = connectedTeams.filter(t => t !== "ADMIN");

  return (
    <div style={{background:'#111', minHeight:'100vh', padding:'40px', color:'white', textAlign:'center'}}>
      <h1 style={{color:'#d4af37'}}>👮‍♂️ AUCTION CONTROL ROOM</h1>
      <h3 style={{color:'#888'}}>Click on a team to view their submitted XI</h3>

      {/* GRID OF TEAMS */}
      <div style={{
          display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'20px', 
          maxWidth:'1000px', margin:'40px auto'
      }}>
        {teams.map(teamName => {
          // Find the actual submission object for this team
          const submission = submittedTeams.find(s => s.teamName === teamName);
          const isSubmitted = !!submission;

          return (
            <div 
              key={teamName} 
              onClick={() => isSubmitted && setViewingSubmission(submission)}
              style={{
                background: '#1a1a1a', padding:'20px', borderRadius:'10px',
                border: isSubmitted ? '2px solid #28a745' : '2px solid #dc3545',
                opacity: isSubmitted ? 1 : 0.6,
                cursor: isSubmitted ? 'pointer' : 'default', // clickable only if submitted
                transition: 'transform 0.2s',
                transform: isSubmitted ? 'scale(1.02)' : 'scale(1)'
            }}>
              <img src={teamLogos[teamName]} alt={teamName} style={{width:'60px', height:'60px', objectFit:'contain'}} />
              <div style={{marginTop:'10px', fontWeight:'bold'}}>{teamName}</div>
              
              <div style={{color: isSubmitted ? '#28a745' : '#dc3545', fontSize:'0.8rem', marginTop:'5px'}}>
                {isSubmitted ? "✅ VIEW SQUAD" : "⏳ PENDING"}
              </div>
            </div>
          );
        })}
      </div>

      {/* SQUAD DETAILS MODAL (POPUP) */}
      {viewingSubmission && (
        <div style={{
           position:'fixed', top:0, left:0, width:'100%', height:'100%',
           background:'rgba(0,0,0,0.9)', display:'flex', justifyContent:'center', alignItems:'center',
           zIndex: 1000
        }}>
           <div style={{
              background:'#222', padding:'30px', borderRadius:'15px', width:'500px', 
              border:'1px solid #d4af37', boxShadow:'0 0 20px rgba(212, 175, 55, 0.3)'
           }}>
              <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px', borderBottom:'1px solid #444', paddingBottom:'10px'}}>
                 <img src={teamLogos[viewingSubmission.teamName]} alt="" style={{height:'50px'}}/>
                 <h2 style={{margin:0, color:'white'}}>{viewingSubmission.teamName} FINAL XI</h2>
              </div>

              {/* LIST OF PLAYERS */}
              <div style={{maxHeight:'400px', overflowY:'auto', textAlign:'left'}}>
                 {viewingSubmission.squad.map((p, index) => (
                    <div key={index} style={{
                       display:'flex', justifyContent:'space-between', padding:'10px', 
                       background: index % 2 === 0 ? '#1a1a1a' : '#252525',
                       marginBottom:'5px', borderRadius:'4px'
                    }}>
                       <span style={{fontWeight:'bold', color: p.country !== "India" ? '#4da6ff' : '#eee'}}>
                         {p.name} {p.country !== "India" && "✈️"}
                       </span>
                       <span style={{fontSize:'0.8rem', color:'#888', background:'#111', padding:'2px 8px', borderRadius:'4px'}}>
                         {p.role}
                       </span>
                    </div>
                 ))}
              </div>

              <button 
                onClick={() => setViewingSubmission(null)}
                style={{
                  marginTop:'20px', width:'100%', padding:'10px', 
                  background:'#333', color:'white', border:'none', 
                  cursor:'pointer', fontWeight:'bold', borderRadius:'5px'
                }}
              >
                CLOSE
              </button>
           </div>
        </div>
      )}

      {/* GENERATE REPORT BUTTON */}
      {submittedTeams.length === teams.length && (
        <button 
          onClick={onGenerateReport}
          style={{
            background:'#d4af37', border:'none', padding:'15px 40px', 
            fontSize:'1.2rem', fontWeight:'bold', cursor:'pointer', borderRadius:'8px', marginTop:'20px'
          }}
        >
          GENERATE FINAL REPORT 📄
        </button>
      )}
    </div>
  );
};

export default AdminDashboard;