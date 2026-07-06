export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { queryTable } from '@/../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const { textUrl } = await req.json();

    if (!textUrl) {
      return NextResponse.json({ success: false, error: '텍스트 파일 경로가 필요합니다.' }, { status: 400 });
    }

    // 로컬 파일 경로 결정
    const relativePath = textUrl.startsWith('/') ? textUrl.slice(1) : textUrl;
    const filePath = path.join(process.cwd(), 'public', relativePath);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Text file not found at: ${filePath}`);
      return NextResponse.json({ success: false, error: '서버에 저장된 텍스트 파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 파일 로드 및 안전한 한글 디코딩 (UTF-8 / EUC-KR 복합 디코딩)
    const textBuffer = fs.readFileSync(filePath);
    let textContent = '';
    
    try {
      textContent = new TextDecoder('utf-8', { fatal: true }).decode(textBuffer);
    } catch (utfErr) {
      try {
        textContent = new TextDecoder('euc-kr').decode(textBuffer);
      } catch (eucErr) {
        textContent = textBuffer.toString('utf-8'); // 강제 파싱 롤백
      }
    }

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

    // Gemini 3.5 Flash API 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    const promptText = `당신은 카카오톡 대화방 백업 파일, 일반 대화 텍스트 파일, 또는 이메일(EML) 형식의 대화 텍스트 파일을 분석하는 전문 비서이자 분석가입니다.
제시된 한글 대화 텍스트를 읽고, 대화 흐름 상의 화자(발화 주체), 시간대, 그리고 실제 발화 텍스트 내용을 분리하여 정교한 JSON 대화록 배열로 파싱 및 변환해 주세요.
*   **speaker**: 대화한 사람의 이름 (예: "홍길동")
*   **time**: 해당 대화가 이루어진 대략적인 시간 (텍스트 내용 중 '오전 11:20', '14:30' 등이 존재하면 이를 매핑하고, 없을 경우 대화 흐름 상의 00:00 혹은 적절한 시간 형태로 가공 기입)
*   **text**: 불필요한 메타 정보(이모티콘, 공지 메시지, 사진 전송 알림 등)를 정제한 순수한 발화 내용

만약 입력 파일이 이메일(EML) 형식인 경우:
1. 이메일 헤더 정보(Subject, From, To, Date 등)와 MIME 구획 기호(Boundary 등), HTML 태그 및 인코딩 기호(Quoted-Printable 인코딩으로 인한 =3D 등)를 깨끗하게 걸러내고, 본문에 작성된 실제 대화록(카톡 대화 내용 등)만 추출하여 파싱해 주세요.
2. 메일 보낸 이와 받는 이 간의 이메일 본문 내용 자체가 대화인 경우, 보낸 사람(From)과 받는 사람(To)을 화자로 지정하고 대화 순서대로 파싱하십시오.
3. 입력 텍스트에 Quoted-Printable(예: '=3D', '=EC=9D=B4' 등) 또는 HTML 엔티티, MIME 인코딩 노이즈가 섞여 있는 경우, 원래의 한글 텍스트로 올바르게 해독하여 복원한 뒤 파싱해 주세요.

반드시 대화록 형식의 다음 JSON 배열 포맷을 엄격히 지켜 반환해야 합니다. 마크다운 기호(\`\`\`json) 등은 절대로 붙이지 말고, 오직 순수 JSON 데이터만 출력하십시오:
[
  {
    "speaker": "이름",
    "time": "HH:MM", 
    "text": "대화 내용"
  }
]`;

    console.log(`💬 Sending raw chat text (length: ${textContent.length}) to Gemini AI for transcript extraction...`);
    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: promptText }] },
        contents: [{ parts: [{ text: `대화 텍스트 본문:\n${textContent}` }] }],
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
    
    console.log('💬 Gemini Text Analysis Success! Received text length:', resultText.length);

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
    console.error('텍스트 대화록 분석 API 예외 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '텍스트 분석 처리 중 예외 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
