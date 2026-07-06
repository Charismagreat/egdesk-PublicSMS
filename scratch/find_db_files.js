const fs = require('fs');
const path = require('path');
const os = require('os');

function scanDir(dirPath, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  let results = [];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        results = results.concat(scanDir(fullPath, maxDepth, currentDepth + 1));
      } else if (item.name.endsWith('.db') || item.name.includes('sqlite') || item.name.includes('hometax') || item.name.includes('financehub')) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    // 스킵
  }
  return results;
}

async function main() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  
  console.log("Scanning directories for FinanceHub/Hometax database files...");
  
  const searchPaths = [
    path.join(homeDir, '.gemini/antigravity'),
    path.join(appData, 'EGDesk'),
    path.join(appData, 'egdesk'),
    path.join(homeDir, '.egdesk'),
    path.join(__dirname, '..') // 프로젝트 폴더
  ];

  for (const sp of searchPaths) {
    if (fs.existsSync(sp)) {
      console.log(`Scanning path: ${sp}`);
      const found = scanDir(sp, 2);
      if (found.length > 0) {
        console.log(`-> Found files in ${sp}:`);
        found.forEach(f => console.log(`   - ${f}`));
      }
    }
  }
}

main();
