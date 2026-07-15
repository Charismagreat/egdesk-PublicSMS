import { syncInventoryToProduct } from '../src/lib/sync-products-helper';
import { queryTable, deleteRows } from '../egdesk-helpers';

async function runTest() {
  try {
    console.log('🔄 [테스트 시작] 완제품 등록 -> 상품 DRAFT 연동 검증');

    // 기존의 테스트 데이터 잔해 제거
    await deleteRows('products', { filters: { id: 'PROD-99999' } });

    const dummyFinishedGood = {
      id: 99999,
      type: '완제품',
      name: 'E2E 테스트 완제품 컵',
      price: 5000,
      category: '주방용품',
      description: 'E2E 연동 테스트용 완제품 머그컵입니다.',
      uuid: 'ITEM-TEST-99999'
    };

    // 1. INSERT 이벤트 동기화 호출
    console.log('1. 재고 완제품 INSERT 이벤트 트리거...');
    await syncInventoryToProduct(dummyFinishedGood, 'INSERT');

    // 2. products 테이블에 DRAFT 상태로 잘 들어갔는지 확인
    console.log('2. products 테이블 조회 검증 중...');
    const result = await queryTable('products', { filters: { inventory_item_id: '99999' } });
    const rows = result.rows || [];

    if (rows.length > 0) {
      const product = rows[0];
      console.log('✅ 완제품 연동 상품 조회 성공!');
      console.log(`- ID: ${product.id}`);
      console.log(`- 이름: ${product.name}`);
      console.log(`- 가격: ${product.price}원`);
      console.log(`- 상태: ${product.status} (기본 DRAFT 여야 함)`);
      console.log(`- 연동 재고 ID: ${product.inventory_item_id}`);
    } else {
      console.error('❌ 동기화된 상품 데이터를 찾을 수 없습니다.');
    }

    // 3. CLEANUP
    await deleteRows('products', { filters: { id: 'PROD-99999' } });
    console.log('🧹 테스트 잔해 데이터 정리 완료.');

  } catch (err) {
    console.error('❌ 테스트 중 오류 발생:', err);
  }
}

runTest();
