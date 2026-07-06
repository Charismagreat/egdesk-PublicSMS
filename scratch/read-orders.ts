import { queryTable } from '../egdesk-helpers';

async function readOrders() {
  try {
    const res = await queryTable('crm_orders', { limit: 10 });
    console.log('=== [DB 조회] crm_orders ===');
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('에러:', err.message);
  }
}

readOrders();
