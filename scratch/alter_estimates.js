const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../crm_data.db');
const db = new Database(dbPath);

console.log('Database opened at', dbPath);

try {
  db.exec(`
    ALTER TABLE crm_estimates ADD COLUMN partner_business_number TEXT;
    ALTER TABLE crm_estimates ADD COLUMN partner_address TEXT;
    ALTER TABLE crm_estimates ADD COLUMN partner_representative TEXT;
    ALTER TABLE crm_estimates ADD COLUMN document_number TEXT;
    ALTER TABLE crm_estimates ADD COLUMN document_date TEXT;
    ALTER TABLE crm_estimates ADD COLUMN document_memo TEXT;
  `);
  console.log('Columns added successfully to crm_estimates!');
} catch (err) {
  console.error('Error altering table:', err);
} finally {
  db.close();
}
