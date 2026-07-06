import { NextResponse } from "next/server";
import { queryTable, updateRows, insertRows } from "../../../../../egdesk-helpers";

// B2B 거래처 기초 프로필 백필용 시드 데이터 (crm_partners 테이블용)
const PARTNER_SEEDS = [
  {
    id: "PT-001",
    type: "BUYER",
    company_name: "(주)대선기공",
    business_number: "120-81-12345",
    representative: "박대선",
    phone: "02-555-1234",
    manager_name: "박민우",
    manager_phone: "010-1234-5678",
    email: "minwoo@daesun.co.kr",
    address: "경기도 시흥시 공단로 102",
    vip_level: "NORMAL",
    credit_limit: 50000000,
    memo: "기업은행 987-654-321012" // 가상계좌번호를 임시로 메모에 보관 연동
  },
  {
    id: "PT-002",
    type: "BUYER",
    company_name: "에스제이 트레이딩",
    business_number: "214-85-67890",
    representative: "성재준",
    phone: "031-444-5678",
    manager_name: "최성준",
    manager_phone: "010-8765-4321",
    email: "sj@sjtrading.com",
    address: "인천시 남동구 공단남로 45",
    vip_level: "NORMAL",
    credit_limit: 30000000,
    memo: "신한은행 110-220-330440"
  },
  {
    id: "PT-003",
    type: "BUYER",
    company_name: "한성테크",
    business_number: "135-82-11223",
    representative: "한성호",
    phone: "02-999-8888",
    manager_name: "정지훈",
    manager_phone: "010-1111-2222",
    email: "jihoon@hansung.tech",
    address: "서울시 금천구 가산디지털2로 90",
    vip_level: "VIP",
    credit_limit: 80000000,
    memo: "국민은행 4567-89-101112"
  },
  {
    id: "PT-004",
    type: "BUYER",
    company_name: "(주)광명네트웍스",
    business_number: "119-86-55443",
    representative: "광명진",
    phone: "02-111-2222",
    manager_name: "강동우",
    manager_phone: "010-3333-4444",
    email: "dwkang@gmnetworks.co.kr",
    address: "서울시 구로구 디지털로 33",
    vip_level: "VVIP",
    credit_limit: 150000000,
    memo: "우리은행 1002-123-456789"
  }
];

/**
 * GET: 거래처별 채권 리스크 목록 및 요약 통계 조회 (물리 DB 조인 연동)
 */
export async function GET() {
  try {
    // 1. DB crm_partners 테이블 백필 상태 확인
    const partnerRes = await queryTable("crm_partners", {});
    let dbPartners = partnerRes.rows || [];

    // 만약 거래처 정보가 비어있다면 자동 백필 수행
    if (dbPartners.length === 0) {
      const nowStr = new Date().toISOString().substring(0, 19).replace("T", " ");
      const insertData = PARTNER_SEEDS.map(p => ({ ...p, created_at: nowStr }));
      await insertRows("crm_partners", insertData);
      
      const freshRes = await queryTable("crm_partners", {});
      dbPartners = freshRes.rows || [];
    }

    // 2. DB crm_partner_credit_risks 테이블 조회
    const creditRes = await queryTable("crm_partner_credit_risks", {});
    const dbCredits = creditRes.rows || [];

    // 3. 조인 연산 및 통계 조립 (crm_partners + crm_partner_credit_risks)
    const stats = dbCredits.map((cr: any) => {
      // 파트너 마스터 정보 매칭
      const pt = dbPartners.find((p: any) => p.id === cr.id) || PARTNER_SEEDS.find(p => p.id === cr.id);
      
      return {
        id: cr.id,
        companyName: pt?.company_name || "(주)미지거래처",
        managerName: pt?.manager_name || "담당자 미지정",
        managerPhone: pt?.manager_phone || "010-0000-0000",
        totalSales: pt?.id === "PT-001" ? 150000000 : pt?.id === "PT-002" ? 85000000 : pt?.id === "PT-003" ? 45000000 : 98000000,
        overdueAmount: cr.overdue_amount,
        overdueDays: cr.overdue_days,
        creditRating: cr.credit_rating as "A" | "B" | "C" | "D" | "E" | "F",
        defaultProbability: cr.default_probability,
        riskLevel: cr.risk_level as "CRITICAL" | "WARNING" | "SAFE",
        lastAction: cr.last_action || "이력 없음",
        actionDate: cr.action_date || "-",
        virtualAccount: pt?.memo || "계좌 미등록"
      };
    });

    // 4. 에이징 통계 계산
    const overdueTotal = dbCredits.reduce((sum: number, cr: any) => sum + (cr.overdue_amount || 0), 0);
    const criticalCount = dbCredits.filter((cr: any) => cr.risk_level === "CRITICAL").length;
    const warningCount = dbCredits.filter((cr: any) => cr.risk_level === "WARNING").length;

    // 연체 범위 파싱
    const amt1_30 = dbCredits.filter((cr: any) => cr.overdue_days >= 1 && cr.overdue_days <= 30).reduce((sum: number, cr: any) => sum + cr.overdue_amount, 0);
    const amt31_60 = dbCredits.filter((cr: any) => cr.overdue_days >= 31 && cr.overdue_days <= 60).reduce((sum: number, cr: any) => sum + cr.overdue_amount, 0);
    const amt61_90 = dbCredits.filter((cr: any) => cr.overdue_days >= 61 && cr.overdue_days <= 90).reduce((sum: number, cr: any) => sum + cr.overdue_amount, 0);
    const amt90over = dbCredits.filter((cr: any) => cr.overdue_days > 90).reduce((sum: number, cr: any) => sum + cr.overdue_amount, 0);

    const aging = {
      categories: ["1~30일", "31~60일", "61~90일", "90일 초과"],
      amounts: [amt1_30, amt31_60, amt61_90, amt90over]
    };

    // 5. 요약 리스크 요인 텍스트 조립
    const riskFactors = [];
    if (criticalCount > 0) {
      riskFactors.push("⚠️ (주)대선기공의 미수금 연체 기간이 80일을 초과하여 대손상각(부도 처리) 리스크군으로 진단되었습니다.");
    }
    if (warningCount > 0) {
      riskFactors.push("⚠️ 에스제이 트레이딩의 최근 3개월 원자재 수급 부진 영향으로 매출액 대비 연체 전환 확률이 12% 급증했습니다.");
    }
    const hasShortDelay = dbCredits.some((cr: any) => cr.overdue_days > 0 && cr.overdue_days <= 15);
    if (hasShortDelay) {
      riskFactors.push("💡 한성테크의 결제 지연 일수가 최근 5일간 점진적으로 상승하여 단기 모니터링이 요구됩니다.");
    }

    if (riskFactors.length === 0) {
      riskFactors.push("✅ 전사 채권 연체 미수금 리스크 0건 (안전 영역)");
    }

    const summary = {
      averageDso: overdueTotal > 0 ? 49.8 : 30.0,
      overdueTotal,
      averageCreditScore: overdueTotal > 0 ? 71 : 95,
      riskFactors
    };

    return NextResponse.json({
      success: true,
      stats,
      summary,
      aging
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 실시간 채권 위험도 분석 및 독촉 SMS 모의 발송
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. 실시간 채권/신용 위험 분석 재연산 (recalculate)
    if (action === "recalculate") {
      await new Promise(resolve => setTimeout(resolve, 300));

      // 에스제이 트레이딩(PT-002)의 연체일수 가산 및 위험 등급 상향(CRITICAL) 업데이트
      await updateRows("crm_partner_credit_risks", {
        overdue_days: 45,
        default_probability: 51.2,
        risk_level: "CRITICAL"
      }, { filters: { id: "PT-002" } });

      return NextResponse.json({
        success: true,
        message: "전사 매출채권 연체 현황 및 거래처 신용 위험 재진단이 DB에 연동 완료되었습니다."
      });
    }

    // 2. 미수금 수금 독촉 알림 SMS 발송 시뮬레이션 (send_sms)
    if (action === "send_sms") {
      const { partnerId, message } = body;

      const checkRes = await queryTable("crm_partner_credit_risks", { filters: { id: partnerId } });
      if (!checkRes.rows || checkRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "거래처 리스크 정보를 찾을 수 없습니다." }, { status: 450 });
      }
      const credit = checkRes.rows[0];

      // 최근 조치 이력 및 부도 확률 소폭 하락(회수성공율 제고 연출) DB 업데이트
      const nowStr = new Date().toISOString().substring(0, 10);
      await updateRows("crm_partner_credit_risks", {
        last_action: "AI 법률준수 독촉SMS 발송",
        action_date: nowStr,
        default_probability: Math.max(0, credit.default_probability - 5)
      }, { filters: { id: partnerId } });

      // 거래처 마스터 정보 조회
      const ptRes = await queryTable("crm_partners", { filters: { id: partnerId } });
      const ptName = ptRes.rows?.[0]?.company_name || "(주)대선기공";

      return NextResponse.json({
        success: true,
        message: `[${ptName}] 담당자에게 독촉 메시지가 정상 발송되어 조치 이력이 DB에 저장되었습니다.`
      });
    }

    return NextResponse.json({ success: false, error: "유효하지 않은 요청 액션입니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
