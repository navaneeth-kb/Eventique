import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import { db } from '../../firebaseConfig';

interface Participant {
  email: string;
  name: string;
  phoneNumber: string;
  uid: string;
  batch: string;
  branch: string;
  division: string;
  gender: string;
  year: number;
  teamCode?: string;
  teamName?: string;
}

const OrganiserAttendanceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!id) return;
      
      try {
        const eventRef = doc(db, 'event', id);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
          const eventData = eventSnap.data();
          setEventName(eventData.name || 'Event');
          
          const isTeam = eventData.isTeamEvent || false;
          setIsTeamEvent(isTeam);
          
          let emailToTeamMap: Record<string, {teamCode: string, teamName: string}> = {};
          if (isTeam) {
            const teamsRef = collection(db, 'event', id, 'teams');
            const teamSnaps = await getDocs(teamsRef);
            teamSnaps.forEach(doc => {
              const td = doc.data();
              if (td.members) {
                 td.members.forEach((m: string) => {
                   emailToTeamMap[m] = { teamCode: td.teamCode, teamName: td.teamName || `Team ${td.teamCode}` };
                 });
              }
            });
          }
          
          const attendees = eventData.attendees || [];
          const attendeeEmails = attendees.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean);
          
          if (attendeeEmails.length > 0) {
            const usersCollection = collection(db, 'users');
            const participantPromises = attendeeEmails.map(async (email: string) => {
              try {
                const q = query(usersCollection, where("email", "==", email));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                  const userDoc = querySnapshot.docs[0];
                  const userData = userDoc.data();
                  return {
                    email,
                    name: userData.name || 'N/A',
                    phoneNumber: userData.phoneNumber || 'N/A',
                    uid: userData.uid || 'N/A',
                    batch: userData.batch || 'N/A',
                    branch: userData.branch || 'N/A',
                    division: userData.division || 'N/A',
                    gender: userData.gender || 'N/A',
                    year: userData.year || 0,
                    teamCode: emailToTeamMap[email]?.teamCode || 'N/A',
                    teamName: emailToTeamMap[email]?.teamName || 'N/A',
                  };
                } else {
                  return {
                    email,
                    name: 'User not found',
                    phoneNumber: 'N/A',
                    uid: 'N/A',
                    batch: 'N/A',
                    branch: 'N/A',
                    division: 'N/A',
                    gender: 'N/A',
                    year: 0,
                    teamCode: emailToTeamMap[email]?.teamCode || 'N/A',
                    teamName: emailToTeamMap[email]?.teamName || 'N/A',
                  };
                }
              } catch (e) {
                console.error("Error fetching profile for", email, e);
                return {
                  email,
                  name: 'Profile hidden',
                  phoneNumber: 'N/A',
                  uid: 'N/A',
                  batch: 'N/A',
                  branch: 'N/A',
                  division: 'N/A',
                  gender: 'N/A',
                  year: 0,
                    teamCode: emailToTeamMap[email]?.teamCode || 'N/A',
                    teamName: emailToTeamMap[email]?.teamName || 'N/A',
                };
              }
            });
            
            const participantData = await Promise.all(participantPromises);
            if (isTeam) {
              participantData.sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''));
            }
            setParticipants(participantData);
          }
        }
      } catch (error) {
        console.error('Error fetching attendees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [id]);

  const downloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Add event title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`${eventName} - Attendance List`, 14, 20);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Add attendee count
    doc.text(`Total Attendees: ${participants.length}`, 14, 35);
    
    const baseHeaders = ['Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year'];

    const generateTableData = (data: Participant[], includeTeam: boolean) => {
      let lastTeamName = "";
      return data.map(participant => {
        const row = [
          participant.name,
          participant.email,
          participant.phoneNumber,
          participant.uid,
          participant.batch,
          participant.branch,
          participant.division,
          participant.gender,
          participant.year.toString()
        ];
        if (includeTeam) {
          const currentTeamName = participant.teamName || "";
          const teamDisplay = currentTeamName === lastTeamName ? "" : currentTeamName;
          lastTeamName = currentTeamName;
          row.unshift(teamDisplay);
        }
        return row;
      });
    };

    let startY = 40;

    if (isTeamEvent) {
      const teamParticipants = participants.filter(p => p.teamCode && p.teamCode !== 'N/A');
      const indParticipants = participants.filter(p => !p.teamCode || p.teamCode === 'N/A');

      if (teamParticipants.length > 0) {
        doc.setFontSize(14);
        doc.text("Team Attendees", 14, startY);
        startY += 5;
        autoTable(doc, {
          head: [['Team', ...baseHeaders]],
          body: generateTableData(teamParticipants, true),
          startY: startY,
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 40 }
        });
        // @ts-ignore
        startY = doc.lastAutoTable.finalY + 15;
      }

      if (indParticipants.length > 0) {
        doc.setFontSize(14);
        doc.text("Individual Attendees", 14, startY);
        startY += 5;
        autoTable(doc, {
          head: [baseHeaders],
          body: generateTableData(indParticipants, false),
          startY: startY,
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 40 }
        });
      }
    } else {
      autoTable(doc, {
        head: [baseHeaders],
        body: generateTableData(participants, false),
        startY: startY,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 40 }
      });
    }
    
    doc.save(`${eventName.replace(/[^a-z0-9]/gi, '_')}_attendance.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderTable = (title: string, data: Participant[], showTeamColumn: boolean) => (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-gray-700 mb-4">{title}</h3>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {showTeamColumn && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Team</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length > 0 ? (
                data.map((participant, index) => {
                  let isFirstInTeam = false;
                  let teamMembersCount = 0;
                  if (showTeamColumn) {
                    const prev = index > 0 ? data[index - 1] : null;
                    if (!prev || prev.teamCode !== participant.teamCode) {
                      isFirstInTeam = true;
                      teamMembersCount = data.filter(p => p.teamCode === participant.teamCode).length;
                    }
                  }
                  return (
                    <tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                      {showTeamColumn && isFirstInTeam && (
                        <td rowSpan={teamMembersCount} className="px-6 py-4 whitespace-nowrap align-top border-r border-gray-200 bg-blue-50/30">
                          <div className="font-bold text-[#246d8c]">{participant.teamName}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.phoneNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.uid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.batch}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.branch}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.division}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.gender}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.year}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={showTeamColumn ? 10 : 9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No attendees in this category yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Go back to previous page"
            title="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" aria-hidden="true" />
            <span className="sr-only">Go back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {eventName} - Attendance Details ({participants.length})
          </h1>
        </div>
        <button
          onClick={downloadPDF}
          disabled={participants.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${participants.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          aria-label="Export attendance list to PDF"
          title="Export PDF"
        >
          <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
          <span>Export PDF</span>
        </button>
      </div>

      {isTeamEvent ? (
        <>
          {renderTable("Team Attendees", participants.filter(p => p.teamCode && p.teamCode !== 'N/A'), true)}
          {renderTable("Individual Attendees", participants.filter(p => !p.teamCode || p.teamCode === 'N/A'), false)}
        </>
      ) : (
        renderTable("All Attendees", participants, false)
      )}
    </div>
  );
};

export default OrganiserAttendanceDetails;