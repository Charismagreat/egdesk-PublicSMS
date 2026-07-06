import { NextResponse } from "next/server";
import { queryTable } from "../../../../../egdesk-helpers";

/**
 * GET: 실시간 전류/진동 센서 상태 및 타임라인 데이터 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 센서 종합 상태 조회 (SEN-SUMMARY 단일 행)
    const statusRes = await queryTable("crm_quality_sensors_status", { filters: { id: "SEN-SUMMARY" } });
    const dbStatus = statusRes.rows && statusRes.rows.length > 0 ? statusRes.rows[0] : null;

    const sensorStatus = {
      equipmentName: dbStatus ? dbStatus.equipmentName : "주력 사출 프레스 M-500",
      operationalStatus: dbStatus ? dbStatus.operationalStatus : "WARNING",
      vibrationRms: dbStatus ? Number(dbStatus.vibrationRms || 0) : 4.8,
      motorCurrent: dbStatus ? Number(dbStatus.motorCurrent || 0) : 18.2,
      bearingTemp: dbStatus ? Number(dbStatus.bearingTemp || 0) : 56.4,
      anomalyScore: dbStatus ? Number(dbStatus.anomalyScore || 0) : 88,
      threshold: dbStatus ? Number(dbStatus.threshold || 0) : 70
    };

    // 2. DB에서 센서 기여도 요인 리스트 조회
    const contribRes = await queryTable("crm_quality_sensors_contribution", {});
    const sensorContributions = (contribRes.rows || []).map((c: any) => ({
      name: c.name,
      rate: Number(c.rate || 0)
    }));
    // 기여도 역순(내림차순) 정렬
    sensorContributions.sort((a: any, b: any) => b.rate - a.rate);

    // 3. DB에서 시계열 타임라인 조회
    const timelineRes = await queryTable("crm_quality_sensors_timeline", {});
    const timeline = (timelineRes.rows || []).map((t: any) => ({
      time: t.time,
      vibration: Number(t.vibration || 0),
      current: Number(t.current || 0),
      temperature: Number(t.temperature || 0),
      anomalyScore: Number(t.anomalyScore || 0)
    }));
    // 시간 오름차순 정렬
    timeline.sort((a: any, b: any) => a.time.localeCompare(b.time));

    return NextResponse.json({
      success: true,
      sensorStatus,
      sensorContributions,
      timeline
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
