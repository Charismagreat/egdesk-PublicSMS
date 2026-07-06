import { queryTable, executeSQL } from '../egdesk-helpers';

async function readPayments() {
  try {
    console.log('--- 1. queryTable("crm_payments") 결과 ---');
    const qRes = await queryTable('crm_payments', { limit: 5 });
    console.log(JSON.stringify(qRes.rows?.[0] || {}, null, 2));

    console.log('\n--- 2. executeSQL("SELECT * FROM crm_payments") 결과 ---');
    const sqlRes = await executeSQL('SELECT * FROM crm_payments LIMIT 5');
    console.log(JSON.stringify(sqlRes.rows?.[0] || {}, null, 2));
  } catch (err: any) {
    console.error('에러:', err.message);
  }
}

readPayments();
