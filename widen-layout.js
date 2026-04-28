const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/routes/app.*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // We want to replace the FIRST occurrence of className="mx-auto max-w-Xxl" or similar
  // Or just replace all occurrences of max-w-3xl, max-w-4xl, max-w-5xl, max-w-6xl 
  // ONLY if they are part of a container (like mx-auto)
  
  const original = content;
  content = content.replace(/className="([^"]*)mx-auto\s+max-w-[3456]xl([^"]*)"/g, 'className="$1mx-auto w-full max-w-7xl$2"');
  
  if (original !== content) {
    console.log(`Updated ${file}`);
    fs.writeFileSync(file, content);
  }
});
