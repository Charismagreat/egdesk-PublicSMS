process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { executeSQL } = require('../egdesk-helpers');

async function getTrueTotal() {
  try {
    const invCountRes = await executeSQL("SELECT COUNT(*) as count FROM inventory_items");
    console.log('REAL TOTAL INVENTORY ITEMS (COUNT):', invCountRes.rows ? invCountRes.rows[0].count : invCountRes);

    const prodCountRes = await executeSQL("SELECT COUNT(*) as count FROM products");
    console.log('REAL TOTAL PRODUCTS (COUNT):', prodCountRes.rows ? prodCountRes.rows[0].count : prodCountRes);
  } catch (err) {
    console.error('COUNT Error:', err.message);
  }
}

getTrueTotal();
