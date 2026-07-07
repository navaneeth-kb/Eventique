const fs = require('fs');
let content = fs.readFileSync('src/Pages/OrganiserAttendanceDetails.tsx', 'utf8');

// 1. Add teamCode to Participant interface
content = content.replace(
  "  year: number;\n}",
  "  year: number;\n  teamCode?: string;\n}"
);

// 2. Add isTeamEvent state
content = content.replace(
  "const [eventName, setEventName] = useState('');",
  "const [eventName, setEventName] = useState('');\n  const [isTeamEvent, setIsTeamEvent] = useState(false);"
);

// 3. Update fetchParticipants logic
const fetchLogicTarget = `          const attendees = eventData.attendees || [];
          const attendeeEmails = attendees.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean);
          
          if (attendeeEmails.length > 0) {
            const usersCollection = collection(db, 'users');`;
const fetchLogicReplacement = `          const isTeam = eventData.isTeamEvent || false;
          setIsTeamEvent(isTeam);
          
          let emailToTeamMap: Record<string, string> = {};
          if (isTeam) {
            const teamsRef = collection(db, 'event', id, 'teams');
            const teamSnaps = await getDocs(teamsRef);
            teamSnaps.forEach(doc => {
              const td = doc.data();
              if (td.members) {
                 td.members.forEach((m: string) => {
                   emailToTeamMap[m] = td.teamCode;
                 });
              }
            });
          }
          
          const attendees = eventData.attendees || [];
          const attendeeEmails = attendees.map((a: any) => typeof a === 'string' ? a : a.email).filter(Boolean);
          
          if (attendeeEmails.length > 0) {
            const usersCollection = collection(db, 'users');`;
content = content.replace(fetchLogicTarget, fetchLogicReplacement);

// 4. Update the return map logic (multiple places, need to use regex or split)
content = content.replace(
  /year: userData\.year \|\| 0,/g,
  "year: userData.year || 0,\n                    teamCode: emailToTeamMap[email] || 'N/A',"
);
content = content.replace(
  /year: 0,/g,
  "year: 0,\n                    teamCode: emailToTeamMap[email] || 'N/A',"
);

// 5. Update PDF generation
const pdfHeadersTarget = `    const headers = [
      ['Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year']
    ];`;
const pdfHeadersReplacement = `    const headers = [
      ['Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year', ...(isTeamEvent ? ['Team Code'] : [])]
    ];`;
content = content.replace(pdfHeadersTarget, pdfHeadersReplacement);

const pdfDataTarget = `      participant.gender,
      participant.year.toString()
    ]);`;
const pdfDataReplacement = `      participant.gender,
      participant.year.toString(),
      ...(isTeamEvent ? [participant.teamCode || 'N/A'] : [])
    ]);`;
content = content.replace(pdfDataTarget, pdfDataReplacement);

const columnStylesTarget = `        8: { cellWidth: 10 }  // Year
      },`;
const columnStylesReplacement = `        8: { cellWidth: 10 }, // Year
        ...(isTeamEvent ? { 9: { cellWidth: 15 } } : {})
      },`;
content = content.replace(columnStylesTarget, columnStylesReplacement);

// 6. Update HTML Table
const thTarget = `<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              </tr>`;
const thReplacement = `<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                {isTeamEvent && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Code</th>}
              </tr>`;
content = content.replace(thTarget, thReplacement);

const tdTarget = `<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.year}</td>
                  </tr>`;
const tdReplacement = `<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.year}</td>
                    {isTeamEvent && <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{participant.teamCode}</td>}
                  </tr>`;
content = content.replace(tdTarget, tdReplacement);

const colSpanTarget = `<td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">`;
const colSpanReplacement = `<td colSpan={isTeamEvent ? 10 : 9} className="px-6 py-4 text-center text-sm text-gray-500">`;
content = content.replace(colSpanTarget, colSpanReplacement);

fs.writeFileSync('src/Pages/OrganiserAttendanceDetails.tsx', content);
