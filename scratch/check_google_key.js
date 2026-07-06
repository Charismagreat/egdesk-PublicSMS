const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

const homeDir = os.homedir();
const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
const dbPath = path.join(appData, 'EGDesk/database/user_data.db');

if (!fs.existsSync(dbPath)) {
  console.log("❌ DB 파일을 찾을 수 없습니다:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const row = db.prepare("SELECT value FROM system_settings WHERE key='google_ai_api_key'").get();
  if (row && row.value) {
    console.log("✅ Google AI API Key 존재:", row.value.substring(0, 10) + "...");
  } else {
    console.log("❌ API Key가 DB에 존재하지 않습니다.");
  }
  
  const modelRow = db.prepare("SELECT value FROM system_settings WHERE key='google_ai_model'").get();
  if (modelRow && modelRow.value) {
    console.log("✅ Model:", modelRow.value);
  } else {
    console.log("ℹ️ Model 키가 존재하지 않아 기본 모델이 사용됩니다.");
  }
} catch (err) {
  console.error("❌ DB 쿼리 오류:", err.message);
}

db.close();
