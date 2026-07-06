export const dynamic = 'force-dynamic';
// HMR trigger timestamp: 2026-06-20 09:50:00

import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL, listTables } from '../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
import { setupDatabase } from '@/lib/setup-db';
import fs from 'fs';
import { fetchGeminiWithFallback } from '@/lib/gemini-fallback';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 획득 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 쿠키 헤더 문자열에서 특정 쿠키 값을 파싱하는 헬퍼 함수
function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 최고 관리자(SUPER_ADMIN) 권한 검증 및 사용자 정보 반환 헬퍼 (Fallback 적용)
async function verifySuperAdmin(req?: Request) {
  let token: string | undefined;

  // 1. Next.js 표준 cookies() 시도
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('auth_token')?.value;
  } catch (e) {
    console.error('[verifySuperAdmin] cookies() 읽기 실패:', e);
  }

  // 2. 실패 시 Request 헤더에서 직접 추출 시도 (Fallback)
  if (!token && req) {
    const cookieHeader = req.headers.get('cookie');
    token = getCookieValue(cookieHeader, 'auth_token') || undefined;
  }

  if (!token) return { isAuthorized: false, username: null };
  try {
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    return {
      isAuthorized: role === 'SUPER_ADMIN',
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: null };
  }
}

let isDbMigrated = false;

// 허용된 조회 대상 물리 테이블 화이트리스트 (호환성 및 동적 조회 백업용)
const ALLOWED_TABLES = [
  'crm_customers',
  'rnd_staffs',
  'crm_estimates',
  'crm_orders',
  'products',
  'crm_partners',
  'crm_expenses',
  'crm_operators'
];

// 이지데스크 MY DB에 등록된 모든 사용자 물리 테이블의 한글 표시명 사전
const TABLE_DISPLAY_NAMES: Record<string, string> = {
  crm_expenses: '지출 장부 관리',
  crm_operators: '운영자 권한 관리',
  crm_customers: '고객 명단 관리',
  crm_partners: '거래처 정보 관리',
  crm_estimates: '견적서 관리',
  crm_orders: '주문 내역 관리',
  products: '광고 상품 관리',
  expense_projects: '지출 프로젝트 관리',
  crm_instagram_posts: '인스타그램 포스트 관리',
  crm_naver_blog_posts: '네이버 블로그 포스트 관리',
  crm_partner_contacts: '거래처 담당자 명함첩',
  crm_payments: '결제 내역 관리',
  crm_point_history: '포인트 이용 내역',
  crm_purchase_orders: '구매 발주서 관리',
  crm_reservations: '예약 현황 관리',
  crm_energy_savings: '에너지 피크 절감 스케줄',
  crm_energy_equipments: '에너지 소모 설비 대장',
  crm_safety_alerts: '비전 AI 안전 위험 경보 로그',
  crm_safety_zones: '안전 제어 구역 설정',
  crm_scm_shipments: '수입 조달 화물 실시간 대장',
  crm_scm_suppliers: 'SCM 협력사 평가 스코어카드',
  crm_grant_announcements: '정부 지원금 추천 공고',
  crm_grant_bookmarks: '지원금 관심 공고 보관함',
  crm_grant_rnd_plans: 'AI R&D 사업계획서 초안 보관함',
  crm_labor_stats: '주 52시간 근태 초과 리스크 대장',
  crm_labor_contracts: '근로계약서 독소조항 스캔 현황',
  crm_partner_credit_risks: '거래처 신용 위험 및 연체 지표',
  crm_production_gantt_tasks: '생산 간트 차트 작업 스케줄',
  crm_production_unscheduled_orders: 'AI 대기중 미배정 수주 대장',
  crm_production_bottlenecks: '설비 병목지수 및 부하율 통계',
  crm_production_due_risk: '수주 납기 준수 예측 위험 지표',
  crm_facility_events: '설비 예방 보전 정비 캘린더',
  crm_facility_parts: '소모성 중요 기계 부품 재고',
  crm_facility_checklists: '모바일 설비 점검 보고서 이력',
  crm_facility_oee_stats: 'OEE 설비 종합 효율 통계',
  crm_facility_oee_downtime: '설비 비가동 원인 시간 통계',
  crm_facility_layout: '공장 설비 평면 배치 및 가동 상태',
  crm_facility_predictive_summary: '예지보전 프레스 건전도 요약',
  crm_facility_predictive_vibration: '실시간 센서 진동 시계열 추이',
  crm_facility_predictive_fft: 'FFT 주파수 스펙트럼 분석 이력',
  crm_facility_predictive_part_rul: '부품 RUL 잔여수명 예측 데이터',
  crm_facility_repair_logs: '설비 고장 수리 대장 및 정비 이력',
  crm_facility_repair_solutions: 'AI RAG 고장 해결 가이드 DB',
  crm_quality_checklist_submissions: '모바일 품질 검사 보고서 이력',
  crm_quality_ncr_items: '부적합 보고서(NCR) 조치 대장',
  crm_quality_ncr_similar_cases: 'AI RAG 유사 불량 조치 이력 추천',
  crm_quality_sensors_status: '실시간 전류/진동 센서 요약',
  crm_quality_sensors_contribution: '비정상 센서 기여도 요인 비율',
  crm_quality_sensors_timeline: '전류/온도 센서 시계열 이상 지표',
  crm_quality_spc_config: 'SPC 관리 한계 및 공정 규격 설정',
  crm_quality_spc_samples: '가열 실린더 온도 계측 이력 샘플',
  crm_quality_spc_predictions: '미래 Cpk 하락 위험 예측 데이터',
  crm_quality_spc_features: 'SPC 공정 변동 원인 중요도',
  crm_quality_vision_model: '비전 AI 모델 사양 및 임계값 설정',
  crm_quality_vision_logs: '비전 AI 불량 검출 이미지 이력 로그',
  crm_finance_products: '제품 표준 원가 분석 기초 데이터',
  crm_finance_forecasts: '90일 자금 수금/지출 예정 대장',
  crm_grant_company_profile: '지원금 적합도 매칭용 회사 스펙',
  crm_employment_certificate_logs: '재직증명서 발급대장',
  crm_operator_profiles: '임직원 인사 마스터 정보',
  crm_operator_salaries: '월별 급여 대장 및 명세서',
  crm_operator_leave_balances: '임직원별 연차/휴가 잔여 현황',
  crm_operator_family_events: '경조사 신청 및 경조금 지급 대장',
  crm_operator_licenses: '보유 국가기술자격 및 면허 대장',
  crm_operator_careers: '입사 전 외부 경력 사항 이력',
  crm_operator_education: '최종 학력 및 교육 이력 정보',
  crm_operator_families: '인사 등록 부양가족 명단',
  crm_operator_job_history: '부서 발령 및 직위 변동 이력',
  crm_operator_promotions: '승진 및 연봉 협상 이력 대장',
  crm_operator_projects: '수행 프로젝트 및 R&D 참여 이력',
  crm_operator_reputations: '동료 다면 평가 및 평판 조회',
  crm_operator_incidents: '징계 및 사내 사고 조치 이력',
  crm_operator_medical: '건강검진 및 특이 의료 사항 정보',
  crm_operator_awards: '포상 및 수상 이력 대장',
  crm_operator_contract_settings: '근로 형태별 급여 계산 설정 규칙',
  crm_operator_ai_briefing_histories: '임직원용 AI 모닝 브리핑 이력',
  crm_annual_leaves: '휴가 신청 및 결재 대장',
  crm_attendance: '일일 출퇴근 기록 및 근태 현황',
  crm_company_events: '전사 사내 행사 및 주요 일정 대장',
  crm_company_event_types: '사내 일정 및 행사 분류 코드',
  coupons: '발행 할인 쿠폰 마스터'
};

/**
 * GET: 등록된 신규 웹 양식 템플릿 목록 조회 또는 특정 템플릿 상세 정보 조회
 */
export async function GET(req: Request) {


  if (!isDbMigrated) {
    try {
      await setupDatabase();
      isDbMigrated = true;
      console.log("✅ API Templates New Route: setupDatabase completed on request.");
    } catch (e: any) {
      console.error("API Templates New Route: setupDatabase run failed:", e.message);
    }
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const id = searchParams.get('id');
    const tableName = searchParams.get('tableName') || '';

    // 0. 모든 테이블 목록 조회 (양식 감지 필드와 무관하게 직접 선택용 전체 테이블 반환)
    if (action === 'all_tables') {
      const tablesRes = await executeSQL(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
          AND name NOT LIKE 'sqlite_%' 
          AND name NOT LIKE 'import_%' 
          AND name NOT LIKE 'sync_%' 
          AND name NOT LIKE 'user_data_%' 
          AND name NOT LIKE 'user_tables'
          -- 발급대장, 출력 로그 및 트랜잭션 이력 성격의 테이블 제외 필터
          AND name NOT LIKE '%_logs'
          AND name NOT LIKE '%_log'
          AND name NOT LIKE '%_histories'
          AND name NOT LIKE '%_history'
        ORDER BY name ASC;
      `);
      const tablesList = tablesRes.rows || [];

      const tables = tablesList.map((t: any) => {
        const name = t.name;
        const displayName = TABLE_DISPLAY_NAMES[name] || name;
        return {
          name,
          label: `${displayName} (${name})`
        };
      });

      return NextResponse.json({ success: true, tables });
    }

    // 1. 추천 테이블 정보 힌트 제공 (양식에 감지된 필드들이 존재하는 테이블과 매핑 가능 컬럼만 필터링하여 추천)
    if (action === 'table_info') {
      const fieldsParam = searchParams.get('fields') || '';
      const tableHints: Record<string, any> = {};

      // 양식이 등록되지 않았거나 감지된 바인딩 필드가 아예 없는 상태면 추천 테이블 리스트 미제공
      if (!fieldsParam.trim()) {
        return NextResponse.json({ success: true, tableHints });
      }

      const templateName = searchParams.get('templateName') || '';
      const targetFields = fieldsParam
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);

      const tablesRes = await executeSQL(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
          AND name NOT LIKE 'sqlite_%' 
          AND name NOT LIKE 'import_%' 
          AND name NOT LIKE 'sync_%' 
          AND name NOT LIKE 'user_data_%' 
          AND name NOT LIKE 'user_tables'
          -- 발급대장, 출력 로그 및 트랜잭션 이력 성격의 테이블 제외 필터
          AND name NOT LIKE '%_logs'
          AND name NOT LIKE '%_log'
          AND name NOT LIKE '%_histories'
          AND name NOT LIKE '%_history'
        ORDER BY name ASC;
      `);
      const tablesList = tablesRes.rows || [];

      const candidateTables = tablesList.map((t: any) => {
        const name = t.name;
        const displayName = TABLE_DISPLAY_NAMES[name] || name;
        return `${name} (${displayName})`;
      });

      // 0) Gemini API를 이용해 양식 사용 목적에 적합한 테이블 추천 시도
      let recommendedTableNames: string[] = [];
      let apiKey: string | null = null;
      let selectedModel = 'gemini-3.5-flash';
      try {
        const keyRes = await executeSQL(`SELECT value FROM system_settings WHERE key = 'google_ai_api_key'`);
        const settingsKeyRow = keyRes.rows?.[0] as any;
        apiKey = settingsKeyRow ? settingsKeyRow.value : null;

        const modelRes = await executeSQL(`SELECT value FROM system_settings WHERE key = 'google_ai_model'`);
        const settingsModelRow = modelRes.rows?.[0] as any;
        if (settingsModelRow && settingsModelRow.value) {
          selectedModel = settingsModelRow.value;
        } else {
          selectedModel = 'gemini-2.5-flash';
        }
      } catch (dbErr) {
        console.error('추천 API 설정 로드 오류:', dbErr);
        selectedModel = 'gemini-2.5-flash';
      }

      if (!apiKey) {
        apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
      }

      let apiSuccess = false;
      if (apiKey && (templateName.trim() || targetFields.length > 0)) {
        try {
          const systemPrompt = `
You are a database integration assistant.
Your task is to understand the purpose of a user-uploaded document form based on its name (if provided) and detected binding fields, and then recommend the most appropriate database tables from the provided list.

Guidelines:
1. Recommending irrelevant tables is strictly forbidden. For example, if the document is a "Medical Certificate" or "Certificate of Employment" (재직증명서), you must ONLY recommend personnel/employee/operator-related tables (like rnd_staffs, crm_operator_profiles, crm_operator_salaries). Never recommend customer lists (crm_customers) or client credit risks (crm_partner_credit_risks).
2. If the document is related to expenses, invoices, or transactions, recommend expense/purchase order/transaction tables (like crm_expenses, crm_purchase_orders, crm_payments).
3. If the document is related to partners, vendors, or buyers, recommend crm_partners.
4. Analyze the semantic meaning of the template name and fields to match the table's purpose. Even if the template name is empty, try your best to deduce the template purpose from the fields (e.g. if fields contain joined_date, employment_status, major_name, staff_role, etc., it is highly likely to be a staff/personnel certificate).
5. Do NOT recommend any log, history, or output registry tables (tables ending with _logs, _log, _histories, or _history, such as crm_employment_certificate_logs). These tables represent historical records of form issuance/logs and must not be used as raw data sources for creating new forms.
6. Output format: You must respond ONLY with a comma-separated list of the exact table physical names (English names) that are suitable. No introduction, no markdown, no explanation. Example: rnd_staffs,crm_operator_profiles
`;

          const userPrompt = `
Template Name: "${templateName || 'Untitled Uploaded Document'}"
Detected Mustache Fields: [${targetFields.join(', ')}]
Available Database Tables:
${candidateTables.join('\n')}

Based on the guidelines, choose the most appropriate tables for this document purpose.
`;

          const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: systemPrompt },
                    { text: userPrompt }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // AI 토큰 사용량 로깅
            try {
              const prompt_tokens = data.usageMetadata?.promptTokenCount || 0;
              const completion_tokens = data.usageMetadata?.candidatesTokenCount || 0;
              const total_tokens = data.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
              const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
              await insertRows('ai_token_usage_logs', [{
                id: logId,
                model: selectedModel || 'gemini-3.5-flash',
                purpose: 'TEMPLATE_GENERATION',
                prompt_tokens,
                completion_tokens,
                total_tokens,
                created_at: logTime
              }]);
            } catch (e: any) {
              console.error('AI 토큰 로깅 실패:', e.message);
            }
            
            // 공백, 줄바꿈, 백틱 등 불필요한 특수문자 제거 후 쉼표로 분할 파싱
            recommendedTableNames = aiText.trim()
              .replace(/[`']/g, '') // 백틱, 홑따옴표 제거
              .split(/[,\s\n\r]+/)
              .map((t: string) => t.trim().replace(/[^a-zA-Z0-9_]/g, ''))
              .filter((t: string) => tablesList.some((tbl: any) => tbl.name === t));
            
            apiSuccess = recommendedTableNames.length > 0;
            console.log(`🤖 Gemini Semantic Recommendations: [${recommendedTableNames.join(', ')}]`);
          }
        } catch (apiErr) {
          console.error('Gemini 지능형 테이블 추천 API 호출 실패, Fallback 규칙으로 전환:', apiErr);
        }
      }

      // 공통 시스템 및 범용 필드 목록 (Fallback용 또는 보완 매칭용)
      const COMMON_FIELDS = [
        'id', 'name', 'phone', 'email', 'address', 'created_at', 'updated_at', 
        'deleted_at', 'uuid', 'remarks', 'description', 'date', 'amount', 'title',
        'updated_by', 'deleted_by', 'restored_by', 'restored_at',
        'staff_name', 'customer_name', 'partner_name', 'user_name', 'username',
        'staff_id', 'user_id', 'customer_id', 'partner_id'
      ];

      // 양식에서 감지된 필드 중 고유 필드가 존재하는지 확인
      const hasUniqueFieldsInTemplate = targetFields.some(f => !COMMON_FIELDS.includes(f.toLowerCase()));

      for (const t of tablesList as any[]) {
        const name = t.name;
        const displayName = TABLE_DISPLAY_NAMES[name] || name;
        const schemaRes = await executeSQL(`PRAGMA table_info("${name}");`);
        const schemaInfo = schemaRes.rows || [];

        let isRecommended = false;
        // 1) AI 추천을 성공적으로 받았을 경우, AI 추천 목록에 포함된 테이블만 매핑 처리
        if (apiSuccess) {
          if (!recommendedTableNames.includes(name)) {
            continue;
          }
          isRecommended = true;
        } else {
          // 2) AI 추천을 받지 못했을 때의 Fallback 룰 베이스 필터 (완화 적용)
          const matchedColumns = schemaInfo.filter((col: any) => targetFields.includes(col.name));

          if (matchedColumns.length === 0) {
            continue;
          }

          // 단순 시스템 정보 관리용 필드를 배제한 비즈니스 유효 필드 매치 확인
          const matchedFieldNames = matchedColumns.map((col: any) => col.name.toLowerCase());
          const meaningfulMatched = matchedFieldNames.filter(fName => 
            !['id', 'uuid', 'created_at', 'updated_at', 'deleted_at', 'updated_by', 'deleted_by', 'restored_by', 'restored_at'].includes(fName)
          );

          if (meaningfulMatched.length === 0) {
            continue;
          }
        }

        // 3) 매치되는 컬럼들을 필터링하되, AI가 직접 지목한 적합 테이블인 경우 겹치는 필드가 없더라도 전체 컬럼을 가이드 힌트로 노출
        let matchedColumns = schemaInfo.filter((col: any) => targetFields.includes(col.name));
        if (isRecommended && matchedColumns.length === 0) {
          matchedColumns = schemaInfo;
        }

        if (matchedColumns.length === 0) {
          continue;
        }

        // 3) 매치되는 컬럼들에 대해서만 한글 설명 매핑 및 힌트 필드 구축
        const fields = matchedColumns.map((col: any) => {
          let colName = col.name;
          if (col.name === 'id') colName = 'ID 식별자';
          else if (col.name === 'name') colName = '대표 명칭';
          else if (col.name === 'description') colName = '설명/세부사항';
          else if (col.name === 'amount') colName = '수치/금액';
          else if (col.name === 'date') colName = '날짜/시간';
          else if (col.name === 'staff_id') colName = '사원 ID';
          else if (col.name === 'staff_name') colName = '성명';
          else if (col.name === 'joined_date') colName = '입사일자';
          else if (col.name === 'degree_level') colName = '학위';
          else if (col.name === 'major_name') colName = '전공학과';
          else if (col.name === 'employment_status') colName = '재직상태';
          else if (col.name === 'phone') colName = '연락처';
          else if (col.name === 'address') colName = '주소';
          else if (col.name === 'email') colName = '이메일';

          return {
            key: col.name,
            name: colName,
            type: col.type || 'TEXT'
          };
        });

        tableHints[name] = {
          label: `${displayName} (${name})`,
          fields
        };
      }

      // 4) 가상의 회사 설정 프로필 테이블 힌트 주입 (템플릿에 회사 전역 변수가 감지되었을 경우)
      const companyFields = [
        'company_name', 'companyname', 'company_business_number', 'business_number', 'businessnumber',
        'ceo_name', 'representative', 'representative_name', 'ceoname', 'company_representative',
        'company_address', 'address', 'companyaddress',
        'company_phone', 'phone', 'companyphone',
        'company_email', 'email', 'companyemail'
      ];
      
      const hasCompanyField = targetFields.some(f => 
        companyFields.includes(f.toLowerCase()) || 
        f.toLowerCase().startsWith('company_') || 
        f.toLowerCase().includes('representative')
      );

      if (hasCompanyField) {
        const matchedCompanyFields: any[] = [];
        
        // 회사명 매칭
        const compNameKey = targetFields.find(f => f.toLowerCase().includes('name') && f.toLowerCase().includes('company') || f.toLowerCase() === 'companyname') || 'company_name';
        if (targetFields.some(f => f.toLowerCase().includes('name') && f.toLowerCase().includes('company') || f.toLowerCase() === 'companyname')) {
          matchedCompanyFields.push({ key: compNameKey, name: '회사명', type: 'TEXT' });
        }
        
        // 대표자 매칭
        const repKey = targetFields.find(f => f.toLowerCase().includes('representative') || f.toLowerCase().includes('ceo')) || 'representative_name';
        if (targetFields.some(f => f.toLowerCase().includes('representative') || f.toLowerCase().includes('ceo'))) {
          matchedCompanyFields.push({ key: repKey, name: '대표이사명 (대표자)', type: 'TEXT' });
        }
        
        // 주소 매칭
        const addrKey = targetFields.find(f => f.toLowerCase().includes('address')) || 'company_address';
        if (targetFields.some(f => f.toLowerCase().includes('address'))) {
          matchedCompanyFields.push({ key: addrKey, name: '회사 주소', type: 'TEXT' });
        }
        
        // 연락처 매칭
        const phoneKey = targetFields.find(f => f.toLowerCase().includes('phone') || f.toLowerCase().includes('tel')) || 'company_phone';
        if (targetFields.some(f => f.toLowerCase().includes('phone') || f.toLowerCase().includes('tel'))) {
          matchedCompanyFields.push({ key: phoneKey, name: '회사 연락처', type: 'TEXT' });
        }
        
        // 이메일 매칭
        const emailKey = targetFields.find(f => f.toLowerCase().includes('email') || f.toLowerCase().includes('mail')) || 'company_email';
        if (targetFields.some(f => f.toLowerCase().includes('email') || f.toLowerCase().includes('mail'))) {
          matchedCompanyFields.push({ key: emailKey, name: '회사 이메일', type: 'TEXT' });
        }
        
        // 사업자번호 매칭
        const bizKey = targetFields.find(f => f.toLowerCase().includes('business') || f.toLowerCase().includes('number') && f.toLowerCase().includes('company')) || 'company_business_number';
        if (targetFields.some(f => f.toLowerCase().includes('business') || f.toLowerCase().includes('number') && f.toLowerCase().includes('company'))) {
          matchedCompanyFields.push({ key: bizKey, name: '사업자등록번호', type: 'TEXT' });
        }

        if (matchedCompanyFields.length > 0) {
          tableHints['system_company_profile'] = {
            label: '우리 회사 기본 정보 (시스템 전역 설정)',
            fields: matchedCompanyFields
          };
        }
      }

      return NextResponse.json({ success: true, tableHints });
    }

    // 2. 일반 사용자용 테이블 레코드 조회 (안전한 바인딩용 조회)
    if (action === 'query_records') {
      if (!tableName) {
        return NextResponse.json({ success: false, error: '테이블명이 누락되었습니다.' }, { status: 400 });
      }

      // 발급대장, 출력 로그 및 트랜잭션 이력 성격의 테이블 조회 금지
      const isLogTable = tableName.endsWith('_logs') || tableName.endsWith('_log') || tableName.endsWith('_histories') || tableName.endsWith('_history');
      if (isLogTable) {
        return NextResponse.json({ success: false, error: '이력 및 대장성 테이블은 데이터 바인딩 소스로 조회할 수 없습니다.' }, { status: 403 });
      }

      // SQLite 시스템 내에 실제로 실존하는 테이블인지 동적으로 존재 검증 수행
      const existsRes = await listTables();
      const tables = existsRes.tables || [];
      const exists = tables.some((t: any) => t.tableName === tableName);
      if (!exists) {
        return NextResponse.json({ success: false, error: '존재하지 않거나 조회할 수 없는 테이블입니다.' }, { status: 400 });
      }

      let query = '';
      if (tableName === 'rnd_staffs') {
        query = `
          SELECT s.staff_id as id, o.name as staff_name, s.joined_date, s.degree_level, s.major_name, s.employment_status,
                 s.staff_role as position, p.department, s.deleted_at
          FROM rnd_staffs s
          LEFT JOIN crm_operators o ON s.user_id = o.id
          LEFT JOIN crm_operator_profiles p ON CAST(o.id AS TEXT) = p.operator_id
          LIMIT 100
        `;
      } else {
        query = `SELECT * FROM "${tableName}" LIMIT 100`;
      }

      console.log("Executing query_records on direct db via executeSQL...");
      const rowsRes = await executeSQL(query);
      let rows = rowsRes.rows || [];
      
      // SQL 쿼리 상의 DELETE 금지어 필터링 우회를 위한 JS 레벨 소프트 삭제 필터링
      rows = rows.filter((r: any) => !r.deleted_at);

      // 일반적인 포맷으로 가공하여 반환
      const formattedRecords = rows.map((row: any) => {
        const idVal = row.id || row.key || row.item_id || row.staff_id || row.uuid || '';
        const nameVal = row.partner_name || row.staff_name || row.name || row.title || row.company_name || row.username || '-';
        const descVal = row.service_name || row.product_name || row.category || row.remarks || row.content || row.action_type || '-';
        const amountVal = row.total_amount || row.amount || row.price || 0;
        const dateVal = row.created_at || row.order_date || row.reservation_date || row.captured_at || row.joined_date || '-';

        return {
          id: String(idVal),
          name: nameVal,
          description: descVal,
          amount: Number(amountVal),
          date: dateVal,
          raw: row
        };
      });

      return NextResponse.json({ success: true, records: formattedRecords });
    }

    if (action === 'detail' && id) {
      const templateId = parseInt(id);
      const res = await executeSQL(`SELECT * FROM crm_web_templates WHERE id = ${templateId}`);
      const rows = res.rows || [];
      const template = rows[0] || null;

      if (!template || template.deleted_at) {
        return NextResponse.json({ success: false, error: '해당 템플릿을 찾을 수 없거나 삭제되었습니다.' }, { status: 404 });
      }

      // 시스템 설정에서 우리 회사 정보(회사명, 대표이사 등) 가져오기
      let companyProfile: Record<string, any> = {};
      try {
        const settingsRes = await executeSQL(`SELECT value FROM system_settings WHERE key = 'my_company_profile'`);
        const row = settingsRes.rows?.[0] as any;
        if (row && row.value) {
          const parsed = JSON.parse(row.value);
          companyProfile = {
            // 회사명 배리에이션
            company_name: parsed.companyName || '',
            companyName: parsed.companyName || '',
            companyname: parsed.companyName || '',
            
            // 대표이사/대표자 배리에이션
            ceo_name: parsed.representative || '',
            representative: parsed.representative || '',
            ceoName: parsed.representative || '',
            representative_name: parsed.representative || '',
            company_representative: parsed.representative || '',
            
            // 주소 배리에이션
            company_address: parsed.address || '',
            address: parsed.address || '',
            companyAddress: parsed.address || '',
            
            // 연락처 배리에이션
            company_phone: parsed.phone || '',
            phone: parsed.phone || '',
            companyPhone: parsed.phone || '',
            
            // 이메일 배리에이션
            company_email: parsed.email || '',
            email: parsed.email || '',
            companyEmail: parsed.email || '',
            
            // 사업자등록번호 배리에이션
            company_business_number: parsed.businessNumber || '',
            business_number: parsed.businessNumber || '',
            businessNumber: parsed.businessNumber || ''
          };
        }
      } catch (e) {
        console.error('회사 프로필 로드 실패:', e);
      }

      return NextResponse.json({ success: true, template, companyProfile });
    }

    // 목록 조회
    const res = await executeSQL('SELECT * FROM crm_web_templates ORDER BY id DESC');
    const rows = res.rows || [];
    const templates = rows.filter((r: any) => !r.deleted_at);

    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    console.error('GET /api/templates-new error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: 웹 양식 템플릿 신규 등록 또는 수정
 */
export async function POST(req: Request) {
  const { isAuthorized, username } = await verifySuperAdmin(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '최고관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, template_name, html_content, web_html_content, webHtmlContent, document_type, is_active, is_print_active, is_web_active } = body;

    const webHtml = web_html_content || webHtmlContent || '';

    if (!template_name || (!html_content && !webHtml)) {
      return NextResponse.json({ success: false, error: '템플릿명과 HTML 내용(인쇄용 또는 웹용 중 하나)은 필수입니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();

    if (id) {
      // 수정 (Update)
      const templateId = parseInt(id);
      const updateData = {
        template_name,
        // html_content는 NOT NULL 제약조건이 있으므로 비어있는 경우 폴백 텍스트 주입
        html_content: html_content && html_content.trim() ? html_content : '<!-- 인쇄 비활성화 양식 -->',
        web_html_content: webHtml,
        document_type: document_type || '',
        is_active: is_active !== undefined ? Number(is_active) : 1,
        is_print_active: is_print_active !== undefined ? Number(is_print_active) : 1,
        is_web_active: is_web_active !== undefined ? Number(is_web_active) : 1,
        updated_at: timestamp,
        updated_by: username || 'admin'
      };

      await updateRows('crm_web_templates', updateData, { filters: { id: String(templateId) } });
      return NextResponse.json({ success: true, message: '템플릿이 성공적으로 수정되었습니다.', id: templateId });
    } else {
      // 등록 (Insert)
      const insertData = {
        template_name,
        // html_content는 NOT NULL 제약조건이 있으므로 비어있는 경우 폴백 텍스트 주입
        html_content: html_content && html_content.trim() ? html_content : '<!-- 인쇄 비활성화 양식 -->',
        web_html_content: webHtml,
        document_type: document_type || '',
        is_active: is_active !== undefined ? Number(is_active) : 1,
        is_print_active: is_print_active !== undefined ? Number(is_print_active) : 1,
        is_web_active: is_web_active !== undefined ? Number(is_web_active) : 1,
        uuid: crypto.randomUUID(),
        updated_at: timestamp,
        updated_by: username || 'admin'
      };

      await insertRows('crm_web_templates', [insertData]);
      
      // 방금 생성된 ID 조회
      const maxIdRes = await executeSQL('SELECT MAX(id) as maxId FROM crm_web_templates');
      const newId = maxIdRes.rows?.[0]?.maxId || 0;

      return NextResponse.json({ success: true, message: '템플릿이 성공적으로 등록되었습니다.', id: newId });
    }
  } catch (err: any) {
    console.error('POST /api/templates-new error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: 웹 양식 템플릿 소프트 삭제
 */
export async function DELETE(req: Request) {
  const { isAuthorized, username } = await verifySuperAdmin(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '최고관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 ID가 누락되었습니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();
    const deleteData = {
      deleted_at: timestamp,
      deleted_by: username || 'admin'
    };

    await updateRows('crm_web_templates', deleteData, { filters: { id: String(id) } });
    return NextResponse.json({ success: true, message: '템플릿이 성공적으로 삭제(소프트 삭제)되었습니다.' });
  } catch (err: any) {
    console.error('DELETE /api/templates-new error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
