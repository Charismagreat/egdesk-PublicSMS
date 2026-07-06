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
    
    // 테이블 목록 조회
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("=== Tables in financehub.db ===");
    console.log(tables.map(t => t.name));

    // 각 테이블 스키마 정보 조회
    for (const tableName of ['tax_invoices', 'tax_exempt_invoices', 'cash_receipts']) {
      try {
        const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
        console.log(`=== Schema of ${tableName} ===`);
        console.log(JSON.stringify(info, null, 2));
      } catch (e) {
        console.log(`Failed to read schema of ${tableName}:`, e.message);
      }
    }
    
    db.close();
  } catch (err) {
    console.error("Error reading schema:", err);
  }
}

main();
