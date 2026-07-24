import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, setDoc } from 'firebase/firestore';
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
  isEmptySlot?: boolean;
}

const OrganiserExtraDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(Infinity);
  const [minTeamSize, setMinTeamSize] = useState(2);
  const navigate = useNavigate();

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

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
          setMaxParticipants(eventData.num_of_participants ? parseInt(eventData.num_of_participants.toString()) : Infinity);
          setMinTeamSize(eventData.minTeamSize ? parseInt(eventData.minTeamSize.toString()) : 2);
          
          let emailToTeamMap: Record<string, {teamCode: string, teamName: string, intendedSize: number, members: string[]}> = {};
          let teamDetails: Record<string, {teamCode: string, teamName: string, intendedSize: number, members: string[], leaderEmail: string}> = {};

          if (isTeam) {
            const teamsRef = collection(db, 'event', id, 'teams');
            const teamSnaps = await getDocs(teamsRef);
            teamSnaps.forEach(doc => {
              const td = doc.data();
              teamDetails[td.teamCode] = {
                 teamCode: td.teamCode,
                 teamName: td.teamName || `Team ${td.teamCode}`,
                 intendedSize: td.intendedSize || 2,
                 members: td.members || [],
                 leaderEmail: td.leaderEmail
              };
              if (td.members) {
                 td.members.forEach((m: string) => {
                   emailToTeamMap[m] = { teamCode: td.teamCode, teamName: td.teamName || `Team ${td.teamCode}`, intendedSize: td.intendedSize || 2, members: td.members || [] };
                 });
              }
            });
          }
          
          const participantEmails = eventData.Participants || [];
          let participantData: Participant[] = [];
          
          if (participantEmails.length > 0) {
            const usersCollection = collection(db, 'users');
            const participantPromises = participantEmails.map(async (email: string) => {
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
            
            participantData = await Promise.all(participantPromises);
          }

          if (isTeam) {
            Object.values(teamDetails).forEach(team => {
              const currentMembersCount = team.members.length;
              const emptySlotsCount = Math.max(0, team.intendedSize - currentMembersCount);
              for (let i = 0; i < emptySlotsCount; i++) {
                 participantData.push({
                   email: `empty-${team.teamCode}-${i}`,
                   name: 'Empty Slot',
                   phoneNumber: '-',
                   uid: '-',
                   batch: '-',
                   branch: '-',
                   division: '-',
                   gender: '-',
                   year: 0,
                   teamCode: team.teamCode,
                   teamName: team.teamName,
                   isEmptySlot: true,
                 });
              }
            });
            
            participantData.sort((a, b) => {
               const tA = a.teamName || '';
               const tB = b.teamName || '';
               if (tA === tB) {
                  if (a.isEmptySlot && !b.isEmptySlot) return 1;
                  if (!a.isEmptySlot && b.isEmptySlot) return -1;
                  return 0;
               }
               return tA.localeCompare(tB);
            });
          }
          
          setParticipants(participantData);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [id, refreshKey]);

  const verifyAuthCode = async (code: string) => {
    try {
      const q = query(collection(db, 'users'), where('authCode', '==', code));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const expiry = userData.authCodeExpiry?.toDate();
      if (!expiry || expiry < new Date()) {
        return null; // expired
      }
      return { email: userData.email || userDoc.id, uid: userData.uid, name: userData.name };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleAddParticipant = async () => {
    const code = prompt("Enter the 6-digit authorization code from the student:");
    if (!code) return;
    
    setLoading(true);
    const student = await verifyAuthCode(code);
    if (!student) {
      alert("Invalid or expired authorization code.");
      setLoading(false);
      return;
    }
    
    if (participants.some(p => p.email === student.email)) {
      alert("Student is already registered for this event.");
      setLoading(false);
      return;
    }
    
    try {
      const eventRef = doc(db, 'event', id as string);
      await updateDoc(eventRef, {
        Participants: arrayUnion(student.email)
      });
      alert(`Successfully added ${student.name} to the event!`);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert("Error adding participant.");
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (participants.filter(p => !p.isEmptySlot).length >= maxParticipants) {
      alert("Event is full. Cannot add more teams.");
      return;
    }

    const teamName = prompt("Enter the new Team Name:");
    if (!teamName) return;

    const leaderCode = prompt("Enter the Team Leader's 6-digit authorization code:");
    if (!leaderCode) return;

    setLoading(true);
    const leader = await verifyAuthCode(leaderCode);
    if (!leader) {
      alert("Invalid or expired authorization code for the Team Leader.");
      setLoading(false);
      return;
    }

    if (participants.some(p => p.email === leader.email)) {
      alert("Team Leader is already registered for this event.");
      setLoading(false);
      return;
    }

    const newTeamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const members = [leader.email];
    
    // Loop for adding more members
    while (true) {
      if (participants.filter(p => !p.isEmptySlot).length + members.length >= maxParticipants) {
        alert("Reached maximum event capacity.");
        break;
      }

      const memberCode = prompt(`Team so far: ${members.length} members.\nEnter the next member's 6-digit auth code (or leave blank to finish and create team):`);
      if (!memberCode) break;

      const member = await verifyAuthCode(memberCode);
      if (!member) {
        alert("Invalid or expired authorization code. Try again.");
        continue;
      }

      if (participants.some(p => p.email === member.email) || members.includes(member.email)) {
        alert("This student is already registered for this event or already in the current team.");
        continue;
      }

      members.push(member.email);
    }

    try {
      const teamRef = doc(db, 'event', id as string, 'teams', newTeamCode);
      await setDoc(teamRef, {
         teamCode: newTeamCode,
         teamName: teamName,
         intendedSize: Math.max(minTeamSize, members.length),
         members: members,
         leaderEmail: leader.email,
         status: 'registered'
      });

      const eventRef = doc(db, 'event', id as string);
      for (const m of members) {
          await updateDoc(eventRef, {
              Participants: arrayUnion(m)
          });
      }

      alert(`Successfully created team ${teamName} with ${members.length} members!`);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert("Error creating team.");
      setLoading(false);
    }
  };

  const handleAddTeamMember = async (teamCode: string) => {
    const code = prompt(`Enter the 6-digit authorization code from the student to add them to team ${teamCode}:`);
    if (!code) return;
    
    setLoading(true);
    const student = await verifyAuthCode(code);
    if (!student) {
      alert("Invalid or expired authorization code.");
      setLoading(false);
      return;
    }
    
    if (participants.some(p => p.email === student.email)) {
      alert("Student is already registered for this event.");
      setLoading(false);
      return;
    }
    
    try {
      const teamRef = doc(db, 'event', id as string, 'teams', teamCode);
      await updateDoc(teamRef, {
        members: arrayUnion(student.email)
      });
      const eventRef = doc(db, 'event', id as string);
      await updateDoc(eventRef, {
        Participants: arrayUnion(student.email)
      });
      alert(`Successfully added ${student.name} to the team!`);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert("Error adding team member.");
      setLoading(false);
    }
  };

  const handleDeleteParticipant = async (email: string, teamCode?: string) => {
    const code = prompt(`Enter the authorization code for ${email} to confirm deletion:`);
    if (!code) return;
    
    setLoading(true);
    const student = await verifyAuthCode(code);
    if (!student || student.email !== email) {
      alert("Invalid or expired authorization code, or the code does not belong to this student.");
      setLoading(false);
      return;
    }
    
    try {
      if (teamCode && teamCode !== 'N/A') {
        const teamRef = doc(db, 'event', id as string, 'teams', teamCode);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
           const td = teamSnap.data();
           let newMembers = (td.members || []).filter((m: string) => m !== email);
           
           if (newMembers.length === 0) {
              // Delete team if empty
              await deleteDoc(teamRef);
           } else {
              let updatePayload: any = { members: arrayRemove(email) };
              if (td.leaderEmail === email) {
                 updatePayload.leaderEmail = newMembers[0]; // Reassign leader
              }
              await updateDoc(teamRef, updatePayload);
           }
        }
      }
      
      const eventRef = doc(db, 'event', id as string);
      await updateDoc(eventRef, {
        Participants: arrayRemove(email)
      });
      
      alert(`Successfully removed ${email} from the event!`);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert("Error removing participant.");
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamCode: string, leaderEmail?: string) => {
    const code = prompt(`To delete this entire team, enter the authorization code for the Team Leader (${leaderEmail || 'Unknown'}):`);
    if (!code) return;
    
    setLoading(true);
    const student = await verifyAuthCode(code);
    if (!student || (leaderEmail && student.email !== leaderEmail)) {
      alert("Invalid or expired authorization code, or the code does not belong to the Team Leader.");
      setLoading(false);
      return;
    }
    
    try {
      const teamRef = doc(db, 'event', id as string, 'teams', teamCode);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
         const td = teamSnap.data();
         const eventRef = doc(db, 'event', id as string);
         for (const m of (td.members || [])) {
            await updateDoc(eventRef, {
              Participants: arrayRemove(m)
            });
         }
         await deleteDoc(teamRef);
      }
      alert(`Successfully deleted team ${teamCode}!`);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert("Error deleting team.");
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add event title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`${eventName} - Participant List`, 14, 20);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Add participant count
    doc.text(`Total Participants: ${participants.length}`, 14, 35);
    
    const tableData = participants.filter(p => !p.isEmptySlot).map(participant => {
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
      if (isTeamEvent) {
        row.unshift(`${participant.teamName} (${participant.teamCode})`);
      }
      return row;
    });
    
    let headers = [['Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year']];
    if (isTeamEvent) {
      headers = [['Team', 'Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year']];
    }

    
    // Add table using autoTable plugin
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Name
        1: { cellWidth: 30 }, // Email
        2: { cellWidth: 20 }, // Phone
        3: { cellWidth: 15 }, // UID
        4: { cellWidth: 15 }, // Batch
        5: { cellWidth: 15 }, // Branch
        6: { cellWidth: 15 }, // Division
        7: { cellWidth: 15 }, // Gender
        8: { cellWidth: 10 }, // Year
      },
      margin: { top: 40 }
    });
    
    // Save the PDF
    doc.save(`${eventName.replace(/[^a-z0-9]/gi, '_')}_participants.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
            {eventName} - Participant Details ({participants.length})
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isTeamEvent ? (
            <button
              onClick={handleAddTeam}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
              title="Manually Add Team"
            >
              <span className="font-bold">+</span>
              <span className="hidden sm:inline">Add New Team</span>
            </button>
          ) : (
            <button
              onClick={handleAddParticipant}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
              title="Manually Add Participant"
            >
              <span className="font-bold">+</span>
              <span className="hidden sm:inline">Add Participant</span>
            </button>
          )}
          <button
            onClick={downloadPDF}
            disabled={participants.filter(p => !p.isEmptySlot).length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${participants.filter(p => !p.isEmptySlot).length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            aria-label="Export participant list to PDF"
            title="Export PDF"
          >
            <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isTeamEvent && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Team</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participants.length > 0 ? (
                participants.map((participant, index) => {
                  let isFirstInTeam = false;
                  let teamMembersCount = 0;
                  
                  if (isTeamEvent) {
                    const prevParticipant = index > 0 ? participants[index - 1] : null;
                    if (!prevParticipant || prevParticipant.teamCode !== participant.teamCode) {
                      isFirstInTeam = true;
                      teamMembersCount = participants.filter(p => p.teamCode === participant.teamCode).length;
                    }
                  }

                  return (
                    <tr key={index} className={`border-b border-gray-100 ${participant.isEmptySlot ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}>
                      {isTeamEvent && isFirstInTeam && (
                        <td rowSpan={teamMembersCount} className="px-6 py-4 whitespace-nowrap align-top border-r border-gray-200 bg-blue-50/30">
                          <div className="flex flex-col justify-between h-full min-h-[40px]">
                            <div>
                              <div className="font-bold text-[#246d8c]">{participant.teamName}</div>
                              <div className="text-xs text-gray-500 mt-1 font-mono">{participant.teamCode}</div>
                            </div>
                            {participant.teamCode && participant.teamCode !== 'N/A' && (
                              <button 
                                onClick={() => handleDeleteTeam(participant.teamCode as string)} 
                                className="text-red-500 hover:text-red-700 text-xs font-semibold mt-2 text-left transition-colors"
                              >
                                Delete Team
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {participant.isEmptySlot ? (
                        <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                          <div className="flex items-center justify-between w-full">
                            <span>Empty Slot</span>
                            <button 
                              onClick={() => handleAddTeamMember(participant.teamCode as string)} 
                              className="text-blue-600 hover:text-blue-800 text-xs font-semibold not-italic px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                            >
                              + Add Member
                            </button>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.phoneNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.uid}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.batch}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.branch}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.division}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.gender}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => handleDeleteParticipant(participant.email, participant.teamCode)} 
                              className="text-red-600 hover:text-red-900 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isTeamEvent ? 11 : 10} className="px-6 py-4 text-center text-sm text-gray-500">
                    No participants registered for this event yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrganiserExtraDetails;