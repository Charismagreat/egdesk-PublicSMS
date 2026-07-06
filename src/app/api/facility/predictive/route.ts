import { NextResponse } from "next/server";
import { queryTable } from "../../../../../egdesk-helpers";

/**
 * GET: 예지보전 센서 상태 및 수명 예측 지표 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    const targetEqId = "EQ-PRESS-01";

    // 1. DB에서 설비 건전도 점수 및 실시간 진동 요약 조회
    const summaryRes = await queryTable("crm_facility_predictive_summary", { filters: { equipmentId: targetEqId } });
    const summaryRow = summaryRes.rows && summaryRes.rows.length > 0 ? summaryRes.rows[0] : null;

    const equipmentId = summaryRow ? summaryRow.equipmentId : targetEqId;
    const equipmentName = summaryRow ? summaryRow.equipmentName : "주력 사출 프레스 M-500";
    const healthScore = summaryRow ? Number(summaryRow.healthScore || 0) : 84.5;
    const vibrationRms = summaryRow ? Number(summaryRow.vibrationRms || 0) : 2.8;

    // 2. DB에서 진동 추이 시계열 데이터 조회
    const vibRes = await queryTable("crm_facility_predictive_vibration", { filters: { equipmentId: targetEqId } });
    const vibrationTrend = (vibRes.rows || []).map((v: any) => ({
      time: v.time,
      value: Number(v.value || 0)
    }));
    // 시간 순으로 정렬
    vibrationTrend.sort((a: any, b: any) => a.time.localeCompare(b.time));

    // 3. DB에서 FFT 주파수 스펙트럼 분석 데이터 조회
    const fftRes = await queryTable("crm_facility_predictive_fft", { filters: { equipmentId: targetEqId } });
    const fftAnalysis = (fftRes.rows || []).map((f: any) => ({
      frequency: Number(f.frequency || 0),
      amplitude: Number(f.amplitude || 0),
      label: f.label
    }));
    // 주파수 순으로 정렬
    fftAnalysis.sort((a: any, b: any) => a.frequency - b.frequency);

    // 4. DB에서 부품 잔여 수명 RUL 조회
    const rulRes = await queryTable("crm_facility_predictive_part_rul", { filters: { equipmentId: targetEqId } });
    const partLifetimes = (rulRes.rows || []).map((r: any) => ({
      partName: r.partName,
      rulDays: Number(r.rulDays || 0),
      status: r.status,
      percent: Number(r.percent || 0)
    }));

    const predictiveStatus = {
      equipmentId,
      equipmentName,
      healthScore,
      vibrationRms,
      vibrationTrend,
      fftAnalysis,
      partLifetimes
    };

    return NextResponse.json({
      success: true,
      predictiveStatus
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
