const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';

try {
  const db = new Database(dbPath);
  console.log("=== COLUMNS CHECK ===");
  ['crm_deliveries', 'crm_customers', 'coupons'].forEach(table => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    console.log(`\nTable: ${table}`);
    columns.forEach(c => console.log(`  - ${c.name} (${c.type})`));
  });
  db.close();
} catch (e) {
  console.error("Error:", e.message);
}
