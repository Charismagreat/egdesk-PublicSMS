export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createTable, queryTable, insertRows, deleteRows, updateRows } from '@/../egdesk-helpers';

/**
 * 🏛️ 13대 서브 테이블 종합 인사 프로필 데이터베이스 자율 생성 및 데모 백필 (Self-Healing Auto-Migration)
 */
async function initComprehensiveProfilesDatabase() {
  const nowStr = new Date().toISOString();

  const tablesToInit = [
    {
      name: 'crm_operator_education',
      displayName: '임직원 학력이력 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'school_name', type: 'TEXT', notNull: true },
        { name: 'major', type: 'TEXT', defaultValue: 'N/A' },
        { name: 'degree', type: 'TEXT', notNull: true },
        { name: 'entrance_date', type: 'TEXT', notNull: true },
        { name: 'graduation_date', type: 'TEXT', notNull: true },
        { name: 'status', type: 'TEXT', notNull: true }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'edu_1', operator_id: '1', school_name: '서울대학교', major: '경영학', degree: '학사', entrance_date: '1995-03-02', graduation_date: '1999-02-25', status: '졸업' },
        { id: 'edu_2', operator_id: '1', school_name: 'KAIST', major: '테크노경영', degree: '석사', entrance_date: '2000-03-02', graduation_date: '2002-02-21', status: '졸업' },
        { id: 'edu_3', operator_id: '2', school_name: '연세대학교', major: '무역학', degree: '학사', entrance_date: '2010-03-02', graduation_date: '2016-02-25', status: '졸업' },
        { id: 'edu_4', operator_id: '3', school_name: '인하대학교', major: '기계공학', degree: '학사', entrance_date: '2012-03-02', graduation_date: '2018-02-23', status: '졸업' },
        { id: 'edu_5', operator_id: '4', school_name: '고려대학교', major: '컴퓨터학과', degree: '학사', entrance_date: '2016-03-02', graduation_date: '2020-02-25', status: '졸업' }
      ]
    },
    {
      name: 'crm_operator_licenses',
      displayName: '임직원 자격면허 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'license_name', type: 'TEXT', notNull: true },
        { name: 'issuer', type: 'TEXT', notNull: true },
        { name: 'license_no', type: 'TEXT', notNull: true },
        { name: 'acquisition_date', type: 'TEXT', notNull: true },
        { name: 'expiry_date', type: 'TEXT', defaultValue: '없음' }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'lic_1', operator_id: '1', license_name: '공인회계사(CPA)', issuer: '금융위원회', license_no: 'CPA-12345', acquisition_date: '2004-09-15', expiry_date: '없음' },
        { id: 'lic_2', operator_id: '2', license_name: '물류관리사', issuer: '한국산업인력공단', license_no: 'LOGI-98765', acquisition_date: '2017-10-20', expiry_date: '없음' },
        { id: 'lic_3', operator_id: '2', license_name: '유통관리사 2급', issuer: '대한상공회의소', license_no: 'DIST-54321', acquisition_date: '2018-05-15', expiry_date: '없음' },
        { id: 'lic_4', operator_id: '3', license_name: '일반기계기사', issuer: '한국산업인력공단', license_no: 'MECH-11223', acquisition_date: '2019-06-18', expiry_date: '없음' },
        { id: 'lic_5', operator_id: '4', license_name: '정보처리기사', issuer: '한국산업인력공단', license_no: 'INF-44556', acquisition_date: '2020-08-22', expiry_date: '없음' },
        { id: 'lic_6', operator_id: '4', license_name: 'SQLD (SQL개발자)', issuer: '한국데이터산업진흥원', license_no: 'SQLD-99887', acquisition_date: '2021-11-30', expiry_date: '없음' }
      ]
    },
    {
      name: 'crm_operator_careers',
      displayName: '임직원 이전경력 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'company_name', type: 'TEXT', notNull: true },
        { name: 'department', type: 'TEXT', defaultValue: 'N/A' },
        { name: 'job_title', type: 'TEXT', notNull: true },
        { name: 'join_date', type: 'TEXT', notNull: true },
        { name: 'retire_date', type: 'TEXT', notNull: true },
        { name: 'assigned_task', type: 'TEXT', notNull: true },
        { name: 'leaving_reason', type: 'TEXT', defaultValue: '개인사정' }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'car_1', operator_id: '1', company_name: '삼일회계법인', department: '감사본부', job_title: '시니어 매니저', join_date: '2002-03-01', retire_date: '2010-12-31', assigned_task: '기업 감사 및 재무 컨설팅', leaving_reason: '창업 준비' },
        { id: 'car_2', operator_id: '2', company_name: 'CJ대한통운', department: '물류기획팀', job_title: '대리', join_date: '2016-03-01', retire_date: '2024-05-31', assigned_task: 'SCM 물류망 기획 및 재고 전산화', leaving_reason: '이직' },
        { id: 'car_3', operator_id: '3', company_name: '현대중공업', department: '생산조립1과', job_title: '주임', join_date: '2018-03-02', retire_date: '2024-10-31', assigned_task: '가공 라인 조립 총괄 및 설비 점검', leaving_reason: '이직 및 연고지 변경' }
      ]
    },
    {
      name: 'crm_operator_salaries',
      displayName: '임직원 급여상여 이력 대장',
      schema: [
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
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'sal_1', operator_id: '2', payment_year_month: '2026-04', base_salary: 3500000, bonus_amount: 300000, weekly_holiday_allowance: 250000, overtime_allowance: 120000, meal_allowance: 100000, deduction_amount: 380000, net_salary: 3890000, payment_date: '2026-04-25', status: '지급완료' },
        { id: 'sal_2', operator_id: '2', payment_year_month: '2026-05', base_salary: 3500000, bonus_amount: 0, weekly_holiday_allowance: 250000, overtime_allowance: 80000, meal_allowance: 100000, deduction_amount: 360000, net_salary: 3570000, payment_date: '2026-05-25', status: '지급완료' },
        { id: 'sal_3', operator_id: '3', payment_year_month: '2026-04', base_salary: 3200000, bonus_amount: 200000, weekly_holiday_allowance: 220000, overtime_allowance: 180000, meal_allowance: 100000, deduction_amount: 350000, net_salary: 3550000, payment_date: '2026-04-25', status: '지급완료' },
        { id: 'sal_4', operator_id: '3', payment_year_month: '2026-05', base_salary: 3200000, bonus_amount: 0, weekly_holiday_allowance: 220000, overtime_allowance: 150000, meal_allowance: 100000, deduction_amount: 330000, net_salary: 3340000, payment_date: '2026-05-25', status: '지급완료' },
        { id: 'sal_5', operator_id: '4', payment_year_month: '2026-04', base_salary: 3000000, bonus_amount: 150000, weekly_holiday_allowance: 200000, overtime_allowance: 90000, meal_allowance: 100000, deduction_amount: 310000, net_salary: 3230000, payment_date: '2026-04-25', status: '지급완료' },
        { id: 'sal_6', operator_id: '4', payment_year_month: '2026-05', base_salary: 3000000, bonus_amount: 0, weekly_holiday_allowance: 200000, overtime_allowance: 60000, meal_allowance: 100000, deduction_amount: 290000, net_salary: 3070000, payment_date: '2026-05-25', status: '지급완료' }
      ]
    },
    {
      name: 'crm_operator_promotions',
      displayName: '임직원 승진발령 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'change_date', type: 'TEXT', notNull: true },
        { name: 'prev_dept', type: 'TEXT', notNull: true },
        { name: 'next_dept', type: 'TEXT', notNull: true },
        { name: 'prev_role', type: 'TEXT', notNull: true },
        { name: 'next_role', type: 'TEXT', notNull: true },
        { name: 'promotion_reason', type: 'TEXT', defaultValue: '정기 인사평가 반영' }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'pro_1', operator_id: '2', change_date: '2026-03-01', prev_dept: '구매팀', next_dept: '구매팀', prev_role: '사원', next_role: '대리', promotion_reason: 'SCM 자재 발주 시스템 최적화 우수 공헌' },
        { id: 'pro_2', operator_id: '3', change_date: '2026-04-15', prev_dept: '생산부', next_dept: '생산본부 생산공장', prev_role: '조장', next_role: '반장', promotion_reason: '공장 라인 100% 무재해 달성 및 물류 조절 성과 반영' }
      ]
    },
    {
      name: 'crm_operator_awards',
      displayName: '임직원 상벌 징계 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'record_date', type: 'TEXT', notNull: true },
        { name: 'type', type: 'TEXT', notNull: true }, // AWARD, PENALTY
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'content', type: 'TEXT', notNull: true },
        { name: 'authority', type: 'TEXT', notNull: true },
        { name: 'remarks', type: 'TEXT', defaultValue: '없음' }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'awd_1', operator_id: '2', record_date: '2025-12-10', type: 'AWARD', title: '올해의 우수사원 포상', content: '연간 자재 매입 단가 12% 절감에 따른 원가 절감 기여', authority: '대표이사', remarks: '포상금 50만 원 수여' },
        { id: 'awd_2', operator_id: '3', record_date: '2026-02-15', type: 'AWARD', title: '무재해 달성 공로상', content: '공장 생산 설비 선제적 점검으로 사고 발생률 0% 수호', authority: '공장장', remarks: '부상 수여' }
      ]
    },
    {
      name: 'crm_operator_family_events',
      displayName: '임직원 경조사 지원 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'event_date', type: 'TEXT', notNull: true },
        { name: 'relation', type: 'TEXT', notNull: true },
        { name: 'type', type: 'TEXT', notNull: true },
        { name: 'congratulation_money', type: 'REAL', defaultValue: 0 },
        { name: 'wreath_provided', type: 'INTEGER', defaultValue: 0 }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'fev_1', operator_id: '2', event_date: '2025-05-18', relation: '본인', type: '결혼', congratulation_money: 500000, wreath_provided: 1 },
        { id: 'fev_2', operator_id: '3', event_date: '2026-01-10', relation: '모친', type: '장례', congratulation_money: 300000, wreath_provided: 1 }
      ]
    },
    {
      name: 'crm_operator_medical',
      displayName: '임직원 병력 치료 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'diagnosis_name', type: 'TEXT', notNull: true },
        { name: 'treatment_start_date', type: 'TEXT', notNull: true },
        { name: 'treatment_end_date', type: 'TEXT', notNull: true },
        { name: 'hospital_name', type: 'TEXT', notNull: true },
        { name: 'sick_leave_days', type: 'INTEGER', defaultValue: 0 },
        { name: 'work_limitations', type: 'TEXT', defaultValue: '없음' }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'med_1', operator_id: '3', diagnosis_name: '급성 맹장염', treatment_start_date: '2025-08-05', treatment_end_date: '2025-08-12', hospital_name: '인천성모병원', sick_leave_days: 7, work_limitations: '수술 부위 회복을 위해 2주간 무거운 짐 운반 금지 조치' }
      ]
    },
    {
      name: 'crm_operator_incidents',
      displayName: '임직원 대내외 사건사고 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'occurred_date', type: 'TEXT', notNull: true },
        { name: 'severity', type: 'TEXT', notNull: true },
        { name: 'title', type: 'TEXT', notNull: true },
        { name: 'description', type: 'TEXT', notNull: true },
        { name: 'status', type: 'TEXT', notNull: true },
        { name: 'outcome', type: 'TEXT', defaultValue: '조치 예정' },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'inc_1', operator_id: '2', occurred_date: '2026-03-10', severity: 'LOW', title: '사내 비품 파손 분쟁 오해 건', description: '창고 정리 도중 불필요한 시제품 박스 파손 오해로 인한 갈등 발생', status: '종결', outcome: '단순 오해로 확인되어 상호 대화로 원만히 합의 완료 및 사내 비품 변상 조치 완료', updated_at: nowStr },
        { id: 'inc_2', operator_id: '3', occurred_date: '2026-05-02', severity: 'HIGH', title: '전세 사기 피해로 인한 소유권 반환 민사 소송 건', description: '최근 전세 사기 사태 연루로 보증금 유실 위기 직면, 보증금 반환 및 소유권 확보 소송 진행 중', status: '진행중', outcome: '대표 및 법무 대리인이 무료 변호 법률 자문을 조력하는 한편, 직원의 극심한 정신 피로를 보완하기 위해 생산 라인 업무 조율을 검토함', updated_at: nowStr }
      ]
    },
    {
      name: 'crm_operator_reputations',
      displayName: '임직원 다차원 평판 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'evaluation_date', type: 'TEXT', notNull: true },
        { name: 'evaluator_id', type: 'TEXT', defaultValue: '익명' },
        { name: 'source_type', type: 'TEXT', notNull: true },
        { name: 'score', type: 'REAL', notNull: true },
        { name: 'positive_feedback', type: 'TEXT', notNull: true },
        { name: 'constructive_feedback', type: 'TEXT', defaultValue: '없음' },
        { name: 'updated_at', type: 'TEXT', notNull: true }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'rep_1', operator_id: '2', evaluation_date: '2026-05-15', evaluator_id: '익명', source_type: 'INTERNAL', score: 4.8, positive_feedback: '부서 간 갈등이 발생했을 때 중재를 매우 조화롭게 이끌어 냅니다. 타인을 배려하는 소통 태도가 아주 우수합니다.', constructive_feedback: '자료 취합 시 가끔 세부 검토 속도가 늦어질 수 있어, 사전 알림 공유를 미리 해주면 더 수월하겠습니다.', updated_at: nowStr },
        { id: 'rep_2', operator_id: '2', evaluation_date: '2026-05-20', evaluator_id: 'mgr_1', source_type: 'MANAGER', score: 4.7, positive_feedback: '구매 실무 협상력이 탁월하며 원자재 시황을 꿰뚫어 보고 선제 구매에 나서 예산을 획기적으로 절약했습니다.', constructive_feedback: '하급 직원 양성을 위한 멘토링에 시간을 조금 더 배정해 주면 완벽한 차기 리더가 될 것입니다.', updated_at: nowStr },
        { id: 'rep_3', operator_id: '3', evaluation_date: '2026-05-12', evaluator_id: '익명', source_type: 'INTERNAL', score: 4.2, positive_feedback: '생산 설비 관리에 있어 절대 실수를 저지르지 않으며 성실하고 책임감이 막중합니다.', constructive_feedback: '대인 관계 소통 시 단답형 표현이 잦아 오해를 사기도 하니 따뜻한 어조로 조언해 주시면 더 좋겠습니다.', updated_at: nowStr },
        { id: 'rep_4', operator_id: '3', evaluation_date: '2026-05-18', evaluator_id: 'buyer_abc', source_type: 'EXTERNAL', score: 4.9, positive_feedback: '품질 검수 기준에 타협이 없어서 신뢰도가 대단히 높습니다. 당사로 납품하는 모든 자재가 불량률 제로를 지킵니다.', constructive_feedback: '급격한 일정 단축을 요청할 때 가끔 지나치게 완곡하게 거절해 조율이 더딘 경향이 있습니다.', updated_at: nowStr },
        { id: 'rep_5', operator_id: '4', evaluation_date: '2026-05-22', evaluator_id: '익명', source_type: 'INTERNAL', score: 4.6, positive_feedback: '신규 ERP 인벤토리 전산 마운트 시 발생한 전산 장애를 새벽 내내 붙잡아 빠르게 안정화해 주어 감사했습니다.', constructive_feedback: '다른 팀과의 협동 개발 요구사항 분석 시, 직무 한계를 선 긋는 인상이 가끔 있으나 충분히 소통하면 해소됩니다.', updated_at: nowStr }
      ]
    },
    {
      name: 'crm_operator_families',
      displayName: '임직원 부양가족 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'relation_type', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'birth_date', type: 'TEXT', notNull: true },
        { name: 'phone_number', type: 'TEXT', notNull: true },
        { name: 'is_dependent', type: 'INTEGER', defaultValue: 0 },
        { name: 'remarks', type: 'TEXT', defaultValue: '없음' }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'fam_1', operator_id: '2', relation_type: '배우자', name: '한은혜', birth_date: '1990-05-12', phone_number: '010-9988-7766', is_dependent: 1, remarks: '동거 부양' },
        { id: 'fam_2', operator_id: '2', relation_type: '자녀', name: '홍진우', birth_date: '2019-10-01', phone_number: 'N/A', is_dependent: 1, remarks: '초등학교 입학 생애주기 도래 (가족수당 및 축하 복지 상신 대상자)' },
        { id: 'fam_3', operator_id: '3', relation_type: '모친', name: '이순자', birth_date: '1955-03-24', phone_number: '010-5566-7788', is_dependent: 1, remarks: '지방 거주 부양, 노령 연금 복지 대상' },
        { id: 'fam_4', operator_id: '4', relation_type: '자녀', name: '김민우', birth_date: '2024-02-10', phone_number: 'N/A', is_dependent: 1, remarks: '영아 유급 특별 돌봄 수당 및 육아 단축 휴직 권장 주기' }
      ]
    },
    {
      name: 'crm_operator_job_history',
      displayName: '임직원 담당업무 변경이력 대장',
      schema: [
        { name: 'id', type: 'TEXT', notNull: true },
        { name: 'operator_id', type: 'TEXT', notNull: true },
        { name: 'assignment_date', type: 'TEXT', notNull: true },
        { name: 'job_description', type: 'TEXT', notNull: true },
        { name: 'prev_job_description', type: 'TEXT', defaultValue: '없음' },
        { name: 'is_current', type: 'INTEGER', defaultValue: 1 }
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'job_1', operator_id: '2', assignment_date: '2025-03-10', job_description: '부품 원자재 발주 시스템 구축 및 SCM 벤더 관리 실무', prev_job_description: '없음', is_current: 1 },
        { id: 'job_2', operator_id: '3', assignment_date: '2025-07-20', job_description: '생산라인 기계 장비 오퍼레이팅 및 가공 조절', prev_job_description: '없음', is_current: 0 },
        { id: 'job_3', operator_id: '3', assignment_date: '2026-04-15', job_description: '생산공장 1라인 공정 총괄 및 무재해 현장 안전 관리자', prev_job_description: '생산라인 기계 장비 오퍼레이팅 및 가공 조절', is_current: 1 },
        { id: 'job_4', operator_id: '4', assignment_date: '2026-02-15', job_description: 'EGDesk 재고 전산망 데이터베이스 튜닝 및 IT 인프라 지원', prev_job_description: '없음', is_current: 1 }
      ]
    },
    {
      name: 'crm_operator_projects',
      displayName: '임직원 참여 프로젝트 대장',
      schema: [
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
      ],
      uniqueKeyColumns: ['id'],
      demoData: [
        { id: 'prj_1', operator_id: '2', project_name: '전사 스마트 SCM 물류 자동화', role_in_project: '자원 조달 및 벤더 연동 총괄', start_date: '2025-06-01', end_date: '2025-12-15', contribution_rate: 60, performance_score: 95, performance_evaluation: '자재 매입 가격 최적화 알고리즘을 도입하여 물류 예산을 전년 대비 12% 절감하는 압도적 성과 달성', outcome_link: 'http://docs.egdesk.internal/scm-success' },
        { id: 'prj_2', operator_id: '2', project_name: '2분기 수주 긴급 자재 조달 프로젝트', role_in_project: '공급선 긴급 수배 및 리스크 매핑', start_date: '2026-04-01', end_date: '진행중', contribution_rate: 80, performance_score: 90, performance_evaluation: '현재 수주의 납기 안정을 위해 실시간 벤더 매칭 수배 중', outcome_link: '없음' },
        { id: 'prj_3', operator_id: '3', project_name: '공장 생산라인 100% 무재해 환경 고도화', role_in_project: '현장 감지 센서 및 스마트 가드 연동', start_date: '2026-01-05', end_date: '2026-04-30', contribution_rate: 100, performance_score: 98, performance_evaluation: '생산 가이드 및 신체 감지 스마트 레이저 가드를 도입하여 단 한 건의 기계 물리 충돌 사고도 없이 프로젝트 완결', outcome_link: 'http://docs.egdesk.internal/safety-first' },
        { id: 'prj_4', operator_id: '4', project_name: '실시간 인벤토리 DB 튜닝 및 검색 고속화', role_in_project: 'DB 파티셔닝 및 이중화 설계', start_date: '2026-03-01', end_date: '진행중', contribution_rate: 100, performance_score: 88, performance_evaluation: '인벤토리 빅데이터 조회 지연 시간을 3.2초에서 0.15초로 대폭 단축', outcome_link: '없음' }
      ]
    }
  ];

  for (const t of tablesToInit) {
    try {
      // 테이블이 이미 잘 있는지 1건 조회 테스트로 체크
      await queryTable(t.name, { limit: 1 });
    } catch (err: any) {
      // Table not found 에러이거나 테이블 유실 상황일 때만 안전하게 생성
      const errMsg = err.message || '';
      if (errMsg.includes('Table not found') || errMsg.includes('no such table')) {
        console.log(`[Auto-Migration] ${t.name} 테이블 생성 중...`);
        try {
          await createTable(t.displayName, t.schema as any, {
            tableName: t.name,
            uniqueKeyColumns: t.uniqueKeyColumns
          });
          if (t.demoData && t.demoData.length > 0) {
            await insertRows(t.name, t.demoData);
          }
          console.log(`[Auto-Migration] ${t.name} 테이블 및 데모 시드 복구 성공.`);
        } catch (createErr: any) {
          console.error(`[Auto-Migration] ${t.name} 생성/시딩 중 에러:`, createErr);
        }
      } else {
        console.error(`[Auto-Migration] ${t.name} 테이블 상태 확인 실패 (다른 에러):`, err);
      }
    }
  }
}

/**
 * GET: 특정 임직원 또는 전체 임직원의 360도 종합 라이프사이클 프로필 정보 벌크 조회
 */
export async function GET() {
  try {
    // DB 및 13대 테이블 자동 생성 & 백필
    await initComprehensiveProfilesDatabase();

    // 인증 세션 및 권한 체크 (보안 가드 설계)
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    const isHighPrivilege = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'PRESIDENT';

    // 1. 직원 마스터 정보 조회
    const operatorsRes = await queryTable('crm_operators', { filters: { is_active: '1' } });
    const employees = operatorsRes.rows || [];

    // 2. 13대 서브 테이블 정보 일괄 로딩
    const [
      educationRes,
      licensesRes,
      careersRes,
      salariesRes,
      promotionsRes,
      awardsRes,
      familyEventsRes,
      medicalRes,
      incidentsRes,
      reputationsRes,
      familiesRes,
      jobHistoryRes,
      projectsRes
    ] = await Promise.all([
      queryTable('crm_operator_education'),
      queryTable('crm_operator_licenses'),
      queryTable('crm_operator_careers'),
      queryTable('crm_operator_salaries'),
      queryTable('crm_operator_promotions'),
      queryTable('crm_operator_awards'),
      queryTable('crm_operator_family_events'),
      queryTable('crm_operator_medical'),
      queryTable('crm_operator_incidents'),
      queryTable('crm_operator_reputations'),
      queryTable('crm_operator_families'),
      queryTable('crm_operator_job_history'),
      queryTable('crm_operator_projects')
    ]);

    const education = educationRes.rows || [];
    const licenses = licensesRes.rows || [];
    const careers = careersRes.rows || [];
    const salaries = salariesRes.rows || [];
    const promotions = promotionsRes.rows || [];
    const awards = awardsRes.rows || [];
    const familyEvents = familyEventsRes.rows || [];
    const rawMedical = medicalRes.rows || [];
    const rawIncidents = incidentsRes.rows || [];
    const reputations = reputationsRes.rows || [];
    const families = familiesRes.rows || [];
    const jobHistory = jobHistoryRes.rows || [];
    const projects = projectsRes.rows || [];

    // 3. 보안 통제 처리 (대표/사장님이 아닐 경우 병력, 사건사고 마스킹 차단)
    const medical = rawMedical.map((med: any) => {
      if (isHighPrivilege) return med;
      return {
        ...med,
        diagnosis_name: '🔒 최고 권한 보안 격리 (블러 처리)',
        hospital_name: '🔒 격리 대상',
        work_limitations: '🔒 최고 권한 보안 정보로 암호화되었습니다.'
      };
    });

    const incidents = rawIncidents.map((inc: any) => {
      if (isHighPrivilege) return inc;
      return {
        ...inc,
        title: '🔒 대내외 사건사고 격리 정보',
        description: '🔒 본 정보는 최고운영자(SUPER_ADMIN) 및 사장님(PRESIDENT) 전용 보안 격리 항목입니다. 일반 부운영자(SUB_OPERATOR)의 접근이 원천 차단됩니다.',
        outcome: '🔒 암호화 보호 처리'
      };
    });

    // 4. 각 임직원별로 13대 서브 테이블을 360도로 패키징
    const comprehensiveProfiles = employees.map((emp: any) => {
      const empIdStr = String(emp.id);

      return {
        operator_id: emp.id,
        name: emp.name,
        username: emp.username,
        role: emp.role,
        employee_number: emp.employee_number,
        education: education.filter((x: any) => String(x.operator_id) === empIdStr),
        licenses: licenses.filter((x: any) => String(x.operator_id) === empIdStr),
        careers: careers.filter((x: any) => String(x.operator_id) === empIdStr),
        salaries: salaries.filter((x: any) => String(x.operator_id) === empIdStr),
        promotions: promotions.filter((x: any) => String(x.operator_id) === empIdStr),
        awards: awards.filter((x: any) => String(x.operator_id) === empIdStr),
        familyEvents: familyEvents.filter((x: any) => String(x.operator_id) === empIdStr),
        medical: medical.filter((x: any) => String(x.operator_id) === empIdStr),
        incidents: incidents.filter((x: any) => String(x.operator_id) === empIdStr),
        reputations: reputations.filter((x: any) => String(x.operator_id) === empIdStr),
        families: families.filter((x: any) => String(x.operator_id) === empIdStr),
        jobHistory: jobHistory.filter((x: any) => String(x.operator_id) === empIdStr),
        projects: projects.filter((x: any) => String(x.operator_id) === empIdStr)
      };
    });

    return NextResponse.json({
      success: true,
      profiles: comprehensiveProfiles,
      isHighPrivilege
    });

  } catch (error: any) {
    console.error('Comprehensive Profiles GET API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 임직원 360도 각 이력 탭 정보 갱신/추가/삭제를 관장하는 통합 트랜잭션 API
 */
export async function POST(req: Request) {
  try {
    await initComprehensiveProfilesDatabase();

    // 최고관리자/대표자 권한 검증 가드
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '인사 기록 편집 권한이 없습니다. 최고운영자 계정으로 로그인해 주세요.' }, { status: 403 });
    }

    const { action, tableName, operator_id, data, deleteId } = await req.json();

    if (!operator_id) {
      return NextResponse.json({ success: false, error: '변경 대상 임직원 ID가 누락되었습니다.' }, { status: 400 });
    }

    const allowedTables = [
      'crm_operator_education',
      'crm_operator_licenses',
      'crm_operator_careers',
      'crm_operator_salaries',
      'crm_operator_promotions',
      'crm_operator_awards',
      'crm_operator_family_events',
      'crm_operator_medical',
      'crm_operator_incidents',
      'crm_operator_reputations',
      'crm_operator_families',
      'crm_operator_job_history',
      'crm_operator_projects'
    ];

    if (!allowedTables.includes(tableName)) {
      return NextResponse.json({ success: false, error: `지원하지 않거나 보안 위반 대상 테이블입니다: ${tableName}` }, { status: 400 });
    }

    // [ACTION: DELETE] 행 삭제
    if (action === 'DELETE') {
      if (!deleteId) {
        return NextResponse.json({ success: false, error: '삭제할 레코드의 ID가 없습니다.' }, { status: 400 });
      }
      await deleteRows(tableName, { filters: { id: String(deleteId), operator_id: String(operator_id) } });

      return NextResponse.json({
        success: true,
        message: '선택하신 인사 이력 레코드가 정상 삭제되었습니다 🗑️'
      });
    }

    // [ACTION: UPSERT] 행 삽입/수정
    if (action === 'UPSERT') {
      if (!data || typeof data !== 'object') {
        return NextResponse.json({ success: false, error: '입력된 인사 정보 데이터가 유효하지 않습니다.' }, { status: 400 });
      }

      // 수정모드 분기 처리 (기존 id가 존재하고 실제로 DB에 해당 레코드가 있는 경우)
      if (data.id) {
        try {
          const existingRes = await queryTable(tableName, { filters: { id: String(data.id), operator_id: String(operator_id) } });
          if (existingRes && existingRes.rows && existingRes.rows.length > 0) {
            const updateData = { ...data };
            delete updateData.id;
            delete updateData.operator_id;

            if (['crm_operator_incidents', 'crm_operator_reputations'].includes(tableName)) {
              updateData.updated_at = new Date().toISOString();
            }

            await updateRows(tableName, updateData, { filters: { id: String(data.id), operator_id: String(operator_id) } });

            return NextResponse.json({
              success: true,
              message: '임직원 360도 종합 인사 이력이 성공적으로 수정되었습니다 📝',
              row: { ...data, operator_id: String(operator_id) }
            });
          }
        } catch (err) {
          console.error('[UPSERT-UPDATE] 기존 레코드 조회/수정 실패:', err);
        }
      }

      // 신규 등록 모드
      const upsertRow = {
        ...data,
        id: data.id || `${tableName.replace('crm_operator_', '')}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        operator_id: String(operator_id)
      };

      // 사건사고 및 평판 등의 경우 갱신일/갱신일시 추가
      if (['crm_operator_incidents', 'crm_operator_reputations'].includes(tableName)) {
        upsertRow.updated_at = new Date().toISOString();
      }

      await insertRows(tableName, [upsertRow]);

      return NextResponse.json({
        success: true,
        message: '임직원 360도 종합 인사 이력이 성공적으로 동기화 및 갱신되었습니다 📝',
        row: upsertRow
      });
    }

    return NextResponse.json({ success: false, error: '지정되지 않았거나 지원하지 않는 Action 패턴입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('Comprehensive Profiles POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
