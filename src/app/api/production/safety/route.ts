import { NextResponse } from "next/server";
import { queryTable, updateRows, insertRows } from "../../../../../egdesk-helpers";

// 기본 CCTV 피드 데이터 (DB 상태에 따라 동적 오버레이)
const BASE_CCTVS = [
  {
    id: "CCTV-01",
    name: "프레스 1호기 구역 (CCTV-01)",
    status: "NORMAL" as const,
    boundingBoxes: [
      { x: 120, y: 80, w: 90, h: 160, label: "작업자: 홍길동", color: "#10b981" },
      { x: 450, y: 40, w: 200, h: 180, label: "Virtual Fence: 위험 구역 경계선", color: "#f59e0b", isArea: true },
    ]
  },
  {
    id: "CCTV-02",
    name: "사출 성형 2호동 (CCTV-02)",
    status: "NORMAL" as const,
    boundingBoxes: [
      { x: 220, y: 90, w: 85, h: 150, label: "작업자: 김철수", color: "#10b981" },
      { x: 400, y: 100, w: 90, h: 150, label: "작업자: 이영희", color: "#10b981" }
    ]
  },
  {
    id: "CCTV-03",
    name: "B2 입출고 로딩독 (CCTV-03)",
    status: "NORMAL" as const,
    boundingBoxes: [
      { x: 150, y: 120, w: 180, h: 110, label: "지게차 운행 차선", color: "#10b981", isArea: true },
      { x: 480, y: 130, w: 80, h: 120, label: "작업자: 박민수", color: "#10b981" }
    ]
  }
];

/**
 * GET: CCTV 피드 오버레이 좌표, 위험 로그 히스토리, 핫스팟 분석 데이터 반환 (물리 DB 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 안전 구역 정보 조회
    const zoneRes = await queryTable("crm_safety_zones", {});
    const dbZones = zoneRes.rows || [];

    // 2. DB에서 위험 감지 알림 조회 (최근 15건)
    const alertRes = await queryTable("crm_safety_alerts", { limit: 15 });
    const dbAlerts = alertRes.rows || [];

    // 3. 핫스팟 분석 데이터 매핑
    const hotspots = dbZones.map((z: any) => {
      let zoneId = "ZONE-A";
      if (z.id === "ZONE-2") zoneId = "ZONE-B";
      if (z.id === "ZONE-3") zoneId = "ZONE-C";
      
      return {
        zoneId,
        zoneName: z.zone_name,
        dangerScore: z.risk_score
      };
    });
    // 조립 라인 기본 고정값 추가
    hotspots.push({ zoneId: "ZONE-D", zoneName: "조립 및 포장 라인", dangerScore: 20 });

    // 4. 위험 로그 감사록 매핑
    const dangerLogs = dbAlerts.map((al: any) => {
      // 시간 추출 (HH:MM:SS)
      const timeStr = al.created_at.includes(" ") ? al.created_at.split(" ")[1] : al.created_at;
      
      return {
        id: al.id,
        time: timeStr,
        location: al.zone_name,
        title: al.detector_type,
        level: al.alert_level,
        status: al.is_resolved === 1 ? ("RESOLVED" as const) : ("DETECTED" as const),
        operator: al.zone_name.includes("프레스") ? "홍길동 (사원)" : al.zone_name.includes("B2") ? "박민수 (기사)" : "이영희 (사원)"
      };
    });

    // 5. CCTV 카메라 오버레이 갱신
    const cctvs = BASE_CCTVS.map((cam) => {
      const relatedZone = dbZones.find((z: any) => cam.name.includes(z.zone_name));
      const relatedUnresolvedAlert = dbAlerts.find((al: any) => cam.name.includes(al.zone_name) && al.is_resolved === 0);

      // 셧다운 여부 체크
      if (relatedZone && relatedZone.status === "긴급 셧다운") {
        return {
          ...cam,
          status: "EMERGENCY_STOP" as const,
          boundingBoxes: [
            { x: 50, y: 120, w: 700, h: 80, label: "🛑 EMERGENCY SHUTDOWN: 원격 공정 가동 정지됨", color: "#f43f5e", isArea: true }
          ]
        };
      }

      // 미해결 위험 감지 존재 여부 체크
      if (relatedUnresolvedAlert) {
        const boxes = [...cam.boundingBoxes];
        if (relatedUnresolvedAlert.detector_type.includes("안전모")) {
          // 안전모 미착용 박스 오버레이 추가
          boxes.push({ x: 320, y: 110, w: 80, h: 140, label: "⚠️ 안전모 미착용 감지", color: "#f43f5e" });
        }
        return {
          ...cam,
          status: "WARNING" as const,
          boundingBoxes: boxes
        };
      }

      return cam;
    });

    return NextResponse.json({
      success: true,
      cctvs,
      dangerLogs,
      hotspots
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 현장 경고 사이렌 방송 및 특정 설비/공정 원격 비상 정지(STOP)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. 경고 사이렌 방송 송출 (trigger_siren)
    if (action === "trigger_siren") {
      const { logId } = body;

      // 사이렌 가동을 로그 또는 DB 상태에 기록
      await updateRows("crm_safety_alerts", { detector_type: "⚠️ 사이렌 및 LED 경광등 긴급 전송 가동 중" }, { filters: { id: logId } });

      return NextResponse.json({
        success: true,
        message: "현장 스피커로 경고 안내 방송 및 LED 경광등이 긴급 가동되었습니다."
      });
    }

    // 2. 특정 구역 공정 비상 셧다운 정지 (emergency_stop)
    if (action === "emergency_stop") {
      const { zoneId } = body;
      
      let dbZoneId = "ZONE-1"; // ZONE-A
      let zoneName = "프레스 성형실";
      if (zoneId === "ZONE-B") {
        dbZoneId = "ZONE-2";
        zoneName = "원자재 사출동";
      } else if (zoneId === "ZONE-C") {
        dbZoneId = "ZONE-3";
        zoneName = "완제품 자재창고";
      }

      // 2-1. 해당 구역의 가동 상태를 "긴급 셧다운"으로 업데이트하고 위험지수 5점 가산
      const zoneRes = await queryTable("crm_safety_zones", { filters: { id: dbZoneId } });
      if (zoneRes.rows && zoneRes.rows.length > 0) {
        const currentScore = zoneRes.rows[0].risk_score || 0;
        await updateRows("crm_safety_zones", { 
          status: "긴급 셧다운",
          risk_score: Math.min(100, currentScore + 5)
        }, { filters: { id: dbZoneId } });
      }

      // 2-2. 해당 구역의 미해결 알림들을 일괄 해결 처리
      await updateRows("crm_safety_alerts", { is_resolved: 1 }, { filters: { zone_name: zoneName } });

      return NextResponse.json({
        success: true,
        message: `${zoneName} 설비 전원이 즉각 차단되었으며 안전 셧다운 감사 대장에 기록되었습니다.`
      });
    }

    return NextResponse.json({ success: false, error: "올바른 액션이 정의되지 않았습니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
