const helpers = require('../egdesk-helpers.js');

async function main() {
  console.log("🚀 [AI 모듈 6종] 물리 테이블 신설 및 초기 시드 백필을 시작합니다...");

  try {
    // ────────────────────────────────────────────────────────
    // 1. 에너지 관리 AI 테이블 생성
    // ────────────────────────────────────────────────────────
    console.log("⚡ 1. 에너지 관리 AI 테이블 생성 중...");
    await helpers.createTable("에너지 절감 스케줄", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "apply_date", type: "TEXT" },
      { name: "saving_amount", type: "INTEGER" },
      { name: "is_active", type: "INTEGER" }
    ], { tableName: "crm_energy_savings", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("에너지 소모 설비 대장", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "equipment_name", type: "TEXT", notNull: true },
      { name: "status", type: "TEXT", notNull: true },
      { name: "current_load", type: "REAL" },
      { name: "monthly_bill", type: "INTEGER" }
    ], { tableName: "crm_energy_equipments", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    // ────────────────────────────────────────────────────────
    // 2. 위험 감지 AI 테이블 생성
    // ────────────────────────────────────────────────────────
    console.log("🚨 2. 위험 감지 AI 테이블 생성 중...");
    await helpers.createTable("CCTV 비상 위험 알림 로그", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "zone_name", type: "TEXT", notNull: true },
      { name: "alert_level", type: "TEXT", notNull: true },
      { name: "detector_type", type: "TEXT", notNull: true },
      { name: "created_at", type: "TEXT", notNull: true },
      { name: "is_resolved", type: "INTEGER" }
    ], { tableName: "crm_safety_alerts", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("안전 제어 구역 설정", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "zone_name", type: "TEXT", notNull: true },
      { name: "risk_score", type: "INTEGER" },
      { name: "status", type: "TEXT", notNull: true }
    ], { tableName: "crm_safety_zones", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    // ────────────────────────────────────────────────────────
    // 3. 공급망 관리 AI 테이블 생성
    // ────────────────────────────────────────────────────────
    console.log("🌐 3. 공급망 관리 AI 테이블 생성 중...");
    await helpers.createTable("실시간 수입 조달 화물 리스트", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "item_name", type: "TEXT", notNull: true },
      { name: "supplier_name", type: "TEXT", notNull: true },
      { name: "status", type: "TEXT", notNull: true },
      { name: "eta", type: "TEXT", notNull: true },
      { name: "delay_probability", type: "REAL" },
      { name: "current_step", type: "INTEGER" }
    ], { tableName: "crm_scm_shipments", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("협력사 스코어카드", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "supplier_name", type: "TEXT", notNull: true },
      { name: "delivery_rate", type: "REAL" },
      { name: "defect_rate", type: "REAL" },
      { name: "score", type: "INTEGER" }
    ], { tableName: "crm_scm_suppliers", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    // ────────────────────────────────────────────────────────
    // 4. 정부 지원금 관리 AI 테이블 생성
    // ────────────────────────────────────────────────────────
    console.log("🪙 4. 정부 지원금 관리 AI 테이블 생성 중...");
    await helpers.createTable("정부 지원금 공고 데이터", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "title", type: "TEXT", notNull: true },
      { name: "agency", type: "TEXT", notNull: true },
      { name: "match_score", type: "INTEGER" },
      { name: "budget", type: "INTEGER" },
      { name: "end_date", type: "TEXT", notNull: true }
    ], { tableName: "crm_grant_announcements", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("지원금 관심 북마크 보관함", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "announcement_id", type: "TEXT", notNull: true }
    ], { tableName: "crm_grant_bookmarks", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("지원금 표준 R&D 계획서 보관함", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "announcement_id", type: "TEXT", notNull: true },
      { name: "plan_data", type: "TEXT", notNull: true }
    ], { tableName: "crm_grant_rnd_plans", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    // ────────────────────────────────────────────────────────
    // 5. 노무 관리 AI 테이블 생성
    // ────────────────────────────────────────────────────────
    console.log("⚖️ 5. 노무 관리 AI 테이블 생성 중...");
    await helpers.createTable("임직원 근태 리스크 요약", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "weekly_hours", type: "REAL" },
      { name: "overtime_hours", type: "REAL" },
      { name: "lateness_count", type: "INTEGER" },
      { name: "early_leave_count", type: "INTEGER" },
      { name: "risk_level", type: "TEXT", notNull: true }
    ], { tableName: "crm_labor_stats", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("근로계약서 독소조항 스캔 현황", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "clause_id", type: "TEXT", notNull: true },
      { name: "title", type: "TEXT", notNull: true },
      { name: "is_illegal", type: "INTEGER" },
      { name: "current_text", type: "TEXT", notNull: true },
      { name: "recommended_text", type: "TEXT", notNull: true },
      { name: "reason", type: "TEXT", notNull: true }
    ], { tableName: "crm_labor_contracts", uniqueKeyColumns: ["id", "clause_id"], duplicateAction: "update" });

    // ────────────────────────────────────────────────────────
    // 6. 채권 관리 AI 테이블 생성
    // ────────────────────────────────────────────────────────
    console.log("💵 6. 채권 관리 AI 테이블 생성 중...");
    await helpers.createTable("거래처 신용 위험 및 연체 지표 대장", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "overdue_amount", type: "INTEGER" },
      { name: "overdue_days", type: "INTEGER" },
      { name: "credit_rating", type: "TEXT", notNull: true },
      { name: "default_probability", type: "REAL" },
      { name: "risk_level", type: "TEXT", notNull: true },
      { name: "last_action", type: "TEXT" },
      { name: "action_date", type: "TEXT" }
    ], { tableName: "crm_partner_credit_risks", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    console.log("✅ 모든 AI 모듈 전용 물리 테이블 생성 성공!");

    // ────────────────────────────────────────────────────────
    // 7. 시드 데이터 적재 (중복 인서트 방지)
    // ────────────────────────────────────────────────────────
    console.log("🌱 시드 데이터 백필 적재 시작...");

    // 에너지 기기 시드 데이터
    await helpers.insertRows("crm_energy_equipments", [
      { id: "EQ-101", equipment_name: "전동식 유압 프레스", status: "ON", current_load: 45.2, monthly_bill: 1280000 },
      { id: "EQ-102", equipment_name: "고속 사출 성형기", status: "ON", current_load: 32.8, monthly_bill: 950000 },
      { id: "EQ-103", equipment_name: "대형 열처리 용해로", status: "ON", current_load: 85.0, monthly_bill: 2450000 },
      { id: "EQ-104", equipment_name: "공조 및 냉난방기", status: "OFF", current_load: 0.0, monthly_bill: 410000 }
    ]);
    await helpers.insertRows("crm_energy_savings", [
      { id: "EV-01", apply_date: "2026-06-05", saving_amount: 145000, is_active: 0 }
    ]);

    // 위험 감지 구역/알림 시드 데이터
    await helpers.insertRows("crm_safety_zones", [
      { id: "ZONE-1", zone_name: "프레스 성형실", risk_score: 65, status: "정상 가동" },
      { id: "ZONE-2", zone_name: "원자재 사출동", risk_score: 12, status: "정상 가동" },
      { id: "ZONE-3", zone_name: "완제품 자재창고", risk_score: 85, status: "긴급 셧다운" }
    ]);
    await helpers.insertRows("crm_safety_alerts", [
      { id: "AL-301", zone_name: "완제품 자재창고", alert_level: "CRITICAL", detector_type: "구역 내 미허가 침입자 발생", created_at: "2026-06-05 14:32:00", is_resolved: 0 },
      { id: "AL-302", zone_name: "프레스 성형실", alert_level: "WARNING", detector_type: "작업자 1명 안전모 미착용 감지", created_at: "2026-06-05 16:15:00", is_resolved: 0 }
    ]);

    // SCM 화물/협력사 시드 데이터
    await helpers.insertRows("crm_scm_shipments", [
      { id: "SH-801", item_name: "MCU 마이크로 컨트롤러", supplier_name: "글로벌 세미콘", status: "통관중", eta: "2026-06-08 14:00:00", delay_probability: 72.5, current_step: 2 },
      { id: "SH-802", item_name: "특수 강화 사출 레진", supplier_name: "삼성 케미칼", status: "국내운송", eta: "2026-06-07 10:00:00", delay_probability: 15.0, current_step: 3 },
      { id: "SH-803", item_name: "고밀도 리튬 배터리 팩", supplier_name: "에너지 솔루션", status: "입고완료", eta: "2026-06-04 16:30:00", delay_probability: 3.2, current_step: 4 }
    ]);
    await helpers.insertRows("crm_scm_suppliers", [
      { id: "SUP-01", supplier_name: "동아 전설", delivery_rate: 98.2, defect_rate: 0.05, score: 94 },
      { id: "SUP-02", supplier_name: "아시아 세미콘", delivery_rate: 92.5, defect_rate: 0.12, score: 85 },
      { id: "SUP-03", supplier_name: "유로 로지스틱스", delivery_rate: 88.0, defect_rate: 0.25, score: 78 }
    ]);

    // 지원금 공고/북마크 시드 데이터
    await helpers.insertRows("crm_grant_announcements", [
      { id: "GR-501", title: "중소기업 스마트공장 고도화 지원사업", agency: "중소벤처기업부", match_score: 92, budget: 150000000, end_date: "2026-07-15" },
      { id: "GR-502", title: "소상공인 디지털 전환 기술보급 보조금", agency: "소상공인시장진흥공단", match_score: 85, budget: 30000000, end_date: "2026-06-30" },
      { id: "GR-503", title: "대·중소 동반성장 공동 R&D 지원과제", agency: "산업통상자원부", match_score: 68, budget: 300000000, end_date: "2026-08-31" }
    ]);
    await helpers.insertRows("crm_grant_bookmarks", [
      { id: "BM-01", announcement_id: "GR-501" }
    ]);

    // 노무 임직원 근태/계약서 시드 데이터
    await helpers.insertRows("crm_labor_stats", [
      { id: "EMP-201", weekly_hours: 51.5, overtime_hours: 11.5, lateness_count: 3, early_leave_count: 1, risk_level: "CRITICAL" },
      { id: "EMP-202", weekly_hours: 42.0, overtime_hours: 2.0, lateness_count: 0, early_leave_count: 0, risk_level: "SAFE" },
      { id: "EMP-203", weekly_hours: 48.0, overtime_hours: 8.0, lateness_count: 1, early_leave_count: 2, risk_level: "WARNING" },
      { id: "EMP-204", weekly_hours: 40.0, overtime_hours: 0.0, lateness_count: 0, early_leave_count: 0, risk_level: "SAFE" }
    ]);
    await helpers.insertRows("crm_labor_contracts", [
      { 
        id: "EMP-201", 
        clause_id: "CL-01", 
        title: "연장 및 야간 근로 한도 설정", 
        is_illegal: 1, 
        current_text: "을(근로자)은 업무 필요 시 사전 합의 없이 주 12시간 이상의 연장 근로를 무제한 제공하며, 이에 동의한다.", 
        recommended_text: "을(근로자)의 연장 근로는 1주 12시간을 한도로 노사 상호 합의 하에 실시하며, 연장 근로에 대한 적격 수당을 법정 요율(150%)에 맞추어 지급한다.", 
        reason: "근로기준법 제53조 제1항 위배. 당사자 간에 합의하더라도 1주간 12시간을 초과하여 연장근로를 시킬 수 없으며, 위반 시 형사처벌 대상입니다."
      },
      { 
        id: "EMP-201", 
        clause_id: "CL-02", 
        title: "포괄 임금 고정 연장 수당 매칭", 
        is_illegal: 1, 
        current_text: "을의 기본급에는 월간 발생하는 모든 연장, 야간 및 휴일근로에 대한 수당이 전액 포함된 것으로 간주하며, 추가 청구할 수 없다.", 
        recommended_text: "기본급 2,500,000원 외에 포괄 연장근로수당(월 20시간분) 350,000원을 명확히 분리 표기하며, 이를 초과하여 근무한 시간에 대해서는 근로기준법에 의거 가산수당을 추가 정산 지급한다.", 
        reason: "대법원 포괄임금제 유효성 판단 기준 위배. 수당의 세부 항목과 연장 시간이 명확히 구분되어 계약서에 명시되지 않은 포괄임금 합의는 법적 무효이며, 임금체불 소송 원인이 됩니다."
      },
      { 
        id: "EMP-203", 
        clause_id: "CL-03", 
        title: "주휴수당 지급 규정 명시", 
        is_illegal: 1, 
        current_text: "을은 소정 근로일에 개근하더라도 주휴일에 대해 유급으로 처리하지 않으며, 단가에 주휴수당은 미포함한다.", 
        recommended_text: "1주간 소정 근로일을 개근한 경우 근로기준법 제55조에 의거하여 1일의 유급 주휴일을 부여하며, 관계 법령에 의거한 주휴수당을 기본급에 가산하여 지급한다.", 
        reason: "근로기준법 제55조 위배. 주 15시간 이상 근무하고 소정근로일을 개근한 모든 근로자에게는 유급 주휴일을 의무 부여해야 합니다. (위반 시 2년 이하 징역 또는 2천만원 이하 벌금)"
      }
    ]);

    // 채권 신용 등급 시드 데이터
    await helpers.insertRows("crm_partner_credit_risks", [
      { id: "PT-001", overdue_amount: 42000000, overdue_days: 85, credit_rating: "E", default_probability: 78.5, risk_level: "CRITICAL", last_action: "1차 독촉장 발송완료", action_date: "2026-06-01" },
      { id: "PT-002", overdue_amount: 15500000, overdue_days: 42, credit_rating: "D", default_probability: 45.0, risk_level: "WARNING", last_action: "수금 유선 상담 완료", action_date: "2026-06-03" },
      { id: "PT-003", overdue_amount: 3200000, overdue_days: 12, credit_rating: "B", default_probability: 15.0, risk_level: "SAFE", last_action: "전자세금계산서 발행", action_date: "2026-05-25" },
      { id: "PT-004", overdue_amount: 0, overdue_days: 0, credit_rating: "A", default_probability: 3.2, risk_level: "SAFE", last_action: "수금 완료 (정상)", action_date: "2026-05-30" }
    ]);

    console.log("🌱 모든 시드 데이터 백필 적재 성공 완료!");

  } catch (err) {
    console.error("❌ 마이그레이션 실패:", err.message);
  }
}

main();
