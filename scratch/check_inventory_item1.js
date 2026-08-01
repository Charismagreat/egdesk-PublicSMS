process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable } = require('../egdesk-helpers');

async function checkItem1() {
  try {
    const invRes = await queryTable('inventory_items', { limit: 5 });
    console.log('INVENTORY ITEMS TOP 5:', JSON.stringify(invRes.rows, null, 2));

    const prodRes = await queryTable('products', { limit: 5 });
    console.log('PRODUCTS TOP 5:', JSON.stringify(prodRes.rows, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

checkItem1();
