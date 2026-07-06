// 📂 SQLite 데이터베이스에 system_shared_views 테이블을 생성하는 스크립트
const Database = require('better-sqlite3');
const path = require('path');

// 💾 AppData 경로의 user_data.db 인스턴스 획득
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';

console.log('데이터베이스 연결 중:', dbPath);

let db;
try {
  db = new Database(dbPath, { verbose: console.log });

  // system_shared_views 테이블 생성 쿼리 실행
  db.prepare(`
    CREATE TABLE IF NOT EXISTS system_shared_views (
        view_id TEXT PRIMARY KEY,
        share_hash TEXT UNIQUE NOT NULL,
        source_table TEXT NOT NULL,
        friendly_table_name TEXT NOT NULL,
        column_mappings TEXT NOT NULL,
        default_sort_column TEXT,
        default_sort_direction TEXT DEFAULT 'DESC',
        allow_csv_download INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  console.log('✅ system_shared_views 테이블이 성공적으로 생성 또는 확인되었습니다.');
  
  // 테이블이 정상적으로 들어갔는지 pragma table_info 확인
  const columns = db.prepare('PRAGMA table_info(system_shared_views);').all();
  console.log('테이블 컬럼 정보:', columns);
  
} catch (error) {
  console.error('❌ 데이터베이스 마이그레이션 중 에러 발생:', error);
} finally {
  if (db) {
    db.close();
    console.log('데이터베이스 연결이 정상적으로 해제되었습니다.');
  }
}
