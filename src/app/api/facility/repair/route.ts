import { NextResponse } from "next/server";
import { queryTable, insertRows } from "../../../../../egdesk-helpers";

/**
 * GET: 수리 대장 조회 및 RAG 고장 해결 가이드 조회 (물리 DB 연동)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("query") || "";
    const errCodeQuery = searchParams.get("errorCode") || "";

    // 1. RAG 챗봇 질의 처리
    if (errCodeQuery) {
      const solutionRes = await queryTable("crm_facility_repair_solutions", { filters: { errorCode: errCodeQuery.toUpperCase() } });
      const dbSolution = solutionRes.rows && solutionRes.rows.length > 0 ? solutionRes.rows[0] : null;

      let solution;
      if (dbSolution) {
        let parsedActions = [];
        try {
          parsedActions = typeof dbSolution.actions === "string" ? JSON.parse(dbSolution.actions) : dbSolution.actions;
        } catch (e) {
          parsedActions = [];
        }
        solution = {
          rootCause: dbSolution.rootCause,
          actions: parsedActions,
          similarHistory: dbSolution.similarHistory,
          warehouse: dbSolution.warehouse
        };
      } else {
        solution = {
          rootCause: "알 수 없는 에러 코드이거나 비정형 결함입니다. 과거 데이터베이스에서 매칭되지 않았습니다.",
          actions: [
            "1. 설비 매뉴얼의 긴급 정지 및 고장 배선도를 확인하십시오.",
            "2. 센서 실시간 피드의 Anomaly Score 기여도 랭킹을 참고하십시오."
          ],
          similarHistory: "과거 유사 사례가 존재하지 않습니다.",
          warehouse: "확인 불가"
        };
      }

      return NextResponse.json({
        success: true,
        query: errCodeQuery,
        solution
      });
    }

    // 2. 수리 대장 필터링 및 조회
    let logsRes;
    if (keyword) {
      // 키워드 필터가 있을 시 대소문자 구분 없이 쿼리
      // egdesk-helpers의 queryTable은 간단한 필터만 지원하므로, raw 쿼리를 쓰지 않고 queryTable로 가져온 후 메모리 상에서 필터링하거나 filters를 적용할 수 있습니다.
      // 여기서는 수리 로그 수가 적으므로 queryTable로 전체를 조회한 후 메모리 필터링이 정밀합니다. (LIKE 복수 컬럼 검색 보장)
      logsRes = await queryTable("crm_facility_repair_logs", {});
    } else {
      logsRes = await queryTable("crm_facility_repair_logs", {});
    }

    let logs = (logsRes.rows || []).map((l: any) => ({
      id: l.id,
      date: l.date,
      equipmentId: l.equipmentId,
      equipmentName: l.equipmentName,
      errorCode: l.errorCode,
      symptom: l.symptom,
      repairDesc: l.repairDesc,
      mechanic: l.mechanic,
      cost: Number(l.cost || 0)
    }));

    if (keyword) {
      logs = logs.filter((log: any) => 
        (log.equipmentName || "").includes(keyword) || 
        (log.symptom || "").includes(keyword) || 
        (log.repairDesc || "").includes(keyword) || 
        (log.errorCode || "").includes(keyword)
      );
    }

    // 최신 등록 순 정렬
    logs.sort((a: any, b: any) => b.id.localeCompare(a.id));

    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 신규 수리 이력 등록 및 음성 STT 텍스트 보정 모킹
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, rawSpeechText, equipmentId, errorCode, symptom, mechanic } = body;

    // 음성(STT) 입력에 의한 보고서 자동 변환 모킹 (비즈니스 변환 로직)
    if (action === "voice_stt") {
      let correctedText = rawSpeechText;
      if (rawSpeechText.includes("3번 사출기 모터 베어링 마모")) {
        correctedText = "사출 1호기(M-500) 구동축 롤러 베어링 마모 점검 후 구리스 주입 및 고정 볼트 토크 조임 완료함.";
      }
      return NextResponse.json({
        success: true,
        originalText: rawSpeechText,
        correctedText,
      });
    }

    const eqNames: Record<string, string> = {
      "M-500": "사출 1호기",
      "M-300": "사출 2호기",
      "M-200": "사출 3호기",
      "A-100": "조립 라인 A"
    };

    const targetEqId = equipmentId || "M-500";
    const equipmentName = eqNames[targetEqId] || "기타 설비";

    // 신규 수리 이력 생성 및 DB 저장
    const newLog = {
      id: `REP-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleString("ko-KR"),
      equipmentId: targetEqId,
      equipmentName,
      errorCode: errorCode || "정기보전",
      symptom: symptom || "정기 예방 정비 실시",
      repairDesc: body.repairDesc || "점검 완료",
      mechanic: mechanic || "관리자",
      cost: Number(body.cost || 0)
    };

    await insertRows("crm_facility_repair_logs", [newLog]);

    return NextResponse.json({
      success: true,
      message: "설비 수리 보고서가 데이터베이스에 성공적으로 저장되었습니다.",
      log: newLog
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
