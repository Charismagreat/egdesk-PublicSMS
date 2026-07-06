export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { listTables, deleteTable, insertRows } from '../../../../egdesk-helpers';
import { setupDatabase } from '@/lib/setup-db';

export async function GET() {
  try {
    // 1. 기존 테이블 모두 삭제
    const tablesRes = await listTables();
    if (tablesRes.success && tablesRes.tables) {
      for (const t of tablesRes.tables) {
        console.log(`Deleting table ${t.tableName}...`);
        await deleteTable(t.tableName);
      }
    }

    // 🪓 crm_partners 와 crm_partner_contacts 를 강제 DROP하여 새 INTEGER PK 구조를 완전히 물리 적용시킵니다.
    try {
      const { executeSQL } = require('../../../../egdesk-helpers');
      await executeSQL("DROP TABLE IF EXISTS crm_partner_contacts");
      await executeSQL("DROP TABLE IF EXISTS crm_partners");
      console.log("✓ crm_partners & contacts 테이블 물리 DROP 완료");
    } catch (dropErr) {
      console.warn("테이블 DROP 실패:", dropErr);
    }

    // 2. 스키마 재생성
    console.log('Recreating tables via setupDatabase...');
    await setupDatabase();

    let guardErrorMessage = "";
    // 🪓 Next.js 빌드/메모리 캐시 등으로 인한 setupDatabase의 TEXT PK 재생성 방지용 물리 DDL 보정 가드
    try {
      const { executeSQL } = require('../../../../egdesk-helpers');
      
      // crm_partners 테이블의 DDL을 명시적으로 체크하여 INTEGER PK로 강제 재구축
      const checkDdl = await executeSQL("SELECT sql FROM sqlite_master WHERE type='table' AND name='crm_partners'");
      const ddlSql = checkDdl.rows?.[0]?.sql || checkDdl[0]?.sql || "";
      
      if (ddlSql && !ddlSql.toLowerCase().includes('id" integer') && !ddlSql.toLowerCase().includes('id integer')) {
        console.log("⚠️ 캐시 핫리로드 지연으로 crm_partners가 TEXT id로 재작성되었습니다. 강제 보정 DDL을 태웁니다.");
        await executeSQL("DROP TABLE IF EXISTS crm_partners");
        
        await executeSQL(`
          CREATE TABLE "crm_partners" (
            "id" INTEGER PRIMARY KEY NOT NULL,
            "type" TEXT NOT NULL,
            "company_name" TEXT NOT NULL,
            "business_number" TEXT,
            "representative" TEXT,
            "phone" TEXT,
            "fax" TEXT,
            "manager_name" TEXT,
            "manager_phone" TEXT,
            "manager_email" TEXT,
            "email" TEXT,
            "address" TEXT,
            "vip_level" TEXT DEFAULT 'NORMAL',
            "credit_limit" INTEGER DEFAULT 0,
            "business_license_url" TEXT,
            "memo" TEXT,
            "created_at" TEXT NOT NULL,
            "uuid" TEXT,
            "updated_at" TEXT,
            "updated_by" TEXT,
            "deleted_at" TEXT,
            "deleted_by" TEXT,
            "restored_at" TEXT,
            "restored_by" TEXT
          )
        `);
        console.log("✓ crm_partners 테이블 INTEGER id 물리 DDL 직접 구축 완료");
      }
    } catch (guardErr: any) {
      console.error("물리 DDL 가드 기동 실패:", guardErr.message);
      guardErrorMessage = guardErr.message;
    }

    // 3. 더미 데이터 생성 및 삽입
    console.log('Inserting dummy data...');
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

    return NextResponse.json({ success: true, message: 'DB reset and dummy data inserted completely.', debugMessage: 'guard_v1', guardError: guardErrorMessage });
  } catch (error: any) {
    console.error('Reset error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
