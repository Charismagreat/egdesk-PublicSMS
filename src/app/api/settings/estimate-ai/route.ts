export const dynamic = 'force-dynamic';
import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

/**
 * POST /api/settings/estimate-ai
 * AI를 활용해 업종/전략에 적합한 할인 규칙 추천 데이터 또는 편지 템플릿을 생성합니다.
 */
export async function POST(req: Request) {
  try {
    const { action, business_type, strategy, tone } = await req.json();

    if (!action) {
      return NextResponse.json({ success: false, error: 'action 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // google_ai_api_key 조회
    let apiKey: string | null = null;
    try {
      const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;
    } catch (e) {
      console.error('API key 조회 에러:', e);
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Google AI API Key가 설정에 등록되어 있지 않습니다. [시스템 설정]에서 먼저 등록해 주세요.' }, { status: 400 });
    }

    // 1. 할인 규칙 AI 추천
    if (action === 'recommend_rules') {
      if (!business_type || !strategy) {
        return NextResponse.json({ success: false, error: '업종(business_type)과 영업전략(strategy)이 필요합니다.' }, { status: 400 });
      }

      let strategyText = '';
      if (strategy === 'volume') strategyText = '박리다매 (대량 판매 및 볼륨 위주 할인)';
      else if (strategy === 'margin') strategyText = '마진 극대화 (최소 할인 및 고부가가치 위주)';
      else strategyText = '일반적이고 균형 잡힌 전략';

      const systemInstruction = `
You are an expert financial consultant and B2B pricing strategist.
Your task is to recommend discount rules for business type: "${business_type}" with strategy: "${strategyText}".
Analyze the typical order size, average margins, and sales cycle for this type of business.
Recommend a JSON output containing:
1. "rules": An array of objects containing "minQty" (number) and "discountRate" (number, between 0.01 and 0.50). Provide 2 to 4 tiers.
2. "vipRate": A recommended additional discount rate for VIP customers (number, between 0.01 and 0.15).
3. "reason": A friendly, detailed explanation in Korean explaining why this strategy fits the specified business type and strategy.

CRITICAL: Return ONLY a valid JSON object matching this structure. No markdown wrappers like \`\`\`json.
JSON Schema:
{
  "rules": [{"minQty": number, "discountRate": number}],
  "vipRate": number,
  "reason": string
}
`;

      const prompt = `Recommend business discount rules for:
Business Type: ${business_type}
Strategy: ${strategyText}
`;

      const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API call failed with status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Token usage logging
      try {
        const prompt_tokens = data.usageMetadata?.promptTokenCount || 0;
        const completion_tokens = data.usageMetadata?.candidatesTokenCount || 0;
        const total_tokens = data.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
        await insertRows('ai_token_usage_logs', [{
          id: `TKC-RULE-${Date.now()}`,
          model: 'gemini-3.5-flash',
          purpose: 'RECOMMEND_DISCOUNT_RULES',
          prompt_tokens,
          completion_tokens,
          total_tokens,
          created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
        }]);
      } catch (e) {}

      try {
        const parsed = JSON.parse(rawText.trim());
        return NextResponse.json({ success: true, ...parsed });
      } catch (parseError) {
        console.error("Failed to parse JSON from Gemini:", rawText);
        return NextResponse.json({ success: false, error: 'AI가 반환한 데이터가 올바른 JSON 형식이 아닙니다.', raw: rawText }, { status: 500 });
      }
    }

    // 2. 편지 템플릿 AI 추천
    if (action === 'recommend_template') {
      if (!business_type || !tone) {
        return NextResponse.json({ success: false, error: '업종(business_type)과 어조(tone)가 필요합니다.' }, { status: 400 });
      }

      let toneText = '';
      if (tone === 'formal') toneText = '격식 있고 중후한 B2B 전문 비즈니스 어조';
      else if (tone === 'friendly') toneText = '친근하고 부드러우며 감성적인 고객 지향적 어조';
      else if (tone === 'discount') toneText = '할인 혜택과 볼륨 혜택을 강하게 어필하는 공격적인 마케팅 어조';
      else toneText = '기본적이고 깔끔한 어조';

      const systemInstruction = `
You are a master of business copywriting and professional sales pitch creator.
Your task is to recommend a B2B proposal cover letter (estimate letter) template for business type: "${business_type}" with tone: "${toneText}".
The template will be used in a Mustache-based template system. 
You must incorporate standard Mustache tags so that the system can bind values.
Available tags you CAN use:
- {{recipient_company}} : Name of the buyer/client company
- {{supplier_company}} : Name of the supplier/our company
- {{supplier_owner}} : Representative name of our company
- {{supplier_phone}} : Telephone number of our company
- {{total_amount}} : Total proposed price (including discount)
- {{document_memo}} : Special remarks / terms

Output a JSON object containing:
1. "template": The Mustache template text (in Korean) for the letter. Include line breaks (\\n) for formatting.
2. "reason": A short reason in Korean explaining why this template copy works for this business type and tone.

Example template skeleton:
"안녕하십니까, {{recipient_company}} 귀하. \\n\\n당사 {{supplier_company}}의 고품질 서비스를 제안합니다..."

CRITICAL: Return ONLY a valid JSON object matching this structure. No markdown wrappers.
`;

      const prompt = `Generate a B2B estimate letter template for:
Business Type: ${business_type}
Tone: ${toneText}
`;

      const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API call failed with status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Token usage logging
      try {
        const prompt_tokens = data.usageMetadata?.promptTokenCount || 0;
        const completion_tokens = data.usageMetadata?.candidatesTokenCount || 0;
        const total_tokens = data.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
        await insertRows('ai_token_usage_logs', [{
          id: `TKC-TPL-${Date.now()}`,
          model: 'gemini-3.5-flash',
          purpose: 'RECOMMEND_LETTER_TEMPLATE',
          prompt_tokens,
          completion_tokens,
          total_tokens,
          created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
        }]);
      } catch (e) {}

      try {
        const parsed = JSON.parse(rawText.trim());
        return NextResponse.json({ success: true, ...parsed });
      } catch (parseError) {
        return NextResponse.json({ success: false, error: 'AI가 반환한 템플릿 데이터가 올바른 JSON 형식이 아닙니다.', raw: rawText }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: '지원하지 않는 action입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('API pricing-settings-ai error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
