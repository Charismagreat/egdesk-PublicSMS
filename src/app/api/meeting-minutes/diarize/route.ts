export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/../egdesk-helpers';
import crypto from 'crypto';

/**
 * POST: 방금 인식된 텍스트와 회의 문맥을 기반으로 화자를 자동으로 판별하는 AI API
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, attendees, context } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: '인식된 텍스트가 필요합니다.' }, { status: 400 });
    }

    const attendeesList = Array.isArray(attendees) && attendees.length > 0 
      ? attendees 
      : ["나 (회의 참여자)", "홍길동 대표", "김철수 과장", "이영희 대리"];

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

    let detectedSpeaker = attendeesList[0]; // 기본값: 첫 번째 참석자

    if (apiKey) {
      try {
        let contextText = '이전 대화 없음';
        if (Array.isArray(context) && context.length > 0) {
          contextText = context.map((c: any) => `${c.speaker || '알 수 없음'}: ${c.text}`).join('\n');
        }

        const systemPrompt = `당신은 한국어 회의 대화록의 발화자(화자)를 판별하는 정교한 AI 엔진입니다.
제시된 '방금 말한 문장(targetText)'과 '이전 대화 맥락(context)', 그리고 '회의 참석자 명단(attendees)'을 분석하여, 이 문장을 말했을 가능성이 가장 높은 참석자의 이름을 **단어 하나(참석자 이름)**로만 답변하십시오.

[주의 사항]
1. 반드시 제공된 '회의 참석자 명단'에 존재하는 이름 중 하나만 정확하게 출력해야 합니다. 임의로 이름을 지어내지 마십시오.
2. 마크다운 기호, 마크다운 코드 블록(\`\`\`), 설명, 공백, 따옴표 등을 일체 붙이지 말고 오직 이름 글자만 반환하십시오. (예: "홍길동 대표"가 맞다면 다른 말 없이 "홍길동 대표"만 리턴)
3. 만약 명단 내에서 도저히 판별하기 어렵거나 확실하지 않다면, 명단 중 가장 적절해 보이는 사람을 고르거나 기본적으로 대화의 흐름상 매끄러운 화자를 선택하십시오.`;

        const userText = `[회의 참석자 명단]
${attendeesList.join(', ')}

[이전 대화 맥락]
${contextText}

[방금 말한 문장]
${text}`;

        const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userText }] }],
            generationConfig: { temperature: 0.2 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // 토큰 사용 로그 기록
          if (data.usageMetadata) {
            try {
              const u = data.usageMetadata;
              const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
              const tokenId = `TKC-MEET-DIA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              await insertRows('ai_token_usage_logs', [{
                id: tokenId,
                model: 'gemini-3.5-flash',
                purpose: 'meeting-diarize',
                prompt_tokens: u.promptTokenCount || 0,
                completion_tokens: u.candidatesTokenCount || 0,
                total_tokens: u.totalTokenCount || 0,
                created_at: nowStr,
                uuid: crypto.randomUUID(),
                updated_at: nowStr
              }]);
            } catch (tokenErr) {
              console.error('AI 토큰 로그 기록 실패(회의 화자분할):', tokenErr);
            }
          }

          const responseText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
          // 정합성 체크: 후보 명단에 있는 이름인지 확인
          const cleanText = responseText.replace(/['"`]/g, '').trim();
          const matched = attendeesList.find(a => cleanText.includes(a) || a.includes(cleanText));
          if (matched) {
            detectedSpeaker = matched;
          } else {
            // 매칭되는 이름이 명확하지 않을 시 수동 판정 로직
            for (const att of attendeesList) {
              if (cleanText.toLowerCase().includes(att.toLowerCase())) {
                detectedSpeaker = att;
                break;
              }
            }
          }
        }
      } catch (geminiErr) {
        console.error('Gemini 실시간 화자 판별 실패, 기본값 사용:', geminiErr);
      }
    }

    return NextResponse.json({ success: true, speaker: detectedSpeaker });
  } catch (error: any) {
    console.error('실시간 화자 분할 오류:', error);
    return NextResponse.json({ success: false, error: '화자 분할을 수행하지 못했습니다.' }, { status: 500 });
  }
}
