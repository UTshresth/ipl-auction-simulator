import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminDashboard = ({ connectedTeams, submittedTeams, teamLogos }) => {
  // Local state to track which team's squad we are currently viewing
  const [viewingSubmission, setViewingSubmission] = useState(null);

  // Filter out ADMIN from connected list
  const teams = connectedTeams.filter(t => t !== "ADMIN");

  // --- 📄 PDF GENERATION LOGIC ---
  const generatePDF = () => {
    const doc = new jsPDF();

    // 1. TITLE PAGE
    doc.setFillColor(20, 20, 20); // Dark Background
    doc.rect(0, 0, 210, 297, 'F'); // Fill Page
    
    doc.setTextColor(212, 175, 55); // Gold Text
    doc.setFontSize(30);
    doc.setFont("helvetica", "bold");
    doc.text("IPL AUCTION 2026", 105, 120, null, null, "center");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("OFFICIAL FINAL REPORT", 105, 135, null, null, "center");
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 150, null, null, "center");

    // 2. TEAM PAGES
    submittedTeams.forEach((team, index) => {
      doc.addPage();
      
      // Header Background
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, 210, 40, 'F');

      // Team Title
      doc.setTextColor(212, 175, 55); // Gold
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(team.teamName.toUpperCase(), 14, 25);

      // Squad Count
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(`Squad Size: ${team.squad.length} Players`, 14, 35);

      // PREPARE TABLE DATA
      const tableBody = team.squad.map((p, i) => [
        i + 1,
        p.name,
        p.role,
        p.country,
        p.soldPrice ? `Rs. ${(p.soldPrice / 10000000).toFixed(2)} Cr` : "Retained/Base"
      ]);

      // GENERATE TABLE
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Player Name', 'Role', 'Country', 'Price']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
          fillColor: [212, 175, 55], // Gold Header
          textColor: [0, 0, 0],      // Black Text
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 10, cellPadding: 4 }
      });

      // FOOTER STATS (Optional calculation)
      const totalSpent = team.squad.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Total Spent: Rs. ${(totalSpent / 10000000).toFixed(2)} Cr`, 14, doc.lastAutoTable.finalY + 10);
    });

    // 3. SAVE FILE
    doc.save('IPL_Auction_2026_Report.pdf');
  };

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
      {submittedTeams.length > 0 && (
        <button 
          onClick={generatePDF}
          style={{
            background:'#d4af37', border:'none', padding:'15px 40px', color:'black',
            fontSize:'1.2rem', fontWeight:'bold', cursor:'pointer', borderRadius:'8px', marginTop:'20px',
            boxShadow:'0 0 15px rgba(212, 175, 55, 0.5)'
          }}
        >
          📄 GENERATE FINAL REPORT
        </button>
      )}
    </div>
  );
};

export default AdminDashboard;