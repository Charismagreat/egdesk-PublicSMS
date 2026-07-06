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
    
    // 테이블 목록 전체 조회
    const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log("실제 존재하는 전체 테이블 목록:", allTables);

    if (allTables.includes('accounts')) {
      const sqlAcc = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'").get();
      console.log("\n=== accounts 스키마 DDL ===");
      console.log(sqlAcc.sql);
    }
    
    if (allTables.includes('banks')) {
      const sqlBank = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='banks'").get();
      console.log("\n=== banks 스키마 DDL ===");
      console.log(sqlBank.sql);
    }
    
    db.close();
  } catch (err) {
    console.error("실패:", err.message);
  }
}

checkSchema();
