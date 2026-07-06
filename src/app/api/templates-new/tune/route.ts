export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { fetchGeminiWithFallback } from '@/lib/gemini-fallback';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 획득 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 쿠키 헤더 문자열에서 특정 쿠키 값을 파싱하는 헬퍼 함수
function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 최고 관리자(SUPER_ADMIN) 권한 검증 및 사용자 정보 반환 헬퍼 (Fallback 적용)
async function verifySuperAdmin(req?: Request) {
  let token: string | undefined;

  // 1. Next.js 표준 cookies() 시도
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('auth_token')?.value;
  } catch (e) {
    console.error('[verifySuperAdmin] cookies() 읽기 실패:', e);
  }

  // 2. 실패 시 Request 헤더에서 직접 추출 시도 (Fallback)
  if (!token && req) {
    const cookieHeader = req.headers.get('cookie');
    token = getCookieValue(cookieHeader, 'auth_token') || undefined;
  }

  if (!token) return { isAuthorized: false, username: null };
  try {
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    return {
      isAuthorized: role === 'SUPER_ADMIN',
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: null };
  }
}

// HTML 본문 내의 Base64 이미지 데이터를 감지하여 플레이스홀더로 치환하는 헬퍼 함수
function extractBase64Images(htmlStr: string, prefix: string) {
  const placeholders: { [key: string]: string } = {};
  let counter = 0;
  // src="data:image/png;base64,..." 또는 src="data:image/jpeg;base64,..." 등 모든 Base64 이미지 패턴 매칭
  const cleanHtml = htmlStr.replace(/src="(data:image\/[^;]+;base64,[^"]+)"/g, (match, p1) => {
    const placeholder = `__${prefix}_SEAL_IMAGE_PLACEHOLDER_${counter}__`;
    placeholders[placeholder] = p1;
    counter++;
    return `src="${placeholder}"`;
  });
  return { cleanHtml, placeholders };
}

// 플레이스홀더 문자열을 다시 원래의 Base64 이미지 데이터로 복원하는 헬퍼 함수
function restoreBase64Images(htmlStr: string, placeholders: { [key: string]: string }) {
  let restored = htmlStr;
  for (const [placeholder, base64] of Object.entries(placeholders)) {
    restored = restored.replaceAll(placeholder, base64);
  }
  return restored;
}

/**
 * POST: 최고관리자가 입력한 자연어 수정 요구사항(feedback)과 기존 HTML 코드를 받아서 Gemini를 통해 수정된 최종 HTML 코드를 반환합니다.
 */
export async function POST(req: Request) {
  const { isAuthorized, username } = await verifySuperAdmin(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '최고관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { html, webHtml, feedback, target = 'all', captureImage } = body;

    if (!html || !feedback) {
      return NextResponse.json({ success: false, error: '기존 HTML 코드와 수정 요청 사항(feedback)은 필수입니다.' }, { status: 400 });
    }

    // 도장 이미지 등의 거대 Base64 데이터를 플레이스홀더로 치환하여 토큰 절약 및 Truncation 에러 방지
    const { cleanHtml: printClean, placeholders: printPlaceholders } = extractBase64Images(html, 'PRINT');
    const { cleanHtml: webClean, placeholders: webPlaceholders } = extractBase64Images(webHtml || '', 'WEB');

    // DB에서 API 키 및 모델 설정 가져오기
    let apiKey: string | null = null;
    let selectedModel = 'gemini-2.5-pro'; // 텍스트 수정 및 세밀한 코드 리팩토링에는 Pro 계열이 유리하므로 기본 Pro 모델로 설정
    try {
      const settingsKeyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      apiKey = settingsKeyRes.rows && settingsKeyRes.rows.length > 0 ? settingsKeyRes.rows[0].value : null;

      const settingsModelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      if (settingsModelRes.rows && settingsModelRes.rows.length > 0 && settingsModelRes.rows[0].value) {
        selectedModel = settingsModelRes.rows[0].value;
      }
    } catch (dbErr) {
      console.error('API 설정 로드 오류:', dbErr);
    }

    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Google Gemini API Key가 설정되지 않았습니다. 시스템 설정을 확인하십시오.' }, { status: 500 });
    }

    const systemPrompt = `
You are an expert web designer and frontend engineer.
Your task is to take the provided HTML codes (printHtml and/or webHtml) and apply modifications based on the user's natural language feedback.

If an image is provided in the inputs, it represents the visual preview of the current templates.
A red bounding box (if present in the image) indicates the specific region the user is referring to in their natural language feedback.
Analyze the highlighted region in the image, map it to the corresponding elements in printHtml or webHtml, and apply the requested changes there.

The user can choose to update:
- "printHtml": A classic, print-friendly A4 portrait HTML layout (210mm x 297mm).
- "webHtml": A modern, responsive, and visually stunning web page representation of the same form.

Strict Constraints:
- Output MUST be a single valid JSON object. Do not wrap the JSON in markdown code blocks like \`\`\`json.
- The JSON object must have exactly two keys:
  - "printHtml" (string): The modified (or original) print-friendly HTML.
  - "webHtml" (string): The modified (or original) web page HTML.
- If target is "print", apply feedback ONLY to printHtml, and return webHtml exactly as provided.
- If target is "web", apply feedback ONLY to webHtml, and return printHtml exactly as provided.
- If target is "all", apply feedback to both printHtml and webHtml.
- Ensure you PRESERVE all existing Mustache placeholders (like {{staff_name}}, {{joined_date}}, etc.) unless explicitly asked to modify them.
- DO NOT generate or inject any system headers, navigation bars, footer bars, or operation buttons (such as "인쇄하기", "PDF 다운로드", "Print", "Download", "Save").
- Ensure "webHtml" strictly contains ONLY the card body/form area of the document itself, without external system controls.
`;

    const userContent = JSON.stringify({
      target: target,
      feedback: feedback,
      printHtml: printClean,
      webHtml: webClean
    });

    const requestParts: any[] = [
      { text: systemPrompt },
      { text: userContent }
    ];

    if (captureImage) {
      const base64Data = captureImage.replace(/^data:image\/[^;]+;base64,/, '');
      
      // 디버깅 목적으로 수신된 캡처 이미지를 로컬 scratch 디렉토리에 저장
      try {
        const fs = require('fs');
        const path = require('path');
        const buffer = Buffer.from(base64Data, 'base64');
        const debugPath = path.join('C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\555d2cd8-9725-418b-9a0d-f53bbdbd87d1\\scratch', `debug_capture_${Date.now()}.jpg`);
        fs.writeFileSync(debugPath, buffer);
        console.log(`[Capture Debug] Saved capture to ${debugPath}`);
      } catch (saveErr) {
        console.error('[Capture Debug] Failed to save debug image:', saveErr);
      }

      requestParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    }

    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: requestParts
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error(`Gemini API 호출 실패: ${response.status} - ${errMsg}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 파싱 시도
    let updatedPrintHtml = '';
    let updatedWebHtml = '';

    try {
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```')) {
        const lines = cleanedText.split('\n');
        if (lines[0].startsWith('```')) lines.shift();
        if (lines[lines.length - 1].startsWith('```')) lines.pop();
        cleanedText = lines.join('\n').trim();
      }
      const parsedJson = JSON.parse(cleanedText);
      
      // 원본 Base64 이미지 데이터 복원 (역치환)
      updatedPrintHtml = restoreBase64Images(parsedJson.printHtml || '', printPlaceholders);
      updatedWebHtml = restoreBase64Images(parsedJson.webHtml || '', webPlaceholders);
    } catch (parseErr) {
      console.error('Gemini JSON 파싱 오류. Raw text:', text, parseErr);
      throw new Error('AI의 JSON 응답을 파싱하는 데 실패했습니다. 다시 시도해 주세요.');
    }

    // HTML 내의 모든 {{placeholder}} 감지 및 추출 (정합성 확인 목적)
    const detectedFields: string[] = [];
    const fieldRegex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = fieldRegex.exec(updatedPrintHtml)) !== null) {
      const fieldKey = match[1].trim();
      if (fieldKey && !detectedFields.includes(fieldKey)) {
        detectedFields.push(fieldKey);
      }
    }

    // AI 토큰 사용 로그 기록
    if (data.usageMetadata) {
      try {
        const u = data.usageMetadata;
        const nowStr = getKoreanTimestamp();
        await insertRows('ai_token_usage_logs', [{
          id: `TKN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          model: selectedModel,
          purpose: `template-natural-language-tuning-${target}`,
          prompt_tokens: u.promptTokenCount || 0,
          completion_tokens: u.candidatesTokenCount || 0,
          total_tokens: u.totalTokenCount || 0,
          user_name: username || 'admin',
          menu_path: '/form-management-new/tune',
          created_at: nowStr
        }]);
      } catch (logErr) {
        console.error('AI 토큰 사용량 기록 오류:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      html: updatedPrintHtml,
      webHtml: updatedWebHtml,
      detectedFields: detectedFields
    });

  } catch (error: any) {
    console.error('POST /api/templates-new/tune error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
