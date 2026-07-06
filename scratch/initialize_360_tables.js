const apiKey = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';
const apiUrl = 'http://localhost:8080';

// API fetch wrapper for user_data
async function callTool(tool, args) {
  const res = await fetch(`${apiUrl}/user-data/tools/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({ tool, arguments: args })
  });
  const data = await res.json();
  if (data.success === false) {
    throw new Error(data.error || 'Tool call failed');
  }
  const textContent = data.result?.content?.[0]?.text;
  return textContent ? JSON.parse(textContent) : null;
}

async function safeCreateTable(displayName, schema, options) {
  try {
    // 존재 여부 확인
    await callTool('user_data_query', { tableName: options.tableName, limit: 1 });
    console.log(`ℹ️ 테이블이 이미 존재합니다: ${options.tableName}`);
  } catch (err) {
    console.log(`🔨 테이블 생성 시작: ${options.tableName}`);
    await callTool('user_data_create_table', {
      displayName,
      schema,
      ...options
    });
    console.log(`✅ 테이블 생성 완료: ${options.tableName}`);
  }
}

async function safeInsert(tableName, rows) {
  try {
    const check = await callTool('user_data_query', { tableName, limit: 1 });
    if (check.rows && check.rows.length > 0) {
      console.log(`ℹ️ 데이터가 이미 백필되어 있습니다: ${tableName}`);
      return;
    }
    await callTool('user_data_insert_rows', { tableName, rows });
    console.log(`🎉 데모 데이터 백필 성공: ${tableName} (${rows.length} rows)`);
  } catch (err) {
    console.error(`❌ 데모 데이터 백필 실패: ${tableName} - Error:`, err.message);
  }
}

async function run() {
  const nowStr = new Date().toISOString();
  console.log('=== 🪐 13대 서브 이력 테이블 DIRECT DDL 및 백필 기동 ===');

  try {
    // 1. 학력사항
    await safeCreateTable('임직원 학력이력 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'school_name', type: 'TEXT', notNull: true },
      { name: 'major', type: 'TEXT', defaultValue: 'N/A' },
      { name: 'degree', type: 'TEXT', notNull: true },
      { name: 'entrance_date', type: 'TEXT', notNull: true },
      { name: 'graduation_date', type: 'TEXT', notNull: true },
      { name: 'status', type: 'TEXT', notNull: true }
    ], {
      tableName: 'crm_operator_education',
      uniqueKeyColumns: ['id']
    });
    const demoEdu = [
      { id: 'edu_1', operator_id: '1', school_name: '서울대학교', major: '경영학', degree: '학사', entrance_date: '1995-03-02', graduation_date: '1999-02-25', status: '졸업' },
      { id: 'edu_2', operator_id: '1', school_name: 'KAIST', major: '테크노경영', degree: '석사', entrance_date: '2000-03-02', graduation_date: '2002-02-21', status: '졸업' },
      { id: 'edu_3', operator_id: '2', school_name: '연세대학교', major: '무역학', degree: '학사', entrance_date: '2010-03-02', graduation_date: '2016-02-25', status: '졸업' },
      { id: 'edu_4', operator_id: '3', school_name: '인하대학교', major: '기계공학', degree: '학사', entrance_date: '2012-03-02', graduation_date: '2018-02-23', status: '졸업' },
      { id: 'edu_5', operator_id: '4', school_name: '고려대학교', major: '컴퓨터학과', degree: '학사', entrance_date: '2016-03-02', graduation_date: '2020-02-25', status: '졸업' }
    ];
    await safeInsert('crm_operator_education', demoEdu);

    // 2. 자격면허
    await safeCreateTable('임직원 자격면허 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'license_name', type: 'TEXT', notNull: true },
      { name: 'issuer', type: 'TEXT', notNull: true },
      { name: 'license_no', type: 'TEXT', notNull: true },
      { name: 'acquisition_date', type: 'TEXT', notNull: true },
      { name: 'expiry_date', type: 'TEXT', defaultValue: '없음' }
    ], {
      tableName: 'crm_operator_licenses',
      uniqueKeyColumns: ['id']
    });
    const demoLic = [
      { id: 'lic_1', operator_id: '1', license_name: '공인회계사(CPA)', issuer: '금융위원회', license_no: 'CPA-12345', acquisition_date: '2004-09-15', expiry_date: '없음' },
      { id: 'lic_2', operator_id: '2', license_name: '물류관리사', issuer: '한국산업인력공단', license_no: 'LOGI-98765', acquisition_date: '2017-10-20', expiry_date: '없음' },
      { id: 'lic_3', operator_id: '2', license_name: '유통관리사 2급', issuer: '대한상공회의소', license_no: 'DIST-54321', acquisition_date: '2018-05-15', expiry_date: '없음' },
      { id: 'lic_4', operator_id: '3', license_name: '일반기계기사', issuer: '한국산업인력공단', license_no: 'MECH-11223', acquisition_date: '2019-06-18', expiry_date: '없음' },
      { id: 'lic_5', operator_id: '4', license_name: '정보처리기사', issuer: '한국산업인력공단', license_no: 'INF-44556', acquisition_date: '2020-08-22', expiry_date: '없음' },
      { id: 'lic_6', operator_id: '4', license_name: 'SQLD (SQL개발자)', issuer: '한국데이터산업진흥원', license_no: 'SQLD-99887', acquisition_date: '2021-11-30', expiry_date: '없음' }
    ];
    await safeInsert('crm_operator_licenses', demoLic);

    // 3. 이전경력
    await safeCreateTable('임직원 이전경력 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'company_name', type: 'TEXT', notNull: true },
      { name: 'department', type: 'TEXT', defaultValue: 'N/A' },
      { name: 'job_title', type: 'TEXT', notNull: true },
      { name: 'join_date', type: 'TEXT', notNull: true },
      { name: 'retire_date', type: 'TEXT', notNull: true },
      { name: 'assigned_task', type: 'TEXT', notNull: true },
      { name: 'leaving_reason', type: 'TEXT', defaultValue: '개인사정' }
    ], {
      tableName: 'crm_operator_careers',
      uniqueKeyColumns: ['id']
    });
    const demoCar = [
      { id: 'car_1', operator_id: '1', company_name: '삼일회계법인', department: '감사본부', job_title: '시니어 매니저', join_date: '2002-03-01', retire_date: '2010-12-31', assigned_task: '기업 감사 및 재무 컨설팅', leaving_reason: '창업 준비' },
      { id: 'car_2', operator_id: '2', company_name: 'CJ대한통운', department: '물류기획팀', job_title: '대리', join_date: '2016-03-01', retire_date: '2024-05-31', assigned_task: 'SCM 물류망 기획 및 재고 전산화', leaving_reason: '이직' },
      { id: 'car_3', operator_id: '3', company_name: '현대중공업', department: '생산조립1과', job_title: '주임', join_date: '2018-03-02', retire_date: '2024-10-31', assigned_task: '가공 라인 조립 총괄 및 설비 점검', leaving_reason: '이직 및 연고지 변경' }
    ];
    await safeInsert('crm_operator_careers', demoCar);

    // 4. 급여상여
    await safeCreateTable('임직원 급여상여 이력 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'payment_year_month', type: 'TEXT', notNull: true },
      { name: 'base_salary', type: 'REAL', notNull: true },
      { name: 'bonus_amount', type: 'REAL', defaultValue: 0 },
      { name: 'weekly_holiday_allowance', type: 'REAL', defaultValue: 0 },
      { name: 'overtime_allowance', type: 'REAL', defaultValue: 0 },
      { name: 'meal_allowance', type: 'REAL', defaultValue: 100000 },
      { name: 'deduction_amount', type: 'REAL', notNull: true },
      { name: 'net_salary', type: 'REAL', notNull: true },
      { name: 'payment_date', type: 'TEXT', notNull: true },
      { name: 'status', type: 'TEXT', notNull: true }
    ], {
      tableName: 'crm_operator_salaries',
      uniqueKeyColumns: ['id']
    });
    const demoSal = [
      { id: 'sal_1', operator_id: '2', payment_year_month: '2026-04', base_salary: 3500000, bonus_amount: 300000, weekly_holiday_allowance: 250000, overtime_allowance: 120000, meal_allowance: 100000, deduction_amount: 380000, net_salary: 3890000, payment_date: '2026-04-25', status: '지급완료' },
      { id: 'sal_2', operator_id: '2', payment_year_month: '2026-05', base_salary: 3500000, bonus_amount: 0, weekly_holiday_allowance: 250000, overtime_allowance: 80000, meal_allowance: 100000, deduction_amount: 360000, net_salary: 3570000, payment_date: '2026-05-25', status: '지급완료' },
      { id: 'sal_3', operator_id: '3', payment_year_month: '2026-04', base_salary: 3200000, bonus_amount: 200000, weekly_holiday_allowance: 220000, overtime_allowance: 180000, meal_allowance: 100000, deduction_amount: 350000, net_salary: 3550000, payment_date: '2026-04-25', status: '지급완료' },
      { id: 'sal_4', operator_id: '3', payment_year_month: '2026-05', base_salary: 3200000, bonus_amount: 0, weekly_holiday_allowance: 220000, overtime_allowance: 150000, meal_allowance: 100000, deduction_amount: 330000, net_salary: 3340000, payment_date: '2026-05-25', status: '지급완료' },
      { id: 'sal_5', operator_id: '4', payment_year_month: '2026-04', base_salary: 3000000, bonus_amount: 150000, weekly_holiday_allowance: 200000, overtime_allowance: 90000, meal_allowance: 100000, deduction_amount: 310000, net_salary: 3230000, payment_date: '2026-04-25', status: '지급완료' },
      { id: 'sal_6', operator_id: '4', payment_year_month: '2026-05', base_salary: 3000000, bonus_amount: 0, weekly_holiday_allowance: 200000, overtime_allowance: 60000, meal_allowance: 100000, deduction_amount: 290000, net_salary: 3070000, payment_date: '2026-05-25', status: '지급완료' }
    ];
    await safeInsert('crm_operator_salaries', demoSal);

    // 5. 부서이동/승진
    await safeCreateTable('임직원 승진발령 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'change_date', type: 'TEXT', notNull: true },
      { name: 'prev_dept', type: 'TEXT', notNull: true },
      { name: 'next_dept', type: 'TEXT', notNull: true },
      { name: 'prev_role', type: 'TEXT', notNull: true },
      { name: 'next_role', type: 'TEXT', notNull: true },
      { name: 'promotion_reason', type: 'TEXT', defaultValue: '정기 인사평가 반영' }
    ], {
      tableName: 'crm_operator_promotions',
      uniqueKeyColumns: ['id']
    });
    const demoPro = [
      { id: 'pro_1', operator_id: '2', change_date: '2026-03-01', prev_dept: '구매팀', next_dept: '구매팀', prev_role: '사원', next_role: '대리', promotion_reason: 'SCM 자재 발주 시스템 최적화 우수 공헌' },
      { id: 'pro_2', operator_id: '3', change_date: '2026-04-15', prev_dept: '생산부', next_dept: '생산본부 생산공장', prev_role: '조장', next_role: '반장', promotion_reason: '공장 라인 100% 무재해 달성 및 물류 조절 성과 반영' }
    ];
    await safeInsert('crm_operator_promotions', demoPro);

    // 6. 상벌이력
    await safeCreateTable('임직원 상벌 징계 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'record_date', type: 'TEXT', notNull: true },
      { name: 'type', type: 'TEXT', notNull: true },
      { name: 'title', type: 'TEXT', notNull: true },
      { name: 'content', type: 'TEXT', notNull: true },
      { name: 'authority', type: 'TEXT', notNull: true },
      { name: 'remarks', type: 'TEXT', defaultValue: '없음' }
    ], {
      tableName: 'crm_operator_awards',
      uniqueKeyColumns: ['id']
    });
    const demoAwd = [
      { id: 'awd_1', operator_id: '2', record_date: '2025-12-10', type: 'AWARD', title: '올해의 우수사원 포상', content: '연간 자재 매입 단가 12% 절감에 따른 원가 절감 기여', authority: '대표이사', remarks: '포상금 50만 원 수여' },
      { id: 'awd_2', operator_id: '3', record_date: '2026-02-15', type: 'AWARD', title: '무재해 달성 공로상', content: '공장 생산 설비 선제적 점검으로 사고 발생률 0% 수호', authority: '공장장', remarks: '부상 수여' }
    ];
    await safeInsert('crm_operator_awards', demoAwd);

    // 7. 경조사이력
    await safeCreateTable('임직원 경조사 지원 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'event_date', type: 'TEXT', notNull: true },
      { name: 'relation', type: 'TEXT', notNull: true },
      { name: 'type', type: 'TEXT', notNull: true },
      { name: 'congratulation_money', type: 'REAL', defaultValue: 0 },
      { name: 'wreath_provided', type: 'INTEGER', defaultValue: 0 }
    ], {
      tableName: 'crm_operator_family_events',
      uniqueKeyColumns: ['id']
    });
    const demoFev = [
      { id: 'fev_1', operator_id: '2', event_date: '2025-05-18', relation: '본인', type: '결혼', congratulation_money: 500000, wreath_provided: 1 },
      { id: 'fev_2', operator_id: '3', event_date: '2026-01-10', relation: '모친', type: '장례', congratulation_money: 300000, wreath_provided: 1 }
    ];
    await safeInsert('crm_operator_family_events', demoFev);

    // 8. 병력치료
    await safeCreateTable('임직원 병력 치료 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'diagnosis_name', type: 'TEXT', notNull: true },
      { name: 'treatment_start_date', type: 'TEXT', notNull: true },
      { name: 'treatment_end_date', type: 'TEXT', notNull: true },
      { name: 'hospital_name', type: 'TEXT', notNull: true },
      { name: 'sick_leave_days', type: 'INTEGER', defaultValue: 0 },
      { name: 'work_limitations', type: 'TEXT', defaultValue: '없음' }
    ], {
      tableName: 'crm_operator_medical',
      uniqueKeyColumns: ['id']
    });
    const demoMed = [
      { id: 'med_1', operator_id: '3', diagnosis_name: '급성 맹장염', treatment_start_date: '2025-08-05', treatment_end_date: '2025-08-12', hospital_name: '인천성모병원', sick_leave_days: 7, work_limitations: '수술 부위 회복을 위해 2주간 무거운 짐 운반 금지 조치' }
    ];
    await safeInsert('crm_operator_medical', demoMed);

    // 9. 대내외 사건사고
    await safeCreateTable('임직원 대내외 사건사고 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'occurred_date', type: 'TEXT', notNull: true },
      { name: 'severity', type: 'TEXT', notNull: true },
      { name: 'title', type: 'TEXT', notNull: true },
      { name: 'description', type: 'TEXT', notNull: true },
      { name: 'status', type: 'TEXT', notNull: true },
      { name: 'outcome', type: 'TEXT', defaultValue: '조치 예정' },
      { name: 'updated_at', type: 'TEXT', notNull: true }
    ], {
      tableName: 'crm_operator_incidents',
      uniqueKeyColumns: ['id']
    });
    const demoInc = [
      { id: 'inc_1', operator_id: '2', occurred_date: '2026-03-10', severity: 'LOW', title: '사내 비품 파손 분쟁 오해 건', description: '창고 정리 도중 불필요한 시제품 박스 파손 오해로 인한 갈등 발생', status: '종결', outcome: '단순 오해로 확인되어 상호 대화로 원만히 합의 완료 및 사내 비품 변상 조치 완료', updated_at: nowStr },
      { id: 'inc_2', operator_id: '3', occurred_date: '2026-05-02', severity: 'HIGH', title: '전세 사기 피해로 인한 소유권 반환 민사 소송 건', description: '최근 전세 사기 사태 연루로 보증금 유실 위기 직면, 보증금 반환 및 소유권 확보 소송 진행 중', status: '진행중', outcome: '대표 및 법무 대리인이 무료 변호 법률 자문을 조력하는 한편, 직원의 극심한 정신 피로를 보완하기 위해 생산 라인 업무 조율을 검토함', updated_at: nowStr }
    ];
    await safeInsert('crm_operator_incidents', demoInc);

    // 10. 다차원 평판
    await safeCreateTable('임직원 다차원 평판 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'evaluation_date', type: 'TEXT', notNull: true },
      { name: 'evaluator_id', type: 'TEXT', defaultValue: '익명' },
      { name: 'source_type', type: 'TEXT', notNull: true },
      { name: 'score', type: 'REAL', notNull: true },
      { name: 'positive_feedback', type: 'TEXT', notNull: true },
      { name: 'constructive_feedback', type: 'TEXT', defaultValue: '없음' },
      { name: 'updated_at', type: 'TEXT', notNull: true }
    ], {
      tableName: 'crm_operator_reputations',
      uniqueKeyColumns: ['id']
    });
    const demoRep = [
      { id: 'rep_1', operator_id: '2', evaluation_date: '2026-05-15', evaluator_id: '익명', source_type: 'INTERNAL', score: 4.8, positive_feedback: '부서 간 갈등이 발생했을 때 중재를 매우 조화롭게 이끌어 냅니다. 타인을 배려하는 소통 태도가 아주 우수합니다.', constructive_feedback: '자료 취합 시 가끔 세부 검토 속도가 늦어질 수 있어, 사전 알림 공유를 미리 해주면 더 수월하겠습니다.', updated_at: nowStr },
      { id: 'rep_2', operator_id: '2', evaluation_date: '2026-05-20', evaluator_id: 'mgr_1', source_type: 'MANAGER', score: 4.7, positive_feedback: '구매 실무 협상력이 탁월하며 원자재 시황을 꿰뚫어 보고 선제 구매에 나서 예산을 획기적으로 절약했습니다.', constructive_feedback: '하급 직원 양성을 위한 멘토링에 시간을 조금 더 배정해 주면 완벽한 차기 리더가 될 것입니다.', updated_at: nowStr },
      { id: 'rep_3', operator_id: '3', evaluation_date: '2026-05-12', evaluator_id: '익명', source_type: 'INTERNAL', score: 4.2, positive_feedback: '생산 설비 관리에 있어 절대 실수를 저지르지 않으며 성실하고 책임감이 막중합니다.', constructive_feedback: '대인 관계 소통 시 단답형 표현이 잦아 오해를 사기도 하니 따뜻한 어조로 조언해 주시면 더 좋겠습니다.', updated_at: nowStr },
      { id: 'rep_4', operator_id: '3', evaluation_date: '2026-05-18', evaluator_id: 'buyer_abc', source_type: 'EXTERNAL', score: 4.9, positive_feedback: '품질 검수 기준에 타협이 없어서 신뢰도가 대단히 높습니다. 당사로 납품하는 모든 자재가 불량률 제로를 지킵니다.', constructive_feedback: '급격한 일정 단축을 요청할 때 가끔 지나치게 완곡하게 거절해 조율이 더딘 경향이 있습니다.', updated_at: nowStr },
      { id: 'rep_5', operator_id: '4', evaluation_date: '2026-05-22', evaluator_id: '익명', source_type: 'INTERNAL', score: 4.6, positive_feedback: '신규 ERP 인벤토리 전산 마운트 시 발생한 전산 장애를 새벽 내내 붙잡아 빠르게 안정화해 주어 감사했습니다.', constructive_feedback: '다른 팀과의 협동 개발 요구사항 분석 시, 직무 한계를 선 긋는 인상이 가끔 있으나 충분히 소통하면 해소됩니다.', updated_at: nowStr }
    ];
    await safeInsert('crm_operator_reputations', demoRep);

    // 11. 부양가족
    await safeCreateTable('임직원 부양가족 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'relation_type', type: 'TEXT', notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'birth_date', type: 'TEXT', notNull: true },
      { name: 'phone_number', type: 'TEXT', notNull: true },
      { name: 'is_dependent', type: 'INTEGER', defaultValue: 0 },
      { name: 'remarks', type: 'TEXT', defaultValue: '없음' }
    ], {
      tableName: 'crm_operator_families',
      uniqueKeyColumns: ['id']
    });
    const demoFam = [
      { id: 'fam_1', operator_id: '2', relation_type: '배우자', name: '한은혜', birth_date: '1990-05-12', phone_number: '010-9988-7766', is_dependent: 1, remarks: '동거 부양' },
      { id: 'fam_2', operator_id: '2', relation_type: '자녀', name: '홍진우', birth_date: '2019-10-01', phone_number: 'N/A', is_dependent: 1, remarks: '초등학교 입학 생애주기 도래 (가족수당 및 축하 복지 상신 대상자)' },
      { id: 'fam_3', operator_id: '3', relation_type: '모친', name: '이순자', birth_date: '1955-03-24', phone_number: '010-5566-7788', is_dependent: 1, remarks: '지방 거주 부양, 노령 연금 복지 대상' },
      { id: 'fam_4', operator_id: '4', relation_type: '자녀', name: '김민우', birth_date: '2024-02-10', phone_number: 'N/A', is_dependent: 1, remarks: '영아 유급 특별 돌봄 수당 및 육아 단축 휴직 권장 주기' }
    ];
    await safeInsert('crm_operator_families', demoFam);

    // 12. 담당업무 변경이력
    await safeCreateTable('임직원 담당업무 변경이력 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'assignment_date', type: 'TEXT', notNull: true },
      { name: 'job_description', type: 'TEXT', notNull: true },
      { name: 'prev_job_description', type: 'TEXT', defaultValue: '없음' },
      { name: 'is_current', type: 'INTEGER', defaultValue: 1 }
    ], {
      tableName: 'crm_operator_job_history',
      uniqueKeyColumns: ['id']
    });
    const demoJob = [
      { id: 'job_1', operator_id: '2', assignment_date: '2025-03-10', job_description: '부품 원자재 발주 시스템 구축 및 SCM 벤더 관리 실무', prev_job_description: '없음', is_current: 1 },
      { id: 'job_2', operator_id: '3', assignment_date: '2025-07-20', job_description: '생산라인 기계 장비 오퍼레이팅 및 가공 조절', prev_job_description: '없음', is_current: 0 },
      { id: 'job_3', operator_id: '3', assignment_date: '2026-04-15', job_description: '생산공장 1라인 공정 총괄 및 무재해 현장 안전 관리자', prev_job_description: '생산라인 기계 장비 오퍼레이팅 및 가공 조절', is_current: 1 },
      { id: 'job_4', operator_id: '4', assignment_date: '2026-02-15', job_description: 'EGDesk 재고 전산망 데이터베이스 튜닝 및 IT 인프라 지원', prev_job_description: '없음', is_current: 1 }
    ];
    await safeInsert('crm_operator_job_history', demoJob);

    // 13. 참여 프로젝트
    await safeCreateTable('임직원 참여 프로젝트 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'operator_id', type: 'TEXT', notNull: true },
      { name: 'project_name', type: 'TEXT', notNull: true },
      { name: 'role_in_project', type: 'TEXT', notNull: true },
      { name: 'start_date', type: 'TEXT', notNull: true },
      { name: 'end_date', type: 'TEXT', defaultValue: '진행중' },
      { name: 'contribution_rate', type: 'REAL', defaultValue: 100 },
      { name: 'performance_score', type: 'REAL', defaultValue: 0 },
      { name: 'performance_evaluation', type: 'TEXT', defaultValue: '수행중' },
      { name: 'outcome_link', type: 'TEXT', defaultValue: '없음' }
    ], {
      tableName: 'crm_operator_projects',
      uniqueKeyColumns: ['id']
    });
    const demoPrj = [
      { id: 'prj_1', operator_id: '2', project_name: '전사 스마트 SCM 물류 자동화', role_in_project: '자원 조달 및 벤더 연동 총괄', start_date: '2025-06-01', end_date: '2025-12-15', contribution_rate: 60, performance_score: 95, performance_evaluation: '자재 매입 가격 최적화 알고리즘을 도입하여 물류 예산을 전년 대비 12% 절감하는 압도적 성과 달성', outcome_link: 'http://docs.egdesk.internal/scm-success' },
      { id: 'prj_2', operator_id: '2', project_name: '2분기 수주 긴급 자재 조달 프로젝트', role_in_project: '공급선 긴급 수배 및 리스크 매핑', start_date: '2026-04-01', end_date: '진행중', contribution_rate: 80, performance_score: 90, performance_evaluation: '현재 수주의 납기 안정을 위해 실시간 벤더 매칭 수배 중', outcome_link: '없음' },
      { id: 'prj_3', operator_id: '3', project_name: '공장 생산라인 100% 무재해 환경 고도화', role_in_project: '현장 감지 센서 및 스마트 가드 연동', start_date: '2026-01-05', end_date: '2026-04-30', contribution_rate: 100, performance_score: 98, performance_evaluation: '생산 가이드 및 신체 감지 스마트 레이저 가드를 도입하여 단 한 건의 기계 물리 충돌 사고도 없이 프로젝트 완결', outcome_link: 'http://docs.egdesk.internal/safety-first' },
      { id: 'prj_4', operator_id: '4', project_name: '실시간 인벤토리 DB 튜닝 및 검색 고속화', role_in_project: 'DB 파티셔닝 및 이중화 설계', start_date: '2026-03-01', end_date: '진행중', contribution_rate: 100, performance_score: 88, performance_evaluation: '인벤토리 빅데이터 조회 지연 시간을 3.2초에서 0.15초로 대폭 단축', outcome_link: '없음' }
    ];
    await safeInsert('crm_operator_projects', demoPrj);

    console.log('🎉=== 13대 서브 이력 테이블 DIRECT DDL 및 백필 완결 ===');
  } catch (err) {
    console.error('💥 DDL/백필 과정 전체 에러:', err.message);
  }
}

run();
