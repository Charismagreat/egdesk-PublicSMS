const Database = require("better-sqlite3");
const os = require("os");
const path = require("path");
const fs = require("fs");

function migrate() {
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
    console.log("Connected to database for migration:", targetPath);

    const tables = ['tax_invoices', 'tax_exempt_invoices', 'cash_receipts'];
    for (const tableName of tables) {
      // 컬럼 목록 조회
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map(c => c.name);
      
      if (!columns.includes('memo')) {
        console.log(`[Migration] Adding 'memo' column to ${tableName}...`);
        db.prepare(`ALTER TABLE ${tableName} ADD COLUMN memo TEXT`).run();
        console.log(`[Migration] Successfully added 'memo' column to ${tableName}.`);
      } else {
        console.log(`[Migration] 'memo' column already exists in ${tableName}.`);
      }
    }
    
    db.close();
    console.log("✅ Migration process completed successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  }
}

migrate();
