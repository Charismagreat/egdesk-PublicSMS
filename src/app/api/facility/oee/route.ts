import { NextResponse } from "next/server";
import { queryTable } from "../../../../../egdesk-helpers";

/**
 * GET: OEE 종합 효율 및 설비 배치 상태 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 OEE 종합 통계 조회 (ID: OEE-GLOBAL로 저장된 것 단일 행 조회)
    const statsRes = await queryTable("crm_facility_oee_stats", { filters: { id: "OEE-GLOBAL" } });
    const statsRow = statsRes.rows && statsRes.rows.length > 0 ? statsRes.rows[0] : null;

    const overallOee = statsRow ? Number(statsRow.overallOee || 0) : 78.4;
    const availability = statsRow ? Number(statsRow.availability || 0) : 88.5;
    const performance = statsRow ? Number(statsRow.performance || 0) : 92.0;
    const quality = statsRow ? Number(statsRow.quality || 0) : 96.2;

    const operatingHours = {
      totalLoaded: statsRow ? Number(statsRow.totalLoaded || 0) : 480,
      actualRun: statsRow ? Number(statsRow.actualRun || 0) : 425,
      plannedStop: statsRow ? Number(statsRow.plannedStop || 0) : 30,
      breakdownStop: statsRow ? Number(statsRow.breakdownStop || 0) : 25
    };

    const financialLoss = {
      opportunityLossKrw: statsRow ? Number(statsRow.opportunityLossKrw || 0) : 4800000,
      preventedLossKrw: statsRow ? Number(statsRow.preventedLossKrw || 0) : 12500000
    };

    // 2. DB에서 비가동 원인 통계 조회
    const downtimeRes = await queryTable("crm_facility_oee_downtime", {});
    const downtimeReasons = (downtimeRes.rows || []).map((d: any) => ({
      reason: d.reason,
      minutes: Number(d.minutes || 0),
      rate: Number(d.rate || 0)
    }));

    // 3. DB에서 설비 레이아웃 배치 정보 조회
    const layoutRes = await queryTable("crm_facility_layout", {});
    const factoryLayout = (layoutRes.rows || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      status: l.status,
      oee: Number(l.oee || 0),
      x: Number(l.x || 0),
      y: Number(l.y || 0)
    }));

    const oeeData = {
      overallOee,
      availability,
      performance,
      quality,
      operatingHours,
      financialLoss,
      downtimeReasons,
      factoryLayout
    };

    return NextResponse.json({
      success: true,
      oeeData
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
