const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../crm_data.db');
const db = new Database(dbPath);

try {
  const rows = db.prepare("SELECT id, title, memo, tags, created_at FROM crm_expenses ORDER BY created_at DESC LIMIT 5").all();
  console.log('Result Rows:', JSON.stringify(rows, null, 2));
} catch (err) {
  console.error('Query execution error:', err.message);
} finally {
  db.close();
}
