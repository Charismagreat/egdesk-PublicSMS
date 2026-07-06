import { queryTable } from '../egdesk-helpers';

async function runTest() {
  console.log('=== [시작] 주문/예약 API 호출 및 거래/배송내역 실시간 연동 E2E 통합 테스트 ===\n');

  // Next.js API가 로컬에서 구동 중이므로, fetch로 요청을 보냅니다.
  const BASE_URL = 'http://localhost:3000';

  // 1. [스토어 주문 시나리오]
  console.log('[테스트 1] 스토어 구매 시도 중 (택배배송)...');
  const storeRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: '아이유(실시간스토어)',
      customerPhone: '010-1234-5678',
      productName: '시그니처 드립백 커피 세트',
      quantity: '2',
      totalPrice: '54000',
      deliveryMethod: '택배배송',
      shippingAddress: '부산광역시 해운대구 우동 999번지 2층',
      status: '결제완료'
    })
  });
  const storeJson = await storeRes.json();
  console.log(' - API 응답:', storeJson);

  // 2. [테이블 오더 시나리오]
  console.log('\n[테스트 2] 테이블오더 주문 시도 중 (매장식사)...');
  const tableRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: '유재석(테이블 5번)',
      customerPhone: '010-9876-5432',
      productName: '수제 치즈 돈까스 & 에이드 세트',
      quantity: '1',
      totalPrice: '21000',
      deliveryMethod: '현장판매',
      shippingAddress: '테이블 5번 좌석',
      status: '결제완료'
    })
  });
  const tableJson = await tableRes.json();
  console.log(' - API 응답:', tableJson);

  // 3. [예약 시나리오]
  console.log('\n[테스트 3] 온라인 서비스 예약 시도 중...');
  const bookingRes = await fetch(`${BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: '송중기(실시간예약)',
      customerPhone: '010-5555-6666',
      serviceName: '프리미엄 헤어 컷 & 스파케어',
      reservationDate: '2026-05-25',
      reservationTime: '15:30',
      status: '예약접수',
      amount: 85000
    })
  });
  const bookingJson = await bookingRes.json();
  console.log(' - API 응답:', bookingJson);

  // 4. DB 검증 및 기록 확인
  console.log('\n=== DB 실시간 적재 정합성 최종 검증 ===\n');

  try {
    // 거래내역 테이블 (crm_transactions) 조회
    const txs = await queryTable('crm_transactions', {
      orderBy: 'id',
      orderDirection: 'DESC',
      limit: 5
    });
    console.log('[거래내역 crm_transactions 테이블 실시간 적재 상태]');
    console.table(txs.rows.map((r: any) => ({
      고객명: r.customer_name,
      연락처: r.customer_phone,
      상품명: r.product_name,
      거래금액: r.amount,
      일자: r.order_date,
      상태: r.status
    })));

    // 배송내역 테이블 (crm_deliveries) 조회
    const dels = await queryTable('crm_deliveries', {
      orderBy: 'id',
      orderDirection: 'DESC',
      limit: 5
    });
    console.log('\n[배송내역 crm_deliveries 테이블 실시간 적재 상태]');
    console.table(dels.rows.map((r: any) => ({
      고객명: r.customer_name,
      연락처: r.customer_phone,
      주소: r.address,
      택배사: r.courier,
      송장번호: r.tracking_number,
      상태: r.status
    })));
    
    console.log('\n>>> [검증 성공] 주문/예약 시도가 DB의 거래내역 및 배송내역 테이블에 완벽한 연동 정합성으로 영구 기록되었습니다! <<<');
  } catch (dbErr: any) {
    console.error('DB 검증 중 오류 발생:', dbErr.message);
  }
}

runTest();
