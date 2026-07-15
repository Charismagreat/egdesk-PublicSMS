import { queryTable, updateRows, executeSQL } from '../egdesk-helpers';

async function testUpdate() {
  try {
    console.log('🧪 [테스트 시작] DD-999 상품 데이터 진단 및 업데이트 테스트...');
    
    // 1. products 테이블의 전체 레코드 조회
    const before = await executeSQL("SELECT id, name, category, tenant_id, status FROM products LIMIT 50");
    console.log('▶ [products 테이블 전체 목록]:', before.rows);
    
  } catch (err: any) {
    console.error('❌ 업데이트 테스트 중 예외 발생:', err.message || err);
  }
}

testUpdate();
