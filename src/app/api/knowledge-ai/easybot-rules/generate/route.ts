export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../../egdesk-helpers';

/**
 * POST: 최고관리자가 입력한 자연어 지침을 AI가 파싱하여 
 * 자율 감시 규칙(EasyBotRule) 폼 데이터(SQL 조건문 포함)로 자동 빌드
 */
export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 검증 가드
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 계정으로 진행해 주세요.' }, { status: 403 });
    }

    const { prompt } = await req.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: '자연어 지침을 입력해 주십시오.' }, { status: 400 });
    }

    // 2. system_settings에서 Google API Key 및 모델 조회
    const keyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = keyRes.rows && keyRes.rows.length > 0 ? keyRes.rows[0].value : null;

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const model = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-2.0-flash';

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '구글 AI API Key가 등록되지 않았습니다. [시스템 설정] 또는 [AI 설정]에서 API Key를 먼저 저장해 주세요.' 
      }, { status: 400 });
    }

    // 3. 데이터베이스 테이블 구조와 의미 힌트 정보 작성
    const dbSchemaHint = `
[지원 감시 대상 테이블 목록 및 컬럼 힌트]:
1. crm_expenses (지출 내역 대장)
   - 주요 컬럼: id, category, amount (금액), memo (적요/내용), user_id (지출 사원 ID), expense_date (지출 일자)
2. crm_orders (주문 내역 대장)
   - 주요 컬럼: id, name (주문명), amount (총 주문금액), status (주문상태), memo (메모), address (배송 주소)
3. crm_deliveries (배송 정보 대장)
   - 주요 컬럼: id, order_id, courier, tracking_number, status (배송상태), updated_at
4. products (제품 및 자재 재고)
   - 주요 컬럼: id, name (상품명), category, price (단가), stock (재고 수량), safe_stock (안전 재고 수량)
5. crm_snaptasks (업무 지시 대장)
   - 주요 컬럼: id, title, content, operator_id, priority, due_date

[연계 테이블 정보 (JOIN / 서브쿼리용)]:
* crm_staff (임직원 정보)
  - 주요 컬럼: id (사원 ID), name (성명), department (부서), position (직급), status (재직상태: 'ACTIVE' 재직, 'TEMPORARY' 계약직 등)

[대안 A: JOIN/서브쿼리 구현 규칙]:
- 하나의 규칙은 하나의 감시 대상 테이블(트리거)에만 걸릴 수 있지만, 조건식(conditions_sql)에 서브쿼리를 사용하여 여러 테이블을 유기적으로 감시할 수 있습니다.
- 예를 들어 "계약직 직원의 30만원 이상 지출 감시"의 경우:
  - 감시 대상 테이블: crm_expenses
  - 조건식 (conditions_sql): "amount >= 300000 AND user_id IN (SELECT id FROM crm_staff WHERE status = 'TEMPORARY')"
`;

    const assigneeHint = `
[후속 업무 배정 담당자 ID 목록 (assignee_id)]:
- "1" : 최고운영자/대표이사 (ID: 1)
- "2" : 자사몰 영업 마케터 (ID: 2)
- "3" : 생산공장/물류 MD (ID: 3)
- "4" : 재무감사 회계관제 대리 (ID: 4)
`;

    const priorityHint = `
[생성 태스크 우선순위 (task_priority)]:
- "low" (낮음), "medium" (보통), "high" (높음), "critical" (긴급)
`;

    // 4. Gemini 프롬프트 설계
    const generatorPrompt = `
당신은 최고관리자의 자연어 지침을 해석하여 이지봇(EasyBot) 자율 관제 규칙 설정을 자동으로 빌드하는 비즈니스 시스템 분석가 AI 모델입니다.

[요구사항]:
제공된 [최고관리자 자연어 지침]을 분석하여 다음의 JSON 규격으로만 응답해 주세요. 다른 일반 텍스트 설명은 절대로 배제하십시오.

${dbSchemaHint}
${assigneeHint}
${priorityHint}

[최고관리자 자연어 지침]:
"${prompt}"

[치환 가이드]:
- task_title_template 및 task_content_template 에서는 해당 감시 대상 테이블의 컬럼을 중괄호 {컬럼명} 형태로 치환하여 사용할 수 있습니다. (예: {amount}, {name}, {memo} 등)
- 자연어에서 특정 담당자를 명시하지 않았다면, 업무 성격에 가장 잘 맞는 assignee_id(1, 2, 3, 4 중 하나)를 AI가 추론하여 지정해 주세요. (예: 지출/재무는 4번, 배송/물류는 3번, 영업/마케팅은 2번, 중요 경고/승인은 1번)
- task_priority 역시 자연어 맥락에 따라 'low', 'medium', 'high', 'critical' 중 하나로 지정해 주세요.
- conditions_sql은 유효한 SQLite3 WHERE 조건식이어야 합니다. 특히 테이블명이 생략된 컬럼명이 유효하도록 구성하되, 서브쿼리의 경우 외부 테이블과 겹치지 않게 조심히 작성하세요.

반드시 다음의 JSON 규격으로만 응답해 주세요. 마크다운 따옴표(\`\`\`) 등을 포함하지 말고 순수 JSON 문자열로만 응답해 주세요.
{
  "title": "규칙을 대표하는 직관적인 한글 명칭",
  "target_table": "감시 대상 테이블명 (crm_expenses, crm_orders, crm_deliveries, products, crm_snaptasks 중 하나)",
  "conditions_sql": "SQLite3 WHERE 조건식 (JOIN 대체를 위해 서브쿼리 적극 활용 가능)",
  "assignee_id": "배정자 ID 문자열 ('1', '2', '3', '4' 중 하나)",
  "task_priority": "우선순위 문자열 ('low', 'medium', 'high', 'critical' 중 하나)",
  "task_title_template": "생성될 후속 업무 제목 템플릿 (한글)",
  "task_content_template": "생성될 후속 업무 상세내용 템플릿 (한글)"
}
`;

    // 5. Gemini API 호출
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "당신은 자연어 지침을 정밀 분석하여 SQL 조건식과 폼 데이터가 채워진 JSON 객체를 구성하는 구조화된 어시스턴트입니다." }] },
        contents: [{ role: 'user', parts: [{ text: generatorPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.');
    }

    const resData = await response.json();
    const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = resData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = resData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = resData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: model || 'gemini-3.5-flash',
        purpose: 'EASYBOT_RULES_GEN',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (jsonErr) {
      console.error('Gemini 결과 JSON 파싱 실패:', resultText);
      return NextResponse.json({ 
        success: false, 
        error: 'AI가 생성한 설정 구조를 해석하지 못했습니다. 입력하신 지침을 조금 더 명확하게 작성해 주세요.' 
      }, { status: 500 });
    }

    // 기본적인 정합성 보강
    if (!parsedResult.target_table) parsedResult.target_table = 'crm_expenses';
    if (!parsedResult.assignee_id) parsedResult.assignee_id = '1';
    if (!parsedResult.task_priority) parsedResult.task_priority = 'medium';

    return NextResponse.json({
      success: true,
      rule: parsedResult
    });

  } catch (error: any) {
    console.error('EasyBot Rules Generator API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
