const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const appData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const dbPaths = [
  path.join(appData, 'EGDesk/database/user_data.db'),
  path.join(appData, 'egdesk/database/user_data.db')
];

let db;
for (const p of dbPaths) {
  try {
    db = new Database(p, { fileMustExist: true });
    console.log(`Connected to database at: ${p}`);
    break;
  } catch (e) {
    // continue
  }
}

if (!db) {
  console.error("Could not connect to any database file.");
  process.exit(1);
}

try {
  const rows = db.prepare("SELECT id, title, memo, tags, created_at FROM crm_expenses ORDER BY created_at DESC LIMIT 5").all();
  console.log('Result Rows:', JSON.stringify(rows, null, 2));
} catch (err) {
  console.error('Query execution error:', err.message);
} finally {
  db.close();
}
