import { deleteTable, executeSQL } from '../egdesk-helpers';
import { setupDatabase } from '../src/lib/setup-db';

async function recreate() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Deleting old products table and metadata...');
  try {
    await deleteTable('products');
  } catch (e) {
    console.log('Failed to delete normally:', e.message);
  }
  
  console.log('Recreating tables from updated config...');
  await setupDatabase();
  
  // Re-seed data
  console.log('Seeding dummy products...');
  const dummyProducts = [
    {
      name: '매콤 제육덮밥 (테이블오더)', price: '8500', category: '테이블용', menu_category: '식사류',
      available_methods: '매장에서', description: '매장에서만 즐길 수 있는 제육덮밥',
      main_image_url: 'https://images.unsplash.com/photo-1626082895617-2c6fd34b1259'
    },
    {
      name: '생맥주 500cc', price: '4500', category: '테이블용', menu_category: '주류',
      available_methods: '매장에서', description: '시원한 생맥주',
      main_image_url: 'https://images.unsplash.com/photo-1518176258769-f227c798150e'
    },
    {
      name: '모듬 감자튀김', price: '12000', category: '테이블용', menu_category: '안주류',
      available_methods: '매장에서,가져가기', description: '바삭바삭한 감자튀김',
      main_image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594'
    },
    {
      name: '프리미엄 원두 커피 (홀빈 200g)', price: '15000', category: '스토어용', menu_category: '음료',
      available_methods: '배송,가져가기', description: '밀봉 배송 원두',
      main_image_url: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7'
    },
    {
      name: '수제 다이어트 샐러드팩 (1주일분)', price: '45000', category: '스토어용', menu_category: '식사류',
      available_methods: '배달,배송', description: '다이어트 샐러드팩',
      main_image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd'
    },
    {
      name: '시그니처 디저트 세트 (포장 전용)', price: '22000', category: '스토어용', menu_category: '디저트',
      available_methods: '가져가기', description: '포장 전용 할인 디저트 세트',
      main_image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777'
    },
    {
      name: '스페셜 뷰티 케어 (1시간 30분)', price: '80000', category: '예약용', menu_category: '서비스',
      available_methods: '매장에서', description: '100% 예약제 프리미엄 케어',
      main_image_url: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35'
    },
    {
      name: '프라이빗 파티룸 대관 (4시간)', price: '150000', category: '예약용', menu_category: '공간대여',
      available_methods: '매장에서', description: '원하는 날짜와 시간에 파티룸을 대관하세요.',
      main_image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
    }
  ];

  for (let i = 0; i < dummyProducts.length; i++) {
    const prod = dummyProducts[i];
    console.log(`Adding: ${prod.name}`);
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Date.now().toString() + i,
        ...prod
      })
    });
    const data = await res.json();
    if (!data.success) {
      console.error('Failed to add:', prod.name, data.error);
    }
  }
}

recreate().catch(console.error);
