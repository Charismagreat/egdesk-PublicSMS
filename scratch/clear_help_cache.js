const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

const homeDir = os.homedir();
const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
const paths = [
  path.join(appData, 'EGDesk/database/user_data.db'),
  path.join(appData, 'egdesk/database/user_data.db')
];

let targetPath = '';
for (const p of paths) {
  if (fs.existsSync(p)) {
    targetPath = p;
    break;
  }
}
if (!targetPath) {
  targetPath = paths[0];
}

const normalizedPath = targetPath.replace(/\\/g, '/');
console.log('Connecting to database at:', normalizedPath);

try {
  const db = new Database(normalizedPath);
  db.exec("DELETE FROM ai_contextual_help;");
  console.log('Successfully cleared ai_contextual_help table cache!');
  db.close();
} catch (e) {
  console.error('Error clearing table:', e.message);
}
