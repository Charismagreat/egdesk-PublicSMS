async function seedData() {
  const baseUrl = 'http://localhost:3000';
  console.log('Seeding dummy products...');

  const dummyProducts = [
    // --- 테이블 오더 전용 (매장에서) ---
    {
      name: '매콤 제육덮밥 (테이블오더)',
      price: '8500',
      category: '식사류',
      available_methods: '매장에서',
      description: '매장에서만 즐길 수 있는 갓 볶아낸 제육덮밥입니다.',
      main_image_url: 'https://images.unsplash.com/photo-1626082895617-2c6fd34b1259?q=80&w=400&auto=format&fit=crop'
    },
    {
      name: '생맥주 500cc',
      price: '4500',
      category: '주류',
      available_methods: '매장에서',
      description: '시원한 생맥주',
      main_image_url: 'https://images.unsplash.com/photo-1518176258769-f227c798150e?q=80&w=400&auto=format&fit=crop'
    },
    {
      name: '모듬 감자튀김',
      price: '12000',
      category: '안주류',
      available_methods: '매장에서,가져가기',
      description: '바삭바삭한 모듬 감자튀김입니다.',
      main_image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?q=80&w=400&auto=format&fit=crop'
    },

    // --- 스토어 전용 (배달, 배송, 가져가기) ---
    {
      name: '프리미엄 원두 커피 (홀빈 200g)',
      price: '15000',
      category: '일반상품',
      available_methods: '배송,가져가기',
      description: '로스팅 직후 밀봉하여 배송되는 신선한 원두입니다.',
      main_image_url: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=400&auto=format&fit=crop'
    },
    {
      name: '수제 다이어트 샐러드팩 (1주일분)',
      price: '45000',
      category: '식사류',
      available_methods: '배달,배송',
      description: '매일 아침 배달/배송되는 신선한 샐러드팩입니다.',
      main_image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=400&auto=format&fit=crop'
    },
    {
      name: '시그니처 디저트 세트 (포장 전용)',
      price: '22000',
      category: '일반상품',
      available_methods: '가져가기',
      description: '매장 픽업 전용 할인 디저트 세트입니다.',
      main_image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=400&auto=format&fit=crop'
    },

    // --- 예약용 전용 (방문 서비스, 공간 대여 등) ---
    // 예약용은 대체로 price를 비우거나 상담후결정 처리하는 경우가 많음, 스토어 노출 방지를 위해 카테고리를 예약상품 등으로 지정 가능하지만 현재는 일반 예약상품으로.
    {
      name: '스페셜 뷰티 케어 (1시간 30분)',
      price: '80000',
      category: '예약상품',
      available_methods: '매장에서',
      description: '100% 예약제로 운영되는 프리미엄 케어 서비스입니다.',
      main_image_url: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=400&auto=format&fit=crop'
    },
    {
      name: '프라이빗 파티룸 대관 (4시간)',
      price: '150000',
      category: '예약상품',
      available_methods: '매장에서',
      description: '원하는 날짜와 시간에 파티룸을 대관하세요.',
      main_image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=400&auto=format&fit=crop'
    }
  ];

  for (let i = 0; i < dummyProducts.length; i++) {
    const prod = dummyProducts[i];
    console.log(`Adding: ${prod.name}`);
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Date.now().toString() + i, // Unique ID
        ...prod
      })
    });
    const data = await res.json();
    if (!data.success) {
      console.error('Failed to add:', prod.name, data.error);
    }
  }

  console.log('Seeding complete!');
}

seedData().catch(console.error);
