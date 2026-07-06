const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        getFiles(name, files);
      }
    } else {
      if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js')) {
        files.push(name);
      }
    }
  }
  return files;
}

const allFiles = getFiles(path.join(__dirname, '..', 'src'));
const missingFiles = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('generativelanguage.googleapis.com')) {
    if (!content.includes('fetchGeminiWithFallback') && !content.includes('getGeminiApiKey') && !file.includes('ai-router.ts')) {
      missingFiles.push(file);
    }
  }
}

console.log("True Missing files:", missingFiles);
