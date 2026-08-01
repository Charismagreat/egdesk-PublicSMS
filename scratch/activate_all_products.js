process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable, updateRows } = require('../egdesk-helpers');

async function activateAllProducts() {
  try {
    console.log('products 테이블 조회중...');
    let offset = 0;
    const limit = 1000;
    let totalUpdated = 0;

    while (true) {
      const res = await queryTable('products', { limit, offset });
      const rows = res.rows || [];
      if (rows.length === 0) break;

      const draftRows = rows.filter(r => r.status !== 'ACTIVE');
      for (const row of draftRows) {
        await updateRows('products', { status: 'ACTIVE' }, { filters: { id: String(row.id) } });
        totalUpdated++;
      }

      console.log(`[Progress] ${totalUpdated} 건 status: ACTIVE 업데이트 완료...`);
      if (rows.length < limit) break;
      offset += limit;
    }

    console.log(`총 ${totalUpdated}건의 상품 status를 ACTIVE(판매 중)로 일괄 활성화 완료!`);
  } catch (err) {
    console.error('ERROR:', err);
  }
}

activateAllProducts();
