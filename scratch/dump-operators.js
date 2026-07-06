const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

function getDirectDB() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
    path.join(appData, 'EGDesk/database/user_data.db'),
    path.join(appData, 'egdesk/database/user_data.db')
  ];
  
  let targetPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }
  
  if (!targetPath) {
    targetPath = paths[0];
  }

  const normalizedPath = targetPath.replace(/\\/g, '/');
  return new Database(normalizedPath);
}

try {
  const db = getDirectDB();
  
  // 1. 테이블 스키마 확인
  const schema = db.prepare('PRAGMA table_info("crm_operators")').all();
  console.log('--- crm_operators Schema ---');
  console.log(schema);

  // 2. 전체 데이터 조회
  const rows = db.prepare('SELECT * FROM "crm_operators"').all();
  console.log('--- crm_operators Rows ---');
  console.log(rows);
  
  db.close();
} catch (e) {
  console.error('에러 발생:', e.message);
}
