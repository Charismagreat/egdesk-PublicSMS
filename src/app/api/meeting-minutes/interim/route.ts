export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, executeSQL } from '@/../egdesk-helpers';
import crypto from 'crypto';

/**
 * POST: 회의 도중 실시간 AI 중간 요약 및 제언 어시스트 API
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript } = body;

    if (!transcript) {
      return NextResponse.json({ success: false, error: '현재까지의 회의 기록이 필요합니다.' }, { status: 400 });
    }

    let dialogText = '';
    if (Array.isArray(transcript)) {
      dialogText = transcript.map((t: any) => `${t.speaker || '참석자'}: ${t.text}`).join('\n');
    } else {
      dialogText = String(transcript);
    }

    if (!dialogText.trim()) {
      return NextResponse.json({ success: true, analysis: '대화가 시작되면 AI가 중간 분석을 개시합니다.' });
    }

    // 1. system_settings에서 구글 AI API 키 조회
    let apiKey = null;
    try {
      const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      if (settingsRes.rows && settingsRes.rows.length > 0) {
        apiKey = settingsRes.rows[0].value;
      }
    } catch (dbErr) {
      console.warn('⚠️ system_settings 조회 실패:', dbErr);
    }

    let analysisResult = '';

    if (apiKey) {
      try {
        const systemPrompt = `당신은 유능한 회의 퍼실리테이터(Facilitator)이자 비즈니스 컨설턴트입니다.
제시된 현재까지의 한국어 회의 대화록을 분석하여 다음 내용을 은은한 색상의 마크다운 서식으로 정성껏 요약/답변해 주세요:
1. **현재까지의 논의 핵심 요약** (합의된 사항이나 주요 대화 주제를 한 문장으로 압축)
2. **AI의 추천 논의 방향 및 제언** (회의가 겉돌거나 정체되지 않고 구체적인 Action Item을 낼 수 있도록 다음 회의 단계에서 꼭 짚고 넘어가야 할 실질적인 질문이나 조율 포인트를 2~3줄로 제안)

마크다운 코드 블록(\`\`\`) 없이 순수 마크다운으로만 리턴하십시오.`;

        const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: `현재까지 대화록:\n${dialogText}` }] }],
            generationConfig: { temperature: 0.4 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // 토큰 사용 로그 기록
          if (data.usageMetadata) {
            try {
              const u = data.usageMetadata;
              const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
              const tokenId = `TKC-MEET-INT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              await insertRows('ai_token_usage_logs', [{
                id: tokenId,
                model: 'gemini-3.5-flash',
                purpose: 'meeting-interim',
                prompt_tokens: u.promptTokenCount || 0,
                completion_tokens: u.candidatesTokenCount || 0,
                total_tokens: u.totalTokenCount || 0,
                created_at: nowStr,
                uuid: crypto.randomUUID(),
                updated_at: nowStr
              }]);
            } catch (tokenErr) {
              console.error('AI 토큰 로그 기록 실패(회의 중간요약):', tokenErr);
            }
          }

          analysisResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (geminiErr) {
        console.error('Gemini 실시간 중간 분석 실패, 폴백 사용:', geminiErr);
      }
    }

    // 폴백 어드바이스 제공
    if (!analysisResult) {
      analysisResult = `### 🤖 AI 실시간 중간 진단 (폴백 작동)
*   **현재 진행 사항**: 참석자 간의 활발한 의견 교환이 감지되었습니다.
*   **AI 퍼실리테이터 제언**: 
    - 합의를 도출하기 위해 각 대안의 **실행 일정과 예상 예산**에 대한 정량적 수치를 교환하시는 것을 추천드립니다.
    - 특히 각 역할에 대한 **담당자 명확화(R&R)**를 위해 "누가 담당할 것인가"에 대한 발화를 구체화해 보십시오.`;
    }

    return NextResponse.json({ success: true, analysis: analysisResult });
  } catch (error: any) {
    console.error('실시간 중간 요약 오류:', error);
    return NextResponse.json({ success: false, error: '중간 피드백 분석을 수행하지 못했습니다.' }, { status: 500 });
  }
}
