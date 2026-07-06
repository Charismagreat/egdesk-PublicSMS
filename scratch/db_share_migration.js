const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';

console.log('🚀 [Dashboard Share Migration] 시작합니다...');
try {
  const db = new Database(dbPath);
  
  // 1. shared_dashboards 물리 테이블 생성 DDL
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_dashboards (
      share_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sql_query TEXT NOT NULL,
      table_name TEXT,
      display_name TEXT,
      chart_spec_json TEXT,
      briefing_markdown TEXT,
      refresh_interval TEXT DEFAULT 'NONE',
      last_refreshed_at TEXT,
      created_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );
  `);
  console.log('✓ shared_dashboards 물리 테이블 생성 완료!');

  // 2. 이지데스크 user_tables 메타데이터 동기화
  const schemaJson = JSON.stringify([
    { name: 'share_id', type: 'TEXT', notNull: true },
    { name: 'title', type: 'TEXT', notNull: true },
    { name: 'sql_query', type: 'TEXT', notNull: true },
    { name: 'table_name', type: 'TEXT' },
    { name: 'display_name', type: 'TEXT' },
    { name: 'chart_spec_json', type: 'TEXT' },
    { name: 'briefing_markdown', type: 'TEXT' },
    { name: 'refresh_interval', type: 'TEXT' },
    { name: 'last_refreshed_at', type: 'TEXT' },
    { name: 'created_at', type: 'TEXT', notNull: true },
    { name: 'is_active', type: 'INTEGER' }
  ]);

  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_tables';").get();
    if (tableCheck) {
      db.prepare(`
        INSERT OR REPLACE INTO user_tables (
          id, table_name, display_name, schema_json, column_count, 
          created_at, updated_at
        )
        VALUES (
          'shared_dashboards', 'shared_dashboards', '공유 대시보드 관리', ?, 11, 
          datetime('now', '+9 hours'), datetime('now', '+9 hours')
        );
      `).run(schemaJson);
      console.log('✓ user_tables 내 shared_dashboards 메타데이터 등록 완료!');
    }
  } catch (metaErr) {
    console.error('⚠️ user_tables 메타데이터 등록 경고:', metaErr.message);
  }

  db.close();
  console.log('🎉 [Dashboard Share Migration] 완료!');
} catch (err) {
  console.error('❌ [Dashboard Share Migration] 실패:', err.message);
}
