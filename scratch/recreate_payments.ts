import { deleteTable } from '../egdesk-helpers';
import { setupDatabase } from '../src/lib/setup-db';

async function recreatePaymentsTable() {
  console.log('=== [DB 복구] crm_payments 테이블 삭제 및 재생성 시작 ===');
  try {
    console.log('- 기존 crm_payments 테이블 삭제 시도...');
    await deleteTable('crm_payments');
    console.log(' - crm_payments 삭제 완료.');

    console.log('- setupDatabase() 호출하여 crm_payments 테이블 재생성...');
    await setupDatabase();
    console.log(' - crm_payments 재생성 완료.');
  } catch (err: any) {
    console.error('실패:', err.message);
  }
}

recreatePaymentsTable();
