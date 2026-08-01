process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable, insertRows } = require('../egdesk-helpers');

async function syncAll2300() {
  try {
    console.log('1. [페이지네이션 스캔] inventory_items 2,300건 전수 오프셋 페칭 중...');
    
    const allInvItems = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const res = await queryTable('inventory_items', { limit, offset });
      const rows = res.rows || [];
      allInvItems.push(...rows);
      if (rows.length < limit) break;
      offset += limit;
    }

    console.log(`스캔 완료: 총 ${allInvItems.length} 건의 재고 데이터 로드됨.`);

    const finishedGoods = allInvItems.filter(i => !i.deleted_at && (i.type === '완제품' || i.type === 'product'));
    console.log(`그 중 완제품 항목 수: ${finishedGoods.length} 건`);

    // 기존 products의 inventory_item_id 목록 스캔
    const existingProds = [];
    offset = 0;
    while (true) {
      const res = await queryTable('products', { limit, offset });
      const rows = res.rows || [];
      existingProds.push(...rows);
      if (rows.length < limit) break;
      offset += limit;
    }

    const existingInvIds = new Set(existingProds.map(p => String(p.inventory_item_id)).filter(Boolean));
    const missingGoods = finishedGoods.filter(i => !existingInvIds.has(String(i.id)));
    console.log(`미연동 상태인 남은 완제품 수: ${missingGoods.length} 건`);

    if (missingGoods.length === 0) {
      console.log('모든 완제품이 100% 이미 products 테이블에 적재되어 있습니다!');
      return;
    }

    // 100건 단위 분할 적재
    const batchSize = 100;
    let addedCount = 0;
    for (let i = 0; i < missingGoods.length; i += batchSize) {
      const chunk = missingGoods.slice(i, i + batchSize);
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

      await insertRows('products', rowsToInsert);
      addedCount += chunk.length;
      console.log(`[Progress] ${addedCount} / ${missingGoods.length} 건 적재 완료...`);
    }

    console.log(`\n2. 미연동 완제품 ${addedCount}건 추가 연동 적재 완료!`);

  } catch (err) {
    console.error('전수 연동 중 오류:', err.message);
  }
}

syncAll2300();
