const fs = require('fs');

let content = fs.readFileSync('src/Pages/OrganiserEventDetail.tsx', 'utf8');

// Restore isGeneratingAttendance
content = content.replace(
  "  // const [isGeneratingAttendance, setIsGeneratingAttendance] = useState(false);",
  "  // @ts-ignore\n  const [isGeneratingAttendance, setIsGeneratingAttendance] = useState(false);"
);

// Ignore generateAttendanceList
content = content.replace(
  "  const generateAttendanceList = async () => {",
  "  // @ts-ignore\n  const generateAttendanceList = async () => {"
);

// Remove stray */
content = content.replace(
  "    } finally {\n      setIsGeneratingAttendance(false);\n    }\n  };\n  */",
  "    } finally {\n      setIsGeneratingAttendance(false);\n    }\n  };"
);

fs.writeFileSync('src/Pages/OrganiserEventDetail.tsx', content);
