const API_URL = 'http://localhost:8080/user-data/tools/call';
const API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0'; // env.local 값

const DEFAULT_MENU_ITEMS = [
  { href: "/", label: "모바일 채널" },
  { href: "/sms", label: "무료 문자 발송 AI" },
  { href: "/message-logs", label: "발송 내역 조회" },
  { href: "/automation", label: "자동 발송 설정" },
  { href: "/customers", label: "고객 관리 AI" },
  { href: "/partners", label: "거래처 관리 AI" },
  { href: "/transactions", label: "거래 관리 AI" },
  { href: "/orders", label: "주문 관리 AI" },
  { href: "/payments", label: "결제 관리 AI" },
  { href: "/finance", label: "금융 정보 AI" },
  { href: "/financials", label: "재무 정보 AI" },
  { href: "/coupons", label: "쿠폰 관리 AI" },
  { href: "/reservations", label: "예약 관리 AI" },
  { href: "/deliveries", label: "배송 관리 AI" },
  { href: "/products", label: "상품 관리 AI" },
  { href: "/estimates", label: "견적/발주/수주 AI" },
  { href: "/snaptasks", label: "AI 스냅태스크" },
  { href: "/inventory", label: "재고 관리 AI" },
  { href: "/expenses", label: "지출 관리 AI" },
  { href: "/safety-management", label: "안전 관리 AI" },
  { href: "/quality-control", label: "품질 관리 AI" },
  { href: "/facility-management", label: "설비 관리 AI" },
  { href: "/finance-cashflow", label: "자금/원가 AI" },
  { href: "/production-plan", label: "생산 계획 AI" },
  { href: "/energy-management", label: "에너지 관리 AI" },
  { href: "/safety-detection", label: "위험 감지 AI" },
  { href: "/scm-management", label: "공급망 관리 AI" },
  { href: "/grant-management", label: "지원금 신청 AI" },
  { href: "/labor-management", label: "노무 관리 AI" },
  { href: "/lawyer-ai", label: "법률 상담 AI" },
  { href: "/credit-risk", label: "채권 관리 AI" },
  { href: "/password-ai", label: "비밀번호관리 AI" },
  { href: "/hr/attendance", label: "근태 관리 AI" },
  { href: "/price-tracker", label: "가격 추적 AI" },
  { href: "/website", label: "홈페이지 빌더 AI" },
  { href: "/recruitment", label: "채용 매니저 AI" },
  { href: "/instagram", label: "인스타그램 마케팅 AI" },
  { href: "/naver-blog", label: "N-BLOG 포스팅 AI" },
  { href: "/youtube-shorts", label: "YOUTUBE 쇼츠 AI" },
  { href: "/knowledge-ai", label: "지식 관리 AI" },
  { href: "/ecount-erp-ai", label: "이카운트 ERP AI" },
  { href: "/rnd-management", label: "연구소 관리 AI" },
  { href: "/form-management-new", label: "양식 관리 AI" },
  { href: "/meeting-minutes", label: "회의 기록 AI" },
  { href: "/import-customs", label: "수입 통관 AI" },
  { href: "/ai-briefing", label: "AI 브리핑" }
];

async function callTool(tool, args) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY
    },
    body: JSON.stringify({ tool, arguments: args })
  });
  return res.json();
}

async function main() {
  try {
    console.log("Cleaning current menu settings via 8080 MCP server...");
    const cleanRes = await callTool('user_data_delete_rows', {
      tableName: 'system_menu_settings'
    });
    console.log("Delete result:", cleanRes.success);

    console.log("Inserting 45 default items...");
    const insertData = DEFAULT_MENU_ITEMS.map((item, idx) => ({
      menu_href: item.href,
      is_enabled: 1,
      sort_order: (idx + 1) * 10
    }));

    const insertRes = await callTool('user_data_insert_rows', {
      tableName: 'system_menu_settings',
      rows: insertData
    });
    console.log("Insert result:", insertRes.success);
    
    if (insertRes.success) {
      console.log("Successfully restored 45 menu items via MCP!");
    }
  } catch (err) {
    console.error("Failed to restore via MCP:", err);
  }
}

main();
