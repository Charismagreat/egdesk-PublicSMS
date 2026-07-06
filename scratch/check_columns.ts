import { executeSQL } from '../egdesk-helpers';

async function checkColumns() {
  try {
    const res = await executeSQL("PRAGMA table_info(crm_payments)");
    console.log('=== crm_payments columns ===');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err: any) {
    console.error('에러:', err.message);
  }
}

checkColumns();
