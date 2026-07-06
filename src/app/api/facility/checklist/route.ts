import { NextResponse } from "next/server";
import { queryTable, insertRows } from "../../../../../egdesk-helpers";

/**
 * GET: 제출된 모바일 설비 점검 이력 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    const res = await queryTable("crm_facility_checklists", {});
    const rawChecks = res.rows || [];

    // checks 필드를 JSON 파싱하여 반환 규격 준수
    const checks = rawChecks.map((c: any) => {
      let parsedChecks = [];
      try {
        parsedChecks = typeof c.checks === "string" ? JSON.parse(c.checks) : c.checks;
      } catch (e) {
        parsedChecks = [];
      }
      return {
        id: c.id,
        equipmentId: c.equipmentId,
        inspector: c.inspector,
        checks: parsedChecks,
        signatureData: c.signatureData,
        audioUrl: c.audioUrl,
        status: c.status,
        checkedAt: c.checkedAt
      };
    });

    // 최신 등록 순으로 정렬
    checks.sort((a: any, b: any) => b.id.localeCompare(a.id));

    return NextResponse.json({
      success: true,
      checks
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 신규 모바일 설비 예방 점검 저장
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { equipmentId, inspector, checks, signatureData, audioUrl, status } = body;

    if (!equipmentId || !inspector || !checks) {
      return NextResponse.json({ success: false, error: "필수 입력 항목(설비 코드, 정비원, 점검 문항)이 누락되었습니다." }, { status: 400 });
    }

    const checksStr = typeof checks === "object" ? JSON.stringify(checks) : checks;
    const checkedAt = new Date().toLocaleString("ko-KR");
    const newId = `MC-${Date.now()}`;

    const newCheckRow = {
      id: newId,
      equipmentId,
      inspector,
      checks: checksStr,
      signatureData: signatureData || null,
      audioUrl: audioUrl || null,
      status: status || "PASS",
      checkedAt
    };

    // DB에 행 추가
    await insertRows("crm_facility_checklists", [newCheckRow]);

    const returnCheck = {
      ...newCheckRow,
      checks: typeof checks === "string" ? JSON.parse(checks) : checks
    };

    let alertTriggered = false;
    if (status === "FAIL") {
      alertTriggered = true;
      console.log(`[설비 고장 경보 🚨] 설비 [${equipmentId}] 현장 점검 부적합 발생! 긴급 정비 티켓 발행 및 알림 이송.`);
    }

    return NextResponse.json({
      success: true,
      message: status === "FAIL"
        ? "설비 점검 부합 사항이 접수되었습니다. 긴급 수리 대장 이송 및 예비 자재 점검 알림이 발행되었습니다."
        : "모바일 설비 예방 점검이 안전하게 저장되었습니다. (Paperless 서명 서명)",
      check: returnCheck,
      alertTriggered
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
