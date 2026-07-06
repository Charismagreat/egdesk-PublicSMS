import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { selectedModel, chatMessages, userMsg } = await request.json();

    // AI 설정 쿼리
    const settingsKeyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsKeyRes.rows && settingsKeyRes.rows.length > 0 ? settingsKeyRes.rows[0].value : (process.env.GEMINI_API_KEY || "");
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key가 설정되어 있지 않습니다." }, { status: 400 });
    }

    const model = selectedModel || "gemini-3.5-flash";

    const systemPrompt = `
You are a premium Industrial Safety Response Chatbot complying with the Korean Serious Accident Punishment Act (SAPA).
When a user describes an accident (e.g., fall, electric shock, entrapment, fire), you must:
1. Provide immediate golden-time emergency action guidelines (1, 2, 3 steps in Korean).
2. Generate a standard government-submitting [재해조사표] (Accident Investigation Report) draft in Markdown format based on the details provided.
The report must include:
- 재해개요 (Overview)
- 발생원인 (Root Cause)
- 재발방지대책 (Preventative Measures)
Keep the tone urgent, professional, and clear.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetchGeminiWithFallback(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...chatMessages.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        generationConfig: {
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 호출 실패 (Status: ${response.status})`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다. 안내를 생성하는 도중 오류가 발생했습니다.";

    // AI 사용량 기록
    try {
      const prompt_tokens = data.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = data.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = data.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);

      await insertRows("ai_token_usage_logs", [{
        id: logId,
        model,
        purpose: "SAFETY_ACCIDENT_CHAT",
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: nowStr
      }]);
    } catch (e: any) {
      console.error("AI 사용량 로그 기록 실패:", e.message);
    }

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
