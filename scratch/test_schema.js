const { getTableSchema } = require('../egdesk-helpers');

async function check() {
  try {
    const res = await getTableSchema('products');
    console.log('PRODUCTS SCHEMA:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

check();
