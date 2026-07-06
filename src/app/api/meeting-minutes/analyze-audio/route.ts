export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { queryTable } from '@/../egdesk-helpers';

// 파일 확장자에 따른 마임타입 매핑
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp3':
      return 'audio/mp3';
    case '.wav':
      return 'audio/wav';
    case '.m4a':
      return 'audio/m4a';
    case '.webm':
      return 'audio/webm';
    case '.ogg':
      return 'audio/ogg';
    default:
      return 'audio/webm';
  }
}

export async function POST(req: Request) {
  try {
    const { audioUrl } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ success: false, error: '오디오 파일 경로가 필요합니다.' }, { status: 400 });
    }

    // 로컬 파일 경로 결정
    // audioUrl 예: /uploads/meetings/filename.webm
    const relativePath = audioUrl.startsWith('/') ? audioUrl.slice(1) : audioUrl;
    const filePath = path.join(process.cwd(), 'public', relativePath);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Audio file not found at: ${filePath}`);
      return NextResponse.json({ success: false, error: '서버에 저장된 오디오 파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 파일 로드 및 Base64 인코딩
    const audioBuffer = fs.readFileSync(filePath);
    const base64Data = audioBuffer.toString('base64');
    const mimeType = getMimeType(filePath);

    // Google AI API 키 획득
    let apiKey = null;
    try {
      const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      if (settingsRes.rows && settingsRes.rows.length > 0) {
        apiKey = settingsRes.rows[0].value;
      }
    } catch (dbErr) {
      console.warn('⚠️ system_settings 조회 실패 (API 키 획득 불가능):', dbErr);
    }

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '시스템에 구글 AI API 키(google_ai_api_key)가 설정되지 않았습니다. [시스템 설정]에서 API 키를 먼저 등록해 주세요.' 
      }, { status: 400 });
    }

    // Gemini 3.5 Flash API 호출 (멀티모달 오디오 처리)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    const promptText = `당신은 전문 회의 기록가이자 오디오 분석가입니다.
제시된 오디오 파일을 주의 깊게 청취하고, 대화하는 주체별(화자 1, 화자 2, 화자 3...)로 발화 내용을 분리하여 텍스트로 변환(STT)해 주세요.
반드시 대화록 형식의 다음 JSON 배열 포맷을 엄격히 지켜 반환해야 합니다. 마크다운 기호(\`\`\`json) 등은 절대로 붙이지 말고, 오직 순수 JSON 데이터만 출력하십시오:
[
  {
    "speaker": "화자 1",
    "time": "00:15", 
    "text": "실제 발화 텍스트 내용"
  }
]`;

    console.log(`🎙️ Sending audio (${mimeType}) to Gemini AI for transcript extraction...`);
    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error Response:', errText);
      throw new Error(`Gemini API HTTP Error! Status: ${response.status}`);
    }

    const resData = await response.json();
    const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    console.log('🎙️ Gemini Audio Analysis Success! Received text length:', resultText.length);

    let transcript = [];
    try {
      transcript = JSON.parse(resultText.trim());
    } catch (parseErr) {
      console.error('Failed to parse Gemini output to JSON:', resultText);
      // 포맷팅 롤백 처리 시도
      const cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      transcript = JSON.parse(cleanText);
    }

    return NextResponse.json({
      success: true,
      transcript
    });

  } catch (error: any) {
    console.error('오디오 분석 API 예외 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '오디오 분석 처리 중 예외 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
