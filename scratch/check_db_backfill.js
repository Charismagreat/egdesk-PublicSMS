const { queryTable, insertRows } = require('../egdesk-helpers');

const DEFAULT_MENU_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/sms", label: "무료 문자 발송 AI" },
  { href: "/message-logs", label: "발송 내역 조회" },
  { href: "/automation", label: "자동 발송 설정" },
  { href: "/customers", label: "고객 관리 AI" },
  { href: "/partners", label: "거래처 관리 AI" },
  { href: "/transactions", label: "거래 관리 AI" },
  { href: "/orders", label: "주문 관리 AI" },
  { href: "/payments", label: "결제 관리 AI" },
  { href: "/finance", label: "금융 정보 AI" },
  { href: "/coupons", label: "쿠폰 관리 AI" },
  { href: "/reservations", label: "예약 관리 AI" },
  { href: "/deliveries", label: "배송 관리 AI" },
  { href: "/products", label: "상품 관리 AI" },
  { href: "/estimates", label: "견적/발주/수주 AI" },
  { href: "/snaptasks", label: "AI 스냅태스크" },
  { href: "/inventory", label: "재고 관리 AI" },
  { href: "/expenses", label: "지출 관리 AI" },
  { href: "/price-tracker", label: "가격 추적 AI" },
  { href: "/website", label: "홈페이지 빌더 AI" },
  { href: "/recruitment", label: "채용 매니저 AI" },
  { href: "/instagram", label: "인스타그램 마케팅 AI" },
  { href: "/naver-blog", label: "N-BLOG 포스팅 AI" },
  { href: "/youtube-shorts", label: "YOUTUBE 쇼츠 AI" },
  { href: "/ai-briefing", label: "AI 브리핑" }
];

async function checkAndBackfill() {
  try {
    const result = await queryTable('system_menu_settings', { orderBy: 'sort_order', orderDirection: 'ASC' });
    let rows = result.rows || [];
    console.log('Current rows count:', rows.length);

    if (rows.length === 0) {
      console.log('No settings found. Backfilling...');
      const insertData = DEFAULT_MENU_ITEMS.map((item, index) => ({
        menu_href: item.href,
        is_enabled: 1,
        sort_order: (index + 1) * 10
      }));

      await insertRows('system_menu_settings', insertData);
      console.log('Backfill inserted!');

      const freshResult = await queryTable('system_menu_settings', { orderBy: 'sort_order', orderDirection: 'ASC' });
      rows = freshResult.rows || [];
    }

    console.log('Final Rows in DB:');
    rows.forEach(r => {
      console.log(`Href: ${r.menu_href.padEnd(25)} | Enabled: ${r.is_enabled} | Order: ${r.sort_order}`);
    });

  } catch (err) {
    console.error('Test error:', err);
  }
}

checkAndBackfill();
