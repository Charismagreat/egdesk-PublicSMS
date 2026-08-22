export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, createTable } from '@/../egdesk-helpers';

/**
 * 🏛️ AI 분석 이력 보존용 데이터베이스 스냅샷 자율 생성 및 데모 백필 (Self-Healing Auto-Migration)
 */
async function initAiBriefingHistoriesDatabase() {
  await queryTable('crm_operator_ai_briefing_histories', { limit: 1 }).catch(async () => {
    console.log('[Auto-Migration] crm_operator_ai_briefing_histories 테이블 생성 중...');
    await createTable('임직원 AI 전사 업무 분석 이력 대장', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'target_year_month', type: 'TEXT', notNull: true },
      { name: 'risk_score', type: 'INTEGER', notNull: true },
      { name: 'alert_title', type: 'TEXT', notNull: true },
      { name: 'alert_message', type: 'TEXT', notNull: true },
      { name: 'briefing_text', type: 'TEXT', notNull: true },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'created_by', type: 'TEXT', notNull: true },
      { name: 'token_usage_input', type: 'INTEGER', defaultValue: 0 },
      { name: 'token_usage_output', type: 'INTEGER', defaultValue: 0 },
      { name: 'tenant_id', type: 'TEXT' }
    ], {
      tableName: 'crm_operator_ai_briefing_histories',
      uniqueKeyColumns: ['id']
    });
  });
}

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'default';
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR';
    return { isAuthorized, role, name, username, tenantId };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

/**
 * GET: 사장님 전용 과거 AI 분석 히스토리 조회
 */
export async function GET() {
  try {
    const { isAuthorized, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized || (loggedUsername !== 'admin' && loggedUsername !== 'SUPER_ADMIN' && loggedUsername !== 'PRESIDENT')) {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      const sessionUser = token ? decodeJwt(token) : { role: 'SUB_OPERATOR' };
      if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
        return NextResponse.json({ success: false, error: '인사 분석 이력 조회 권한이 없습니다. 최고운영자 계정으로 로그인해 주세요.' }, { status: 403 });
      }
    }

    // DB 및 테이블 자동 신설 & 백필
    await initAiBriefingHistoriesDatabase();

    const queryFilters: any = {};
    if (loggedUsername !== 'admin') {
      queryFilters.tenant_id = tenantId;
    }

    // 이력 조회 (가장 최근 순으로 정렬, 데모 백필 데이터 배제)
    const historiesRes = await queryTable('crm_operator_ai_briefing_histories', {
      filters: queryFilters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
    const histories = (historiesRes.rows || []).filter((h: any) => !h.deleted_at && !String(h.id).startsWith('hist_demo_'));

    return NextResponse.json({
      success: true,
      histories
    });

  } catch (error: any) {
    console.error('AI Briefing GET API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isAuthorized, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const sessionUser = token ? decodeJwt(token) : { id: '1', role: 'SUB_OPERATOR' };
    const isHighPrivilege = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'PRESIDENT';

    if (loggedUsername !== 'admin' && !isHighPrivilege) {
      return NextResponse.json({ success: false, error: '인사 분석 이력 조회 권한이 없습니다. 최고운영자 계정으로 로그인해 주세요.' }, { status: 403 });
    }

    // 2. 근태, 연차 신청, 회사 일정 전사 마스터 데이터 수입 (테넌트 격리)
    const empFilters: any = { is_active: '1' };
    if (loggedUsername !== 'admin') empFilters.tenant_id = tenantId;
    const employeesRes = await queryTable('crm_operators', { filters: empFilters });
    const employees = employeesRes.rows || [];

    // 🛡️ 등록된 직원이 0명일 때 명확한 안내 반환 (불필요한 AI 호출 방지 및 허구 분석 차단)
    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          riskScore: 0,
          alertTitle: "등록된 임직원 데이터 대기 중 ⚪",
          alertMessage: "현재 등록된 임직원이 없습니다. 임직원을 등록하시면 실시간 AI 전사 업무 분석 예보가 작동합니다.",
          briefingText: "[안내: 등록된 임직원 데이터 부재]\n현재 시스템에 등록된 활성 임직원이 없습니다. 따라서 전사 업무 공백 및 부서별 리스크 분석을 수행할 수 없습니다.\n\n[권장 조치 가이드]\n1. 상단의 '엑셀 일괄 등록' 또는 '신규 등록' 메뉴를 통해 임직원 정보를 먼저 등록해 주세요.\n2. 출퇴근 기록 및 연차/일정이 누적되면 Gemini AI가 출퇴근 타임스탬프와 일정을 교차 분석하여 업무 예보를 자동 생성합니다."
        }
      });
    }

    // 1. DB에서 AI 설정 정보 로드
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [시스템 설정 > AI 설정]에서 API 키를 먼저 등록해 주세요.'
      }, { status: 400 });
    }

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    const lFilters: any = {};
    if (loggedUsername !== 'admin') lFilters.tenant_id = tenantId;
    const leavesRes = await queryTable('crm_annual_leaves', { filters: lFilters }).catch(() => ({ rows: [] }));
    const leaves = leavesRes.rows || [];

    const evFilters: any = {};
    if (loggedUsername !== 'admin') evFilters.tenant_id = tenantId;
    const eventsRes = await queryTable('crm_company_events', { filters: evFilters }).catch(() => ({ rows: [] }));
    const events = eventsRes.rows || [];

    const attFilters: any = {};
    if (loggedUsername !== 'admin') attFilters.tenant_id = tenantId;
    const attendanceRes = await queryTable('crm_attendance', { filters: attFilters }).catch(() => ({ rows: [] }));
    const attendance = attendanceRes.rows || [];

    const conFilters: any = {};
    if (loggedUsername !== 'admin') conFilters.tenant_id = tenantId;
    const contractsRes = await queryTable('crm_operator_contract_settings', { filters: conFilters }).catch(() => ({ rows: [] }));
    const contracts = contractsRes.rows || [];

    const prFilters: any = {};
    if (loggedUsername !== 'admin') prFilters.tenant_id = tenantId;
    const profilesRes = await queryTable('crm_operator_profiles', { filters: prFilters }).catch(() => ({ rows: [] }));
    const profiles = profilesRes.rows || [];

    // 3. 신규 13대 서브 테이블 정보 로드 (테넌트 격리)
    const subFilters = loggedUsername !== 'admin' ? { tenant_id: tenantId } : {};
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
      queryTable('crm_operator_education', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_licenses', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_careers', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_salaries', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_promotions', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_awards', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_family_events', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_medical', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_incidents', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_reputations', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_families', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_job_history', { filters: subFilters }).catch(() => ({ rows: [] })),
      queryTable('crm_operator_projects', { filters: subFilters }).catch(() => ({ rows: [] }))
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

    // 🛡️ 보안 통제 처리 (부운영자(SUB_OPERATOR) 요청 시 민감 항목 마스킹 차단)
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

    // RAG에 공급할 무기명 평판 정보
    const reputationsForRag = reputations.map((rep: any) => ({
      operator_id: rep.operator_id,
      evaluation_date: rep.evaluation_date,
      source_type: rep.source_type,
      score: rep.score,
      positive_feedback: rep.positive_feedback,
      constructive_feedback: rep.constructive_feedback
    }));

    // JSON RAG 데이터 취합
    const ragContext = {
      total_employees_count: employees.length,
      is_high_privilege_request: isHighPrivilege,
      employees: employees.map((e: any) => {
        const empIdStr = String(e.id);
        const detail = profiles.find((p: any) => String(p.operator_id) === empIdStr) || {
          department: "미정",
          hire_date: e.created_at ? e.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          backup_operator_id: "none",
          skills: "일반 서무",
          commute_area: "인근 통근"
        };
        const contract = contracts.find((c: any) => String(c.operator_id) === empIdStr) || {
          hourly_wage: 10000,
          weekly_hours: 40,
          allow_weekly_holiday_paid: 1
        };

        // 13대 상세 서브 이력 결합
        return {
          id: e.id,
          name: e.name,
          role: e.role,
          department: detail.department,
          hire_date: detail.hire_date,
          backup_operator_id: detail.backup_operator_id,
          skills: detail.skills,
          commute_area: detail.commute_area,
          hourly_wage: contract.hourly_wage,
          weekly_hours: contract.weekly_hours,
          allow_weekly_holiday_paid: contract.allow_weekly_holiday_paid,
          
          // 상세 13대 서브 리스트 주입
          education: education.filter((x: any) => String(x.operator_id) === empIdStr),
          licenses: licenses.filter((x: any) => String(x.operator_id) === empIdStr),
          careers: careers.filter((x: any) => String(x.operator_id) === empIdStr),
          salaries: salaries.filter((x: any) => String(x.operator_id) === empIdStr),
          promotions: promotions.filter((x: any) => String(x.operator_id) === empIdStr),
          awards: awards.filter((x: any) => String(x.operator_id) === empIdStr),
          familyEvents: familyEvents.filter((x: any) => String(x.operator_id) === empIdStr),
          medical: medical.filter((x: any) => String(x.operator_id) === empIdStr),
          incidents: incidents.filter((x: any) => String(x.operator_id) === empIdStr),
          reputations: reputationsForRag.filter((x: any) => String(x.operator_id) === empIdStr),
          families: families.filter((x: any) => String(x.operator_id) === empIdStr),
          jobHistory: jobHistory.filter((x: any) => String(x.operator_id) === empIdStr),
          projects: projects.filter((x: any) => String(x.operator_id) === empIdStr)
        };
      }),
      leaves: leaves.map((l: any) => ({
        operator_id: l.operator_id,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date,
        days_spent: l.days_spent,
        status: l.status,
        reason: l.reason
      })),
      company_events: events.map((ev: any) => ({
        title: ev.title,
        start_date: ev.start_date,
        end_date: ev.end_date,
        event_type: ev.event_type,
        description: ev.description
      })),
      attendance_summary: attendance.slice(-100).map((a: any) => ({
        operator_id: a.operator_id,
        work_date: a.work_date,
        status: a.status,
        working_hours: a.working_hours
      }))
    };

    // 3. RAG 프롬프트 설계
    const aiPrompt = `당신은 전사 기업 인사(HR) 및 공급망 관리(SCM) 전문 최고 분석관이자 사장님의 핵심 경영 참모(HRBP)입니다.
제공된 임직원들의 360도 종합 마스터 프로필(학력, 경력, 자격증, 승진 이력, 포상/징계, 병력 이력, 참여 프로젝트별 기여도 및 평가 점수, 다차원 평판 피드백, 소득세 부양가족 명단, 대내외 사건사고 이력)과 회사 전사 일정 대장(company_events), 휴가 신청(leaves), 출퇴근 감사 데이터(attendance_summary)를 RAG 컨텍스트로 복합 학습하여 고밀도 인사 공백 경보, 법무/사건사고 리스크에 따른 업무 안배 조율, 그리고 인건비 대비 보상 및 가족 맞춤형 생애주기 복지 정책을 정밀하게 제안해 주세요.

[주요 분석 요구사항]:
1. **평판-기여도-보상(급여)의 교차 대조 및 인재 이탈 경보**:
   - 직원의 다차원 평판(reputations)이 매우 뛰어나고 프로젝트 기여도 및 성과 점수(projects)도 극도로 우수(예: 90점 이상)하나, 누적 급여 및 상여금 지급 내역(salaries)이 부서 평균 또는 역량 대비 부조화스럽게 낮게 형성된 인재가 있는지 탐색하세요.
   - 인재 이탈을 방지하기 위한 선제적인 급여 갱신, 격려 상여금 편성 또는 특별 승진 기용 권고를 briefingText에 논리정연하게 작성하십시오.
2. **사건사고/법무/병력 리스크와 직무 심리적 완충 조율**:
   - 직원의 대내외 사건사고(incidents - 단순 갈등부터 민형사 법적 공방까지) 또는 과거/현재 메디컬 병력(medical) 내역을 복합 감지하십시오.
   - 사건사고 위험도(severity)가 MEDIUM 또는 HIGH 이거나, 큰 수술/병력 이력이 있는 직원의 경우 심리적 피로도 및 업무 집중도 저하가 우려됩니다. 중요 프로젝트 참여율(contribution_rate)을 단기적으로 하향 안배하고, 백업 대행자(backup_operator_id)를 적극 연동 가동하여 전사 실무 납품 및 품질 리스크를 사전 방어하는 세련된 대응책을 권장하십시오.
3. **부양가족 생애주기 분석 및 자율 패밀리 케어 복지 권고**:
   - 부양가족(families) 리스트 내 구성원들의 생년월일을 기준으로, 만 나이를 역산하여 특이적 복지 캘린더 이벤트를 자율 추론하세요.
   - 예컨대, 자녀가 만 6~7세가 되어 초등학교 입학 주기를 맞이하거나(홍길동 자녀 등), 영유아 자녀(이영희 자녀 등)가 있어 돌봄 수당 지원이 필요하거나, 노령 부모 부양으로 인한 부양가족 공제 혜택 등이 필요한 경우를 짚어내고, "초등 입학 특별 휴가 및 축하금 발송", "영유아 돌봄 시간 단축 유급 혜택 상신" 등을 사장님께 직접 적극 제안하십시오.
4. **부서 가동률 임계 및 역량 기반 대체 백업**:
   - 1인 단독 부서(예: 구매팀 홍길동 과장) 또는 핵심 라인의 연차 쏠림 공백 발생 시, 백업 대행자(backup_operator_id)의 가용성을 진단하십시오.
   - 백업 담당자가 중복 휴가이거나 없는 경우, 보유 기술 자격증(licenses) 및 역량(skills)이 유사한 타 부서의 인원을 스페어 대체 조율 자원으로 매핑하여 업무 연계성을 제공하십시오.
5. **재무 인건비 및 주휴수당 최적화**:
   - 당월 전사 예상 인건비 총액과 실근무 기반 주휴수당의 최적 효율성을 진단하여 보고하십시오.

반드시 아래 JSON 스키마만을 철저히 준수하여 순수 JSON 문자열로만 응답해 주세요. 다른 마크다운 백틱(\`\`\`) 기호나 텍스트는 절대 포함하지 마세요.

응답 JSON 규격 스펙 예시:
{
  "riskScore": 65, // 0~100 사이의 정수 (법무, 공백, 평판 이탈 리스크 통합 지수)
  "alertTitle": "6월 전사 인사-법무 리스크 주의 단계 🟡", // 또는 "정상 🟢", "심각 위험 🔴"
  "alertMessage": "구매팀 홍길동 과장의 개인 소송 리스크 혹은 부양 자녀 입학 등 가족 생애주기 변화 및 특정인 연차 쏠림에 따른 업무 연속성 체크가 요구됩니다.",
  "briefingText": "[직원 평판 및 보상 교차 검증]\\n홍길동 과장의 경우 사내 동료 평판이 4.8점으로 극도로 우수하고 스마트 SCM 프로젝트의 성과가 95점에 달하나, 동 부서 대비 상여 비중이 상대적으로 적습니다. 인재 이탈 방지를 위해 2분기 정기 상여 편성을 권고합니다.\\n\\n[법무/사건사고 및 심리적 완충 케어]\\n생산본부 김철수 반장이 최근 전세 사기 관련 고위험(HIGH) 민사 소송 분쟁을 겪고 있습니다. 심리적 압박으로 인한 생산 라인 오판 리스크를 완화하기 위해 무재해 환경 프로젝트의 업무 기여율을 단기 조율하고 구매팀 홍길동 대리를 1차 백업으로 전격 가동하십시오.\\n\\n[가족 생애주기 맞춤형 복지 상신]\\n홍길동 과장의 자녀(홍진우, 만 6세)가 내년 초등학교 입학 생애주기에 도래합니다. 입학 축하금 30만 원 지원과 돌봄 휴가 결재를 선제 배정하여 애사심을 고취하십시오. 이영희 사원의 경우 영아 자녀(김민우)를 위해 육아 돌봄 단축 시간 단축을 권장합니다.\\n\\n[인건비 최적화]\\n근태와 연동된 실 예상 주휴수당 총액을 대조하여 효율적 예산 안배를 수립하였습니다."
}

[학습용 실시간 전사 360도 종합 HR 컨텍스트]:
${JSON.stringify(ragContext, null, 2)}`;

    // 4. Gemini AI 호출 가동
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: aiPrompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini AI API 통신 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini AI로부터 공백 및 360도 종합 인사 분석 응답을 수신하지 못했습니다.');
    }

    // AI API 사용량 통계 감사 로그 누락 없이 안전하게 실시간 적재
    let promptTokens = 0;
    let completionTokens = 0;
    try {
      const u = aiData.usageMetadata || {};
      promptTokens = u.promptTokenCount || 0;
      completionTokens = u.candidatesTokenCount || 0;
      const totalTokens = u.totalTokenCount || 0;

      if (totalTokens > 0) {
        await insertRows('ai_token_usage_logs', [{
          model_name: selectedModel,
          task_purpose: 'HR_AI_BRIEFING_360',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          timestamp: new Date().toISOString()
        }]);
        console.log('✓ 360 ERP AI 분석 API 토큰 감사로그 누락 없이 적재 완료 💰');
      }
    } catch (logErr) {
      console.error('HR AI 토큰 사용량 감사 로그 적재 실패:', logErr);
    }

    // AI 응답 JSON 파싱
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.trim());
    } catch (err) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0].trim());
      } else {
        throw new Error('AI 분석 결과 응답 포맷이 올바르지 않습니다.');
      }
    }

    // 🪐 11단계: 과거 이력 보존 스냅샷 자동 적재 추가!
    try {
      const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const currentYearMonth = new Date().toISOString().substring(0, 7);
      
      const newHistoryId = `hist_${Date.now()}`;
      await insertRows('crm_operator_ai_briefing_histories', [{
        id: newHistoryId,
        target_year_month: currentYearMonth,
        risk_score: parsedResult.riskScore || 0,
        alert_title: parsedResult.alertTitle || '정상 가동중 🟢',
        alert_message: parsedResult.alertMessage || '회사 일정 대비 연차 쏠림 현상이 발견되지 않아 전사 업무 공백 리스크가 극히 낮습니다.',
        briefing_text: parsedResult.briefingText || '안정적인 전사 인사 근태 환경이 유지되고 있습니다.',
        created_at: nowKst,
        created_by: String(sessionUser.id || '1'),
        tenant_id: tenantId,
        token_usage_input: promptTokens,
        token_usage_output: completionTokens
      }]);
      console.log('✓ AI 분석 히스토리 스냅샷 테이블 자동 저장 완수 📝');
    } catch (histSaveErr) {
      console.error('AI 분석 히스토리 자동 저장 실패:', histSaveErr);
    }

    return NextResponse.json({
      success: true,
      riskScore: parsedResult.riskScore || 0,
      alertTitle: parsedResult.alertTitle || '정상 가동중 🟢',
      alertMessage: parsedResult.alertMessage || '회사 일정 대비 연차 쏠림 현상이 발견되지 않아 전사 업무 공백 리스크가 극히 낮습니다.',
      briefingText: parsedResult.briefingText || '안정적인 전사 인사 근태 환경이 유지되고 있습니다.'
    });

  } catch (error: any) {
    console.error('AI Briefing POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

