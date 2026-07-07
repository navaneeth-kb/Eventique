const fs = require('fs');

let content = fs.readFileSync('src/Pages/EventCreation.tsx', 'utf8');

// Undo the block comment and use ts-ignore
content = content.replace(
  "  /*\n  const handleLogoChange",
  "  // @ts-ignore\n  const handleLogoChange"
);

content = content.replace(
  "  const removeLogoAt = (index: number) => {",
  "  // @ts-ignore\n  const removeLogoAt = (index: number) => {"
);

content = content.replace(
  "  };\n  */",
  "  };"
);

fs.writeFileSync('src/Pages/EventCreation.tsx', content);
