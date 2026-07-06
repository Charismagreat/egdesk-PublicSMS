const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
const db = new Database(dbPath);

console.log('=== SCHEMA_INFO ===');
const schema = db.prepare('PRAGMA table_info("expense_projects");').all();
console.log(JSON.stringify(schema));

console.log('=== DATA_ROWS ===');
const rows = db.prepare('SELECT * FROM expense_projects;').all();
console.log(JSON.stringify(rows));

db.close();
