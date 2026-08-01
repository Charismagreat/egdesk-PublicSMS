process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { deleteTable, createTable, getTableSchema } = require('../egdesk-helpers');

async function recreateFullTable() {
  try {
    console.log('1. [EGDesk Helpers] deleteTable("products") 로 드랍 시도...');
    await deleteTable('products').catch(() => {});

    console.log('2. [EGDesk Helpers] tenant_id 및 7종 감사 컬럼 포함하여 createTable 재구동...');
    const fullProductsSchema = [
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
      { name: 'inventory_item_id', type: 'INTEGER' },
      { name: 'tenant_id', type: 'TEXT' },
      { name: 'uuid', type: 'TEXT' },
      { name: 'updated_at', type: 'TEXT' },
      { name: 'updated_by', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' },
      { name: 'deleted_by', type: 'TEXT' },
      { name: 'restored_at', type: 'TEXT' },
      { name: 'restored_by', type: 'TEXT' }
    ];

    const createRes = await createTable('광고 상품', fullProductsSchema, { tableName: 'products' });
    console.log('createTable 결과:', JSON.stringify(createRes, null, 2));

    const schemaRes = await getTableSchema('products');
    console.log('새 스키마 목록:', JSON.stringify(schemaRes, null, 2));

  } catch (err) {
    console.error('오류:', err);
  }
}

recreateFullTable();
