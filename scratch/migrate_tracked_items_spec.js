const Database = require('better-sqlite3');
const path = require('path');

async function migrate() {
  const dbPath = path.join(__dirname, '../crm_data.db');
  console.log('데이터베이스 연결 중:', dbPath);
  const db = new Database(dbPath);

  try {
    // 1. tracked_items 테이블의 컬럼 정보 조회
    const columns = db.prepare("PRAGMA table_info(tracked_items)").all();
    const hasSpec = columns.some(col => col.name === 'spec');

    if (!hasSpec) {
      console.log('tracked_items 테이블에 spec 컬럼이 없습니다. 컬럼을 추가합니다...');
      db.prepare("ALTER TABLE tracked_items ADD COLUMN spec TEXT").run();
      console.log('spec 컬럼 추가 성공!');
    } else {
      console.log('이미 spec 컬럼이 존재합니다.');
    }
  } catch (err) {
    console.error('마이그레이션 실패:', err.message);
  } finally {
    db.close();
  }
}

migrate();
