import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const { industry, keyword } = await req.json();

    if (!industry || !keyword) {
      return NextResponse.json({ success: false, error: '산업군 및 원자재 키워드를 입력해 주세요.' }, { status: 400 });
    }

    // 1. DB에서 구글 AI API 키 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [설정 > AI 설정]에서 먼저 등록해 주세요.' 
      }, { status: 400 });
    }

    // 2. Gemini AI 추천 시스템 프롬프트 수립
    const systemPrompt = `
당신은 중소제조업 SCM 및 가격 최적화 전문가이자, 웹 크롤링 파이프라인 설계자입니다.
사용자의 산업군과 가격 추적 희망 원자재/제품 키워드를 바탕으로, 신뢰도가 매우 높고 일단위/주단위 가격이 고시되는 국내외 공식 웹사이트 2곳을 RAG 추천해 주세요.

보안 및 실용적 관점에서 스크래핑이 용이하고 차단 정책이 낮은 공공 정보망(예: 한국자원정보서비스 KOMIS, LME, 한국은행 경제통계시스템, 네이버 페이 증권 등)을 우선적으로 제안해야 합니다.
반드시 아래의 정밀한 JSON 구조로만 응답해 주세요. 지어내거나 일반적인 안내문을 덧붙이지 마십시오.

응답 JSON 구조 예시:
[
  {
    "site_name": "한국자원정보서비스 (KOMIS)",
    "url": "https://www.komis.or.kr/komis/sub/china/mineral/price.do",
    "recommended_selector": "table.table_style1 > tbody > tr:first-child > td:nth-child(3)",
    "scraping_difficulty": "쉬움",
    "description": "광물 국가 공인 가격 지표를 일단위로 제공하는 대한민국 자원 종합 포털입니다."
  },
  {
    "site_name": "LME 공식 구리 시세 페이지",
    "url": "https://www.lme.com/en/Metals/Non-ferrous/Copper",
    "recommended_selector": "div.price-table__current-price > span",
    "scraping_difficulty": "보통",
    "description": "런던금속거래소의 공식 구리 톤당 시세 고시 페이지입니다."
  }
]
`;

    const model = 'gemini-3.5-flash';
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: 'user', parts: [{ text: `산업군: ${industry}\n원자재/경쟁품목 키워드: ${keyword}` }] }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini AI API 호출 에러');
    }

    const resData = await response.json();
    const recommendedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const recommendations = JSON.parse(recommendedText);

    // 🕒 AI 토큰 실시간 모니터링 로그 대장에 기록 연동
    if (resData.usageMetadata) {
      try {
        const u = resData.usageMetadata;
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        await insertRows('ai_token_usage_logs', [{
          id: `TK-REC-${Date.now()}`,
          model,
          purpose: 'price-tracker-ai-recommendation',
          prompt_tokens: u.promptTokenCount || 0,
          completion_tokens: u.candidatesTokenCount || 0,
          total_tokens: u.totalTokenCount || 0,
          created_at: nowStr
        }]);
      } catch (logErr) {
        console.error('AI 추천 토큰 로깅 실패:', logErr);
      }
    }

    return NextResponse.json({ success: true, recommendations });

  } catch (error: any) {
    console.error('AI Recommendation API Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
