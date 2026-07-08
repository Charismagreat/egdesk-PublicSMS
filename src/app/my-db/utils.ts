export function getTableDisplayName(tableName: string): string {
  if (!tableName) return "";
  
  const mapping: Record<string, string> = {
    crm_expenses: "지출 장부 관리",
    crm_operators: "운영자 권한 관리",
    crm_customers: "고객 명단 관리",
    crm_partners: "거래처 정보 관리",
    crm_estimates: "견적서 관리",
    crm_orders: "주문 내역 관리",
    products: "광고 상품 관리",
    expense_projects: "지출 프로젝트 관리",
    crm_instagram_posts: "인스타그램 포스트 관리",
    crm_naver_blog_posts: "네이버 블로그 포스트 관리",
    crm_partner_contacts: "거래처 담당자 명함첩",
    crm_payments: "결제 내역 관리",
    crm_point_history: "포인트 이용 내역",
    crm_purchase_orders: "구매 발주서 관리",
    crm_reservations: "예약 현황 관리"
  };

  return mapping[tableName] || tableName;
}

export function getColumnFriendlyName(colName: string): string {
  if (!colName) return "";

  const mapping: Record<string, string> = {
    id: "일련번호",
    created_at: "생성일시",
    updated_at: "수정일시",
    deleted_at: "삭제일시",
    created_by: "생성자",
    updated_by: "수정자",
    deleted_by: "삭제자",
    amount: "금액",
    name: "이름",
    phone: "연락처",
    email: "이메일",
    status: "상태"
  };

  return mapping[colName] || colName;
}

export function isSensitiveColumn(colName: string): boolean {
  if (!colName) return false;
  const lower = colName.toLowerCase();
  return ["password", "pwd", "token", "deleted_at", "deleted_by", "secret", "key"].includes(lower);
}
