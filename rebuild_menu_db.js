const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

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

function getDirectDB() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
    path.join(appData, 'EGDesk/database/user_data.db'),
    path.join(appData, 'egdesk/database/user_data.db')
  ];
  
  let targetPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }
  
  if (!targetPath) {
    targetPath = paths[0];
  }
  return new Database(targetPath.replace(/\\/g, '/'));
}

function main() {
  try {
    const db = getDirectDB();
    console.log("Rebuilding system_menu_settings table...");
    
    db.exec("BEGIN TRANSACTION;");
    
    // 1. 기존 데이터 비우기
    db.prepare("DELETE FROM system_menu_settings").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='system_menu_settings'").run();
    
    // 2. 45개 전체 초기 적재
    const insertStmt = db.prepare(`
      INSERT INTO system_menu_settings (menu_href, is_enabled, sort_order) 
      VALUES (?, 1, ?)
    `);
    
    DEFAULT_MENU_ITEMS.forEach((item, idx) => {
      insertStmt.run(item.href, (idx + 1) * 10);
    });
    
    db.exec("COMMIT;");
    console.log("Successfully rebuilt 45 menu items in system_menu_settings!");
    db.close();
  } catch (err) {
    console.error("Rebuild failed:", err);
  }
}

main();
