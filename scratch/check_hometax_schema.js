const Database = require("better-sqlite3");
const os = require("os");
const path = require("path");
const fs = require("fs");

function checkSchema() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, "AppData/Roaming");
  const paths = [
    path.join(appData, "EGDesk/database/financehub.db"),
    path.join(appData, "egdesk/database/financehub.db")
  ];

  let targetPath = "";
  for (const p of paths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  if (!targetPath) {
    console.log("❌ DB 발견 안됨");
    return;
  }

  try {
    const db = new Database(targetPath);
    
    for (const tableName of ['tax_invoices', 'tax_exempt_invoices', 'cash_receipts']) {
      if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName)) {
        const sqlAcc = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        console.log(`\n=== ${tableName} 스키마 DDL ===`);
        console.log(sqlAcc.sql);

        const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
        console.log(`\n=== ${tableName} table_info ===`);
        console.log(JSON.stringify(info, null, 2));
      } else {
        console.log(`❌ ${tableName} 테이블 없음`);
      }
    }
    
    db.close();
  } catch (err) {
    console.error("실패:", err.message);
  }
}

checkSchema();
