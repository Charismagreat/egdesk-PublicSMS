process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable, deleteTable, createTable, insertRows } = require('../egdesk-helpers');

async function cleanDummyProducts() {
  try {
    console.log('1. [데이터 정돈] 무분별하게 적재된 더미 products 테이블 정리중...');
    
    // products 테이블 재조회
    const res = await queryTable('products', { limit: 10000 });
    const rows = res.rows || [];
    
    // 사용자가 의미 있게 등록한 실제 상품(예: brand가 입력되어 있거나, PROD- 기계적 아이디가 아닌 수동/유효 등록 상품, 또는 ACTIVE 상태의 핵심 상품)
    const validProducts = rows.filter(r => 
      !r.deleted_at && (
        r.brand || 
        r.status === 'ACTIVE' || 
        !String(r.id).startsWith('PROD-')
      )
    );

    console.log(`유지할 유효 상품 수: ${validProducts.length} 건`);

    // 테이블 깨끗하게 초기화 후 유효 데이터만 복원
    await deleteTable('products');
    
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

    await createTable('광고 상품', fullProductsSchema, { tableName: 'products' });

    if (validProducts.length > 0) {
      await insertRows('products', validProducts);
    }

    console.log('2. 더미 데이터 정돈 완료!');

    const finalRes = await queryTable('products', { limit: 100 });
    console.log('최종 남은 정갈한 상품 목록:', JSON.stringify(finalRes.rows, null, 2));

  } catch (err) {
    console.error('정돈 중 오류:', err.message);
  }
}

cleanDummyProducts();
