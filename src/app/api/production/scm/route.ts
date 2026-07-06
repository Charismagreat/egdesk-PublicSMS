import { NextResponse } from "next/server";
import { queryTable, updateRows } from "../../../../../egdesk-helpers";

// 고정된 AI 대체 가능 공급처 추천 리스트 (지리적 정보 매핑)
const BASE_ALTERNATIVES: Record<string, any[]> = {
  "SH-801": [
    { id: "SUP-02", name: "아시아 세미콘", price: 42000000, leadTime: 3, rating: 4.6, reason: "상해항 기상 악화 우회, 국내 창고 재고 확보로 즉시 배송 가능" },
    { id: "SUP-03", name: "유로 로지스틱스", price: 45000000, leadTime: 4, rating: 4.3, reason: "단가는 약간 높으나 즉시 안전 재고 물량 20톤 인도 가능" }
  ]
};

/**
 * GET: 조달 화물 리스트, 협력사 평점, AI 대체공급처 후보군 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 수입 화물 트래킹 리스트 조회
    const shipRes = await queryTable("crm_scm_shipments", {});
    const dbShipments = shipRes.rows || [];

    // 2. DB에서 협력사 신뢰성 평점 데이터 조회
    const supRes = await queryTable("crm_scm_suppliers", {});
    const dbSuppliers = supRes.rows || [];

    // 3. 화물 리스트 매핑 (좌표 및 리스크 계산 융합)
    const shipments = dbShipments.map((s: any) => {
      const prob = s.delay_probability || 0.0;
      let risk: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
      if (prob >= 70) risk = "CRITICAL";
      else if (prob >= 30) risk = "WARNING";

      // 운송 루트 좌표 매핑 (시드 정보 기반)
      let route = {
        fromName: "중국 상해항",
        toName: "인천항 / 평택 공장",
        from: { x: 120, y: 190 },
        current: { x: 310, y: 130 },
        to: { x: 550, y: 110 }
      };

      if (s.id === "SH-802") {
        route = {
          fromName: "부산항",
          toName: "평택 공장",
          from: { x: 680, y: 220 },
          current: { x: 610, y: 150 },
          to: { x: 550, y: 110 }
        };
      } else if (s.id === "SH-803") {
        route = {
          fromName: "베트남 다낭항",
          toName: "평택 공장",
          from: { x: 160, y: 250 },
          current: { x: 280, y: 210 },
          to: { x: 550, y: 110 }
        };
      }

      // 우회 전환된 경우 출발지 변경 연출
      if (s.supplier_name.includes("대체") || s.supplier_name.includes("아시아")) {
        route.fromName = "아시아 세미콘 여수 창고";
        route.from = { x: 500, y: 230 };
        route.current = { x: 520, y: 160 };
      }

      return {
        id: s.id,
        supplierId: s.id === "SH-801" ? "SUP-01" : s.id === "SH-802" ? "SUP-02" : "SUP-03",
        supplierName: s.supplier_name,
        item: s.item_name,
        status: s.status, // SHIPPED, CUSTOMS, DOMESTIC, ARRIVED
        eta: s.eta,
        delayProbability: prob,
        risk,
        route
      };
    });

    // 4. 협력사 스코어카드 매핑
    const suppliers = dbSuppliers.map((sup: any) => ({
      id: sup.id,
      name: sup.supplier_name,
      rating: sup.id === "SUP-01" ? 3.8 : sup.id === "SUP-02" ? 4.8 : 4.2,
      deliveryRate: sup.delivery_rate,
      defectRate: sup.defect_rate,
      priceDiff: sup.id === "SUP-01" ? 15 : sup.id === "SUP-02" ? -3 : 5
    }));

    return NextResponse.json({
      success: true,
      shipments,
      suppliers,
      alternatives: BASE_ALTERNATIVES
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: AI 추천 대체 공급처로 즉시 우회 전환 및 모바일 운송 상태 갱신
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. 발주처 대체 우회 전환 실행 (switch_supplier)
    if (action === "switch_supplier") {
      const { shipmentId, alternativeSupplierId } = body;

      const supRes = await queryTable("crm_scm_suppliers", { filters: { id: alternativeSupplierId } });
      if (!supRes.rows || supRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "대체 협력사 정보를 찾을 수 없습니다." }, { status: 400 });
      }
      const supplier = supRes.rows[0];

      // DB 화물 정보 교체 업데이트 (지연 확률을 5%로 낮추어 리스크 해소)
      await updateRows("crm_scm_shipments", {
        supplier_name: `${supplier.supplier_name} (대체 우회)`,
        status: "DOMESTIC",
        eta: "2026-06-10",
        delay_probability: 5.0,
        current_step: 3
      }, { filters: { id: shipmentId } });

      return NextResponse.json({
        success: true,
        message: `발주처가 ${supplier.supplier_name}(으)로 성공적으로 우회 전환되어 리스크가 완전히 해소되었습니다.`
      });
    }

    // 2. 모바일 운송 상태 단계별 업데이트 (update_tracking)
    if (action === "update_tracking") {
      const { shipmentId, status } = body;

      let delayProb = 45.0;
      let step = 2;

      if (status === "SHIPPED") { delayProb = 55.0; step = 1; }
      else if (status === "CUSTOMS") { delayProb = 75.0; step = 2; }
      else if (status === "DOMESTIC") { delayProb = 10.0; step = 3; }
      else if (status === "ARRIVED") { delayProb = 0.0; step = 4; }

      // DB 상태 일괄 갱신
      await updateRows("crm_scm_shipments", {
        status,
        delay_probability: delayProb,
        current_step: step
      }, { filters: { id: shipmentId } });

      return NextResponse.json({
        success: true,
        message: "원자재 통관 단계가 DB에 실시간 업데이트되어 PC 관리 대장에 반영되었습니다."
      });
    }

    return NextResponse.json({ success: false, error: "올바른 액션이 정의되지 않았습니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
