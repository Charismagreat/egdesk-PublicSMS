const helpers = require('../egdesk-helpers.js');

async function main() {
  console.log("🚀 [잔여 AI 모듈 13종] 물리 테이블 신설 및 초기 시드 백필을 시작합니다...");

  try {
    // 1. 생산 계획 AI (APS) 테이블 생성
    console.log("📅 1. 생산 계획 AI 테이블 생성 중...");
    await helpers.createTable("생산 간트 차트 작업 목록", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "title", type: "TEXT", notNull: true },
      { name: "equipmentId", type: "TEXT", notNull: true },
      { name: "equipmentName", type: "TEXT", notNull: true },
      { name: "operatorName", type: "TEXT" },
      { name: "startHour", type: "INTEGER" },
      { name: "endHour", type: "INTEGER" },
      { name: "progress", type: "INTEGER" },
      { name: "status", type: "TEXT", notNull: true }
    ], { tableName: "crm_production_gantt_tasks", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("미배정 수주 대장", [
      { name: "orderId", type: "TEXT", notNull: true },
      { name: "productName", type: "TEXT", notNull: true },
      { name: "qty", type: "INTEGER" },
      { name: "dueDate", type: "TEXT" },
      { name: "status", type: "TEXT" }
    ], { tableName: "crm_production_unscheduled_orders", uniqueKeyColumns: ["orderId"], duplicateAction: "update" });

    await helpers.createTable("설비별 누적 로드 및 병목 지수", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "name", type: "TEXT", notNull: true },
      { name: "loadRate", type: "INTEGER" },
      { name: "status", type: "TEXT" },
      { name: "queueTasks", type: "INTEGER" }
    ], { tableName: "crm_production_bottlenecks", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("납기 준수 위험 분석", [
      { name: "orderId", type: "TEXT", notNull: true },
      { name: "productName", type: "TEXT", notNull: true },
      { name: "probability", type: "INTEGER" },
      { name: "status", type: "TEXT" }
    ], { tableName: "crm_production_due_risk", uniqueKeyColumns: ["orderId"], duplicateAction: "update" });

    // 2. 설비 관리 AI (PdM) 테이블 생성
    console.log("⚙️ 2. 설비 관리 AI 테이블 생성 중...");
    await helpers.createTable("월간 정비 일정", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "date", type: "TEXT", notNull: true },
      { name: "title", type: "TEXT", notNull: true },
      { name: "type", type: "TEXT" },
      { name: "assignee", type: "TEXT" }
    ], { tableName: "crm_facility_events", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("소모성 부품 재고 관리", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "name", type: "TEXT", notNull: true },
      { name: "safetyStock", type: "INTEGER" },
      { name: "currentStock", type: "INTEGER" },
      { name: "unit", type: "TEXT" },
      { name: "leadTimeDays", type: "INTEGER" },
      { name: "risk", type: "TEXT" }
    ], { tableName: "crm_facility_parts", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("모바일 현장 예방 점검 이력", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "equipmentId", type: "TEXT", notNull: true },
      { name: "inspector", type: "TEXT", notNull: true },
      { name: "checks", type: "TEXT", notNull: true }, // JSON String
      { name: "signatureData", type: "TEXT" },
      { name: "audioUrl", type: "TEXT" },
      { name: "status", type: "TEXT", notNull: true },
      { name: "checkedAt", type: "TEXT", notNull: true }
    ], { tableName: "crm_facility_checklists", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("OEE 설비 종합 효율 통계", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "overallOee", type: "REAL" },
      { name: "availability", type: "REAL" },
      { name: "performance", type: "REAL" },
      { name: "quality", type: "REAL" },
      { name: "totalLoaded", type: "INTEGER" },
      { name: "actualRun", type: "INTEGER" },
      { name: "plannedStop", type: "INTEGER" },
      { name: "breakdownStop", type: "INTEGER" },
      { name: "opportunityLossKrw", type: "INTEGER" },
      { name: "preventedLossKrw", type: "INTEGER" }
    ], { tableName: "crm_facility_oee_stats", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("비가동 원인 통계", [
      { name: "reason", type: "TEXT", notNull: true },
      { name: "minutes", type: "INTEGER" },
      { name: "rate", type: "REAL" }
    ], { tableName: "crm_facility_oee_downtime", uniqueKeyColumns: ["reason"], duplicateAction: "update" });

    await helpers.createTable("공장 설비 평면 배치 및 상태", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "name", type: "TEXT", notNull: true },
      { name: "status", type: "TEXT" },
      { name: "oee", type: "REAL" },
      { name: "x", type: "INTEGER" },
      { name: "y", type: "INTEGER" }
    ], { tableName: "crm_facility_layout", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("예지보전 건전도 요약", [
      { name: "equipmentId", type: "TEXT", notNull: true },
      { name: "equipmentName", type: "TEXT", notNull: true },
      { name: "healthScore", type: "REAL" },
      { name: "vibrationRms", type: "REAL" }
    ], { tableName: "crm_facility_predictive_summary", uniqueKeyColumns: ["equipmentId"], duplicateAction: "update" });

    await helpers.createTable("실시간 진동 트렌드 시계열", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "equipmentId", type: "TEXT", notNull: true },
      { name: "time", type: "TEXT" },
      { name: "value", type: "REAL" }
    ], { tableName: "crm_facility_predictive_vibration", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("FFT 주파수 분석 스펙트럼", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "equipmentId", type: "TEXT", notNull: true },
      { name: "frequency", type: "INTEGER" },
      { name: "amplitude", type: "REAL" },
      { name: "label", type: "TEXT" }
    ], { tableName: "crm_facility_predictive_fft", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("부품 잔여 수명 RUL", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "equipmentId", type: "TEXT", notNull: true },
      { name: "partName", type: "TEXT" },
      { name: "rulDays", type: "INTEGER" },
      { name: "status", type: "TEXT" },
      { name: "percent", type: "INTEGER" }
    ], { tableName: "crm_facility_predictive_part_rul", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("설비 고장 수리 대장", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "date", type: "TEXT", notNull: true },
      { name: "equipmentId", type: "TEXT", notNull: true },
      { name: "equipmentName", type: "TEXT", notNull: true },
      { name: "errorCode", type: "TEXT" },
      { name: "symptom", type: "TEXT" },
      { name: "repairDesc", type: "TEXT" },
      { name: "mechanic", type: "TEXT" },
      { name: "cost", type: "INTEGER" }
    ], { tableName: "crm_facility_repair_logs", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("AI 고장 진단 대책 가이드 DB", [
      { name: "errorCode", type: "TEXT", notNull: true },
      { name: "rootCause", type: "TEXT" },
      { name: "actions", type: "TEXT" }, // JSON string array
      { name: "similarHistory", type: "TEXT" },
      { name: "warehouse", type: "TEXT" }
    ], { tableName: "crm_facility_repair_solutions", uniqueKeyColumns: ["errorCode"], duplicateAction: "update" });

    // 3. 품질 관리 AI (QC) 테이블 생성
    console.log("🔬 3. 품질 관리 AI 테이블 생성 중...");
    await helpers.createTable("모바일 품질 검사 체크리스트 이력", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "lotNo", type: "TEXT", notNull: true },
      { name: "inspector", type: "TEXT", notNull: true },
      { name: "checkItems", type: "TEXT", notNull: true }, // JSON String
      { name: "signatureData", type: "TEXT" },
      { name: "photoUrl", type: "TEXT" },
      { name: "status", type: "TEXT", notNull: true },
      { name: "submittedAt", type: "TEXT", notNull: true }
    ], { tableName: "crm_quality_checklist_submissions", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("부적합 보고서 대장", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "date", type: "TEXT", notNull: true },
      { name: "itemName", type: "TEXT", notNull: true },
      { name: "defectCode", type: "TEXT" },
      { name: "defectType", type: "TEXT" },
      { name: "quantity", type: "INTEGER" },
      { name: "reporter", type: "TEXT" },
      { name: "status", type: "TEXT", notNull: true },
      { name: "description", type: "TEXT" },
      { name: "actionPlan", type: "TEXT" }
    ], { tableName: "crm_quality_ncr_items", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("LLM RAG 기반 유사 결함 조치 추천 이력", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "title", type: "TEXT", notNull: true },
      { name: "similarity", type: "REAL" },
      { name: "rootCause", type: "TEXT" },
      { name: "actionTaken", type: "TEXT" }
    ], { tableName: "crm_quality_ncr_similar_cases", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("실시간 전류/진동 센서 종합 상태", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "equipmentName", type: "TEXT", notNull: true },
      { name: "operationalStatus", type: "TEXT" },
      { name: "vibrationRms", type: "REAL" },
      { name: "motorCurrent", type: "REAL" },
      { name: "bearingTemp", type: "REAL" },
      { name: "anomalyScore", type: "INTEGER" },
      { name: "threshold", type: "INTEGER" }
    ], { tableName: "crm_quality_sensors_status", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("이상 탐지 기여도 요인", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "name", type: "TEXT", notNull: true },
      { name: "rate", type: "INTEGER" }
    ], { tableName: "crm_quality_sensors_contribution", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("실시간 센서 시계열 및 이상 지수", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "time", type: "TEXT" },
      { name: "vibration", type: "REAL" },
      { name: "current", type: "REAL" },
      { name: "temperature", type: "REAL" },
      { name: "anomalyScore", type: "INTEGER" }
    ], { tableName: "crm_quality_sensors_timeline", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("SPC 관리 규격 설정", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "targetValue", type: "REAL" },
      { name: "ucl", type: "REAL" },
      { name: "lcl", type: "REAL" },
      { name: "usl", type: "REAL" },
      { name: "lsl", type: "REAL" },
      { name: "currentCpk", type: "REAL" },
      { name: "cpkStatus", type: "TEXT" },
      { name: "futureRiskProbability", type: "INTEGER" }
    ], { tableName: "crm_quality_spc_config", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("X-bar 공정 온도 계측 이력", [
      { name: "batch", type: "TEXT", notNull: true },
      { name: "value", type: "REAL" },
      { name: "cpk", type: "REAL" },
      { name: "timestamp", type: "TEXT" }
    ], { tableName: "crm_quality_spc_samples", uniqueKeyColumns: ["batch"], duplicateAction: "update" });

    await helpers.createTable("미래 Cpk 예측 데이터", [
      { name: "batch", type: "TEXT", notNull: true },
      { name: "value", type: "REAL" },
      { name: "cpk", type: "REAL" },
      { name: "timestamp", type: "TEXT" },
      { name: "risk", type: "INTEGER" }
    ], { tableName: "crm_quality_spc_predictions", uniqueKeyColumns: ["batch"], duplicateAction: "update" });

    await helpers.createTable("SPC 요인별 중요도", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "name", type: "TEXT", notNull: true },
      { name: "value", type: "INTEGER" },
      { name: "color", type: "TEXT" }
    ], { tableName: "crm_quality_spc_features", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("비전 모델 사양 및 상태", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "activeModel", type: "TEXT" },
      { name: "goldenSamplesCount", type: "INTEGER" },
      { name: "lastTrainedAt", type: "TEXT" },
      { name: "anomalyThreshold", type: "REAL" }
    ], { tableName: "crm_quality_vision_model", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    await helpers.createTable("비전 불량 검출 이력 로그", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "timestamp", type: "TEXT" },
      { name: "itemName", type: "TEXT" },
      { name: "anomalyScore", type: "REAL" },
      { name: "status", type: "TEXT" },
      { name: "defectType", type: "TEXT" },
      { name: "imageUrl", type: "TEXT" },
      { name: "isReviewed", type: "INTEGER" }
    ], { tableName: "crm_quality_vision_logs", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    // 4. 자금 및 원가 AI 시뮬레이터 (Finance Cashflow) 테이블 생성
    console.log("💰 4. 자금 및 원가 AI 시뮬레이터 테이블 생성 중...");
    await helpers.createTable("제품 원가 기초 데이터", [
      { name: "productId", type: "TEXT", notNull: true },
      { name: "productName", type: "TEXT" },
      { name: "rawMaterialCost", type: "INTEGER" },
      { name: "laborCost", type: "INTEGER" },
      { name: "expenseCost", type: "INTEGER" },
      { name: "sellingPrice", type: "INTEGER" }
    ], { tableName: "crm_finance_products", uniqueKeyColumns: ["productId"], duplicateAction: "update" });

    await helpers.createTable("수금 및 지출 예정 대장", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "date", type: "TEXT", notNull: true },
      { name: "type", type: "TEXT" },
      { name: "title", type: "TEXT" },
      { name: "partnerName", type: "TEXT" },
      { name: "amount", type: "INTEGER" },
      { name: "isOverdue", type: "INTEGER" },
      { name: "contact", type: "TEXT" }
    ], { tableName: "crm_finance_forecasts", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    // 5. 정부 지원금 AI 기업 프로필 테이블 생성
    console.log("🪙 5. 정부 지원금 기업 프로필 테이블 생성 중...");
    await helpers.createTable("기업 기본 스펙 프로필 정보", [
      { name: "id", type: "TEXT", notNull: true },
      { name: "establishmentYear", type: "INTEGER" },
      { name: "employeeCount", type: "INTEGER" },
      { name: "patentsCount", type: "INTEGER" },
      { name: "femaleEmployeeRatio", type: "INTEGER" },
      { name: "youthEmployeeRatio", type: "INTEGER" },
      { name: "sector", type: "TEXT" }
    ], { tableName: "crm_grant_company_profile", uniqueKeyColumns: ["id"], duplicateAction: "update" });

    console.log("✅ 모든 신규 물리 테이블 생성 완료!");

    // ────────────────────────────────────────────────────────
    // 시드 데이터 백필 적재 시작
    // ────────────────────────────────────────────────────────
    console.log("🌱 시드 데이터 백필 적재 시작...");

    // 1. 생산 계획 AI (APS)
    await helpers.insertRows("crm_production_gantt_tasks", [
      { id: "T-01", title: "자동차 범퍼 사출 가공", equipmentId: "M-500", equipmentName: "사출 1호기 (M-500)", operatorName: "강성욱 (기사)", startHour: 9, endHour: 12, progress: 100, status: "COMPLETED" },
      { id: "T-02", title: "가전 외장 케이스 압출", equipmentId: "M-300", equipmentName: "사출 2호기 (M-300)", operatorName: "이민우 (조장)", startHour: 9, endHour: 13, progress: 75, status: "RUNNING" },
      { id: "T-03", title: "내부 정밀 기어 사출", equipmentId: "M-200", equipmentName: "사출 3호기 (M-200)", operatorName: "박준영 (사원)", startHour: 10, endHour: 15, progress: 20, status: "RUNNING" },
      { id: "T-04", title: "범퍼 후가공 및 마감", equipmentId: "A-100", equipmentName: "조립 라인 A (A-100)", operatorName: "최현우 (조장)", startHour: 13, endHour: 17, progress: 0, status: "WAITING" },
      { id: "T-05", title: "외장 케이스 도장 건조", equipmentId: "A-100", equipmentName: "조립 라인 A (A-100)", operatorName: "김태호 (사원)", startHour: 17, endHour: 21, progress: 0, status: "WAITING" }
    ]);
    await helpers.insertRows("crm_production_unscheduled_orders", [
      { orderId: "ORD-9954", productName: "냉장고 도어 힌지 몰딩", qty: 2500, dueDate: "2026-06-12", status: "UNSCHEDULED" },
      { orderId: "ORD-9955", productName: "자동차 헤드램프 가이드", qty: 1200, dueDate: "2026-06-14", status: "UNSCHEDULED" },
      { orderId: "ORD-9956", productName: "스마트TV 후면 프레임", qty: 3000, dueDate: "2026-06-18", status: "UNSCHEDULED" }
    ]);
    await helpers.insertRows("crm_production_bottlenecks", [
      { id: "M-500", name: "사출 1호기 (M-500)", loadRate: 98, status: "CRITICAL", queueTasks: 4 },
      { id: "M-300", name: "사출 2호기 (M-300)", loadRate: 85, status: "WARNING", queueTasks: 2 },
      { id: "M-200", name: "사출 3호기 (M-200)", loadRate: 60, status: "NORMAL", queueTasks: 1 },
      { id: "A-100", name: "조립 라인 A (A-100)", loadRate: 45, status: "NORMAL", queueTasks: 1 }
    ]);
    await helpers.insertRows("crm_production_due_risk", [
      { orderId: "ORD-9951", productName: "현대차 도어 가니쉬", probability: 98, status: "SAFE" },
      { orderId: "ORD-9952", productName: "삼성 에어컨 그릴", probability: 89, status: "SAFE" },
      { orderId: "ORD-9953", productName: "LG 노트북 쉘", probability: 64, status: "WARNING" }
    ]);

    // 2. 설비 관리 AI (PdM)
    await helpers.insertRows("crm_facility_events", [
      { id: "EVT-001", date: "2026-06-08", title: "사출 1호기 축 롤러 베어링 교체", type: "PREVENTIVE", assignee: "김철수" },
      { id: "EVT-002", date: "2026-06-12", title: "사출 2호기 유압 유량 센서 캘리브레이션", type: "CALIBRATION", assignee: "이영희" },
      { id: "EVT-003", date: "2026-06-15", title: "공장 전력 분전반 안전 점검", type: "ROUTINE", assignee: "박민수" },
      { id: "EVT-004", date: "2026-06-22", title: "사출 3호기 모터 서보 앰프 점검", type: "PREVENTIVE", assignee: "김철수" },
      { id: "EVT-005", date: "2026-06-28", title: "조립 라인 컨베이어 벨트 장력 조절", type: "ROUTINE", assignee: "이영희" }
    ]);
    await helpers.insertRows("crm_facility_parts", [
      { id: "PT-022", name: "롤러 베어링 (6204-ZZ)", safetyStock: 10, currentStock: 2, unit: "EA", leadTimeDays: 5, risk: "CRITICAL" },
      { id: "PT-085", name: "고온 히터 카트리지 (300W)", safetyStock: 5, currentStock: 6, unit: "EA", leadTimeDays: 3, risk: "SAFE" },
      { id: "PT-112", name: "유압 서보 솔레노이드 밸브", safetyStock: 2, currentStock: 1, unit: "EA", leadTimeDays: 10, risk: "WARNING" }
    ]);
    await helpers.insertRows("crm_facility_oee_stats", [
      { id: "OEE-GLOBAL", overallOee: 78.4, availability: 88.5, performance: 92.0, quality: 96.2, totalLoaded: 480, actualRun: 425, plannedStop: 30, breakdownStop: 25, opportunityLossKrw: 4800000, preventedLossKrw: 12500000 }
    ]);
    await helpers.insertRows("crm_facility_oee_downtime", [
      { reason: "기종 교체 및 금형 세팅", minutes: 90, rate: 45 },
      { reason: "원재료 Lot 입고 지연 대기", minutes: 50, rate: 25 },
      { reason: "모터 하우징 진동 과부하 정지", minutes: 30, rate: 15 },
      { reason: "일상 보전 급유 및 스케일 청소", minutes: 20, rate: 10 },
      { reason: "기타 안전 센서 오작동 등", minutes: 10, rate: 5 }
    ]);
    await helpers.insertRows("crm_facility_layout", [
      { id: "M-500", name: "사출 1호기", status: "WARNING", oee: 72.5, x: 20, y: 30 },
      { id: "M-300", name: "사출 2호기", status: "RUNNING", oee: 84.1, x: 50, y: 30 },
      { id: "M-200", name: "사출 3호기", status: "STOPPED", oee: 0.0, x: 80, y: 30 },
      { id: "A-100", name: "조립 라인 A", status: "RUNNING", oee: 92.5, x: 35, y: 70 },
      { id: "P-100", name: "포장 기기 P", status: "RUNNING", oee: 88.0, x: 65, y: 70 }
    ]);
    await helpers.insertRows("crm_facility_predictive_summary", [
      { equipmentId: "EQ-PRESS-01", equipmentName: "주력 사출 프레스 M-500", healthScore: 84.5, vibrationRms: 2.8 }
    ]);
    await helpers.insertRows("crm_facility_predictive_vibration", [
      { id: "VIB-1", equipmentId: "EQ-PRESS-01", time: "18:00", value: 1.2 },
      { id: "VIB-2", equipmentId: "EQ-PRESS-01", time: "19:00", value: 1.3 },
      { id: "VIB-3", equipmentId: "EQ-PRESS-01", time: "20:00", value: 1.5 },
      { id: "VIB-4", equipmentId: "EQ-PRESS-01", time: "21:00", value: 2.1 },
      { id: "VIB-5", equipmentId: "EQ-PRESS-01", time: "22:00", value: 2.6 },
      { id: "VIB-6", equipmentId: "EQ-PRESS-01", time: "23:00", value: 2.8 }
    ]);
    await helpers.insertRows("crm_facility_predictive_fft", [
      { id: "FFT-1", equipmentId: "EQ-PRESS-01", frequency: 10, amplitude: 0.1, label: "불균형 요인" },
      { id: "FFT-2", equipmentId: "EQ-PRESS-01", frequency: 33, amplitude: 0.8, label: "베어링 아우터 레이스 마모 결함" },
      { id: "FFT-3", equipmentId: "EQ-PRESS-01", frequency: 50, amplitude: 0.2, label: "전원 노이즈" },
      { id: "FFT-4", equipmentId: "EQ-PRESS-01", frequency: 80, amplitude: 0.05, label: "기어 이빨 기어링" }
    ]);
    await helpers.insertRows("crm_facility_predictive_part_rul", [
      { id: "RUL-1", equipmentId: "EQ-PRESS-01", partName: "구동 축 롤러 베어링", rulDays: 14, status: "WARNING", percent: 12 },
      { id: "RUL-2", equipmentId: "EQ-PRESS-01", partName: "유압 서보 벨브 실링", rulDays: 45, status: "NORMAL", percent: 48 },
      { id: "RUL-3", equipmentId: "EQ-PRESS-01", partName: "고압 가열 코일 블록", rulDays: 120, status: "NORMAL", percent: 85 }
    ]);
    await helpers.insertRows("crm_facility_repair_logs", [
      { id: "REP-2026-004", date: "2026-06-06 23:30", equipmentId: "M-500", equipmentName: "사출 1호기", errorCode: "E-03", symptom: "사출 노즐 히터 과열 오류 발생 및 히터 차단", repairDesc: "히터 카트리지 3번 단선 확인 후 신품 자재로 교체하고 온도 제어 릴레이 접점 접촉 청소 완료함.", mechanic: "김철수 (설비정비원)", cost: 120000 },
      { id: "REP-2026-003", date: "2026-06-02 11:20", equipmentId: "M-300", equipmentName: "사출 2호기", errorCode: "E-15", symptom: "유압 서보 모터 과부하 정지 및 기어 진동 가중", repairDesc: "서보 모터 고정 커플링 마모로 인한 유격 감지되어 솔레노이드 밸브 실링 교체 및 커플링 록타이트 보강 체결 완료.", mechanic: "이영희 (설비정비원)", cost: 450000 },
      { id: "REP-2026-002", date: "2026-05-28 09:15", equipmentId: "A-100", equipmentName: "조립 라인 A", errorCode: "W-08", symptom: "컨베이어 기어 벨트 미끄러짐 및 펄스 카운트 에러", repairDesc: "기어 드라이브 구동 벨트 마모 및 인장 저하. 벨트 장력 실린더 압력 리셋 및 신품 타이밍 벨트(3GT) 교체.", mechanic: "김철수 (설비정비원)", cost: 85000 }
    ]);
    await helpers.insertRows("crm_facility_repair_solutions", [
      { errorCode: "E-03", rootCause: "히터 전원 케이블 커넥터 접촉 불량 또는 히터 카트리지 국부 소손", actions: JSON.stringify(["1. 제어반 전원을 차단하고 히터 3상 단자의 저항치(정상 범위: 20~40옴)를 측정합니다.", "2. 저항치가 무한대일 경우 히터 카트리지를 교체하십시오.", "3. 릴레이 단자대의 전선 조임 상태 및 오염 물질을 클리너로 청소하십시오."]), similarHistory: "2024년 5월 김 반장님이 히터 블록 접촉 단자를 청소해 해결한 이력이 있습니다.", warehouse: "자재창고 A동 3번 선반 (고온 히터 300W - 코드 PT-085)" },
      { errorCode: "E-15", rootCause: "유압 오일 냉각 필터 막힘에 따른 점도 상승 및 서보 모터 피드 과부하", actions: JSON.stringify(["1. 유압 오일 필터 압력 게이지를 체크하여 막힘 상태를 검진합니다.", "2. 바이패스 밸브를 열어 필터 엘리먼트를 교체 세척합니다.", "3. 오일 탱크 온도를 측정하여 55도 이하인지 확인하십시오."]), similarHistory: "2025년 2월 유압 펌프 필터 교체로 과부하 트립 문제를 해결한 사례가 있습니다.", warehouse: "기계부품실 B구역 2번 캐비닛 (유압 오일 필터)" }
    ]);

    // 3. 품질 관리 AI (QC)
    await helpers.insertRows("crm_quality_ncr_items", [
      { id: "NCR-2026-004", date: "2026-06-06 23:45", itemName: "사출 성형 커버 A형", defectCode: "DEF-022", defectType: "표면 수축 및 함몰", quantity: 120, reporter: "김철수 (공정검사원)", status: "UNDER_REVIEW", description: "사출 성형 후 냉각 불량으로 인해 전면부 표면에 수축 함몰(Sink Mark)이 발생하여 규격 한계 초과함.", actionPlan: "" },
      { id: "NCR-2026-003", date: "2026-06-05 10:15", itemName: "커넥터 하우징 B형", defectCode: "DEF-008", defectType: "미성형 결함", quantity: 45, reporter: "이영희 (출하검사원)", status: "CAPA_ISSUED", description: "원자재 공급 불균형으로 인해 하단 결속 핀 성형부에 미성형 결함이 관찰되어 출하 대기 격리함.", actionPlan: "노즐 온도 5도 상향 조정 및 원자재 공급 압력 조절 피드 메커니즘 튜닝 완료." },
      { id: "NCR-2026-002", date: "2026-06-02 16:30", itemName: "사출 성형 커버 A형", defectCode: "DEF-015", defectType: "이물 혼입", quantity: 15, reporter: "박민수 (수입검사원)", status: "COMPLETED", description: "원재료 피딩 호퍼 세척 관리 소홀로 인한 흑점 이물 혼입 발견.", actionPlan: "호퍼 청소 스케줄 강화(주 1회 -> 매일 작업 전) 및 집진 쉴드 커버 장착 완료." }
    ]);
    await helpers.insertRows("crm_quality_ncr_similar_cases", [
      { id: "NCR-2024-118", title: "2024년 11월 사출 커버 표면 수축 불량 발생 건", similarity: 95.8, rootCause: "냉각 순환 밸브 스케일(침전물) 누적으로 인한 냉각 열교환 효율 저하.", actionTaken: "냉각 배관 세척액 플러싱 실시 및 냉각 타이머 2.5초 연장 설정. 조치 후 Cpk 1.45로 복귀." },
      { id: "NCR-2025-042", title: "2025년 4월 금형 온도 편차로 인한 Sink Mark 발생 건", similarity: 88.2, rootCause: "금형 가열 히터 카트리지 3번 단선으로 인한 국부적 온도 저하.", actionTaken: "단선된 가열 카트리지 교체 및 금형 온도 상한 경보 센서 이중화 튜닝." }
    ]);
    await helpers.insertRows("crm_quality_sensors_status", [
      { id: "SEN-SUMMARY", equipmentName: "주력 사출 프레스 M-500", operationalStatus: "WARNING", vibrationRms: 4.8, motorCurrent: 18.2, bearingTemp: 56.4, anomalyScore: 88, threshold: 70 }
    ]);
    await helpers.insertRows("crm_quality_sensors_contribution", [
      { id: "CON-1", name: "모터 하우징 진동 (Vibration)", rate: 62 },
      { id: "CON-2", name: "가동 구동 축 내부 온도 (Temperature)", rate: 23 },
      { id: "CON-3", name: "3상 공급 전력 전류 (Current)", rate: 15 }
    ]);
    await helpers.insertRows("crm_quality_sensors_timeline", [
      { id: "TIM-1", time: "23:00", vibration: 1.2, current: 12.4, temperature: 45.2, anomalyScore: 15 },
      { id: "TIM-2", time: "23:10", vibration: 1.3, current: 12.5, temperature: 45.8, anomalyScore: 18 },
      { id: "TIM-3", time: "23:20", vibration: 1.5, current: 13.0, temperature: 46.5, anomalyScore: 28 },
      { id: "TIM-4", time: "23:30", vibration: 2.1, current: 14.2, temperature: 48.0, anomalyScore: 45 },
      { id: "TIM-5", time: "23:40", vibration: 3.4, current: 16.5, temperature: 52.3, anomalyScore: 78 },
      { id: "TIM-6", time: "23:50", vibration: 4.8, current: 18.2, temperature: 56.4, anomalyScore: 88 }
    ]);
    await helpers.insertRows("crm_quality_spc_config", [
      { id: "SPC-CFG", targetValue: 210.0, ucl: 215.0, lcl: 205.0, usl: 218.0, lsl: 202.0, currentCpk: 1.15, cpkStatus: "WARNING", futureRiskProbability: 89 }
    ]);
    await helpers.insertRows("crm_quality_spc_samples", [
      { batch: "B-201", value: 210.2, cpk: 1.54, timestamp: "18:00" },
      { batch: "B-202", value: 211.5, cpk: 1.48, timestamp: "19:00" },
      { batch: "B-203", value: 209.8, cpk: 1.59, timestamp: "20:00" },
      { batch: "B-204", value: 213.1, cpk: 1.35, timestamp: "21:00" },
      { batch: "B-205", value: 214.8, cpk: 1.22, timestamp: "22:00" },
      { batch: "B-206", value: 215.2, cpk: 1.15, timestamp: "23:00" }
    ]);
    await helpers.insertRows("crm_quality_spc_predictions", [
      { batch: "B-207 (예측)", value: 216.0, cpk: 1.08, timestamp: "00:00 (예측)", risk: 78 },
      { batch: "B-208 (예측)", value: 216.5, cpk: 0.98, timestamp: "01:00 (예측)", risk: 89 },
      { batch: "B-209 (예측)", value: 217.1, cpk: 0.89, timestamp: "02:00 (예측)", risk: 94 },
      { batch: "B-210 (예측)", value: 217.3, cpk: 0.85, timestamp: "03:00 (예측)", risk: 97 }
    ]);
    await helpers.insertRows("crm_quality_spc_features", [
      { id: "SPC-F1", name: "가열 실린더 압력", value: 42, color: "bg-rose-500" },
      { id: "SPC-F2", name: "냉각수 밸브 유량", value: 28, color: "bg-amber-500" },
      { id: "SPC-F3", name: "환경 외부 온도", value: 18, color: "bg-blue-500" },
      { id: "SPC-F4", name: "원자재 용융 지수", value: 12, color: "bg-indigo-500" }
    ]);
    await helpers.insertRows("crm_quality_vision_model", [
      { id: "VIS-MODEL", activeModel: "Unsupervised PatchCore v2.1", goldenSamplesCount: 85, lastTrainedAt: "2026-06-05 14:30:22", anomalyThreshold: 75.0 }
    ]);
    await helpers.insertRows("crm_quality_vision_logs", [
      { id: "VIS-001", timestamp: "2026-06-06 23:15:30", itemName: "사출 성형 커버 A형", anomalyScore: 92.5, status: "FAIL", defectType: "표면 크랙 (Surface Crack)", imageUrl: "https://api.placeholder.com/400/300", isReviewed: 0 },
      { id: "VIS-002", timestamp: "2026-06-06 23:02:12", itemName: "사출 성형 커버 A형", anomalyScore: 12.4, status: "PASS", defectType: "없음 (정상)", imageUrl: "https://api.placeholder.com/400/300", isReviewed: 1 },
      { id: "VIS-003", timestamp: "2026-06-06 22:45:18", itemName: "커넥터 하우징 B형", anomalyScore: 88.1, status: "FAIL", defectType: "미성형 (Under-fill)", imageUrl: "https://api.placeholder.com/400/300", isReviewed: 1 },
      { id: "VIS-004", timestamp: "2026-06-06 22:30:05", itemName: "커넥터 하우징 B형", anomalyScore: 15.0, status: "PASS", defectType: "없음 (정상)", imageUrl: "https://api.placeholder.com/400/300", isReviewed: 1 },
      { id: "VIS-005", timestamp: "2026-06-06 22:12:44", itemName: "사출 성형 커버 A형", anomalyScore: 95.4, status: "FAIL", defectType: "이물 혼입 (Contamination)", imageUrl: "https://api.placeholder.com/400/300", isReviewed: 0 }
    ]);

    // 4. 자금 및 원가 AI 시뮬레이터 (Finance Cashflow)
    await helpers.insertRows("crm_finance_products", [
      { productId: "P-101", productName: "사출 성형 부품 A (자동차 향)", rawMaterialCost: 4500, laborCost: 2000, expenseCost: 1500, sellingPrice: 10000 },
      { productId: "P-102", productName: "압출 정밀 가이드 B (기계 향)", rawMaterialCost: 8000, laborCost: 3500, expenseCost: 2500, sellingPrice: 18000 },
      { productId: "P-103", productName: "가전 외장 다이캐스팅 C", rawMaterialCost: 12000, laborCost: 5000, expenseCost: 4000, sellingPrice: 28000 },
      { productId: "P-104", productName: "소형 플라스틱 캡 D", rawMaterialCost: 800, laborCost: 400, expenseCost: 300, sellingPrice: 2000 }
    ]);
    await helpers.insertRows("crm_finance_forecasts", [
      { id: "FC-01", date: "2026-06-08", type: "IN", title: "(주)현대모비스 매출채권 수금 예정", partnerName: "(주)현대모비스", amount: 45000000, isOverdue: 0, contact: "010-1234-5678" },
      { id: "FC-02", date: "2026-06-10", type: "OUT", title: "한일스틸 원자재(코일) 대금 결제", partnerName: "한일스틸", amount: 25000000, isOverdue: 0, contact: "010-8888-9999" },
      { id: "FC-03", date: "2026-06-15", type: "OUT", title: "6월 전직원 급여 및 상여금 지급", partnerName: "임직원 일동", amount: 32000000, isOverdue: 0, contact: "내부 급여계" },
      { id: "FC-04", date: "2026-06-18", type: "IN", title: "삼성전자 가전사업부 수주잔고 수금", partnerName: "삼성전자(주)", amount: 55000000, isOverdue: 0, contact: "010-2222-3333" },
      { id: "FC-05", date: "2026-06-20", type: "IN", title: "LG전자 디스플레이 부품 미수금 수금 (연체)", partnerName: "LG전자", amount: 18000000, isOverdue: 1, contact: "010-5555-6666" },
      { id: "FC-06", date: "2026-06-25", type: "OUT", title: "한전 전기요금 및 공장 관리비 자동이체", partnerName: "한국전력공사", amount: 12500000, isOverdue: 0, contact: "02-123-4567" },
      { id: "FC-07", date: "2026-07-02", type: "OUT", title: "대성케미칼 특수 수지 발주 대금 선입금", partnerName: "대성케미칼", amount: 22000000, isOverdue: 0, contact: "010-7777-8888" },
      { id: "FC-08", date: "2026-07-10", type: "IN", title: "기아자동차 2차 벤더 납품 수금 예정", partnerName: "세원정밀", amount: 38000000, isOverdue: 0, contact: "010-9999-0000" },
      { id: "FC-09", date: "2026-07-15", type: "OUT", title: "7월 임직원 정기 급여 지급", partnerName: "임직원 일동", amount: 30000000, isOverdue: 0, contact: "내부 급여계" },
      { id: "FC-10", date: "2026-07-28", type: "IN", title: "협력사 삼우정밀 미수 대금 수금 (연체)", partnerName: "삼우정밀", amount: 15000000, isOverdue: 1, contact: "010-4444-5555" }
    ]);

    // 5. 정부 지원금 AI 기업 프로필 (Company Profile)
    await helpers.insertRows("crm_grant_company_profile", [
      { id: "MY-COMPANY", establishmentYear: 2022, employeeCount: 12, patentsCount: 2, femaleEmployeeRatio: 35, youthEmployeeRatio: 65, sector: "도소매 및 물류 소프트웨어" }
    ]);

    console.log("🌱 모든 시드 데이터 백필 적재 성공 완료!");

  } catch (err) {
    console.error("❌ 마이그레이션 실패:", err.message);
  }
}

main();
