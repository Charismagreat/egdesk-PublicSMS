const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

function main() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
    path.join(appData, 'EGDesk/database/user_data.db'),
    path.join(appData, 'egdesk/database/user_data.db')
  ];
  
  let dbPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      dbPath = p;
      break;
    }
  }
  
  if (!dbPath) {
    dbPath = paths[0];
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  console.log('DB 경로:', dbPath);
  const db = new Database(dbPath);

  // 테이블 생성 DDL 실행
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_financial_statements (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      company_type TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL,
      fiscal_quarter TEXT NOT NULL DEFAULT 'YR',
      total_assets INTEGER DEFAULT 0,
      total_liabilities INTEGER DEFAULT 0,
      total_equity INTEGER DEFAULT 0,
      revenue INTEGER DEFAULT 0,
      operating_income INTEGER DEFAULT 0,
      net_income INTEGER DEFAULT 0,
      pdf_file_path TEXT,
      parsed_raw_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(company_id, fiscal_year, fiscal_quarter)
    );
  `);

  console.log('crm_financial_statements 테이블 생성 또는 확인 완료!');

  // 테이블 컬럼 목록 확인
  const colInfo = db.prepare("PRAGMA table_info(crm_financial_statements);").all();
  console.log('생성된 테이블 스키마 정보:');
  console.log(colInfo.map(c => `${c.name} (${c.type})`));

  db.close();
}

main();
