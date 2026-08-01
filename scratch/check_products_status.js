const { queryTable, executeSQL, listTables } = require('../egdesk-helpers');

async function check() {
  try {
    const listRes = await listTables();
    console.log('LIST TABLES:', JSON.stringify(listRes, null, 2));

    const qRes = await queryTable('products', { limit: 100 });
    console.log('QUERY PRODUCTS ROWS COUNT:', qRes.rows ? qRes.rows.length : 0);
    console.log('QUERY PRODUCTS ROWS SAMPLE:', JSON.stringify(qRes.rows ? qRes.rows.slice(0, 5) : [], null, 2));

    const invRes = await queryTable('inventory_items', { limit: 100 });
    console.log('INVENTORY ITEMS COUNT:', invRes.rows ? invRes.rows.length : 0);
  } catch (err) {
    console.error('CHECK ERROR:', err);
  }
}

check();
