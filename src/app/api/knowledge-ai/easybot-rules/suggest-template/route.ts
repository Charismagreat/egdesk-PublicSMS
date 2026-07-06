export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../../egdesk-helpers';

/**
 * POST: 규칙 정보(명칭, 대상 테이블, 조건식)에 부합하는
 * 업무 지시 상세 내용 템플릿(task_content_template)을 AI가 추천 생성
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

    const { title, target_table, conditions_sql } = await req.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: '규칙 명칭(title) 정보가 필요합니다.' }, { status: 400 });
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

    // 3. 테이블 설명 및 매핑 치환 가이드
    const tableFieldGuide = `
[테이블별 추천 치환 컬럼 괄호 가이드]:
- crm_expenses (지출 내역 대장): 
  사용 가능한 변수: {amount} (금액), {category} (카테고리), {memo} (내용/적요), {expense_date} (지출일자), {user_id} (지출자 ID)
- crm_orders (주문 내역 대장):
  사용 가능한 변수: {name} (주문명), {amount} (총 주문금액), {status} (주문상태), {memo} (메모), {address} (배송주소)
- crm_deliveries (배송 정보 대장):
  사용 가능한 변수: {courier} (택배사), {tracking_number} (송장번호), {status} (배송상태)
- products (제품 및 자재 재고):
  사용 가능한 변수: {name} (상품명), {category} (카테고리), {price} (단가), {stock} (현재재고), {safe_stock} (안전재고)
- crm_snaptasks (업무 지시 대장):
  사용 가능한 변수: {title} (업무제목), {content} (상세내용), {priority} (우선순위)
`;

    // 4. Gemini 프롬프트 설계
    const generatorPrompt = `
당신은 기업의 위기 관리 및 비즈니스 자율 대행 룰 엔진에 적합한 업무 지시서 템플릿을 정밀 작성하는 전문 비즈니스 컨설턴트 AI입니다.

[요구사항]:
아래에 제공된 [자율 감시 규칙 메타데이터]에 완벽하게 부합하도록, 시스템에서 해당 규칙이 실시간 탐지되었을 때 담당자가 보고 실행해야 할 구체적인 "업무 지시 상세 내용 템플릿"을 추천해서 작성해 주세요.

[자율 감시 규칙 메타데이터]:
- 규칙 명칭: ${title}
- 감시 대상 테이블: ${target_table}
- 감시 조건식: ${conditions_sql || "조건 없음 (전체 감시)"}

${tableFieldGuide}

[주의사항]:
- 템플릿 작성 시 해당 테이블에서 사용할 수 있는 대표적인 변수 괄호(예: {amount}, {name}, {memo} 등)를 적절히 삽입하여, 런타임에 데이터가 자동으로 바인딩되어 출력될 수 있도록 구성해 주세요.
- 문장은 매우 구체적이고 정중하며 전문적인 사내 업무 지시 어조(한글)로 작성해 주세요.
- 응답은 마크다운 기호 없이, 반드시 다음의 JSON 규격으로만 출력해 주세요:
{
  "suggested_template": "AI가 생성한 상세 업무 지시서 템플릿 텍스트"
}
`;

    // 5. Gemini API 호출
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "당신은 비즈니스 룰에 최적화된 업무 지시서 양식을 구조화된 JSON으로 응답하는 전문 비즈니스 분석가입니다." }] },
        contents: [{ role: 'user', parts: [{ text: generatorPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
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
        purpose: 'EASYBOT_RULES_SUGGEST_TEMPLATE',
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
        error: 'AI 추천 템플릿을 가공하지 못했습니다. 다시 시도해 주세요.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      suggested_template: parsedResult.suggested_template || ""
    });

  } catch (error: any) {
    console.error('Suggest Task Template API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
