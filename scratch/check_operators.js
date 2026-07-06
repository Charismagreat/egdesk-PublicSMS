const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

const homeDir = os.homedir();
const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
const dbPath = path.join(appData, 'EGDesk/database/user_data.db');

if (!fs.existsSync(dbPath)) {
  console.log("❌ DB 파일을 찾을 수 없습니다.");
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const rows = db.prepare("SELECT id, username, name, role FROM crm_operators").all();
  console.log("👥 등록된 운영자 계정 목록:");
  console.log(JSON.stringify(rows, null, 2));
} catch (err) {
  console.error("❌ DB 조회 오류:", err.message);
}

db.close();
