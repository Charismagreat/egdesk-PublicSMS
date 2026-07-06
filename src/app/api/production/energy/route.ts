import { NextResponse } from "next/server";
import { queryTable, updateRows } from "../../../../../egdesk-helpers";

// 기본 베이스 시계열 차트 포인트 (09:00 ~ 21:00)
const BASE_POWER_POINTS = [
  { time: "09:00", actual: 45, forecast: 45 },
  { time: "10:00", actual: 62, forecast: 60 },
  { time: "11:00", actual: 78, forecast: 75 },
  { time: "12:00", actual: 40, forecast: 42 },
  { time: "13:00", actual: 82, forecast: 85 },
  { time: "14:00", actual: 95, forecast: 98 },
  { time: "15:00", actual: null, forecast: 108 },
  { time: "16:00", actual: null, forecast: 92 },
  { time: "17:00", actual: null, forecast: 85 },
  { time: "18:00", actual: null, forecast: 55 },
  { time: "19:00", actual: null, forecast: 50 },
  { time: "20:00", actual: null, forecast: 45 },
  { time: "21:00", actual: null, forecast: 38 },
];

const CONTRACT_POWER = 100; // 계약 전력 임계치 (kW)

/**
 * GET: 실시간 전력 부하 데이터, 설비별 누적 사용량, 절감 추천 리스트 조회 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 에너지 설비 현황 조회
    const eqRes = await queryTable("crm_energy_equipments", {});
    const dbEquipments = eqRes.rows || [];

    // 2. DB에서 에너지 절감 스케줄 적용 상태 조회
    const saveRes = await queryTable("crm_energy_savings", { filters: { id: "EV-01" } });
    const isSavingApplied = saveRes.rows?.[0]?.is_active === 1;

    // 3. 설비 상태 매핑 (프론트엔드 호환 포맷 변환)
    const equipments = dbEquipments.map((eq: any) => ({
      id: eq.id,
      name: eq.equipment_name,
      currentPower: eq.status === "ON" ? eq.current_load : 0,
      accumulatedEnergy: eq.id === "EQ-101" ? 380 : eq.id === "EQ-102" ? 250 : eq.id === "EQ-103" ? 140 : 75, // 누적전력 임시 산출
      estimatedCost: eq.monthly_bill,
      isOnline: eq.status === "ON"
    }));

    // 4. 추천 리스트 조립
    const recommendations = [
      {
        id: "REC-01",
        title: "전동식 유압 프레스(EQ-101) 15시 공정 우회",
        effect: 245000,
        reason: "한전 최대 중부하 요금 시간대(15시) 회피하여 요금이 저렴한 17시로 가동 시간 재조정",
        targetEqId: "EQ-101",
        shiftHours: 2,
        applied: isSavingApplied
      },
      {
        id: "REC-02",
        title: "공조 및 냉난방기(EQ-104) 비필수 냉방 부하 셧다운",
        effect: 48000,
        reason: "실시간 전력량이 계약전력의 90% 이상 도달 시, 조립동의 비필수 예비 공조기를 원격 오프 제어",
        targetEqId: "EQ-104",
        shiftHours: 1,
        applied: false
      }
    ];

    // 5. 전력 시계열 차트 포인트 동적 보정
    let powerPoints = [...BASE_POWER_POINTS];

    // 5-1. 절감 스케줄 승인에 따른 15시 피크 차감 시뮬레이션
    if (isSavingApplied) {
      powerPoints = powerPoints.map((point) => {
        if (point.time === "15:00") return { ...point, forecast: 88 }; // 20kW 가량의 부하 감축
        if (point.time === "17:00") return { ...point, forecast: point.forecast! + 12 }; // 우회 이전
        return point;
      });
    }

    // 5-2. 설비가 원격으로 꺼졌는지(OFF) 판독하여 차트 전력 감축
    dbEquipments.forEach((eq: any) => {
      if (eq.status === "OFF") {
        const load = eq.current_load || 0;
        powerPoints = powerPoints.map((point) => {
          if (point.time === "14:00" && point.actual !== null) {
            return { ...point, actual: Math.max(0, point.actual - load) };
          }
          if (point.time === "15:00") {
            return { ...point, forecast: Math.max(0, point.forecast! - load) };
          }
          return point;
        });
      }
    });

    const actualValues = powerPoints.filter(p => p.actual !== null).map(p => p.actual as number);
    const currentPeak = actualValues.length > 0 ? Math.max(...actualValues) : 82;

    return NextResponse.json({
      success: true,
      powerPoints,
      equipments,
      recommendations,
      contractPower: CONTRACT_POWER,
      currentPeak,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 추천 가이드 적용 및 모바일 원격 셧다운 제어
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. 추천 절감 적용 (apply_saving)
    if (action === "apply_saving") {
      const { recId } = body;

      if (recId === "REC-01") {
        // DB 스케줄 상태를 활성화(1)로 업데이트
        await updateRows("crm_energy_savings", { is_active: 1, apply_date: new Date().toISOString().substring(0, 10) }, { filters: { id: "EV-01" } });
        
        // 대상 설비의 전기요금 차감 반영
        const eqRes = await queryTable("crm_energy_equipments", { filters: { id: "EQ-101" } });
        if (eqRes.rows && eqRes.rows.length > 0) {
          const currentBill = eqRes.rows[0].monthly_bill || 0;
          await updateRows("crm_energy_equipments", { monthly_bill: Math.max(0, currentBill - 245000) }, { filters: { id: "EQ-101" } });
        }
      }

      return NextResponse.json({
        success: true,
        message: "AI 에너지 절감 일정이 DB에 최종 승인되었으며, 15시 전력 피크 위험 요소를 해결했습니다."
      });
    }

    // 2. 모바일 설비 원격 셧다운 제어 (toggle_shutdown)
    if (action === "toggle_shutdown") {
      const { eqId } = body;
      const eqRes = await queryTable("crm_energy_equipments", { filters: { id: eqId } });

      if (!eqRes.rows || eqRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "설비 정보를 찾을 수 없습니다." }, { status: 400 });
      }

      const currentStatus = eqRes.rows[0].status;
      const newStatus = currentStatus === "ON" ? "OFF" : "ON";

      // DB 상태 원격 토글 갱신
      await updateRows("crm_energy_equipments", { status: newStatus }, { filters: { id: eqId } });

      return NextResponse.json({
        success: true,
        message: `설비 가동 상태가 DB에서 ${newStatus === "ON" ? "ON" : "OFF"}으로 원격 전환되었습니다.`
      });
    }

    return NextResponse.json({ success: false, error: "올바른 액션이 정의되지 않았습니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
