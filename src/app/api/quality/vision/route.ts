import { NextResponse } from "next/server";
import { queryTable, updateRows } from "../../../../../egdesk-helpers";

/**
 * GET: 비전 모델 상태 및 검출 이력 리스트 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 모델 기본 사양 조회 (ID: VIS-MODEL 단일 행)
    const modelRes = await queryTable("crm_quality_vision_model", { filters: { id: "VIS-MODEL" } });
    const dbModel = modelRes.rows && modelRes.rows.length > 0 ? modelRes.rows[0] : null;

    const modelStatus = {
      activeModel: dbModel ? dbModel.activeModel : "Unsupervised PatchCore v2.1",
      goldenSamplesCount: dbModel ? Number(dbModel.goldenSamplesCount || 0) : 85,
      lastTrainedAt: dbModel ? dbModel.lastTrainedAt : "2026-06-05 14:30:22",
      anomalyThreshold: dbModel ? Number(dbModel.anomalyThreshold || 0) : 75.0,
    };

    // 2. DB에서 비전 판정 로그 조회
    const logsRes = await queryTable("crm_quality_vision_logs", {});
    const logs = (logsRes.rows || []).map((l: any) => ({
      id: l.id,
      timestamp: l.timestamp,
      itemName: l.itemName,
      anomalyScore: Number(l.anomalyScore || 0),
      status: l.status,
      defectType: l.defectType,
      imageUrl: l.imageUrl,
      isReviewed: l.isReviewed === 1
    }));

    // 최신 시간순 정렬
    logs.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));

    return NextResponse.json({
      success: true,
      modelStatus,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 노코드 모델 재학습 및 임계치 업데이트
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, threshold, newGoldenSamples } = body;

    const targetModelId = "VIS-MODEL";

    if (action === "retrain") {
      // 1. 기존 모델 정보 조회
      const modelRes = await queryTable("crm_quality_vision_model", { filters: { id: targetModelId } });
      const dbModel = modelRes.rows && modelRes.rows.length > 0 ? modelRes.rows[0] : null;
      
      const currentSamples = dbModel ? Number(dbModel.goldenSamplesCount || 0) : 85;
      const nextSamples = currentSamples + (newGoldenSamples || 0);
      const nextThreshold = threshold || (dbModel ? Number(dbModel.anomalyThreshold || 0) : 75.0);
      const lastTrainedAt = new Date().toLocaleString("ko-KR");

      // 2. DB 갱신
      await updateRows("crm_quality_vision_model", {
        activeModel: "Unsupervised PatchCore v2.1 (훈련 중)",
        goldenSamplesCount: nextSamples,
        lastTrainedAt,
        anomalyThreshold: nextThreshold
      }, { filters: { id: targetModelId } });

      return NextResponse.json({
        success: true,
        message: "Golden Sample 기반 Vision AI 모델 재학습이 성공적으로 시작되었습니다. 완료 후 대시보드에 적용됩니다.",
        modelStatus: {
          activeModel: "Unsupervised PatchCore v2.1 (훈련 중)",
          goldenSamplesCount: nextSamples,
          lastTrainedAt,
          anomalyThreshold: nextThreshold,
        }
      });
    }

    if (action === "update_threshold") {
      const nextThreshold = threshold !== undefined ? Number(threshold) : 75.0;

      // DB 갱신
      await updateRows("crm_quality_vision_model", {
        anomalyThreshold: nextThreshold
      }, { filters: { id: targetModelId } });

      return NextResponse.json({
        success: true,
        message: `이상 검출 임계치가 ${nextThreshold}%로 변경되었습니다.`,
        threshold: nextThreshold,
      });
    }

    return NextResponse.json({ success: false, error: "알 수 없는 요청입니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
