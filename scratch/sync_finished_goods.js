process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable, insertRows, updateRows } = require('../egdesk-helpers');

async function syncAll() {
  try {
    console.log('1. [재고 데이터베이스] inventory_items 전체 품목 조회 중...');
    const invRes = await queryTable('inventory_items', { limit: 10000 });
    const invItems = invRes.rows || [];
    console.log('전체 재고 항목 개수:', invItems.length);

    // 완제품(type: '완제품' 또는 'product')만 추출
    const finishedGoods = invItems.filter(i => !i.deleted_at && (i.type === '완제품' || i.type === 'product'));
    console.log('연동 대상 완제품 품목 개수:', finishedGoods.length);

    let syncedCount = 0;
    for (const item of finishedGoods) {
      const existing = await queryTable('products', { filters: { inventory_item_id: String(item.id) } });
      const rows = existing.rows || [];

      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const productPayload = {
        tenant_id: item.tenant_id || 'default',
        name: item.name || '',
        price: item.price !== undefined && item.price !== null ? String(item.price) : '0',
        brand: item.brand || '',
        description: item.description || '',
        category: item.category || '스토어용',
        updated_at: nowStr,
        updated_by: 'system_sync'
      };

      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        await updateRows('products', productPayload, { ids });
      } else {
        const newProductId = `PROD-${item.id}`;
        productPayload.id = newProductId;
        productPayload.status = 'DRAFT';
        productPayload.inventory_item_id = item.id;
        productPayload.is_estimate_price = 0;
        productPayload.is_coupon_excludable = 0;

        await insertRows('products', [productPayload]);
      }
      syncedCount++;
    }

    console.log(`\n2. 총 ${syncedCount}건의 완제품이 products 데이터베이스로 동기화 완료 되었습니다!`);

    const prodRes = await queryTable('products', { limit: 10 });
    console.log('\n3. [products 테이블 현황] 총 개수:', prodRes.rows ? prodRes.rows.length : 0);
    console.log('동기화된 상품 샘플 (상위 3건):', JSON.stringify(prodRes.rows ? prodRes.rows.slice(0, 3) : [], null, 2));

  } catch (err) {
    console.error('동기화 중 오류:', err.message);
  }
}

syncAll();
