process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { deleteTable, createTable, getTableSchema } = require('../egdesk-helpers');

async function recreateTable() {
  try {
    console.log('1. [EGDesk Helpers] deleteTable("products") 로 기존 꼬인 테이블 및 메타데이터 드랍 시도...');
    const dropRes = await deleteTable('products').catch(err => console.log('Drop info:', err.message));
    console.log('Drop 결과:', dropRes);

    console.log('\n2. [EGDesk Helpers] createTable 로 brand 컬럼을 명시하여 products 테이블 정식 신규 생성...');
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
      tableName: 'products'
    });
    console.log('createTable 결과:', JSON.stringify(createRes, null, 2));

    console.log('\n3. [EGDesk Helpers] 새로 생성된 products 스키마 검증 중...');
    const schemaRes = await getTableSchema('products');
    console.log('새 스키마 목록:', JSON.stringify(schemaRes, null, 2));

  } catch (err) {
    console.error('재생성 중 오류:', err);
  }
}

recreateTable();
