import { deleteTable } from '../egdesk-helpers';
import { setupDatabase } from '../src/lib/setup-db';

async function recreateBoth() {
  console.log('=== [DB 정밀 복구] crm_customers 및 crm_payments 테이블 재생성 ===');
  try {
    console.log('- crm_customers 삭제 중...');
    await deleteTable('crm_customers').catch(() => {});
    
    console.log('- crm_payments 삭제 중...');
    await deleteTable('crm_payments').catch(() => {});

    console.log('- setupDatabase() 호출하여 테이블들 생성...');
    await setupDatabase();
    console.log(' - 테이블 재생성 완료!');
  } catch (err: any) {
    console.error('에러:', err.message);
  }
}

recreateBoth();
