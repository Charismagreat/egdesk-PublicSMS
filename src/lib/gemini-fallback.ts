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
        const mime = imagePart.inlineData.mimeType || 'image/png';
        imageInput = `data:${mime};base64,${imagePart.inlineData.data}`; // Base64 표준 포맷 변환
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

  // 2. 모델명 파싱
  const modelMatch = url.match(/\/models\/([^?:]+)/);
  const initialModel = modelMatch ? modelMatch[1] : 'gemini-3.5-flash';

  // 3. 전사 AI Caller 단일 채널 호출 및 3단계 장애 극복 폴백 루프 가동
  const modelsLineup = [initialModel, 'gemini-1.5-flash', 'gemini-2.5-flash'];
  let callerRes: any = null;
  let callerErr: any = null;
  let finalModelUsed = initialModel;

  for (const targetModel of modelsLineup) {
    try {
      console.log(`[AI Fallback Wrapper] callAiCaller 호출 기동 (모델: ${targetModel}, 이미지존재: ${!!imageInput})`);
      
      callerRes = await callAiCaller(prompt, {
        systemPrompt,
        model: targetModel,
        temperature: temperature ?? 0.1,
        imageInput, // 이미지 존재 시 이지데스크 caller가 받아 처리하도록 넘김
        caller: 'egdesk-fallback-wrapper',
        keyName: 'wonconduct'
      } as any);

      // 503 에러 징후 정밀 추적 및 예외 처리
      const checkText = callerRes && typeof callerRes === 'object' 
        ? JSON.stringify(callerRes) 
        : String(callerRes || '');
      
      if (checkText.includes('503 Service Unavailable') || checkText.includes('high demand') || checkText.includes('503')) {
        throw new Error('Google Gemini 503 Service Unavailable detected in response body');
      }

      // 성공 시 설정 및 루프 탈출
      finalModelUsed = targetModel;
      callerErr = null;
      break;
    } catch (err: any) {
      callerErr = err;
      console.warn(`[AI Warning] callAiCaller 실패 (모델: ${targetModel}, 원인: ${err.message || err}). 다음 폴백 모델로 우회 시도...`);
      // 다음 모델 호출 전 짧은 딜레이
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 모든 폴백 라인업이 실패한 경우 최종 에러
  if (callerErr) {
    throw new Error(`[GoogleGenerativeAI Error]: callAiCaller 전사 폴백 실패. (최종 에러: ${callerErr.message || callerErr})`);
  }

  // 4. 원래 구글 API가 반환하던 JSON 구조와 호환되는 가짜 Gemini Response 객체 리턴
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

