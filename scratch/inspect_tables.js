const sqlite3 = require('better-sqlite3');
const path = require('path');

try {
  const os = require('os');
  const fs = require('fs');
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
    path.join(appData, 'EGDesk/database/user_data.db'),
    path.join(appData, 'egdesk/database/user_data.db')
  ];
  let dbPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      dbPath = p;
      break;
    }
  }
  if (!dbPath) {
    dbPath = paths[0];
  }

  console.log(`Connecting to database at: ${dbPath}`);
  const db = new sqlite3(dbPath);
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("=== Database Tables ===");
  tables.forEach(t => console.log(`- ${t.name}`));
  
  db.close();
} catch (err) {
  console.error("Error connecting to database:", err);
}
