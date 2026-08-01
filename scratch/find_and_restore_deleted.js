process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable, updateRows } = require('../egdesk-helpers');

async function findAndRestore() {
  try {
    console.log('1. queryTable로 products 검색중...');
    let offset = 0;
    const limit = 1000;
    const deletedProducts = [];

    while (true) {
      const res = await queryTable('products', { limit, offset });
      const rows = res.rows || [];
      if (rows.length === 0) break;

      for (const r of rows) {
        if (r.deleted_at) {
          deletedProducts.push(r);
        }
      }

      if (rows.length < limit) break;
      offset += limit;
    }

    console.log(`소프트 삭제(deleted_at)된 products 항목 수: ${deletedProducts.length} 건`);
    console.log(JSON.stringify(deletedProducts, null, 2));

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    if (deletedProducts.length > 0) {
      for (const row of deletedProducts) {
        console.log(`복원 진행 중: ID ${row.id} (${row.name}) -> status: DRAFT, deleted_at: null`);
        await updateRows('products', {
          status: 'DRAFT',
          deleted_at: null,
          deleted_by: null,
          restored_at: nowStr,
          restored_by: 'system_restore'
        }, { filters: { id: String(row.id) } });
      }
      console.log('🎉 삭제되었던 products 레코드가 성공적으로 승인 대기 완제품(DRAFT)으로 복원되었습니다!');
    }

    // inventory_items에서도 삭제된 항목 체크
    console.log('\n2. queryTable로 inventory_items 검색중...');
    offset = 0;
    const deletedInv = [];
    while (true) {
      const res = await queryTable('inventory_items', { limit, offset });
      const rows = res.rows || [];
      if (rows.length === 0) break;

      for (const r of rows) {
        if (r.deleted_at) {
          deletedInv.push(r);
        }
      }

      if (rows.length < limit) break;
      offset += limit;
    }

    console.log(`소프트 삭제(deleted_at)된 inventory_items 항목 수: ${deletedInv.length} 건`);
    console.log(JSON.stringify(deletedInv, null, 2));

    if (deletedInv.length > 0) {
      for (const row of deletedInv) {
        console.log(`inventory_items 복원 진행 중: ID ${row.id} (${row.name})`);
        await updateRows('inventory_items', {
          deleted_at: null,
          deleted_by: null,
          restored_at: nowStr,
          restored_by: 'system_restore'
        }, { filters: { id: String(row.id) } });

        // products 테이블도 DRAFT로 등록/복원
        await updateRows('products', {
          status: 'DRAFT',
          deleted_at: null,
          restored_at: nowStr
        }, { filters: { inventory_item_id: String(row.id) } });
      }
      console.log('🎉 inventory_items 및 관련 products 레코드가 DRAFT 상태로 복원되었습니다!');
    }

  } catch (err) {
    console.error('복원 작업 중 오류:', err.message);
  }
}

findAndRestore();
