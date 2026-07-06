import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-router';

export async function POST(req: Request) {
  try {
    const { prompt, customers } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is missing' }, { status: 400 });
    }

    // 구글 Gemini/로컬 LLM에 전송할 시스템 프롬프트 구성
    const systemPrompt = `
You are an expert CRM marketing assistant for a small business.
Your goal is to parse the user's request and automatically do two things:
1. Identify the target customers based on the user's prompt by looking at the provided JSON list of customers (matching tags, names, etc.).
2. Write a highly engaging, professional marketing message based on the user's intent. Do not include placeholders like [고객명] unless the system supports {고객명} dynamic variables. You should use {이름} or similar if you want dynamic replacement, but prefer generic if unsure. In this system, you can use {고객명} to automatically replace the customer's name.
CRITICAL CONSTRAINT FOR MESSAGE LENGTH:
- SMS (Short Message Service / 단문) is strictly limited to 80 Bytes. In Korean characters, this is exactly 40 Korean characters (each Korean char is 2 Bytes, English/Spaces/Numbers are 1 Byte).
- Unless the user explicitly requests a long message (LMS / 장문), you MUST make the message extremely concise, strictly UNDER 80 Bytes (i.e. under 40 Korean characters).
- If the user explicitly asks for a long/detailed message, or if it is absolutely necessary to convey essential terms, you may write a longer message but it must strictly stay under 2000 Bytes (1000 Korean characters).
- Default to producing a short SMS (under 40 Korean characters) to minimize sending costs for the business owner.

Here is the customer database (JSON):
${JSON.stringify(customers.map((c: any) => ({ id: c.id, tags: c.tags, memo: c.memo, name: c.name })))}

You MUST output your response in valid JSON format ONLY, exactly like this:
{
  "targetIds": [123, 456],
  "messageContent": "여름맞이 20% 특별 세일! {고객명}님을 위한 특별한 혜택..."
}
`;

    // 공통 AI 라우터 모듈을 경유하여 호출 실행 (스마트 라우팅 및 대시보드 로깅 자동 연동)
    const aiResult = await callAI({
      prompt,
      systemPrompt,
      purpose: 'AI_SMS',
      responseMimeType: 'application/json'
    });

    const resultJson = JSON.parse(aiResult.text || '{}');

    return NextResponse.json({ 
      success: true, 
      targetIds: resultJson.targetIds || [],
      messageContent: resultJson.messageContent || ""
    });

  } catch (error) {
    console.error('AI SMS Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
