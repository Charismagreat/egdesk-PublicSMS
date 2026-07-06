import { executeSQL, deleteTable, insertRows, listTables } from '../egdesk-helpers';
import { setupDatabase } from '../src/lib/setup-db';

async function runCleanAndRecreateAll() {
  console.log('=== [DB 전체 초기화 및 정밀 복구 시작] ===');
  try {
    // 1. 기존 user_tables 메타데이터 및 모든 물리 테이블을 깨끗하게 비웁니다.
    console.log('- user_tables 메타데이터 초기화...');
    await executeSQL("DELETE FROM user_tables").catch(() => {});
    
    // 2. 물리 테이블 전부 지우기 (안전을 위해 수동 deleteTable 시도)
    const tables = [
      'coupons', 'crm_operators', 'system_settings', 'crm_deliveries', 
      'crm_reservations', 'crm_payments', 'crm_orders', 'crm_transactions', 
      'products', 'ad_templates', 'message_logs', 'message_templates', 'crm_customers'
    ];
    for (const t of tables) {
      console.log(`- 물리 테이블 삭제 중: ${t}`);
      await deleteTable(t).catch(() => {});
    }

    // 3. setupDatabase()를 다시 돌려서 코어 테이블들 완벽 재생성
    console.log('- setupDatabase() 호출하여 모든 테이블 재생성...');
    await setupDatabase();
    console.log(' - 모든 테이블이 무결하게 성공적으로 생성되었습니다!');

    // 4. 상품(products) 시딩 데이터
    console.log('- 광고 상품(products) 데이터 시딩 중...');
    const dummyProducts = [
      {
        id: 'PROD_001', name: '매콤 제육덮밥 (테이블오더)', price: '8500', category: '테이블용', menu_category: '식사류',
        available_methods: '매장에서', description: '매장에서만 즐길 수 있는 갓 볶아낸 제육덮밥입니다.',
        main_image_url: 'https://images.unsplash.com/photo-1626082895617-2c6fd34b1259?q=80&w=200&h=200&fit=crop'
      },
      {
        id: 'PROD_002', name: '생맥주 500cc', price: '4500', category: '테이블용', menu_category: '주류',
        available_methods: '매장에서', description: '시원한 생맥주',
        main_image_url: 'https://images.unsplash.com/photo-1518176258769-f227c798150e?q=80&w=200&h=200&fit=crop'
      },
      {
        id: 'PROD_003', name: '모듬 감자튀김', price: '12000', category: '테이블용', menu_category: '안주류',
        available_methods: '매장에서,가져가기', description: '바삭바삭한 모듬 감자튀김입니다.',
        main_image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?q=80&w=200&h=200&fit=crop'
      },
      {
        id: 'PROD_004', name: '시그니처 드립백 커피 세트', price: '27000', category: '스토어용', menu_category: '음료',
        available_methods: '배송,가져가기', description: '프리미엄 원두를 엄선하여 블렌딩한 명품 드립백',
        main_image_url: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=200&h=200&fit=crop'
      },
      {
        id: 'PROD_005', name: '수제 치즈 돈까스 & 에이드 세트', price: '21000', category: '테이블용', menu_category: '식사류',
        available_methods: '매장에서,가져가기', description: '생치즈가 가득한 돈까스와 신선한 에이드 세트',
        main_image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200&h=200&fit=crop'
      }
    ];
    await insertRows('products', dummyProducts);

    // 5. 고객(crm_customers) 시딩 데이터
    console.log('- 고객 명단(crm_customers) 데이터 시딩 중...');
    const dummyCustomers = [
      {
        id: 1, name: '아이유(실시간스토어)', phone: '010-1234-5678', tags: '단골,스토어,VIP',
        memo: '드립백 세트 자주 구매하심. 택배 수령 전 연락 요망.',
        address: '부산광역시 해운대구 우동 999번지 2층', shipping_address: '부산광역시 해운대구 우동 999번지 2층 (문 앞)',
        recipient_name: '이지은', recipient_phone: '010-1234-5678', created_at: '2026-05-18 10:30:00'
      },
      {
        id: 2, name: '유재석(테이블 5번)', phone: '010-9876-5432', tags: '테이블,치즈돈까스',
        memo: '에이드 음료 변경 가능 여부 자주 질문하심. 친절 응대.',
        address: '서울특별시 마포구 상암동 123-45', shipping_address: '테이블 5번 좌석',
        recipient_name: '유재석', recipient_phone: '010-9876-5432', created_at: '2026-05-19 12:45:00'
      },
      {
        id: 3, name: '김고은', phone: '010-5555-1234', tags: '신규,VIP',
        memo: '선물용 프리미엄 원두 세트 구매 문의 주심.',
        address: '서울특별시 종로구 삼청동 88-1', shipping_address: '서울특별시 종로구 삼청동 88-1 (경비실)',
        recipient_name: '김고은', recipient_phone: '010-5555-1234', created_at: '2026-05-20 09:15:00'
      },
      {
        id: 4, name: '박보검', phone: '010-4444-5678', tags: '단골,디저트',
        memo: '포장 픽업 주문 위주. 크로플 메뉴 선호.',
        address: '경기도 성남시 분당구 정자동 77-8', shipping_address: '경기도 성남시 분당구 정자동 77-8 101동 202호',
        recipient_name: '박보검', recipient_phone: '010-4444-5678', created_at: '2026-05-17 15:20:00'
      }
    ];
    await insertRows('crm_customers', dummyCustomers);

    // 6. 주문(crm_orders) 시딩 데이터
    console.log('- 주문 내역(crm_orders) 데이터 시딩 중...');
    const dummyOrders = [
      {
        id: '1779266254269', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        product_name: '시그니처 드립백 커피 세트', quantity: '2', total_price: '54000',
        delivery_method: '택배배송', shipping_address: '부산광역시 해운대구 우동 999번지 2층',
        tracking_number: 'TRK-987654321', attachment_url: '', customer_memo: '문앞 배송 바람',
        order_date: '2026-05-20', status: '결제완료'
      },
      {
        id: '1779266254454', customer_name: '유재석(테이블 5번)', customer_phone: '010-9876-5432',
        product_name: '수제 치즈 돈까스 & 에이드 세트', quantity: '1', total_price: '21000',
        delivery_method: '현장판매', shipping_address: '테이블 5번 좌석',
        tracking_number: '', attachment_url: '', customer_memo: '따뜻하게 조리바람',
        order_date: '2026-05-20', status: '결제완료'
      },
      {
        id: '1779266327211', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        product_name: '시그니처 드립백 커피 세트', quantity: '1', total_price: '27000',
        delivery_method: '택배배송', shipping_address: '부산광역시 해운대구 우동 999번지 2층',
        tracking_number: 'TRK-11223344', attachment_url: '', customer_memo: '경비실에 맡겨주세요',
        order_date: '2026-05-19', status: '배송중'
      },
      {
        id: '1779266327341', customer_name: '유재석(테이블 5번)', customer_phone: '010-9876-5432',
        product_name: '수제 치즈 돈까스 & 에이드 세트', quantity: '1', total_price: '21000',
        delivery_method: '현장판매', shipping_address: '테이블 5번 좌석',
        tracking_number: '', attachment_url: '', customer_memo: '',
        order_date: '2026-05-18', status: '주문취소'
      },
      {
        id: '1779267023433', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        product_name: '시그니처 드립백 커피 세트', quantity: '2', total_price: '54000',
        delivery_method: '택배배송', shipping_address: '부산광역시 해운대구 우동 999번지 2층',
        tracking_number: 'TRK-55667788', attachment_url: '', customer_memo: '',
        order_date: '2026-05-17', status: '반품완료'
      }
    ];
    await insertRows('crm_orders', dummyOrders);

    // 7. 거래(crm_transactions) 시딩 데이터
    console.log('- 거래 내역(crm_transactions) 데이터 시딩 중...');
    const dummyTransactions = [
      {
        id: 'TX_1779266254269', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        product_name: '시그니처 드립백 커피 세트', amount: '54000원', order_date: '2026-05-20',
        status: '결제완료', order_id: '1779266254269'
      },
      {
        id: 'TX_1779266254454', customer_name: '유재석(테이블 5번)', customer_phone: '010-9876-5432',
        product_name: '수제 치즈 돈까스 & 에이드 세트', amount: '21000원', order_date: '2026-05-20',
        status: '결제완료', order_id: '1779266254454'
      },
      {
        id: 'TX_1779266327211', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        product_name: '시그니처 드립백 커피 세트', amount: '27000원', order_date: '2026-05-19',
        status: '결제완료', order_id: '1779266327211'
      },
      {
        id: 'TX_1779267023433', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        product_name: '시그니처 드립백 커피 세트', amount: '-54000원', order_date: '2026-05-17',
        status: '반품환불', order_id: '1779267023433'
      }
    ];
    await insertRows('crm_transactions', dummyTransactions);

    // 8. 배송(crm_deliveries) 시딩 데이터
    console.log('- 배송 내역(crm_deliveries) 데이터 시딩 중...');
    const dummyDeliveries = [
      {
        id: 'DL_1779266254269', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        address: '부산광역시 해운대구 우동 999번지 2층', courier: '대한통운',
        tracking_number: 'TRK-987654321', status: '배송중', order_id: '1779266254269'
      },
      {
        id: 'DL_1779266327211', customer_name: '아이유(실시간스토어)', customer_phone: '010-1234-5678',
        address: '부산광역시 해운대구 우동 999번지 2층', courier: '우체국택배',
        tracking_number: 'TRK-11223344', status: '배송완료', order_id: '1779266327211'
      }
    ];
    await insertRows('crm_deliveries', dummyDeliveries);

    // 9. 결제(crm_payments) 시딩 데이터
    console.log('- 결제 내역(crm_payments) 데이터 시딩 중...');
    const dummyPayments = [
      {
        id: 'PAY-1779266254269', customer_name: '아이유(실시간스토어)', payment_method: '카드결제',
        amount: '54000원', payment_date: '2026-05-20 18:01:23', status: '결제완료', order_id: '1779266254269'
      },
      {
        id: 'PAY-1779266254454', customer_name: '유재석(테이블 5번)', payment_method: '무통장입금',
        amount: '21000원', payment_date: '2026-05-20 18:02:10', status: '결제완료', order_id: '1779266254454'
      }
    ];
    await insertRows('crm_payments', dummyPayments);

    console.log('=== [DB 전체 복구 및 시딩 완료!] ===');
  } catch (err: any) {
    console.error('치명적 에러:', err.message);
  }
}

runCleanAndRecreateAll();
