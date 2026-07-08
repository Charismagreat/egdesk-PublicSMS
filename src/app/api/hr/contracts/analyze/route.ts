export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../../egdesk-helpers';

/**
 * POST: 근로계약서 문서(PDF, 이미지) AI 검독 및 계약 조건 자동 적재
 */
export async function POST(req: Request) {
  try {
    // 1. 최고운영자 권한 검증
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '근로계약서 분석 권한이 없습니다. 최고관리자 계정으로 로그인해 주세요.' }, { status: 403 });
    }

    const body = await req.json();
    const { operator_id, file_base64, file_mime } = body;

    if (!operator_id || !file_base64 || !file_mime) {
      return NextResponse.json({ success: false, error: '직원 ID 및 근로계약서 파일 데이터는 필수입니다.' }, { status: 400 });
    }

    // 2. DB에서 구글 AI 설정 정보 로드
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

    // 3. Prompt 조립
    const systemInstruction = `당신은 대한민국 근로기준법을 정확하게 숙지하고 있는 노무 법률 AI 비서이자 인사 급여 설정 전문가입니다. 제공되는 근로계약서 문서(PDF 또는 이미지)를 해독하여 급여 및 근무 형태와 관련된 4대 필수 지표를 추출하고, 근로기준법 위반 및 노동 분쟁 소지가 있는 '독소 조항(위법 조항)'을 스캔하여 정해진 JSON 규격으로만 답변해 주세요.`;

    const userPrompt = `첨부된 근로계약서 파일을 정밀 판독하여 대한민국 근로기준법 기준에 맞춰 다음 지표들을 도출해 주세요.

[도출해야 할 정보 및 작성 지침]
1. hourly_wage: 계약서상에 명시된 통상 시급(REAL)입니다. 만약 월급(예: 2,090,000원)만 적혀 있는 경우, 주 40시간(월 209시간) 기준 통상임금 산정방식을 적용해 시급(예: 10,000원)으로 환산하여 숫자로만 도출하십시오.
2. weekly_hours: 주당 소정근로시간(REAL)을 도출하십시오.
3. allow_weekly_holiday_paid: 주 소정근로시간이 15시간 이상인 경우 주휴수당 적용 대상이므로 1(적용), 주 15시간 미만인 경우 주휴수당 미적용 대상이므로 0(미적용)을 입력하십시오.
4. work_days: 근무 요일들을 쉽표(,)로 구분한 텍스트(예: "월,화,수,목,금")로 도출하십시오.
5. contract_memo: 근로 계약 형태 및 수습 기간 여부 등에 대한 간략한 요약을 작성하십시오.
6. toxic_clauses: 근로기준법에 위반되거나 분쟁 여지가 다분한 조항(예: 연장근로수당 포기 각서, 최저임금 미달 시급, 법정 퇴직금 미지급 규정 등)이 있다면 해당 조항의 명칭과 구체적 설명, 그리고 노무사의 보완 조언을 상세히 작성해 주십시오.

반드시 아래의 구조화된 JSON 포맷으로 결과를 도출해 주세요. JSON 외의 다른 설명이나 백틱(\`\`\`) 등은 절대 답변에 포함하지 마십시오.

{
  "hourly_wage": 10000,
  "weekly_hours": 40.0,
  "allow_weekly_holiday_paid": 1,
  "work_days": "월,화,수,목,금",
  "contract_memo": "2026년도 신임 정규직 주 40시간 표준 근로계약서",
  "has_law_violation": true 또는 false (위반 소지 조항이 1개라도 있는 경우 true),
  "toxic_clauses": [
    {
      "clause_name": "위반/독소 조항 명칭",
      "clause_text": "계약서 내 명시된 구체적 문구",
      "violation_reason": "근로기준법 조항 위반 이유 및 노무 제언"
    }
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    // 4. Gemini API 호출 (멀티모달 PDF/이미지 전송)
    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: userPrompt },
              {
                inlineData: {
                  mimeType: file_mime,
                  data: file_base64
                }
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini AI 분석 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = aiData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = aiData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = aiData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: selectedModel || 'gemini-3.5-flash',
        purpose: 'HR_CONTRACT_AI_SCAN',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    if (!rawText) {
      throw new Error('Gemini AI로부터 근로계약 분석 결과를 수신하지 못했습니다.');
    }

    // JSON 파싱 확인
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.trim());
    } catch (err) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0].trim());
      } else {
        throw new Error('AI 분석 결과의 JSON 형식이 올바르지 않습니다.');
      }
    }

    const nowStr = new Date().toISOString();

    // 5. crm_operator_contract_settings 에 계약 정보 자동 동기화 (Upsert)
    const contractData = {
      operator_id: String(operator_id),
      hourly_wage: Number(parsedResult.hourly_wage) || 10000.0,
      weekly_hours: Number(parsedResult.weekly_hours) || 40.0,
      allow_weekly_holiday_paid: Number(parsedResult.allow_weekly_holiday_paid) === 0 ? 0 : 1,
      work_days: parsedResult.work_days || '월,화,수,목,금',
      contract_memo: parsedResult.contract_memo || 'AI 자동 검독 계약서',
      updated_at: nowStr
    };

    // 기존 계약 조건 유무 확인 및 갱신/삽입
    await insertRows('crm_operator_contract_settings', [contractData]);

    // 6. [동시성] 근로계약 독소조항 스캔 내역 DB 기록 (crm_labor_contracts 대장)
    try {
      const scanId = `LCS-${Date.now()}`;
      const hasViolation = parsedResult.has_law_violation ? 1 : 0;
      const toxicStr = JSON.stringify(parsedResult.toxic_clauses || []);

      await insertRows('crm_labor_contracts', [{
        id: scanId,
        operator_id: String(operator_id),
        contract_file_name: body.file_name || '계약서_스캔본',
        has_toxic_clauses: hasViolation,
        findings_json: toxicStr,
        created_at: nowStr,
        updated_at: nowStr,
        updated_by: 'SUPER_ADMIN'
      }]);
    } catch (dbErr: any) {
      console.error('독소조항 대장 기록 실패:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      result: parsedResult,
      contract: contractData
    });

  } catch (error: any) {
    console.error('Contracts AI Analyze API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '근로계약서 AI 분석 중 서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
