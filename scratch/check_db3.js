const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

function getFinanceHubDb() {
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
    targetPath = paths[0];
  }

  return new Database(targetPath);
}

try {
  const db = getFinanceHubDb();
  
  // 1. transactions 테이블 정보
  console.log("--- transactions columns ---");
  console.log(db.prepare("PRAGMA table_info(transactions)").all().map(c => `${c.name} (${c.type})`));
  console.log("Sample:", db.prepare("SELECT * FROM transactions LIMIT 1").get());

  // 2. bank_transactions 테이블 정보
  console.log("--- bank_transactions columns ---");
  console.log(db.prepare("PRAGMA table_info(bank_transactions)").all().map(c => `${c.name} (${c.type})`));
  console.log("Sample:", db.prepare("SELECT * FROM bank_transactions LIMIT 1").get());

  db.close();
} catch (e) {
  console.error("Error:", e);
}
