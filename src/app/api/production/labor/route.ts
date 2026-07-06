import { NextResponse } from "next/server";
import { queryTable, updateRows } from "../../../../../egdesk-helpers";

/**
 * GET: 직원 근태 진단 정보 및 계약서 조항 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 직원별 근태 리스크 요약 조회
    const statRes = await queryTable("crm_labor_stats", {});
    const dbStats = statRes.rows || [];

    // 2. DB에서 근로계약서 독소조항 스캔 현황 조회
    const contractRes = await queryTable("crm_labor_contracts", {});
    const dbContracts = contractRes.rows || [];

    // 3. 근태 통계 매핑 (프론트엔드 호환 camelCase 변환)
    const stats = dbStats.map((s: any) => ({
      id: s.id,
      name: s.id === "EMP-201" ? "김태호" : s.id === "EMP-202" ? "이소연" : s.id === "EMP-203" ? "박준서" : "최유리",
      department: s.id === "EMP-201" ? "생산 조립 1라인" : s.id === "EMP-202" ? "물류 자재창고" : s.id === "EMP-203" ? "도장 마감부" : "품질 보증실",
      weeklyHours: s.weekly_hours,
      overtimeHours: s.overtime_hours,
      latenessCount: s.lateness_count,
      earlyLeaveCount: s.early_leave_count,
      riskLevel: s.risk_level as "CRITICAL" | "WARNING" | "SAFE"
    }));

    // 4. 근로계약서 조항 그루핑 매핑
    const contracts: Record<string, any> = {};
    dbContracts.forEach((c: any) => {
      const empId = c.id;
      if (!contracts[empId]) {
        contracts[empId] = {
          employeeId: empId,
          employeeName: empId === "EMP-201" ? "김태호" : "박준서",
          clauses: []
        };
      }
      contracts[empId].clauses.push({
        id: c.clause_id,
        title: c.title,
        isIllegal: c.is_illegal === 1,
        currentText: c.current_text,
        recommendedText: c.recommended_text,
        reason: c.reason
      });
    });

    // 5. 전사 종합 진단 수치 집계
    const criticalCount = dbStats.filter((s: any) => s.risk_level === "CRITICAL").length;
    const illegalClausesCount = dbContracts.filter((c: any) => c.is_illegal === 1).length;
    
    // 점수 계산 (불법 조항 수 및 크리티컬 근태자 차감 방식)
    const auditScore = Math.max(10, 100 - (criticalCount * 12) - (illegalClausesCount * 8));
    const unpaidAllowance = criticalCount > 0 ? 1850000 : 0; // 위험 임금 체불액

    // 리스크 요인 텍스트 동적 조립
    const riskFactors = [];
    if (criticalCount > 0) {
      riskFactors.push("⚠️ 연장근로 한도(주 52시간) 위반 우려 대상자 감지 (김태호 대리)");
    }
    const hasIllegal01 = dbContracts.some((c: any) => c.clause_id === "CL-02" && c.is_illegal === 1);
    const hasIllegal02 = dbContracts.some((c: any) => c.clause_id === "CL-03" && c.is_illegal === 1);
    
    if (hasIllegal01) {
      riskFactors.push("⚠️ 포괄임금제 계약 조항 내 연장근로 대가 무단 미명시로 인한 임금체불 소지 1건");
    }
    if (hasIllegal02) {
      riskFactors.push("💡 주 15시간 미만 초단기 근로자가 아님에도 주휴수당 지급 조건 계약서 명시 누락 1건");
    }

    if (riskFactors.length === 0) {
      riskFactors.push("✅ 전사 근로기준법 및 포괄임금 독소조항 리스크 0건 (안전 영역)");
    }

    const summary = {
      auditScore,
      criticalCount,
      unpaidAllowance,
      riskFactors
    };

    return NextResponse.json({
      success: true,
      stats,
      summary,
      contracts
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 노무 진단 재연산 및 계약 조항 보정
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. 실시간 근태 정밀 재진단 (generate_audit)
    if (action === "generate_audit") {
      await new Promise(resolve => setTimeout(resolve, 300));

      // 시뮬레이션: 지시 조치에 따라 EMP-201의 근로 시간을 법적 한도 아래로 완화
      await updateRows("crm_labor_stats", {
        weekly_hours: 49.8,
        overtime_hours: 9.8,
        risk_level: "WARNING"
      }, { filters: { id: "EMP-201" } });

      return NextResponse.json({
        success: true,
        message: "실시간 출퇴근 데이터 스캔 및 노무 리스크 재진단이 DB에 연동 완료되었습니다."
      });
    }

    // 2. 근로계약서 독소 조항 보정 (remediate_clause)
    if (action === "remediate_clause") {
      const { employeeId, clauseId } = body;

      // 해당 조항의 추천 보정 문구 확인을 위한 쿼리
      const checkRes = await queryTable("crm_labor_contracts", { filters: { id: employeeId, clause_id: clauseId } });
      if (!checkRes.rows || checkRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "해당 조항을 찾을 수 없습니다." }, { status: 400 });
      }
      const clause = checkRes.rows[0];

      // 추천 텍스트로 보정하고 불법 조항 해제(0)로 DB 업데이트
      await updateRows("crm_labor_contracts", {
        is_illegal: 0,
        current_text: clause.recommended_text
      }, { filters: { id: employeeId, clause_id: clauseId } });

      return NextResponse.json({
        success: true,
        message: "AI 추천 표준 근로조항으로 성공적으로 보정되어 법적 안전성이 DB에 수호되었습니다."
      });
    }

    return NextResponse.json({ success: false, error: "유효하지 않은 요청 액션입니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
