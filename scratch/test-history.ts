import { queryTable, executeSQL } from '../egdesk-helpers';

async function testHistory() {
  try {
    const phone = '010-1234-5678';
    
    console.log('--- [1] queryTable crm_orders (no filter) ---');
    const allOrders = await queryTable('crm_orders', { limit: 1 });
    console.log(JSON.stringify(allOrders.rows?.[0] || {}, null, 2));

    console.log('\n--- [2] queryTable crm_orders with customer_phone filter ---');
    const filteredOrders = await queryTable('crm_orders', { filters: { customer_phone: phone } });
    console.log(`건수: ${filteredOrders.rows?.length || 0}`);
    console.log(JSON.stringify(filteredOrders.rows || [], null, 2));

    console.log('\n--- [3] executeSQL select crm_orders with customer_phone ---');
    const sqlOrders = await executeSQL(`SELECT * FROM crm_orders WHERE customer_phone = '${phone}'`);
    console.log(`건수: ${sqlOrders.rows?.length || 0}`);
    console.log(JSON.stringify(sqlOrders.rows || [], null, 2));
  } catch (err: any) {
    console.error('에러:', err.message);
  }
}

testHistory();
