import re

with open('src/Pages/OrganiserExtraDetails.tsx', 'r') as f:
    content = f.read()

# 1. Update Participant interface
content = content.replace(
    'teamCode?: string;',
    'teamCode?: string;\n  teamName?: string;'
)

# 2. Update emailToTeamMap
content = content.replace(
    'let emailToTeamMap: Record<string, string> = {};',
    'let emailToTeamMap: Record<string, {teamCode: string, teamName: string}> = {};'
)

# 3. Update map population
content = content.replace(
'''             teamSnaps.forEach(doc => {
              const td = doc.data();
              if (td.members) {
                 td.members.forEach((m: string) => {
                   emailToTeamMap[m] = td.teamCode;
                 });
              }
            });''',
'''             teamSnaps.forEach(doc => {
              const td = doc.data();
              if (td.members) {
                 td.members.forEach((m: string) => {
                   emailToTeamMap[m] = { teamCode: td.teamCode, teamName: td.teamName || `Team ${td.teamCode}` };
                 });
              }
            });'''
)

# 4. Update teamCode field in participant data mapping
content = content.replace(
    'teamCode: emailToTeamMap[email] || \'N/A\',',
    'teamCode: emailToTeamMap[email]?.teamCode || \'N/A\',\n                    teamName: emailToTeamMap[email]?.teamName || \'N/A\','
)

# 5. Sort participants by teamName before setting state
content = content.replace(
    'setParticipants(participantData);',
    '''if (isTeam) {
              participantData.sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''));
            }
            setParticipants(participantData);'''
)

# 6. PDF headers
content = content.replace(
    "['Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year', ...(isTeamEvent ? ['Team Code'] : [])]",
    "['Team', 'Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year']"
)

content = content.replace(
'''    const tableData = participants.map(participant => [
      participant.name,
      participant.email,
      participant.phoneNumber,
      participant.uid,
      participant.batch,
      participant.branch,
      participant.division,
      participant.gender,
      participant.year.toString(),
      ...(isTeamEvent ? [participant.teamCode || 'N/A'] : [])
    ]);''',
'''    const tableData = participants.map(participant => {
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
'''
)

# 7. PDF column styles
content = content.replace(
'''        ...(isTeamEvent ? { 9: { cellWidth: 15 } } : {})
      },''',
'''      },'''
)

content = content.replace(
    "head: headers,",
    "head: headers,"
)

# 8. HTML table header
content = content.replace(
'''                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                {isTeamEvent && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Code</th>}''',
'''                {isTeamEvent && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Team</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>'''
)

# 9. HTML table body with rowSpan
content = content.replace(
'''              {participants.length > 0 ? (
                participants.map((participant, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.phoneNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.uid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.batch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.division}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.gender}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.year}</td>
                    {isTeamEvent && <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{participant.teamCode}</td>}
                  </tr>
                ))
              ) : (''',
'''              {participants.length > 0 ? (
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
                    <tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                      {isTeamEvent && isFirstInTeam && (
                        <td rowSpan={teamMembersCount} className="px-6 py-4 whitespace-nowrap align-top border-r border-gray-200 bg-blue-50/30">
                          <div className="font-bold text-[#246d8c]">{participant.teamName}</div>
                          <div className="text-xs text-gray-500 mt-1 font-mono">{participant.teamCode}</div>
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
              ) : ('''
)

with open('src/Pages/OrganiserExtraDetails.tsx', 'w') as f:
    f.write(content)
