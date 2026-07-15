const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
const db = new Database(dbPath);

function main() {
  try {
    const sos = db.prepare('SELECT id, estimate_id, tenant_id, customer_name, created_at FROM crm_sales_orders').all();
    console.log('--- crm_sales_orders ---');
    console.log(JSON.stringify(sos, null, 2));

    const ests = db.prepare('SELECT id, type, tenant_id, partner_name FROM crm_estimates').all();
    console.log('--- crm_estimates ---');
    console.log(JSON.stringify(ests, null, 2));

    const items = db.prepare('SELECT id, estimate_id, tenant_id, product_name, quantity, unit_price FROM crm_estimate_items').all();
    console.log('--- crm_estimate_items ---');
    console.log(JSON.stringify(items, null, 2));
  } catch (err) {
    console.error('에러:', err.message);
  } finally {
    db.close();
  }
}

main();
