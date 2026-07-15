import { executeSQL } from '../egdesk-helpers';

async function runDiagnostic() {
  try {
    console.log('🔍 [DB 진단 시작] products 테이블 상태 점검...');
    
    // 1. products 테이블에 있는 총 데이터 수
    const totalRes = await executeSQL('SELECT COUNT(*) as count FROM products');
    console.log(`- 전체 상품 수 (소프트 삭제 무관): ${totalRes.rows?.[0]?.count}`);

    // 2. deleted_at IS NULL 이거나 deleted_at 이 비어있는 수량
    const deleteRes = await executeSQL('SELECT deleted_at, COUNT(*) as count FROM products GROUP BY deleted_at');
    console.log('- deleted_at 값 분포:');
    console.log(deleteRes.rows);

    // 3. status 별 수량
    const statusRes = await executeSQL('SELECT status, COUNT(*) as count FROM products GROUP BY status');
    console.log('- status 값 분포:');
    console.log(statusRes.rows);

    // 4. tenant_id 별 수량
    const tenantRes = await executeSQL('SELECT tenant_id, COUNT(*) as count FROM products GROUP BY tenant_id');
    console.log('- tenant_id 값 분포:');
    console.log(tenantRes.rows);

    // 5. inventory_item_id 매핑 현황
    const invMapRes = await executeSQL('SELECT COUNT(*) as count FROM products WHERE inventory_item_id IS NOT NULL');
    console.log(`- 재고 아이템과 연동된 상품 수: ${invMapRes.rows?.[0]?.count}`);

    // 6. 실제 재고 완제품 수량
    const invItemsRes = await executeSQL("SELECT COUNT(*) as count FROM inventory_items WHERE type IN ('완제품', 'product') AND deleted_at IS NULL");
    console.log(`- 재고 대장 내 미삭제 완제품 수: ${invItemsRes.rows?.[0]?.count}`);

    // 7. DRAFT 상태의 상품들 상위 5개 출력
    const draftsRes = await executeSQL("SELECT id, name, tenant_id, status, deleted_at, inventory_item_id FROM products WHERE status = 'DRAFT' LIMIT 5");
    console.log('- DRAFT 상품 샘플 5개:');
    console.log(draftsRes.rows);

  } catch (err: any) {
    console.error('❌ 진단 중 오류 발생:', err.message);
  }
}

runDiagnostic();
