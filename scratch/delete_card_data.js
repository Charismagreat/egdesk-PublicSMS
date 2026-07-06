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
    
    // SQLite UDF 바인딩 (트리거 통과용)
    try {
      db.function("notify_change_financehub_changed", { varargs: true }, function(...args) {
        console.log("Trigger notify_change_financehub_changed intercepted:", args);
      });
    } catch (e) {
      console.log("UDF registration warning:", e.message);
    }

    try {
      // card_transactions 테이블 데이터 전체 삭제
      const result = db.prepare(`DELETE FROM card_transactions`).run();
      console.log(`Successfully deleted ${result.changes} rows from card_transactions.`);
    } catch (e) {
      console.log(`Failed to delete card transactions:`, e.message);
    }
    
    db.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
