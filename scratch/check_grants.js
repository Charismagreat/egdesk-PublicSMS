const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

function getDbPath() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
    path.join(appData, 'EGDesk/database/user_data.db'),
    path.join(appData, 'egdesk/database/user_data.db')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

const dbPath = getDbPath();
const db = new Database(dbPath);

console.log("Check for GR-PBLN_000000000123195:");
const targetRow = db.prepare("SELECT * FROM crm_grant_announcements WHERE id = 'GR-PBLN_000000000123195'").get();
console.log(targetRow);

console.log("\nAll IDs in DB (sorted):");
const allIds = db.prepare("SELECT id FROM crm_grant_announcements ORDER BY id DESC").all();
console.log(allIds.map(r => r.id).slice(0, 50));
db.close();
