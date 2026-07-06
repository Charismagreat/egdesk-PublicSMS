const Database = require('better-sqlite3');
const db = new Database('crm_data.db');

try {
  const contacts = db.prepare('SELECT * FROM crm_partner_contacts').all();
  console.log('=== crm_partner_contacts ===');
  console.log(contacts);

  const partners = db.prepare('SELECT * FROM crm_partners').all();
  console.log('=== crm_partners ===');
  console.log(partners.map(p => ({ id: p.id, company_name: p.company_name, type: p.type })));
} catch (err) {
  console.error(err);
} finally {
  db.close();
}
