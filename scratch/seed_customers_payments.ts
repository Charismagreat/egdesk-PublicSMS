import { insertRows, deleteRows } from '../egdesk-helpers';

async function seedCustomersAndPayments() {
  console.log('=== [DB 시딩] crm_customers 및 crm_payments 더미 데이터 적재 시작 ===');

  try {
    // 1. 기존 데이터 청소 (안전하게 중복 방지를 위해 전체 청소 후 적재)
    console.log('- 기존 crm_customers, crm_payments 테이블 청소 중...');
    await deleteRows('crm_customers', { filters: {} }).catch(() => {});
    await deleteRows('crm_payments', { filters: {} }).catch(() => {});

    // 2. 고객 더미 데이터 정의
    const dummyCustomers = [
      {
        id: 1,
        name: '아이유(실시간스토어)',
        phone: '010-1234-5678',
        tags: '단골,스토어,VIP',
        memo: '드립백 세트 자주 구매하심. 택배 수령 전 연락 요망.',
        address: '부산광역시 해운대구 우동 999번지 2층',
        shipping_address: '부산광역시 해운대구 우동 999번지 2층 (문 앞)',
        recipient_name: '이지은',
        recipient_phone: '010-1234-5678',
        created_at: '2026-05-18 10:30:00'
      },
      {
        id: 2,
        name: '유재석(테이블 5번)',
        phone: '010-9876-5432',
        tags: '테이블,치즈돈까스',
        memo: '에이드 음료 변경 가능 여부 자주 질문하심. 친절 응대.',
        address: '서울특별시 마포구 상암동 123-45',
        shipping_address: '테이블 5번 좌석',
        recipient_name: '유재석',
        recipient_phone: '010-9876-5432',
        created_at: '2026-05-19 12:45:00'
      },
      {
        id: 3,
        name: '김고은',
        phone: '010-5555-1234',
        tags: '신규,VIP',
        memo: '선물용 프리미엄 원두 세트 구매 문의 주심.',
        address: '서울특별시 종로구 삼청동 88-1',
        shipping_address: '서울특별시 종로구 삼청동 88-1 (경비실)',
        recipient_name: '김고은',
        recipient_phone: '010-5555-1234',
        created_at: '2026-05-20 09:15:00'
      },
      {
        id: 4,
        name: '박보검',
        phone: '010-4444-5678',
        tags: '단골,디저트',
        memo: '포장 픽업 주문 위주. 크로플 메뉴 선호.',
        address: '경기도 성남시 분당구 정자동 77-8',
        shipping_address: '경기도 성남시 분당구 정자동 77-8 101동 202호',
        recipient_name: '박보검',
        recipient_phone: '010-4444-5678',
        created_at: '2026-05-17 15:20:00'
      },
      {
        id: 5,
        name: '한소희',
        phone: '010-7777-3333',
        tags: '블랙컨슈머',
        memo: '배송지 변경 요청이 빈번하므로 주의하여 확인 필요.',
        address: '서울특별시 성동구 성수동2가 45-6',
        shipping_address: '서울특별시 성동구 성수동2가 45-6 5층',
        recipient_name: '한소희',
        recipient_phone: '010-7777-3333',
        created_at: '2026-05-15 11:10:00'
      },
      {
        id: 6,
        name: '손흥민',
        phone: '010-3333-7777',
        tags: 'VVIP,단체주문',
        memo: '토트넘 단체 티타임용 원두 및 드립백 대량 주문 건 발생.',
        address: '서울특별시 강남구 압구정동 500',
        shipping_address: '서울특별시 강남구 압구정동 500 (압구정 스포츠센터)',
        recipient_name: '손흥민',
        recipient_phone: '010-3333-7777',
        created_at: '2026-05-14 08:00:00'
      },
      {
        id: 7,
        name: '임영웅',
        phone: '010-8888-9999',
        tags: '단골,원두커피',
        memo: '부모님 선물용 다이어트 샐러드 팩 정기 배송 신청.',
        address: '경기도 고양시 일산동구 마두동 44-5',
        shipping_address: '경기도 고양시 일산동구 마두동 44-5 (경비실 보관)',
        recipient_name: '임영웅',
        recipient_phone: '010-8888-9999',
        created_at: '2026-05-16 14:05:00'
      }
    ];

    console.log(`- crm_customers ${dummyCustomers.length}개 적재 중...`);
    await insertRows('crm_customers', dummyCustomers);
    console.log(' - crm_customers 적재 완료!');

    // 3. 결제 더미 데이터 정의
    // crm_orders 에 들어있는 ID: "1779266254269", "1779266254454", "1779266327211", "1779266327341", "1779267023433", "1779267024176"
    const dummyPayments = [
      {
        id: 'PAY-1779266254269',
        customer_name: '아이유(실시간스토어)',
        payment_method: '카드결제',
        amount: '54000원',
        payment_date: '2026-05-20 18:01:23',
        status: '결제완료',
        order_id: '1779266254269'
      },
      {
        id: 'PAY-1779266254454',
        customer_name: '유재석(테이블 5번)',
        payment_method: '무통장입금',
        amount: '21000원',
        payment_date: '2026-05-20 18:02:10',
        status: '결제완료',
        order_id: '1779266254454'
      },
      {
        id: 'PAY-1779266327211',
        customer_name: '아이유(실시간스토어)',
        payment_method: '카드결제',
        amount: '54000원',
        payment_date: '2026-05-20 18:03:00',
        status: '결제완료',
        order_id: '1779266327211'
      },
      {
        id: 'PAY-1779266327341',
        customer_name: '유재석(테이블 5번)',
        payment_method: '현금',
        amount: '21000원',
        payment_date: '2026-05-20 18:04:15',
        status: '결제완료',
        order_id: '1779266327341'
      },
      {
        id: 'PAY-1779267023433',
        customer_name: '아이유(실시간스토어)',
        payment_method: '카드결제',
        amount: '54000원',
        payment_date: '2026-05-20 18:10:45',
        status: '결제완료',
        order_id: '1779267023433'
      },
      {
        id: 'PAY-1779267024176',
        customer_name: '유재석(테이블 5번)',
        payment_method: '카드결제',
        amount: '21000원',
        payment_date: '2026-05-20 18:11:02',
        status: '결제완료',
        order_id: '1779267024176'
      },
      {
        id: 'PAY-2000000000001',
        customer_name: '김고은',
        payment_method: '카드결제',
        amount: '15000원',
        payment_date: '2026-05-20 09:30:00',
        status: '결제완료',
        order_id: ''
      },
      {
        id: 'PAY-2000000000002',
        customer_name: '박보검',
        payment_method: '간편결제',
        amount: '22000원',
        payment_date: '2026-05-20 10:15:30',
        status: '결제완료',
        order_id: ''
      },
      {
        id: 'PAY-2000000000003',
        customer_name: '한소희',
        payment_method: '무통장입금',
        amount: '45000원',
        payment_date: '2026-05-20 11:22:11',
        status: '결제대기',
        order_id: ''
      },
      {
        id: 'PAY-2000000000004',
        customer_name: '손흥민',
        payment_method: '카드결제',
        amount: '150000원',
        payment_date: '2026-05-20 13:40:00',
        status: '결제완료',
        order_id: ''
      }
    ];

    console.log(`- crm_payments ${dummyPayments.length}개 적재 중...`);
    await insertRows('crm_payments', dummyPayments);
    console.log(' - crm_payments 적재 완료!');
    
    console.log('=== [DB 시딩 완료] 성공적으로 모든 더미 데이터를 적재하였습니다! ===');
  } catch (err: any) {
    console.error('시딩 실패:', err.message);
  }
}

seedCustomersAndPayments();
