const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

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
  console.log("❌ DB 파일을 찾을 수 없습니다.");
  process.exit(1);
}

const db = new Database(targetPath);

const tables = ['rnd_centers', 'rnd_staffs', 'rnd_spaces', 'rnd_logs', 'rnd_compliance_alarms'];

console.log("📊 RND 테이블 데이터 검증:");
for (const table of tables) {
  try {
    const count = db.prepare(`SELECT count(*) as cnt FROM ${table}`).get().cnt;
    console.log(`- ${table}: ${count} 개의 행 존재`);
    
    // 첫번째 행의 내용을 간단히 출력
    const firstRow = db.prepare(`SELECT * FROM ${table} LIMIT 1`).get();
    console.log(`  샘플 데이터:`, JSON.stringify(firstRow, null, 2));
  } catch (err) {
    console.error(`- ${table} 조회 실패:`, err.message);
  }
}

db.close();
