/**
 * 구글 Gemini AI API 호출 장애(503, 429) 극복용 자동 폴백 fetch 래퍼 함수
 * 주석 및 설명: 한국어 작성 원칙 준수
 */
import { callAiCaller, getGeminiApiKey } from '@/../egdesk-helpers';

/**
 * 텍스트 글자 수를 기반으로 토큰 수를 예측합니다. (폴백용 계산기)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const code = text.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      tokens += 1.5; // 한글 음절
    } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)) {
      tokens += 0.35; // 영문, 숫자
    } else {
      tokens += 0.2; // 공백, 기호 등
    }
  }
  return Math.ceil(tokens);
}

export async function fetchGeminiWithFallback(url: string, init?: RequestInit): Promise<Response> {
  // API 키가 'AIzaSy'로 시작하지 않으면 이지데스크 헬퍼를 통해 진짜 키로 복호화/교체
  let finalUrl = url;
  try {
    const urlObj = new URL(url);
    const apiKey = urlObj.searchParams.get('key');
    if (apiKey && !apiKey.startsWith('AIzaSy')) {
      const decryptedKeyRes = await getGeminiApiKey({ name: apiKey });
      if (decryptedKeyRes && decryptedKeyRes.success && decryptedKeyRes.apiKey) {
        urlObj.searchParams.set('key', decryptedKeyRes.apiKey);
        finalUrl = urlObj.toString();
      }
    }
  } catch (err) {
    console.error('⚠️ [fallback] EGDesk에서 API 키 복호화에 실패했습니다:', err);
  }

  let prompt = '';
  let systemPrompt: string | undefined = undefined;
  let responseMimeType: 'application/json' | 'text/plain' | undefined = undefined;
  let temperature: number | undefined = undefined;
  let imageInput: string | undefined = undefined;

  // 1. 전달받은 RequestInit body 파라미터 구조 분석 및 추출
  if (init && init.body && typeof init.body === 'string') {
    try {
      const bodyObj = JSON.parse(init.body);
      const parts = bodyObj.contents?.[0]?.parts || [];
      
      // 텍스트 프롬프트 추출
      const textPart = parts.find((p: any) => 'text' in p);
      prompt = textPart ? textPart.text : '';

      // 멀티모달 base64 이미지 추출
      const imagePart = parts.find((p: any) => 'inlineData' in p);
      if (imagePart && imagePart.inlineData?.data) {
        imageInput = imagePart.inlineData.data; // Raw Base64 data
      }

      // 시스템 지침(systemInstruction) 추출
      if (bodyObj.systemInstruction?.parts?.[0]?.text) {
        systemPrompt = bodyObj.systemInstruction.parts[0].text;
      }

      // JSON 출력 강제 사양 및 온도 추출
      if (bodyObj.generationConfig?.responseMimeType) {
        responseMimeType = bodyObj.generationConfig.responseMimeType;
      }
      if (bodyObj.generationConfig?.temperature != null) {
        temperature = bodyObj.generationConfig.temperature;
      }
    } catch (e) {
      console.warn('[AI Warning] Request body parsing failed in fallback wrapper:', e);
    }
  }

  // A. 이미지/PDF OCR 분석(멀티모달)인 경우 -> 기존 구형 백오프 재시도 및 하위 폴백 모델 로직 구동 (100% 동작 복원)
  if (imageInput) {
    const maxRetries = 3;

    async function fetchWithRetry(targetUrl: string, modelLabel: string): Promise<Response> {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          const res = await fetch(targetUrl, init);
          if (res.ok) return res;

          if (res.status === 503 || res.status === 429 || res.status === 500) {
            attempt++;
            if (attempt < maxRetries) {
              const delay = attempt * 500;
              console.warn(`[AI Warning] ${modelLabel} 실패 (Status: ${res.status}). ${delay}ms 후 재시도...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText || 'Unknown Error'}`);
        } catch (err: any) {
          if (err.message && err.message.startsWith('HTTP ')) throw err;
          attempt++;
          if (attempt < maxRetries) {
            const delay = attempt * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }
      throw new Error(`${modelLabel} API call failed`);
    }

    try {
      return await fetchWithRetry(finalUrl, '기본 모델');
    } catch (err: any) {
      console.error(`[AI Emergency] 기본 모델 에러: ${err.message}. 1차 폴백 진입.`);
    }

    // 가장 트래픽 수용력이 넓고 안정적인 상용 gemini-1.5-flash 모델을 최우선 폴백으로 매핑
    const fallbackModel1 = 'gemini-1.5-flash';
    const fallbackUrl1 = finalUrl.replace(/\/models\/[^:]+:/, `/models/${fallbackModel1}:`);
    try {
      return await fetchWithRetry(fallbackUrl1, '1차 폴백 모델 (gemini-1.5-flash)');
    } catch (err: any) {
      console.error(`[AI Emergency] 1차 폴백 실패: ${err.message}. 2차 폴백 진입.`);
    }

    const fallbackModel2 = 'gemini-2.5-flash';
    const fallbackUrl2 = finalUrl.replace(/\/models\/[^:]+:/, `/models/${fallbackModel2}:`);
    try {
      return await fetchWithRetry(fallbackUrl2, '2차 폴백 모델 (gemini-2.5-flash)');
    } catch (err: any) {
      throw err;
    }
  }

  // B. 텍스트 분석인 경우 -> 공통 callAiCaller 호출 기동
  const modelMatch = finalUrl.match(/\/models\/([^?:]+)/);
  const modelName = modelMatch ? modelMatch[1] : 'gemini-1.5-flash';

  const callerRes = await callAiCaller(prompt, {
    systemPrompt,
    model: modelName,
    temperature: temperature ?? 0.7,
    caller: 'egdesk-fallback-wrapper',
    keyName: 'wonconduct'
  } as any);

  let text = '';
  if (callerRes && typeof callerRes === 'object') {
    if ('text' in callerRes) {
      text = String(callerRes.text);
    } else {
      text = JSON.stringify(callerRes);
    }
  } else if (typeof callerRes === 'string') {
    text = callerRes;
  }
  const usage = callerRes?.usage || {};
  const promptTokens = usage.promptTokens || callerRes?.promptTokens || estimateTokens(prompt + (systemPrompt || ''));
  const completionTokens = usage.completionTokens || callerRes?.completionTokens || estimateTokens(text);
  const totalTokens = promptTokens + completionTokens;

  const mockGeminiData = {
    candidates: [
      {
        content: {
          parts: [
            { text }
          ]
        }
      }
    ],
    usageMetadata: {
      promptTokenCount: promptTokens,
      candidatesTokenCount: completionTokens,
      totalTokenCount: totalTokens
    }
  };

  return new Response(JSON.stringify(mockGeminiData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 불완전하거나 도중에 끊긴 JSON 문자열을 분석하여 강제로 유효한 JSON 포맷으로 수리합니다.
 */
export function repairJson(jsonStr: string): string {
  let trimmed = jsonStr.trim();
  if (!trimmed) return '{}';

  // 1. 만약 문자열이 마크다운 래퍼(```json)로 감싸져 있으면 제거
  trimmed = trimmed.replace(/^```json/i, '').replace(/```$/, '').trim();

  let inString = false;
  let escapeActive = false;
  const stack: ('{' | '[')[] = [];
  let cleanChars: string[] = [];

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (inString) {
      if (escapeActive) {
        escapeActive = false;
        cleanChars.push(char);
      } else if (char === '\\') {
        escapeActive = true;
        cleanChars.push(char);
      } else if (char === '"') {
        inString = false;
        cleanChars.push(char);
      } else {
        cleanChars.push(char);
      }
    } else {
      if (char === '"') {
        inString = true;
        cleanChars.push(char);
      } else if (char === '{') {
        stack.push('{');
        cleanChars.push(char);
      } else if (char === '[') {
        stack.push('[');
        cleanChars.push(char);
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') {
          stack.pop();
        }
        cleanChars.push(char);
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') {
          stack.pop();
        }
        cleanChars.push(char);
      } else {
        cleanChars.push(char);
      }
    }
  }

  let repaired = cleanChars.join('').trim();

  // 2. 만약 따옴표 문자열 한가운데서 끊긴 채 루프가 끝났다면, 강제로 닫는 따옴표와 값을 임시 마감 처리합니다.
  if (inString) {
    repaired += '"';
    inString = false;
  }

  // 3. 콜론(:) 뒤에 값이 없이 툭 끊겨 끝난 경우 처리 (예: "key": )
  if (repaired.endsWith(':')) {
    repaired += 'null';
  } else if (repaired.endsWith(',')) {
    // 쉼표로 끝난 경우 쉼표 제거
    repaired = repaired.slice(0, -1);
  }

  // 4. 스택에 남아있는 열린 중괄호/대괄호를 역순으로 닫아줍니다.
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') {
      repaired += '}';
    } else if (last === '[') {
      repaired += ']';
    }
  }

  // 최후 검사: 완전 깨져서 JSON 시작( { 또는 [ ) 조차 없으면 빈 객체화
  if (!repaired.startsWith('{') && !repaired.startsWith('[')) {
    repaired = '{' + repaired + '}';
  }

  return repaired;
}

