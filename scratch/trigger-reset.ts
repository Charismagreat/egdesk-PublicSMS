

async function main() {
  console.log('Requesting DB Reset & Dummy Data Insertion...');
  try {
    const res = await fetch('http://localhost:3000/api/reset-all');
    console.log(`Response Status: ${res.status}`);
    const data: any = await res.json();
    console.log('Response JSON:', data);
  } catch (error: any) {
    console.error('Failed to trigger reset via API:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('Next.js dev server might not be running. Attempting direct DB reset using setup-db module...');
      // 서버가 꺼져있을 경우 직접 setup-db 모듈과 reset-all의 로직을 스크립트로 안전하게 로컬 구동해줍니다.
      try {
        const { setupDatabase } = require('../src/lib/setup-db');
        const { insertRows, listTables, deleteTable } = require('../egdesk-helpers');
        
        console.log('Executing direct local database reset...');
        const tablesRes = await listTables();
        if (tablesRes.success && tablesRes.tables) {
          for (const t of tablesRes.tables) {
            console.log(`Deleting table ${t.tableName}...`);
            await deleteTable(t.tableName);
          }
        }
        await setupDatabase();
        
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);
        const dateStr = pastDate.toISOString().split('T')[0];
        
        const names = ['홍길동', '김철수', '이영희', '박지민', '최수아'];
        const phones = ['010-1111-2222', '010-3333-4444', '010-5555-6666', '010-7777-8888', '010-9999-0000'];
        const tags = ['VIP,여름세일', '단골,에어컨', '신규회원', '예약우선,VVIP', '블랙컨슈머'];
        const addresses = ['서울시 강남구 테헤란로 123', '경기도 성남시 분당구 판교역로 456', '인천시 연수구 송도과학로 789', '부산시 해운대구 센텀중앙로 10', '대구시 수성구 달구벌대로 100'];
        
        const customers = [];
        const orders = [];
        const payments = [];
        const reservations = [];
        const deliveries = [];
        const logs = [];
        
        for (let i = 0; i < 5; i++) {
          customers.push({
            id: i + 1,
            name: names[i],
            phone: phones[i],
            tags: tags[i],
            memo: '특이사항 없음',
            address: addresses[i],
            shipping_address: addresses[i] + ' (문앞)',
            recipient_name: names[i],
            recipient_phone: phones[i],
            created_at: dateStr + ' 10:00:00'
          });
          
          orders.push({
            id: (10000 + i).toString(),
            customer_name: names[i],
            customer_phone: phones[i],
            product_name: '상품' + (i+1),
            quantity: '1',
            order_date: dateStr,
            status: '배송완료'
          });
          
          payments.push({
            id: (20000 + i).toString(),
            customer_name: names[i],
            payment_method: '카드결제',
            amount: '100000원',
            payment_date: dateStr,
            status: '결제완료',
            order_id: (10000 + i).toString()
          });
          
          reservations.push({
            id: (30000 + i).toString(),
            customer_name: names[i],
            customer_phone: phones[i],
            service_name: '서비스' + (i+1),
            reservation_date: dateStr,
            reservation_time: '14:00',
            status: '예약확정'
          });
          
          deliveries.push({
            id: (40000 + i).toString(),
            customer_name: names[i],
            customer_phone: phones[i],
            address: addresses[i],
            courier: '대한통운',
            tracking_number: '6123456789' + i,
            status: '배송중',
            order_id: (10000 + i).toString()
          });
          
          logs.push({
            id: i + 1,
            customer_id: i + 1,
            phone: phones[i],
            message: '안녕하세요 ' + names[i] + '님!',
            status: 'SUCCESS',
            created_at: dateStr + ' 12:00:00'
          });
        }
        
        const products = [
          { id: '1', name: '다이슨 V12 청소기', price: '850000', url: 'https://example.com/dyson', description: '가벼운 무게와 강력한 흡입력', main_image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=200&h=200&fit=crop', detail_image_url: 'https://example.com/detail1' },
          { id: '2', name: 'LG 오브제 에어컨', price: '2400000', url: 'https://example.com/lg-ac', description: 'AI 기능이 탑재된 스마트 에어컨', main_image_url: 'https://images.unsplash.com/photo-1626243888062-0e9e4f3a74d2?w=200&h=200&fit=crop', detail_image_url: 'https://example.com/detail2' },
          { id: '3', name: '삼성 비스포크 냉장고', price: '1800000', url: 'https://example.com/samsung', description: '내 맘대로 색상을 조합하는 인테리어 가전', main_image_url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=200&h=200&fit=crop', detail_image_url: 'https://example.com/detail3' },
          { id: '4', name: '애플 아이패드 프로', price: '1500000', url: 'https://example.com/ipad', description: 'M4 칩 탑재로 더욱 강력해진 성능', main_image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop', detail_image_url: 'https://example.com/detail4' },
          { id: '5', name: '소니 노이즈캔슬링 헤드폰', price: '450000', url: 'https://example.com/sony', description: '업계 최고 수준의 노이즈 캔슬링', main_image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=200&h=200&fit=crop', detail_image_url: 'https://example.com/detail5' }
        ];
        
        await insertRows('crm_customers', customers);
        await insertRows('crm_orders', orders);
        await insertRows('crm_payments', payments);
        await insertRows('crm_reservations', reservations);
        await insertRows('crm_deliveries', deliveries);
        await insertRows('message_logs', logs);
        await insertRows('products', products);
        
        console.log('SUCCESS! Direct local database reset and dummy data seeding complete.');
      } catch (localErr: any) {
        console.error('Direct local database reset failed:', localErr.message);
      }
    }
  }
}

main();
