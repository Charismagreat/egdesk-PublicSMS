import Database from 'better-sqlite3';

// 로컬 프로젝트 DB 경로 조회 (crm_data.db)
const db = new Database('crm_data.db');

try {
  const rows = db.prepare(`
    SELECT id, folder_id, title, content, file_name, file_size, file_url, created_at, deleted_at 
    FROM crm_task_folder_items 
    ORDER BY id DESC 
    LIMIT 10
  `).all();
  console.log('=== LATEST TASK FOLDER ITEMS FROM LOCAL DB ===');
  console.log(JSON.stringify(rows, null, 2));
} catch (e: any) {
  console.error('Error querying Local DB:', e.message);
} finally {
  db.close();
}
