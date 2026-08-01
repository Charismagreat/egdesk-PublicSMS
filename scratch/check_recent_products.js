process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable } = require('../egdesk-helpers');

async function checkRecent() {
  try {
    const res = await queryTable('products', { limit: 10, orderBy: 'id', orderDirection: 'DESC' });
    console.log('PRODUCTS LATEST 10:', JSON.stringify(res.rows, null, 2));

    const invRes = await queryTable('inventory_items', { limit: 10, orderBy: 'id', orderDirection: 'DESC' });
    console.log('INVENTORY_ITEMS LATEST 10:', JSON.stringify(invRes.rows, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

checkRecent();
