const { queryTable, updateRows } = require('../egdesk-helpers');

async function testUpdate() {
  try {
    const listRes = await queryTable('products', { limit: 5 });
    console.log('QUERY PRODUCTS:', JSON.stringify(listRes.rows, null, 2));

    if (listRes.rows && listRes.rows.length > 0) {
      const firstId = listRes.rows[0].id;
      console.log(`Updating first product (id: ${firstId}) brand to '삼성전자'...`);
      const updateRes = await updateRows('products', { brand: '삼성전자' }, { filters: { id: String(firstId) } });
      console.log('UPDATE RES:', updateRes);

      const afterRes = await queryTable('products', { filters: { id: String(firstId) } });
      console.log('AFTER UPDATE PRODUCT:', JSON.stringify(afterRes.rows, null, 2));
    }
  } catch (err) {
    console.error('TEST ERROR:', err);
  }
}

testUpdate();
