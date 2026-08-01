process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { createTable, updateRows, queryTable } = require('../egdesk-helpers');

async function runTest() {
  try {
    console.log('1. createTable(duplicateAction: "update") 로 brand 컬럼 스키마 정식 승인...');
    const schema = [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'price', type: 'TEXT' },
      { name: 'brand', type: 'TEXT' },
      { name: 'url', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'main_image_url', type: 'TEXT' },
      { name: 'detail_image_url', type: 'TEXT' },
      { name: 'available_methods', type: 'TEXT' },
      { name: 'category', type: 'TEXT' },
      { name: 'menu_category', type: 'TEXT' },
      { name: 'is_coupon_excludable', type: 'INTEGER' },
      { name: 'is_estimate_price', type: 'INTEGER' },
      { name: 'status', type: 'TEXT' },
      { name: 'inventory_item_id', type: 'INTEGER' }
    ];

    const createRes = await createTable('광고 상품', schema, {
      tableName: 'products',
      duplicateAction: 'update'
    });
    console.log('createTable 결과:', JSON.stringify(createRes, null, 2));

    console.log('\n2. updateRows 로 brand: "삼성전자" 업데이트 시도...');
    const updateRes = await updateRows('products', {
      name: 'WSD-YL970(B)',
      brand: '삼성전자'
    }, { filters: { id: 'PROD-1' } });
    console.log('updateRows 결과:', JSON.stringify(updateRes, null, 2));

    console.log('\n3. queryTable 로 반영 결과 검증...');
    const after = await queryTable('products', { filters: { id: 'PROD-1' } });
    console.log('최종 PROD-1 데이터:', JSON.stringify(after.rows, null, 2));

  } catch (err) {
    console.error('오류 발생:', err.message);
  }
}

runTest();
