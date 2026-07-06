import { insertRows } from '../egdesk-helpers';

async function generateUserScenarios() {
  console.log('=== [실제 사용 시나리오 시뮬레이션] 각 서비스별 DB 기록 생성 시작 ===\n');

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 1. 스토어(store) 시나리오 주문 및 결제 데이터 삽입
    console.log('[시나리오 1] 스토어(store) 구매 및 결제 완료 건 생성 중...');
    const storeOrderId = 'ST-' + Date.now();
    await insertRows('crm_orders', [{
      id: storeOrderId,
      customer_name: '이지은(스토어구매)',
      customer_phone: '010-2222-3333',
      product_name: '프리미엄 원두 커피 (홀빈 200g) 외 1건',
      quantity: '2',
      total_price: '30000',
      delivery_method: '택배배송',
      shipping_address: '서울특별시 강남구 테헤란로 123 (역삼동)',
      tracking_number: '',
      attachment_url: '',
      customer_memo: '경비실에 맡겨주세요. 로스팅 신선한 걸로 부탁드립니다.',
      order_date: todayStr,
      status: '결제완료'
    }]);
    console.log(' - 스토어 주문 생성 완료.');

    // 1-1. 결제 테이블 연동 레코드 삽입
    const paymentId = 'PAY-' + Date.now();
    await insertRows('crm_payments', [{
      id: paymentId,
      customer_name: '이지은(스토어구매)',
      payment_method: '카드결제',
      amount: '30000',
      payment_date: todayStr,
      status: '결제완료'
    }]);
    console.log(' - 스토어 결제 기록 생성 완료.');
    console.log('--------------------------------------------------');


    // 2. 예약(booking) 시나리오 서비스 예약 신청 데이터 삽입
    console.log('[시나리오 2] 예약(booking) 신규 예약 신청 건 생성 중...');
    const reservationId = 'RES-' + Date.now();
    await insertRows('crm_reservations', [{
      id: reservationId,
      customer_name: '박보검(온라인예약)',
      customer_phone: '010-4444-5555',
      service_name: '스페셜 뷰티 케어 (1시간 30분) [쿠폰사용: VIP할인]',
      reservation_date: '2026-05-22',
      reservation_time: '14:00',
      status: '예약접수'
    }]);
    console.log(' - 서비스 예약 신청 기록 생성 완료.');
    console.log('--------------------------------------------------');


    // 3. 테이블 오더(table-order) 현장 태블릿 주문 건 데이터 삽입
    console.log('[시나리오 3] 테이블오더(table-order) 실시간 현장 주문 건 생성 중...');
    const tableOrderId = 'TO-' + Date.now();
    await insertRows('crm_orders', [{
      id: tableOrderId,
      customer_name: '임영웅(테이블 3번)',
      customer_phone: '010-7777-8888',
      product_name: '매콤 제육덮밥 (테이블오더) 1개, 생맥주 500cc 2잔',
      quantity: '3',
      total_price: '17500',
      delivery_method: '현장판매',
      shipping_address: '테이블 3번 좌석',
      tracking_number: '',
      attachment_url: '',
      customer_memo: '제육덮밥은 곱빼기처럼 넉넉히 맵게 해주세요! 생맥주는 바로 서빙 바랍니다.',
      order_date: todayStr,
      status: '결제대기'
    }]);
    console.log(' - 테이블오더 식사 주문 생성 완료.');
    
    console.log('\n>>> [성공] 각 경로(Store, Booking, Table-Order)에 대한 모든 실시간 테스트 데이터가 DB에 완벽히 보존되었습니다! <<<');
    console.log('PC 관리자 각 화면에서 아래 내용을 확인해 보세요:');
    console.log(' 1. [주문내역 관리] -> 이지은(스토어구매), 임영웅(테이블 3번) 확인 가능');
    console.log(' 2. [결제내역 관리] -> 이지은(스토어구매) 결제금액 30,000원 확인 가능');
    console.log(' 3. [예약 관리] -> 박보검(온라인예약) 스페셜 뷰티 케어 14:00 확인 가능');

  } catch (err: any) {
    console.error('\n>>> [실패] 테스트 데이터 적재 실패! <<<');
    console.error(err.message);
  }
}

generateUserScenarios();
