process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { updateRows, queryTable } = require('../egdesk-helpers');

async function testUpdate() {
  try {
    console.log('1. updateRows 로 description 에 [BRAND:LG전자] 인코딩하여 수정 시도...');
    const updateRes = await updateRows('products', {
      name: 'WSD-YL970(B)',
      description: '[BRAND:LG전자] 수입'
    }, { filters: { id: 'PROD-1' } });
    console.log('updateRows 결과:', JSON.stringify(updateRes, null, 2));

    console.log('\n2. queryTable 로 반영 결과 검증...');
    const after = await queryTable('products', { filters: { id: 'PROD-1' } });
    console.log('최종 PROD-1 데이터:', JSON.stringify(after.rows, null, 2));
  } catch (err) {
    console.error('오류 발생:', err.message);
  }
}

testUpdate();
