const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

function checkCrmDb() {
  const dbPath = path.join(process.cwd(), "crm_data.db");
  if (!fs.existsSync(dbPath)) {
    console.log("❌ crm_data.db 파일이 루트에 없습니다.");
    return;
  }

  console.log(`🔍 crm_data.db 분석 중... (${dbPath})`);
  try {
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log("현재 crm_data.db 테이블 목록:", tables);
    
    // 혹시 crm_data.db 내에도 bank_accounts, accounts, 또는 finance_accounts 등의 테이블이 존재하는지 확인
    const targetTables = ['bank_accounts', 'accounts', 'finance_accounts', 'bank_transactions', 'transactions'];
    for (const t of targetTables) {
      if (tables.includes(t)) {
        const rows = db.prepare(`SELECT * FROM ${t}`).all();
        console.log(`📋 [${t}] 테이블 내용 (${rows.length}개):`, rows);
      }
    }
    
    db.close();
  } catch (err) {
    console.error("❌ crm_data.db 조회 실패:", err.message);
  }
}

checkCrmDb();
