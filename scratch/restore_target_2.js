process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { updateRows, queryTable } = require('../egdesk-helpers');

async function restoreTarget2() {
  try {
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    console.log('PROD-1 (WSD-YL970(B)) 및 PROD-2 (WSD-YL970(C)) 복원 중...');
    
    await updateRows('products', {
      status: 'DRAFT',
      deleted_at: null,
      deleted_by: null,
      restored_at: nowStr,
      restored_by: 'system_user_request'
    }, { filters: { id: 'PROD-1' } });

    await updateRows('products', {
      status: 'DRAFT',
      deleted_at: null,
      deleted_by: null,
      restored_at: nowStr,
      restored_by: 'system_user_request'
    }, { filters: { id: 'PROD-2' } });

    console.log('🎉 PROD-1 및 PROD-2 2건이 성공적으로 승인 대기 완제품(DRAFT)으로 복원되었습니다!');
  } catch (err) {
    console.error('ERROR:', err);
  }
}

restoreTarget2();
