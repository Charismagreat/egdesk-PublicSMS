export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, executeSQL } from '@/../egdesk-helpers';
import crypto from 'crypto';

/**
 * POST: 현재 진행 중인 회의 대화 문맥에 맞는 과거 회의록 시맨틱 추천
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentText } = body;

    if (!currentText || !currentText.trim()) {
      return NextResponse.json({ success: true, recommendations: [] });
    }

    // 1. 과거의 완료된 회의록 가져오기 (소프트 삭제 필터 적용)
    const meetingsRes = await queryTable('crm_meetings', {
      filters: { status: 'COMPLETED', deleted_at: null },
      orderBy: 'date',
      orderDirection: 'DESC'
    });

    const pastMeetings = meetingsRes.rows || [];

    if (pastMeetings.length === 0) {
      return NextResponse.json({ success: true, recommendations: [] });
    }

    // 2. system_settings에서 구글 AI API 키 조회
    let apiKey = null;
    try {
      const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      if (settingsRes.rows && settingsRes.rows.length > 0) {
        apiKey = settingsRes.rows[0].value;
      }
    } catch (dbErr) {
      console.warn('⚠️ system_settings 조회 실패:', dbErr);
    }

    let recommendations = [];

    if (apiKey) {
      try {
        const systemPrompt = `당신은 지능형 문서 추천 및 시맨틱 비교 엔진입니다.
현재 진행 중인 회의의 마지막 발화 문맥(현재 대화 내용)과 과거에 완료된 회의 목록들을 정밀 분석하여, 내용적 유사성이 깊거나 연계해서 참고하면 큰 도움이 될 만한 과거 회의록을 최대 3건 선정해 주세요.
각 선정 건에 대해 추천 매칭도(0~100 사이의 정수 %)와 왜 참고해야 하는지에 대한 정밀한 한글 매칭 이유(1문장)를 작성해 주십시오.

반드시 다음 JSON 스키마를 엄격히 준수하여 응답해야 하며, 마크다운 기호 등은 포함하지 마십시오:
{
  "recommendations": [
    {
      "id": 123, // 과거 회의의 고유 ID (숫자)
      "title": "과거 회의 제목",
      "matchRate": 85, // 매칭도 (0~100 사이의 숫자)
      "reason": "마케팅 실행 기한 조율 과정에서 이전 광고 단가 협의 내용과 유사도가 높습니다."
    }
  ]
}`;

        // 과거 회의록 데이터 콤팩트하게 구성
        const pastMeetingsData = pastMeetings.map((m: any) => ({
          id: m.id,
          title: m.title,
          date: m.date,
          summary: m.summary ? m.summary.slice(0, 200) : '' // 컨텍스트 제한 고려
        }));

        const userPrompt = `현재 대화 문맥:\n"${currentText}"\n\n과거 완료된 회의 목록:\n${JSON.stringify(pastMeetingsData)}`;

        const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // 토큰 사용 로그 기록
          if (data.usageMetadata) {
            try {
              const u = data.usageMetadata;
              const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
              const tokenId = `TKC-MEET-REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              await insertRows('ai_token_usage_logs', [{
                id: tokenId,
                model: 'gemini-3.5-flash',
                purpose: 'meeting-recommend',
                prompt_tokens: u.promptTokenCount || 0,
                completion_tokens: u.candidatesTokenCount || 0,
                total_tokens: u.totalTokenCount || 0,
                created_at: nowStr,
                uuid: crypto.randomUUID(),
                updated_at: nowStr
              }]);
            } catch (tokenErr) {
              console.error('AI 토큰 로그 기록 실패(회의 추천):', tokenErr);
            }
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const resJson = JSON.parse(text);
          if (Array.isArray(resJson.recommendations)) {
            recommendations = resJson.recommendations;
          }
        }
      } catch (geminiErr) {
        console.error('Gemini 시맨틱 추천 실패, 폴백 사용:', geminiErr);
      }
    }

    // 폴백 모드: 단순 키워드 매칭 작동
    if (recommendations.length === 0) {
      // 현재 텍스트에서 명사 형태 키워드 단순 추출 (2글자 이상)
      const keywords = (currentText.match(/[가-힣a-zA-Z0-9]{2,}/g) || []).slice(0, 5);
      
      for (const meeting of pastMeetings) {
        if (recommendations.length >= 2) break; // 최대 2개 추천

        let hitCount = 0;
        const targetStr = ((meeting.title || '') + ' ' + (meeting.summary || '')).toLowerCase();
        
        for (const keyword of keywords) {
          if (targetStr.includes(keyword.toLowerCase())) {
            hitCount++;
          }
        }

        if (hitCount > 0) {
          recommendations.push({
            id: meeting.id,
            title: meeting.title,
            matchRate: Math.min(50 + hitCount * 15, 95),
            reason: `현재 대화의 키워드 [${keywords.slice(0, 2).join(', ')}] 관련 기존 회의 내용이 포함되어 있습니다.`
          });
        }
      }
    }

    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    console.error('실시간 회의 추천 오류:', error);
    return NextResponse.json({ success: false, error: '추천 데이터를 가져오지 못했습니다.' }, { status: 500 });
  }
}
