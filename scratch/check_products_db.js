const { executeSQL } = require('../egdesk-helpers');

async function check() {
  try {
    const res = await executeSQL('SELECT id, name, brand, category, status, tenant_id FROM products');
    console.log('PRODUCTS ROWS:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

check();
