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
    
    // card_transactions 테이블 행 수 및 날짜 분포 조회
    try {
      const totalCount = db.prepare(`SELECT COUNT(*) as cnt FROM card_transactions`).get().cnt;
      console.log(`Total count in card_transactions: ${totalCount}`);
      
      const sample = db.prepare(`SELECT id, card_company_id, card_number, approval_date, merchant_name, amount FROM card_transactions LIMIT 5`).all();
      console.log(`Sample card transactions:`, JSON.stringify(sample, null, 2));

      // 날짜 범위 확인
      const minMax = db.prepare(`SELECT MIN(approval_date) as minDate, MAX(approval_date) as maxDate FROM card_transactions`).get();
      console.log(`Date range in DB:`, minMax);
    } catch (e) {
      console.log(`Error:`, e.message);
    }
    
    db.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
