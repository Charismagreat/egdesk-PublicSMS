export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { queryTable } from '@/../egdesk-helpers';

// 이미지 파일 확장자에 따른 마임타입 매핑
function getImageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/png';
  }
}

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: '이미지 파일 경로가 필요합니다.' }, { status: 400 });
    }

    // 로컬 파일 경로 결정
    const relativePath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    const filePath = path.join(process.cwd(), 'public', relativePath);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Image file not found at: ${filePath}`);
      return NextResponse.json({ success: false, error: '서버에 저장된 이미지 파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 파일 로드 및 Base64 인코딩
    const imageBuffer = fs.readFileSync(filePath);
    const base64Data = imageBuffer.toString('base64');
    const mimeType = getImageMimeType(filePath);

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

    // Gemini 3.5 Flash API 호출 (멀티모달 이미지 처리)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    const promptText = `당신은 카카오톡 대화방 캡처 이미지 또는 일반 대화방 스크린샷 이미지를 정밀 분석하는 전문 비서이자 분석가입니다.
제시된 이미지 속의 한글 말풍선이나 대화 텍스트들을 꼼꼼하게 판독(OCR 및 맥락 분석)하여, 대화 흐름 상의 화자(발화 주체), 시간대, 그리고 실제 발화 텍스트 내용을 분리하여 정교한 JSON 대화록 배열로 파싱 및 변환해 주세요.
*   **speaker**: 대화한 사람의 이름 (말풍선 옆의 이름이나 프로필 옆의 텍스트. 이름이 안 보이면 "화자1", "화자2" 등으로 대조 판별하여 구분 기입)
*   **time**: 해당 대화 말풍선 옆에 표기된 시간 (예: '오전 11:20', '14:30' 등이 존재하면 이를 매핑하고, 없을 경우 대화 흐름 상의 00:00 혹은 적절한 시간 형태로 가공 기입)
*   **text**: 이모티콘이나 사진 전송 표시 등은 텍스트(예: "(이모티콘)" 등)로 간략히 기재하거나 순수 본문만 추출

반드시 대화록 형식의 다음 JSON 배열 포맷을 엄격히 지켜 반환해야 합니다. 마크다운 기호(\`\`\`json) 등은 절대로 붙이지 말고, 오직 순수 JSON 데이터만 출력하십시오:
[
  {
    "speaker": "이름",
    "time": "HH:MM", 
    "text": "대화 내용"
  }
]`;

    console.log(`🖼️ Sending image (${mimeType}) to Gemini AI for transcript extraction...`);
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
    
    console.log('🖼️ Gemini Image Analysis Success! Received text length:', resultText.length);

    let transcript = [];
    try {
      transcript = JSON.parse(resultText.trim());
    } catch (parseErr) {
      console.error('Failed to parse Gemini output to JSON:', resultText);
      const cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      transcript = JSON.parse(cleanText);
    }

    return NextResponse.json({
      success: true,
      transcript
    });

  } catch (error: any) {
    console.error('이미지 대화록 분석 API 예외 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '이미지 분석 처리 중 예외 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
