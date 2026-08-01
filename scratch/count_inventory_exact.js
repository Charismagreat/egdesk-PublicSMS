process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable } = require('../egdesk-helpers');

async function countExact() {
  try {
    const res = await queryTable('inventory_items', { limit: 50000 });
    const rows = res.rows || [];
    
    console.log('--- [재고 데이터베이스 inventory_items 수량 집계] ---');
    console.log('전체 총 레코드 수:', rows.length);

    const typeCounts = {};
    for (const r of rows) {
      if (r.deleted_at) continue;
      const type = r.type || '미분류';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    console.log('유효 타입별 수량:', JSON.stringify(typeCounts, null, 2));

    const prodRes = await queryTable('products', { limit: 50000 });
    console.log('현재 products 테이블 전체 건수:', prodRes.rows ? prodRes.rows.length : 0);

  } catch (err) {
    console.error('집계 오류:', err.message);
  }
}

countExact();
