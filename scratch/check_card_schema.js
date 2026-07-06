const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

async function main() {
  try {
    const homeDir = os.homedir();
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
    const dbPath = path.join(appData, 'EGDesk/database/financehub.db');
    
    console.log("Connecting to:", dbPath);
    const db = new Database(dbPath);
    
    // card_transactions 테이블 존재 확인 및 스키마 정보 조회
    try {
      const info = db.prepare(`PRAGMA table_info(card_transactions)`).all();
      console.log(`=== Schema of card_transactions ===`);
      console.log(JSON.stringify(info, null, 2));
    } catch (e) {
      console.log(`Failed to read schema of card_transactions:`, e.message);
    }
    
    db.close();
  } catch (err) {
    console.error("Error reading schema:", err);
  }
}

main();
