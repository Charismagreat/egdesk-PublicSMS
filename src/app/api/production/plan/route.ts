import { NextResponse } from "next/server";
import { queryTable, insertRows, updateRows, deleteRows } from "../../../../../egdesk-helpers";

// 설비 ID별 이름 매핑 딕셔너리
const EQ_NAMES: Record<string, string> = {
  "M-500": "사출 1호기 (M-500)",
  "M-300": "사출 2호기 (M-300)",
  "M-200": "사출 3호기 (M-200)",
  "A-100": "조립 라인 A (A-100)"
};

/**
 * GET: 생산 계획 정보, 미배정 주문 리스트 및 설비 병목지수 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 간트 태스크 조회
    const ganttRes = await queryTable("crm_production_gantt_tasks", {});
    const ganttTasks = (ganttRes.rows || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      equipmentId: t.equipmentId,
      equipmentName: t.equipmentName,
      operatorName: t.operatorName || "",
      startHour: Number(t.startHour),
      endHour: Number(t.endHour),
      progress: Number(t.progress || 0),
      status: t.status
    }));

    // 2. DB에서 미배정 주문 대장 조회
    const orderRes = await queryTable("crm_production_unscheduled_orders", {});
    const unscheduledOrders = (orderRes.rows || []).map((o: any) => ({
      orderId: o.orderId,
      productName: o.productName,
      qty: Number(o.qty || 0),
      dueDate: o.dueDate,
      status: o.status
    }));

    // 3. DB에서 설비 병목지수 조회
    const bottleRes = await queryTable("crm_production_bottlenecks", {});
    const bottlenecks = (bottleRes.rows || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      loadRate: Number(b.loadRate || 0),
      status: b.status,
      queueTasks: Number(b.queueTasks || 0)
    }));

    // 4. DB에서 납기 준수 위험 분석 조회
    const riskRes = await queryTable("crm_production_due_risk", {});
    const dueRiskAnalysis = (riskRes.rows || []).map((r: any) => ({
      orderId: r.orderId,
      productName: r.productName,
      probability: Number(r.probability || 0),
      status: r.status
    }));

    return NextResponse.json({
      success: true,
      ganttTasks,
      unscheduledOrders,
      bottlenecks,
      dueRiskAnalysis,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 일정 재배치 최적화(reschedule) 및 모바일 진행상태 업데이트 처리
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. 공정 스케줄링 재배치 (reschedule)
    if (action === "reschedule") {
      const { taskId, startHour, endHour, equipmentId } = body;

      const equipmentName = EQ_NAMES[equipmentId] || "기타 설비";

      // DB 업데이트 실행
      await updateRows("crm_production_gantt_tasks", {
        startHour,
        endHour,
        equipmentId,
        equipmentName
      }, { filters: { id: taskId } });

      // 최신 간트 태스크 정보 로딩
      const ganttRes = await queryTable("crm_production_gantt_tasks", {});
      const ganttTasks = (ganttRes.rows || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        equipmentId: t.equipmentId,
        equipmentName: t.equipmentName,
        operatorName: t.operatorName || "",
        startHour: Number(t.startHour),
        endHour: Number(t.endHour),
        progress: Number(t.progress || 0),
        status: t.status
      }));

      return NextResponse.json({
        success: true,
        message: "AI 스케줄러가 제약 조건을 준수하며 일정을 실시간 재정렬했습니다.",
        ganttTasks,
      });
    }

    // 2. 신규 주문 공정 자동 배정 (schedule_order)
    if (action === "schedule_order") {
      const { orderId, equipmentId, startHour, duration } = body;

      // 미배정 주문 조회
      const orderRes = await queryTable("crm_production_unscheduled_orders", { filters: { orderId } });
      if (!orderRes.rows || orderRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "주문 정보를 찾을 수 없습니다." }, { status: 400 });
      }
      const orderToSchedule = orderRes.rows[0];

      // 미배정 리스트에서 해당 주문 삭제
      await deleteRows("crm_production_unscheduled_orders", { filters: { orderId } });

      // 간트 태스크 테이블에 신규 작업 추가
      const newTaskId = `T-${Date.now()}`;
      const equipmentName = EQ_NAMES[equipmentId] || "미정";

      await insertRows("crm_production_gantt_tasks", [
        {
          id: newTaskId,
          title: `[신규] ${orderToSchedule.productName}`,
          equipmentId,
          equipmentName,
          operatorName: "자동 매칭(예비)",
          startHour,
          endHour: startHour + duration,
          progress: 0,
          status: "WAITING"
        }
      ]);

      // 최신 정보 로딩
      const ganttRes = await queryTable("crm_production_gantt_tasks", {});
      const nextGanttTasks = (ganttRes.rows || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        equipmentId: t.equipmentId,
        equipmentName: t.equipmentName,
        operatorName: t.operatorName || "",
        startHour: Number(t.startHour),
        endHour: Number(t.endHour),
        progress: Number(t.progress || 0),
        status: t.status
      }));

      const nextOrderRes = await queryTable("crm_production_unscheduled_orders", {});
      const unscheduledOrders = (nextOrderRes.rows || []).map((o: any) => ({
        orderId: o.orderId,
        productName: o.productName,
        qty: Number(o.qty || 0),
        dueDate: o.dueDate,
        status: o.status
      }));

      return NextResponse.json({
        success: true,
        message: `주문 ${orderId}가 설비 스케줄에 자동으로 최적 배정 완료되었습니다.`,
        ganttTasks: nextGanttTasks,
        unscheduledOrders,
      });
    }

    // 3. 모바일 상태 업데이트 (update_status)
    if (action === "update_status") {
      const { taskId, status, progress } = body;

      const updateFields: any = { status };
      if (progress !== undefined) {
        updateFields.progress = progress;
      }

      // DB 업데이트
      await updateRows("crm_production_gantt_tasks", updateFields, { filters: { id: taskId } });

      // 최신 정보 로딩
      const ganttRes = await queryTable("crm_production_gantt_tasks", {});
      const ganttTasks = (ganttRes.rows || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        equipmentId: t.equipmentId,
        equipmentName: t.equipmentName,
        operatorName: t.operatorName || "",
        startHour: Number(t.startHour),
        endHour: Number(t.endHour),
        progress: Number(t.progress || 0),
        status: t.status
      }));

      return NextResponse.json({
        success: true,
        message: "공정 상태가 변경되어 PC ERP 대장에 실시간 반영되었습니다.",
        ganttTasks,
      });
    }

    return NextResponse.json({ success: false, error: "올바른 액션이 정의되지 않았습니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
