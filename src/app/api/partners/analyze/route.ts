export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, executeSQL } from '../../../../../egdesk-helpers';

/**
 * 최고관리자(SUPER_ADMIN) 권한 검증 공통 헬퍼
 */
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const payload = decodeJwt(token);
  if (payload.role !== 'SUPER_ADMIN') {
    throw new Error('거래처 AI 분석 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.');
  }
}

/**
 * GET: 특정 거래처의 AI 리스크 보고서 목록 조회
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partner_id');

    if (!partnerId) {
      return NextResponse.json({ success: false, error: '조회할 거래처 고유 ID(partner_id)는 필수입니다.' }, { status: 400 });
    }

    const query = `SELECT * FROM crm_partner_ai_reports WHERE partner_id = '${partnerId}' AND deleted_at IS NULL ORDER BY created_at DESC`;
    const res = await executeSQL(query) || [];
    const reports = (res && (res as any).rows) ? (res as any).rows : (Array.isArray(res) ? res : []);

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error('API partners analyze GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: AI 거래처 리스크 분석 실행 및 기록
 */
export async function POST(req: Request) {
  try {
    // 1. 최고관리자 세션 권한 검증
    await verifySuperAdmin();

    const body = await req.json();
    const { partner_id, company_name, analysis_type, payload } = body;

    if (!partner_id || !company_name || !analysis_type) {
      return NextResponse.json({
        success: false,
        error: '거래처 ID, 회사명 및 분석 타입(analysis_type)은 필수 입력 항목입니다.'
      }, { status: 400 });
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

    // 3. 분석 타입(analysis_type)별 System Instruction 및 User Prompt 조립
    let systemInstruction = '';
    let userPrompt = '';

    if (analysis_type === 'NEWS') {
      systemInstruction = `당신은 B2B 거래처 리스크를 사전 탐지하는 전문 '기업 신용 리스크 관리 AI'입니다. 웹 검색 결과(Google Search)를 활용하여 요청받은 기업의 최근 3개월간 부정적 소식(리스크)을 면밀히 분석하고, 정해진 JSON 포맷으로만 답변하세요. 사실에 기반한 명확한 뉴스 출처(URL)를 확보해야 하며, 확실하지 않거나 근거 없는 루머는 배제하십시오.`;
      userPrompt = `다음 거래처에 대한 최근 3개월간의 리스크 분석을 수행해 주세요.

[분석 대상 기업]
- 기업명: ${company_name}
- 주요 업종: B2B 파트너사

[검색 핵심 키워드 조합 예시]
"${company_name}" + (부도 OR 소송 OR 압류 OR 임금체불 OR 세무조사 OR 경영권 분쟁 OR 횡령)

[작성 및 출력 조건]
1. 반드시 Google Search 도구를 사용하여 최신 뉴스를 실시간으로 검색하세요.
2. 분석 결과를 아래 JSON 형식으로 반환하세요. JSON 외의 다른 텍스트는 절대 포함하지 마십시오.

{
  "company_name": "${company_name}",
  "analysis_date": "${new Date().toISOString().slice(0, 10)}",
  "risk_score": "1(매우 안전) ~ 5(매우 위험) 중 정수 입력",
  "risk_summary": "최근 기업 리스크 요약을 2~3문장으로 간략히 서술",
  "detected_risks": [
    {
      "category": "소송/법적분쟁 | 경영진/지배구조 | 재무/자금상황 | 기타 평판 중 하나",
      "issue_title": "리스크 이슈 제목",
      "description": "이슈에 대한 구체적 설명 및 영향력 분석",
      "source_url": "뉴스 기사 또는 공시 URL"
    }
  ],
  "monitoring_recommendation": "향후 상시 모니터링 필요 여부 및 실무자 조치 권고사항"
}`;
    } else if (analysis_type === 'REPUTATION') {
      systemInstruction = `당신은 B2B 기업 평판 및 노동 환경 분석가입니다. 웹 검색 도구(Google Search)를 적극 활용하여 요청받은 기업에 대한 온라인 임직원 평판(잡플래닛, 블라인드, 잡코리아 등) 및 조직 분위기, 퇴사율 동향을 검색하고 분석하십시오. '자금 상황 악화', '사업 축소', '임금 체불', '핵심 인력 이탈' 등 비즈니스 연속성에 직접적 위해가 되는 신호를 감지하고, 반드시 지정된 JSON 구조로만 답변하세요.`;
      userPrompt = `다음 거래처에 대한 온라인 임직원 평판 및 조직 안정성 리스크 분석을 수행해 주세요.

[분석 대상 기업]
- 기업명: ${company_name}

[검색 핵심 키워드 조합 예시]
"${company_name}" + (잡플래닛 OR 블라인드 OR 평판 OR 이직률 OR 임금체불)

[추가 참조 정보]
${payload?.review_text ? `사용자 기입 보조 정보:\n${payload.review_text}` : '제공된 사용자 기입 추가 정보 없음. 구글 검색 평판 데이터에만 의존하여 분석하십시오.'}

[작성 및 출력 조건]
1. 반드시 Google Search 도구를 사용하여 최신 임직원 리뷰 및 평판을 실시간으로 검색하세요.
2. 아래 JSON 포맷으로 출력하세요. JSON 외의 다른 설명 텍스트는 절대 포함하지 마십시오.

{
  "company_name": "${company_name}",
  "overall_sentiment": "긍정 | 보통 | 부정",
  "internal_stability_score": "1(극히 불안정) ~ 5(매우 안정) 중 정수 입력",
  "red_flags": [
    {
      "signal_type": "임금체불 | 구조조정 | 핵심인력동요 | 자금난징후 | 기타",
      "details": "구체적인 내부 고발 및 리뷰 요약 기술",
      "frequency_level": "상 | 중 | 하 (리뷰 내 언급 빈도)"
    }
  ],
  "pros_and_cons": {
    "key_advantage": "직원들이 말하는 기업의 가장 강력한 장점",
    "key_weakness": "직원들이 말하는 기업의 가장 심각한 단점"
  },
  "analyst_opinion": "해당 평판 데이터를 기반으로 한 거래 지속 가치 및 리스크 판단 의견"
}`;
    } else if (analysis_type === 'FINANCIAL') {
      systemInstruction = `당신은 B2B 중소·중견기업 신용공여 및 채무 안정성을 평가하는 'CFA(공인재무분석사) 레벨의 재무 분석 전문가'입니다. 웹 검색 도구(Google Search) 및 첨부된 재무 관련 문서(PDF, 이미지)를 적극 활용하여 요청받은 기업의 최근 분기/연간 재무 성과, 부채비율, 현금흐름 및 주요 공시 정보를 분석하여 비즈니스 안정성을 정량적/정성적으로 종합 진단하십시오. 반드시 지정된 JSON 구조로만 답변하세요.`;
      userPrompt = `다음 거래처에 대한 최근 재무 건전성 분석 및 신용 등급 평가를 실행해 주세요.

[분석 대상 기업]
- 기업명: ${company_name}

[검색 핵심 키워드 조합 예시]
"${company_name}" + (재무제표 OR 매출액 OR 영업이익 OR 부채비율 OR 공시 OR 신용등급)

[추가 참조 정보 (보조 수동 수치)]
- 매출액: ${payload?.revenue || '미지정'} (변동률: ${payload?.revenue_growth || '0%'})
- 영업이익: ${payload?.operating_income || '미정'} (변동률: ${payload?.operating_income_growth || '0%'})
- 부채비율: ${payload?.debt_ratio || '미정'}
- 당기순이익: ${payload?.net_income || '미정'}
- 주요 특이뉴스/공시: ${payload?.financial_news || '특이 사항 없음'}

[작성 및 출력 조건]
1. 반드시 Google Search 도구 및 첨부된 문서 파일을 사용하여 실시간 재무 지표와 공시 정보를 수집하십시오.
2. 단순히 수치만 나열하지 말고 현금흐름의 지속가능성과 단기 채무 지불 능력을 중점적으로 진단하세요.
3. 아래 JSON 포맷으로 결과를 도출해 주세요. JSON 외의 다른 설명 텍스트는 절대 포함하지 마십시오.

{
  "company_name": "${company_name}",
  "financial_health_grade": "안정 | 보통 | 주의 | 위험",
  "key_findings": {
    "growth": "성장성 요약 분석 (매출 및 영업이익 추이 평가)",
    "stability": "안정성 요약 분석 (부채비율 및 유동성 평가)",
    "profitability": "수익성 요약 분석 (당기순이익 및 이익률 평가)"
  },
  "critical_financial_risk": "현재 가장 우려되는 재무적 위험 요소 요약 (예: 자본잠식 우려, 이자보상배율 미달 등)",
  "insolvency_probability": "향후 1년 내 부실화 가능성 (매우낮음 | 낮음 | 보통 | 높음 | 매우높음)",
  "overall_evaluation": "종합적인 재무 분석 결과 및 거래처 여신 한도 조정에 대한 제언"
}`;
    } else {
      return NextResponse.json({ success: false, error: '유효하지 않은 분석 타입입니다.' }, { status: 400 });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    
    // Google Search Grounding 도구 주입 및 System Instruction 구성
    const contentsParts: any[] = [{ text: userPrompt }];

    // 업로드된 파일이 페이로드에 들어있으면 inlineData로 함께 전송
    if (payload?.file_base64 && payload?.file_mime) {
      contentsParts.push({
        inlineData: {
          mimeType: payload.file_mime,
          data: payload.file_base64
        }
      });
    }

    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: contentsParts
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseMimeType: "application/json"
        },
        // 모든 리스크 관제 분석에 실시간 구글 검색 Grounding 도구 적용
        tools: [{ googleSearch: {} }]
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
        purpose: `PARTNER_ANALYZE_${analysis_type}`,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    if (!rawText) {
      throw new Error('Gemini AI로부터 분석 리포트를 수신하지 못했습니다.');
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

    // 데이터베이스 적재 준비
    const reportId = `REP-${Date.now()}`;
    const uuid = `uuid-report-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 위해 등급 산출
    let riskGrade = '보통';
    if (analysis_type === 'NEWS') {
      const score = Number(parsedResult.risk_score) || 3;
      riskGrade = score <= 2 ? '안정' : score === 3 ? '보통' : score === 4 ? '주의' : '위험';
    } else if (analysis_type === 'REPUTATION') {
      const score = Number(parsedResult.internal_stability_score) || 3;
      riskGrade = score >= 4 ? '안정' : score === 3 ? '보통' : score === 2 ? '주의' : '위험';
    } else if (analysis_type === 'FINANCIAL') {
      riskGrade = parsedResult.financial_health_grade || '보통';
    }

    const reportSummary = parsedResult.risk_summary || parsedResult.analyst_opinion || parsedResult.critical_financial_risk || '';

    // crm_partner_ai_reports에 결과 저장
    const reportData = {
      id: reportId,
      partner_id,
      company_name,
      report_type: analysis_type,
      risk_grade: riskGrade,
      summary: reportSummary,
      result_json: JSON.stringify(parsedResult),
      created_at: nowStr,
      uuid,
      updated_at: nowStr,
      updated_by: 'SUPER_ADMIN'
    };

    await insertRows('crm_partner_ai_reports', [reportData]);

    return NextResponse.json({
      success: true,
      report: reportData
    });

  } catch (error: any) {
    console.error('Partners AI Analyze Route Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '거래처 분석 중 서버 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
