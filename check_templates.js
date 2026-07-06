const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

function getDirectDB() {
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
  return new Database(normalizedPath);
}

try {
  const db = getDirectDB();
  const rows = db.prepare("SELECT id, template_name, deleted_at, is_active FROM crm_web_templates").all();
  console.log("=== REAL TEMPLATES LIST ===");
  console.log(rows);
} catch (err) {
  console.error("Error reading database:", err);
}
