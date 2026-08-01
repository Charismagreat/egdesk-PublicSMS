process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable, insertRows, updateRows } = require('../egdesk-helpers');

async function syncRemaining() {
  try {
    console.log('1. [전수 완제품 데이터베이스 점검] inventory_items 전체 품목 스캔중...');
    const invRes = await queryTable('inventory_items', { limit: 50000 });
    const invItems = invRes.rows || [];
    const finishedGoods = invItems.filter(i => !i.deleted_at && (i.type === '완제품' || i.type === 'product'));
    console.log(`전체 완제품 개수: ${finishedGoods.length} 건`);

    const existingProdsRes = await queryTable('products', { limit: 50000 });
    const existingProds = existingProdsRes.rows || [];
    console.log(`현재 products 테이블 개수: ${existingProds.length} 건`);

    const existingInvIds = new Set(existingProds.map(p => String(p.inventory_item_id)).filter(Boolean));
    const remainingGoods = finishedGoods.filter(i => !existingInvIds.has(String(i.id)));
    console.log(`추가 동기화 필요 남은 완제품 개수: ${remainingGoods.length} 건`);

    if (remainingGoods.length === 0) {
      console.log('이미 모든 완제품이 100% 동기화 완료되어 있습니다!');
      return;
    }

    // 100건씩 분할 배치(Batch) 적재로 최속 동기화
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < remainingGoods.length; i += batchSize) {
      const chunk = remainingGoods.slice(i, i + batchSize);
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

      const rowsToInsert = chunk.map(item => ({
        id: `PROD-${item.id}`,
        name: item.name || '',
        price: item.price !== undefined && item.price !== null ? String(item.price) : '0',
        brand: item.brand || '',
        description: item.description || '',
        category: item.category || '스토어용',
        status: 'DRAFT',
        inventory_item_id: item.id,
        is_estimate_price: 0,
        is_coupon_excludable: 0,
        tenant_id: item.tenant_id || 'tenant-guest-id-2222',
        updated_at: nowStr,
        updated_by: 'system_sync'
      }));

      const insertRes = await insertRows('products', rowsToInsert);
      if (insertRes.success) {
        successCount += chunk.length;
      }
    }

    console.log(`\n2. 남은 ${successCount}건 완제품 동기화 배치 적재 최종 완료!`);

    const finalRes = await queryTable('products', { limit: 1 });
    console.log(`\n3. 최종 products 총 건수: ${finalRes.total} 건`);

  } catch (err) {
    console.error('마무리 동기화 중 오류:', err.message);
  }
}

syncRemaining();
