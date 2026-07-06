const Database = require('better-sqlite3');
const dbPath = 'c:\\dev\\egdesk-FreeSMS\\crm_data.db'; // 프로젝트 루트 crm_data.db 타격!
const db = new Database(dbPath);

try {
  console.log('=== [Forensic crm_data.db] Listing all tables ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
  console.log(JSON.stringify(tables));
} catch (e) {
  console.error('Forensic failed:', e.message);
}

db.close();
