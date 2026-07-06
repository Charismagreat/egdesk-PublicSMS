const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';

try {
  const db = new Database(dbPath, { verbose: console.log });

  // system_settings 테이블 존재 확인 및 nts_api_key 데이터 삽입/업데이트
  const exists = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='system_settings'").get();
  
  if (exists.count > 0) {
    // 키가 이미 있는지 검사
    const row = db.prepare("SELECT * FROM system_settings WHERE key = 'nts_api_key'").get();
    
    if (row) {
      db.prepare("UPDATE system_settings SET value = ? WHERE key = 'nts_api_key'").run('9ee91ac4e27da339ca4d20274223baff77801e2eb2800bb4f0fad083f9ac8747');
      console.log('✅ SQLite DB: system_settings 내 nts_api_key가 성공적으로 업데이트되었습니다.');
    } else {
      db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run('nts_api_key', '9ee91ac4e27da339ca4d20274223baff77801e2eb2800bb4f0fad083f9ac8747');
      console.log('✅ SQLite DB: system_settings 내 nts_api_key가 성공적으로 신규 적재되었습니다.');
    }
  } else {
    console.log('⚠️ system_settings 테이블이 발견되지 않았습니다. 환경 변수로 검증기를 대체 가동합니다.');
  }

  db.close();
} catch (e) {
  console.error('❌ DB 업데이트 중 오류 발생:', e);
}
