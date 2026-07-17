"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function DynamicTitleHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === "/estimates/print-pdf") {
      return;
    }
    let title = "EGDESK SMS"; // 기본값

    // 정적 경로와 메뉴명 매핑
    const staticTitles: Record<string, string> = {
      "/": "대시보드",
      "/sms": "무료 문자 발송 AI",
      "/message-logs": "발송 내역 조회",
      "/automation": "자동 발송 설정",
      "/customers": "고객 관리 AI",
      "/partners": "거래처 관리 AI",
      "/transactions": "거래 관리 AI",
      "/orders": "주문 관리 AI",
      "/payments": "결제 관리 AI",
      "/finance": "금융 정보 AI",
      "/finance-management": "금융 관리 AI",
      "/financials": "재무 정보 AI",
      "/coupons": "쿠폰 관리 AI",
      "/reservations": "예약 관리 AI",
      "/deliveries": "배송 관리 AI",
      "/products": "상품 관리 AI",
      "/estimates": "견적/발주/수주 AI",
      "/estimates/manufacture-write": "(제조)보낼 견적서 작성 AI",
      "/estimates/general-write": "(일반)보낼 견적서 작성 AI",
      "/estimates/purchase-order-write": "보낼 발주서 작성 AI",
      "/estimates/statement-write": "보낼 거래명세서 작성 AI",
      "/estimates/manufacture-webview": "(제조)보낸 견적서 상세 내역",
      "/snaptasks": "AI 스냅태스크",
      "/inventory": "재고 관리 AI",
      "/expenses": "지출 관리 AI",
      "/price-tracker": "가격 추적 AI",
      "/website": "홈페이지 빌더 AI",
      "/instagram": "인스타그램 마케팅 AI",
      "/naver-blog": "N-BLOG 포스팅 AI",
      "/youtube-shorts": "YOUTUBE 쇼츠 AI",
      "/knowledge-ai": "지식 관리 AI",
      "/finance-cashflow": "자금/원가 AI",
      "/lawyer-ai": "법률 상담 AI",
      "/credit-risk": "채권 관리 AI",
      "/mail-management-ai": "메일 관리 AI",
      "/form-management-new": "양식 관리 AI",
      "/meeting-minutes": "회의 기록 AI",
      "/settings": "시스템 설정",
      "/ai-settings": "AI 비서 및 하이브리드 라우팅 설정",
      "/login": "로그인",
      "/admin/members": "회원 관리 대장",
      "/my-db": "MY DB",
      "/employees": "직원 관리 대장",
      "/hr/attendance": "근태 관리 AI"
    };

    // 동적 경로 및 특수 조건 분기
    if (pathname === "/estimates/web-view") {
      const typeParam = searchParams.get("type") || "inbound_est";
      const isStatementParam = searchParams.get("is_statement") === "true";
      if (typeParam === "outbound_est" && isStatementParam) {
        title = "보낸 거래명세서 상세 내역";
      } else if (typeParam === "inbound_est" && isStatementParam) {
        title = "받은 거래명세서 상세 내역";
      } else {
        const typeConfig: Record<string, string> = {
          inbound_est: "받은 견적서 상세 내역",
          inbound_po: "보낸 발주서 상세 내역",
          outbound_est: "(일반)보낸 견적서 상세 내역",
          outbound_so: "받은 발주서 상세 내역",
        };
        title = typeConfig[typeParam] || "B2B 대장 내역";
      }
    } else if (pathname.startsWith("/form-management-new/print")) {
      title = "양식 인쇄 및 미리보기";
    } else if (pathname.startsWith("/shared/view")) {
      title = "공유 문서 뷰어";
    } else if (pathname.startsWith("/store")) {
      title = "EGDESK SHOP";
      // 🏢 테넌트 설정의 회사명과 브라우저 탭 타이틀 실시간 동기화
      apiFetch('/api/settings?key=my_company_profile')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.value) {
            const parsed = JSON.parse(data.value);
            if (parsed.companyName) {
              const storeTitle = parsed.companyName.endsWith("SHOP") ? parsed.companyName : `${parsed.companyName} SHOP`;
              document.title = storeTitle;
            }
          }
        })
        .catch(err => console.warn('상점 타이틀 동적 로드 실패:', err));
    } else if (pathname.startsWith("/table-order")) {
      title = "테이블 오더";
    } else if (pathname.startsWith("/booking")) {
      title = "예약 시스템";
    } else if (pathname.startsWith("/m/")) {
      const subPath = pathname.substring(3);
      if (subPath === "grant-management") title = "모바일 지원금 신청";
      else if (subPath.startsWith("expenses")) title = "모바일 지출결의";
      else title = "임직원 모바일 포털";
    } else if (pathname.startsWith("/expenses/mobile-approve")) {
      title = "모바일 결재 승인";
    } else if (pathname.startsWith("/employee")) {
      title = "임직원 정보 시스템";
    } else if (pathname.startsWith("/interpretation-ai")) {
      title = "AI 동시 통역기";
    } else {
      // 일반 정확도 매칭
      title = staticTitles[pathname] || staticTitles[pathname.replace(/\/$/, "")] || "EGDESK SMS";
    }

    document.title = title;
  }, [pathname, searchParams]);

  return null;
}

export default function DynamicTitle() {
  return (
    <Suspense fallback={null}>
      <DynamicTitleHandler />
    </Suspense>
  );
}
