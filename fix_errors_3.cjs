const fs = require('fs');

let content = fs.readFileSync('src/Pages/EventCreation.tsx', 'utf8');

// There are two handleLogoChange. The first one is the unused one with multiple file support.
// The second one is the active one.
// Let's replace the first one with nothing.
const target = `  // @ts-ignore
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).filter(file => file.size <= 5 * 1024 * 1024);
      if (newFiles.length < event.target.files.length) {
        alert("Some files were rejected because they exceed the 5MB limit.");
      }
      setLogoFiles(prev => [...prev, ...newFiles]);
    }
  };

  // @ts-ignore
  const removeLogoAt = (index: number) => {
    setLogoFiles(prev => prev.filter((_, i) => i !== index));
  };
`;

content = content.replace(target, "");

fs.writeFileSync('src/Pages/EventCreation.tsx', content);
