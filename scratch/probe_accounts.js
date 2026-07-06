const Database = require("better-sqlite3");
const os = require("os");
const path = require("path");
const fs = require("fs");

async function probe() {
  console.log("--- SQLite 로컬 DB card_transactions 데이터 조회 ---");
  try {
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
    if (targetPath) {
      const db = new Database(targetPath);
      const count = db.prepare("SELECT count(*) as cnt FROM card_transactions").get();
      console.log(`총 카드 승인 내역 수: ${count.cnt}`);
      
      if (count.cnt > 0) {
        const txs = db.prepare("SELECT * FROM card_transactions LIMIT 5").all();
        console.log(JSON.stringify(txs, null, 2));
      }
      db.close();
    } else {
      console.log("DB 파일을 찾을 수 없습니다.");
    }
  } catch (e) {
    console.error("SQLite 조회 실패:", e.message);
  }
}

probe();
