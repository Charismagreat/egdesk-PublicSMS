export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
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

/**
 * POST: 최고관리자가 이미지나 PDF 양식 파일을 업로드하면, Gemini Flash가 이를 분석하여 Mustache 플레이스홀더를 동반한 A4 HTML 코드로 변환해줍니다.
 */
export async function POST(req: Request) {
  const { isAuthorized, username } = await verifySuperAdmin(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '최고관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { imageBase64, filename, mimeType = 'image/jpeg' } = body;

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: '분석할 양식 파일 데이터(Base64)가 누락되었습니다.' }, { status: 400 });
    }

    // DB에서 API 키 및 모델 설정 가져오기
    let apiKey: string | null = null;
    let selectedModel = 'gemini-2.5-flash';
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

    // Base64 프리픽스 제거
    const cleanedBase64 = imageBase64.replace(/^data:(image\/(png|jpeg|jpg|webp|heic|heif)|application\/pdf);base64,/, "");

    // 템플릿 기본 예시/가이드라인이 포함된 프롬프트 작성
    const systemPrompt = `
You are a top-tier frontend developer and AI document transformation expert.
Your job is to look at the provided document (an image or a PDF page of a form/certificate) and recreate it into TWO different, complete versions:
1. "printHtml": A classic, print-friendly A4 portrait HTML layout (210mm x 297mm) with proper print-friendly margins (e.g., 15mm-20mm padding), light borders, clean structures, and neutral fonts. This will be used for actual physical printing.
2. "webHtml": A modern, responsive, and visually stunning web page representation of the same form. Use clean card structures, soft drop-shadows, rounded borders, modern sans-serif typography (e.g., Outfit, Inter), subtle background color, and responsive grid layouts. It must look like a premium digital intranet/ERP application form, not a paper draft.

Strict Constraints:
- Output MUST be a single valid JSON object. Do not wrap the JSON in markdown code blocks like \`\`\`json.
- The JSON object must have exactly three keys:
  - "printHtml" (string): The raw HTML code for the print-friendly A4 version.
  - "webHtml" (string): The raw HTML code for the modern web page version.
  - "detectedFields" (array of strings): The list of Mustache placeholders detected in both documents (e.g., "staff_name", "joined_date").
- In both HTML codes, embed all CSS styles inside a <style> block within the <head>.
- Detect document context (e.g., Certificate of Employment/재직증명서, Purchase Invoice/거래명세서) and insert appropriate Mustache placeholders like {{staff_name}}, {{joined_date}}, {{usage}}, etc.
- DO NOT generate any system headers, navigation bars, footer bars, or operation buttons (such as "인쇄하기", "PDF 다운로드", "Print", "Download", "Save").
- The "webHtml" should strictly contain ONLY the card body/form area of the document itself, without external system chrome/controls.
`;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Google Gemini API Key가 설정되지 않았습니다. 시스템 설정을 확인하십시오.' }, { status: 500 });
    }

    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanedBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
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
    let printHtml = '';
    let webHtml = '';
    let detectedFields: string[] = [];

    try {
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```')) {
        const lines = cleanedText.split('\n');
        if (lines[0].startsWith('```')) lines.shift();
        if (lines[lines.length - 1].startsWith('```')) lines.pop();
        cleanedText = lines.join('\n').trim();
      }
      const parsedJson = JSON.parse(cleanedText);
      printHtml = parsedJson.printHtml || '';
      webHtml = parsedJson.webHtml || '';
      detectedFields = parsedJson.detectedFields || [];
    } catch (parseErr) {
      console.error('Gemini JSON 파싱 오류. Raw text:', text, parseErr);
      
      // Fallback 파싱 시도 (단순 텍스트 추출 가드)
      if (text.includes('printHtml')) {
        const printMatch = text.match(/"printHtml"\s*:\s*"([\s\S]*?)"\s*,\s*"webHtml"/);
        const webMatch = text.match(/"webHtml"\s*:\s*"([\s\S]*?)"\s*,\s*"detectedFields"/);
        if (printMatch && webMatch) {
          printHtml = printMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          webHtml = webMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
      
      if (!printHtml) {
        throw new Error('AI의 JSON 응답을 파싱하는 데 실패했습니다. 다시 시도해 주세요.');
      }
    }

    // 혹시 detectedFields가 비어있다면 정규식 폴백 기동
    if (detectedFields.length === 0) {
      const fieldRegex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = fieldRegex.exec(printHtml)) !== null) {
        const fieldKey = match[1].trim();
        if (fieldKey && !detectedFields.includes(fieldKey)) {
          detectedFields.push(fieldKey);
        }
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
          purpose: 'new-template-ocr-generation',
          prompt_tokens: u.promptTokenCount || 0,
          completion_tokens: u.candidatesTokenCount || 0,
          total_tokens: u.totalTokenCount || 0,
          user_name: username || 'admin',
          menu_path: '/form-management-new/upload',
          created_at: nowStr
        }]);
      } catch (logErr) {
        console.error('AI 토큰 사용량 기록 오류:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      html: printHtml,
      webHtml: webHtml,
      detectedFields: detectedFields
    });

  } catch (error: any) {
    console.error('POST /api/templates-new/upload error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
