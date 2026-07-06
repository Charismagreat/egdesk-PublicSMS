import { executeSQL } from '../egdesk-helpers';

async function checkOrderId() {
  try {
    const res = await executeSQL("SELECT order_id FROM crm_payments LIMIT 1");
    console.log('결과:', res);
  } catch (err: any) {
    console.error('에러 발생:', err.message);
  }
}

checkOrderId();
