process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { insertRows, updateRows, queryTable } = require('../egdesk-helpers');

async function testCleanTable() {
  try {
    console.log('1. [insertRows] brand: "삼성전자" 포함하여 TEST-101 데이터 신규 추가...');
    const insertRes = await insertRows('products', [{
      id: 'TEST-101',
      name: '삼성 프리미엄 모니터',
      price: '350000',
      brand: '삼성전자',
      category: '스토어용',
      status: 'ACTIVE'
    }]);
    console.log('insertRows 결과:', JSON.stringify(insertRes, null, 2));

    console.log('\n2. [queryTable] TEST-101 데이터 조회...');
    const query1 = await queryTable('products', { filters: { id: 'TEST-101' } });
    console.log('신규 추가 후 데이터:', JSON.stringify(query1.rows, null, 2));

    console.log('\n3. [updateRows] brand: "LG전자" 로 수정 업데이트...');
    const updateRes = await updateRows('products', {
      name: 'LG 울트라 모니터',
      brand: 'LG전자'
    }, { filters: { id: 'TEST-101' } });
    console.log('updateRows 결과:', JSON.stringify(updateRes, null, 2));

    console.log('\n4. [queryTable] 수정 후 TEST-101 데이터 최종 확인...');
    const query2 = await queryTable('products', { filters: { id: 'TEST-101' } });
    console.log('수정 후 최종 데이터:', JSON.stringify(query2.rows, null, 2));

  } catch (err) {
    console.error('검증 중 오류:', err.message);
  }
}

testCleanTable();
