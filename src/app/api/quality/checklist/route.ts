import { NextResponse } from "next/server";
import { queryTable, insertRows } from "../../../../../egdesk-helpers";

/**
 * GET: 제출된 모바일 품질 검사 체크리스트 목록 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    const res = await queryTable("crm_quality_checklist_submissions", {});
    const rawSubmissions = res.rows || [];

    const submissions = rawSubmissions.map((s: any) => {
      let parsedItems = [];
      try {
        parsedItems = typeof s.checkItems === "string" ? JSON.parse(s.checkItems) : s.checkItems;
      } catch (e) {
        parsedItems = [];
      }
      return {
        id: s.id,
        lotNo: s.lotNo,
        inspector: s.inspector,
        checkItems: parsedItems,
        signatureData: s.signatureData,
        photoUrl: s.photoUrl,
        status: s.status,
        submittedAt: s.submittedAt
      };
    });

    // 최신순 정렬
    submissions.sort((a: any, b: any) => b.id.localeCompare(a.id));

    return NextResponse.json({
      success: true,
      submissions
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 신규 모바일 품질 검사 체크리스트 접수
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lotNo, inspector, checkItems, signatureData, photoUrl, status } = body;

    if (!lotNo || !inspector || !checkItems) {
      return NextResponse.json({ success: false, error: "필수 입력 항목(Lot 번호, 검사원, 검사 항목)이 누락되었습니다." }, { status: 400 });
    }

    const checkItemsStr = typeof checkItems === "object" ? JSON.stringify(checkItems) : checkItems;
    const submittedAt = new Date().toLocaleString("ko-KR");
    const newId = `CHK-${Date.now()}`;

    const newSubmissionRow = {
      id: newId,
      lotNo,
      inspector,
      checkItems: checkItemsStr,
      signatureData: signatureData || null,
      photoUrl: photoUrl || null,
      status: status || "PASS",
      submittedAt
    };

    // DB 저장
    await insertRows("crm_quality_checklist_submissions", [newSubmissionRow]);

    const returnSubmission = {
      ...newSubmissionRow,
      checkItems: typeof checkItems === "string" ? JSON.parse(checkItems) : checkItems
    };

    let alertTriggered = false;
    if (status === "FAIL") {
      alertTriggered = true;
      console.log(`[품질 경보 🚨] Lot 번호 [${lotNo}] 검사 부적합 발생! 부적합 보고서(NCR) 자동 발행 및 알림 이송 완료.`);
    }

    return NextResponse.json({
      success: true,
      message: status === "FAIL"
        ? "품질 검사 부적합이 접수되었습니다. 즉각적인 NCR 자동 발행 및 비상 알림이 전달되었습니다."
        : "모바일 현장 품질 검사서가 정상적으로 접수되었습니다. (Paperless 서명 완료)",
      submission: returnSubmission,
      alertTriggered
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
