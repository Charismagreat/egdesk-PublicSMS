import { NextResponse } from "next/server";
import { queryTable } from "../../../../../egdesk-helpers";

/**
 * GET: 월간 정비 일정 및 소모성 부품 재고 목록 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 정비 일정 조회
    const eventRes = await queryTable("crm_facility_events", {});
    const events = (eventRes.rows || []).map((e: any) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      type: e.type,
      assignee: e.assignee
    }));

    // 2. DB에서 부품 재고 조회
    const partRes = await queryTable("crm_facility_parts", {});
    const partInventories = (partRes.rows || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      safetyStock: Number(p.safetyStock || 0),
      currentStock: Number(p.currentStock || 0),
      unit: p.unit,
      leadTimeDays: Number(p.leadTimeDays || 0),
      risk: p.risk
    }));

    return NextResponse.json({
      success: true,
      events,
      partInventories
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
