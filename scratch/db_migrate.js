const Database = require("better-sqlite3");
const os = require("os");
const path = require("path");
const fs = require("fs");

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

  if (!targetPath) {
    console.error("❌ 로컬 금융 DB(financehub.db)를 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log(`[Migration] Target DB found: ${targetPath}`);
  const db = new Database(targetPath);

  // 트리거 우회 더미 함수 기동
  try {
    db.function('notify_change_financehub_changed', { varargs: true }, () => null);
  } catch (e) {
    console.log('[Trigger Bypass] skip:', e.message);
  }

  // 1. natural_rules 테이블 생성
  console.log("[Migration] natural_rules 테이블 생성을 시도합니다...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS natural_rules (
      id TEXT PRIMARY KEY,
      natural_text TEXT NOT NULL,
      structured_json TEXT NOT NULL,
      target_category TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);
  console.log("✅ natural_rules 테이블 생성/확인 완료.");

  // 2. card_transactions 테이블에 applied_rule_id 컬럼 추가
  console.log("[Migration] card_transactions 컬럼 확장을 시도합니다...");
  try {
    db.exec("ALTER TABLE card_transactions ADD COLUMN applied_rule_id TEXT;");
    console.log("✅ card_transactions: applied_rule_id 컬럼 추가 완료.");
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log("ℹ️ card_transactions: applied_rule_id 컬럼이 이미 존재합니다.");
    } else {
      throw e;
    }
  }

  // 3. card_transactions 테이블에 applied_rule_text 컬럼 추가
  try {
    db.exec("ALTER TABLE card_transactions ADD COLUMN applied_rule_text TEXT;");
    console.log("✅ card_transactions: applied_rule_text 컬럼 추가 완료.");
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log("ℹ️ card_transactions: applied_rule_text 컬럼이 이미 존재합니다.");
    } else {
      throw e;
    }
  }

  db.close();
  console.log("🎉 SQLite DB 마이그레이션이 완전히 성공했습니다!");

} catch (error) {
  console.error("❌ 마이그레이션 중 오류 발생:", error.message);
  process.exit(1);
}
