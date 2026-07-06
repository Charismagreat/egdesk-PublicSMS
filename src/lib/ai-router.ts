import { queryTable, insertRows, callAiCaller, getGeminiApiKey } from '../../egdesk-helpers';
import { getAppSetting } from './app-settings';

export interface CallAIOptions {
  prompt: string;
  systemPrompt?: string;
  purpose: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
  imageInput?: string; // Base64 이미지 데이터 (선택 사항)
  tenantId?: string | null; // 테넌트 격리용 식별자
}

export interface AIResponse {
  success: boolean;
  text: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 프롬프트 내에 민감 정보(개인정보 PII)가 포함되어 있는지 검사합니다.
 */
function detectPII(text: string): boolean {
  const juminRegex = /\d{6}-[1-4]\d{6}/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /01[016789]-?\d{3,4}-?\d{4}/;
  const accountRegex = /\b\d{3,6}-\d{2,6}-\d{3,6}\b/;

  return (
    juminRegex.test(text) ||
    emailRegex.test(text) ||
    phoneRegex.test(text) ||
    accountRegex.test(text)
  );
}

/**
 * 목적(purpose)에 따라 고난도 작업인지 판단하여 Gemini 강제 여부를 결정합니다.
 */
function isHighComplexityPurpose(purpose: string): boolean {
  const highComplexityPurposes = [
    'LAWYER_AI_ANALYZE',       // 법률 계약 검토
    'EXPENSE_OCR',             // 지출 영수증 OCR 분석
    'FINANCIAL_STATEMENT_OCR', // 재무제표 OCR 정밀 분석
    'AI_MARKETING_STRATEGY',   // 마케팅 전략 수립
    'SAFETY_ACCIDENT_CHAT',     // 안전 관리 전문 사고 상담
    'EASYBOT_SETUP'            // 이지봇 규칙 설정
  ];
  return highComplexityPurposes.includes(purpose);
}

/**
 * 텍스트 글자 수를 기반으로 토큰 수를 예측합니다. (폴백용 계산기)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  for (let i = 0; i < text.length; i++) {
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

async function callGemini(
  prompt: string,
  systemPrompt: string | undefined,
  apiKey: string,
  modelName: string,
  responseMimeType: 'application/json' | 'text/plain' | undefined,
  temperature: number | undefined,
  imageInput: string | undefined
): Promise<{ text: string; promptTokens: number; completionTokens: number; totalTokens: number }> {
  // A. 이미지/PDF 분석(OCR) 멀티모달인 경우 -> 자체 백오프 재시도 및 폴백 탑재 직접 호출
  if (imageInput) {
    const parts: any[] = [{ text: prompt }];
    const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/png';
    const data = match ? match[2] : imageInput;
    parts.push({
      inlineData: {
        mimeType,
        data
      }
    });

    const maxRetries = 3;

    async function fetchWithRetry(modelLabel: string, currentModel: string): Promise<Response> {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
              contents: [{ parts }],
              generationConfig: {
                responseMimeType: responseMimeType || 'text/plain',
                temperature: temperature ?? 0.7
              }
            })
          });

          if (res.ok) return res;

          if (res.status === 503 || res.status === 429 || res.status === 500) {
            attempt++;
            if (attempt < maxRetries) {
              const delay = attempt * 1000;
              console.warn(`[AI Warning] ${modelLabel} (${currentModel}) 실패 (Status: ${res.status}). ${delay}ms 후 재시도...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          let errorDetail = '';
          try {
            errorDetail = await res.text();
          } catch (_) {}
          throw new Error(`HTTP ${res.status}: ${res.statusText || 'Unknown Error'} - ${errorDetail}`);
        } catch (err: any) {
          if (err.message && err.message.startsWith('HTTP ')) throw err;
          attempt++;
          if (attempt < maxRetries) {
            const delay = attempt * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }
      throw new Error(`${modelLabel} API call failed`);
    }

    let response: Response;
    try {
      response = await fetchWithRetry('기본 모델', modelName);
    } catch (err: any) {
      console.error(`[AI Emergency] 기본 모델 (${modelName}) 에러: ${err.message}. 1차 폴백 진입.`);
      const fallbackModel1 = 'gemini-2.5-flash';
      try {
        response = await fetchWithRetry('1차 폴백 모델', fallbackModel1);
      } catch (err2: any) {
        console.error(`[AI Emergency] 1차 폴백 (${fallbackModel1}) 실패: ${err2.message}. 2차 폴백 진입.`);
        const fallbackModel2 = 'gemini-flash-latest';
        try {
          response = await fetchWithRetry('2차 폴백 모델', fallbackModel2);
        } catch (err3: any) {
          throw new Error(`모든 Gemini 모델 OCR 호출 실패: ${err3.message}`);
        }
      }
    }

    const resData = await response.json();
    const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const promptTokens = resData.usageMetadata?.promptTokenCount || (estimateTokens(prompt + (systemPrompt || '')) + 258);
    const completionTokens = resData.usageMetadata?.candidatesTokenCount || estimateTokens(text);
    const totalTokens = resData.usageMetadata?.totalTokenCount || (promptTokens + completionTokens);

    return { text, promptTokens, completionTokens, totalTokens };
  }

  // B. 일반 텍스트 분석인 경우 -> 이지데스크 공통 callAiCaller 호출 실행!
  const callerRes = await callAiCaller(prompt, {
    systemPrompt,
    model: modelName,
    temperature: temperature ?? 0.7,
    caller: 'egdesk-ai-router',
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

  return { text, promptTokens, completionTokens, totalTokens };
}

/**
 * 로컬 LLM (Ollama) API를 호출합니다 (멀티모달 대응).
 */
async function callLocalLLM(
  prompt: string,
  systemPrompt: string | undefined,
  baseUrl: string,
  modelName: string,
  responseMimeType: 'application/json' | 'text/plain' | undefined,
  temperature: number | undefined,
  imageInput: string | undefined
): Promise<{ text: string; promptTokens: number; completionTokens: number; totalTokens: number }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;
  
  const userMessage: any = { role: 'user', content: prompt };
  if (imageInput) {
    const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
    const data = match ? match[2] : imageInput;
    userMessage.images = [data];
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push(userMessage);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages,
      options: {
        temperature: temperature ?? 0.7
      },
      stream: false,
      format: responseMimeType === 'application/json' ? 'json' : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`로컬 LLM (Ollama) 서버 응답 실패 (HTTP ${response.status}). Ollama 및 모델 활성화 여부를 점검해 주세요.`);
  }

  const data = await response.json();
  const text = data.message?.content || '';
  
  const promptTokens = data.prompt_eval_count || (estimateTokens(prompt + (systemPrompt || '')) + (imageInput ? 200 : 0));
  const completionTokens = data.eval_count || estimateTokens(text);
  const totalTokens = promptTokens + completionTokens;

  return { text, promptTokens, completionTokens, totalTokens };
}

/**
 * 하이브리드 라우터 메인 진입 함수
 * 작업 정보와 DB 설정을 토대로 로컬 LLM 또는 Gemini API로 스마트 라우팅합니다.
 */
export async function callAI(options: CallAIOptions): Promise<AIResponse> {
  const { prompt, systemPrompt, purpose, responseMimeType, temperature, imageInput, tenantId } = options;

  // 1. DB 설정 불러오기 (테넌트 격리 적용)
  let aiProvider = 'gemini';
  let localLlmUrl = 'http://localhost:11434';
  let localLlmModel = 'gemma2';
  let googleApiKey = '';
  let googleModel = 'gemini-3.5-flash';

  try {
    const [providerVal, urlVal, modelVal, keyVal, gModelVal] = await Promise.all([
      getAppSetting('ai_provider', tenantId),
      getAppSetting('local_llm_url', tenantId),
      getAppSetting('local_llm_model', tenantId),
      getAppSetting('google_ai_api_key', tenantId),
      getAppSetting('google_ai_model', tenantId)
    ]);

    if (providerVal) aiProvider = providerVal;
    if (urlVal) localLlmUrl = urlVal;
    if (modelVal) localLlmModel = modelVal;
    if (keyVal) googleApiKey = keyVal;
    if (gModelVal) googleModel = gModelVal;

    if (!googleApiKey || !googleApiKey.startsWith('AIzaSy')) {
      try {
        const decryptedKeyRes = await getGeminiApiKey({ name: googleApiKey });
        if (decryptedKeyRes && decryptedKeyRes.success && decryptedKeyRes.apiKey) {
          googleApiKey = decryptedKeyRes.apiKey;
        }
      } catch (keyErr) {
        console.error('⚠️ EGDesk에서 실제 구글 API 키를 해독해오는 데 실패했습니다:', keyErr);
      }
    }

    if (!googleApiKey) {
      googleApiKey = 'wonconduct';
    }
  } catch (err) {
    googleApiKey = 'wonconduct';
    console.error('⚠️ DB 설정 로드 실패 (기본값 설정):', err);
  }

  // 2. 스마트 하이브리드 라우팅 모드일 때 공급자 판단
  let activeProvider = aiProvider;
  let decisionReason = '설정 강제';

  if (aiProvider === 'smart_hybrid') {
    if (imageInput) {
      activeProvider = 'gemini';
      decisionReason = '멀티모달 이미지 분석 (OCR)';
    } else {
      const hasPII = detectPII(prompt) || (systemPrompt ? detectPII(systemPrompt) : false);
      if (hasPII) {
        activeProvider = 'local_llm';
        decisionReason = '보안 조치 (개인정보 패턴 감지)';
      } 
      else if (isHighComplexityPurpose(purpose)) {
        activeProvider = 'gemini';
        decisionReason = '고성능 추론 요구 작업';
      } 
      else {
        activeProvider = 'local_llm';
        decisionReason = '단순 가공/비용 절감 대상';
      }
    }
    console.log(`🤖 [스마트 라우터] 결정: ${activeProvider} (${decisionReason})`);
  }

  let text = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let modelUsed = '';

  // 3. AI 호출 실행
  if (activeProvider === 'local_llm') {
    modelUsed = `local:${localLlmModel}`;
    try {
      const res = await callLocalLLM(prompt, systemPrompt, localLlmUrl, localLlmModel, responseMimeType, temperature, imageInput);
      text = res.text;
      promptTokens = res.promptTokens;
      completionTokens = res.completionTokens;
      totalTokens = res.totalTokens;
    } catch (localErr: any) {
      console.error(`⚠️ 로컬 LLM 호출 실패, Gemini로 긴급 우회(Failover)합니다. 사유: ${localErr.message}`);
      if (googleApiKey) {
        modelUsed = `${googleModel} (로컬 LLM 우회)`;
        const res = await callGemini(prompt, systemPrompt, googleApiKey, googleModel, responseMimeType, temperature, imageInput);
        text = res.text;
        promptTokens = res.promptTokens;
        completionTokens = res.completionTokens;
        totalTokens = res.totalTokens;
      } else {
        throw new Error(`로컬 LLM 통신 실패 및 우회 가능한 구글 API 키가 구성되어 있지 않습니다. 사유: ${localErr.message}`);
      }
    }
  } else {
    if (!googleApiKey) {
      throw new Error('Google Gemini API Key가 시스템 설정에 등록되어 있지 않습니다. 설정 화면에서 등록해 주세요.');
    }
    modelUsed = googleModel;
    const res = await callGemini(prompt, systemPrompt, googleApiKey, googleModel, responseMimeType, temperature, imageInput);
    text = res.text;
    promptTokens = res.promptTokens;
    completionTokens = res.completionTokens;
    totalTokens = res.totalTokens;
  }

  // 4. 실시간 대시보드 로깅 통합 (ai_token_usage_logs 적재)
  try {
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    await insertRows('ai_token_usage_logs', [{
      id: `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      model: modelUsed,
      purpose: purpose,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      created_at: nowStr
    }]);
  } catch (logErr: any) {
    console.error('⚠️ AI 토큰 소모 대시보드 로깅 실패:', logErr.message);
  }

  return {
    success: true,
    text,
    modelUsed,
    promptTokens,
    completionTokens,
    totalTokens
  };
}
