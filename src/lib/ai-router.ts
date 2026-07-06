import { queryTable, insertRows, updateRows, callAiCaller, getGeminiApiKey } from '../../egdesk-helpers';

export interface CallAIOptions {
  prompt: string;
  systemPrompt?: string;
  purpose: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
  imageInput?: string; // Base64 이미지 데이터 (선택 사항)
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
  // 주민등록번호 패턴 (예: 900101-1234567)
  const juminRegex = /\d{6}-[1-4]\d{6}/;
  // 이메일 패턴
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  // 휴대폰 번호 패턴 (예: 010-1234-5678, 01012345678)
  const phoneRegex = /01[016789]-?\d{3,4}-?\d{4}/;
  // 계좌번호 패턴 (단순 정밀식, 대시 포함 9~16자리 숫자 조합)
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
    'EASYBOT_SETUP'            // 이지봇 핵심 규칙 설정
  ];
  return highComplexityPurposes.includes(purpose);
}

/**
 * 텍스트 글자 수를 기반으로 토큰 수를 예측합니다. (폴백용 계산기)
 * - 한글: 자당 약 1.5 토큰
 * - 영문/숫자: 자당 약 0.35 토큰
 * - 공백/기호: 자당 약 0.2 토큰
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

async function callGemini(
  prompt: string,
  systemPrompt: string | undefined,
  apiKey: string,
  modelName: string,
  responseMimeType: 'application/json' | 'text/plain' | undefined,
  temperature: number | undefined,
  imageInput: string | undefined
): Promise<{ text: string; promptTokens: number; completionTokens: number; totalTokens: number }> {
  // A. 이미지/PDF 분석(OCR) 멀티모달인 경우 -> 구글 API 직접 fetch를 쏘아 inlineData 전달 (OCR 데이터 복원)
  if (imageInput) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
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

    const response = await fetch(url, {
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

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API 호출 실패 (HTTP ${response.status})`);
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
  
  // Ollama chat message 파츠 구성 (images 배열 지원)
  const userMessage: any = { role: 'user', content: prompt };
  if (imageInput) {
    const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
    const data = match ? match[2] : imageInput;
    userMessage.images = [data]; // Base64 raw 데이터 배열 주입
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
  
  // Ollama 응답 정보 파싱 (prompt_eval_count = prompt_tokens, eval_count = completion_tokens)
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
  const { prompt, systemPrompt, purpose, responseMimeType, temperature, imageInput } = options;

  // 1. DB 설정 불러오기
  let aiProvider = 'gemini';
  let localLlmUrl = 'http://localhost:11434';
  let localLlmModel = 'gemma2';
  let googleApiKey = '';
  let googleModel = 'gemini-3.5-flash';

  try {
    const [providerRes, urlRes, modelRes, keyRes, gModelRes] = await Promise.all([
      queryTable('system_settings', { filters: { key: 'ai_provider' } }),
      queryTable('system_settings', { filters: { key: 'local_llm_url' } }),
      queryTable('system_settings', { filters: { key: 'local_llm_model' } }),
      queryTable('system_settings', { filters: { key: 'google_ai_api_key' } }),
      queryTable('system_settings', { filters: { key: 'google_ai_model' } })
    ]);

    if (providerRes.rows?.length > 0) aiProvider = providerRes.rows[0].value;
    if (urlRes.rows?.length > 0) localLlmUrl = urlRes.rows[0].value;
    if (modelRes.rows?.length > 0) localLlmModel = modelRes.rows[0].value;
    if (keyRes.rows?.length > 0) googleApiKey = keyRes.rows[0].value;
    if (gModelRes.rows?.length > 0) googleModel = gModelRes.rows[0].value;

    // 로컬 LLM URL이 정의되어 있으나 모델명이 비어있는 경우(또는 'auto' 설정일 때)
    // 이지데스크 로컬 Ollama API를 쿼리하여 적절한 모델명을 자동 지정 및 DB 영구 저장합니다.
    if (localLlmUrl && (!localLlmModel || localLlmModel === 'auto' || localLlmModel === '')) {
      try {
        const cleanUrl = localLlmUrl.replace(/\/$/, '');
        const response = await fetch(`${cleanUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];
          if (models.length > 0) {
            const modelNames = models.map((m: any) => m.name);
            let selected = modelNames[0]; // 기본 첫번째 모델 지정
            
            // 한국어 친화적이거나 성능 지표가 뛰어난 모델 우선 매칭
            const priorities = ['eeve', 'exaone', 'gemma2', 'gemma', 'llama3', 'llama', 'mistral', 'phi3'];
            for (const p of priorities) {
              const found = modelNames.find((name: string) => name.toLowerCase().includes(p));
              if (found) {
                selected = found;
                break;
              }
            }
            
            localLlmModel = selected;
            
            // egdesk-helpers API를 경유하여 DB 동기화
            const exist = await queryTable('system_settings', { filters: { key: 'local_llm_model' } });
            if (exist.rows && exist.rows.length > 0) {
              await updateRows('system_settings', { value: selected }, { filters: { key: 'local_llm_model' } });
            } else {
              await insertRows('system_settings', [{ key: 'local_llm_model', value: selected }]);
            }
            console.log(`🤖 [로컬 LLM 자동 매핑] Ollama에서 최적 모델 '${selected}'을 감지하여 DB 설정에 저장했습니다.`);
          }
        }
      } catch (ollamaErr: any) {
        console.error('⚠️ 로컬 LLM 모델 자동 감지 시도 실패:', ollamaErr.message);
      }
    }

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
      // 멀티모달 이미지 분석(OCR)은 고사양 멀티모달 능력을 요구하므로 Gemini 클라우드로 분기
      activeProvider = 'gemini';
      decisionReason = '멀티모달 이미지 분석 (OCR)';
    } else {
      // 2-1. 개인정보(PII) 포함 여부 검사 -> 발견 시 보안을 위해 강제로 로컬 LLM 사용
      const hasPII = detectPII(prompt) || (systemPrompt ? detectPII(systemPrompt) : false);
      if (hasPII) {
        activeProvider = 'local_llm';
        decisionReason = '보안 조치 (개인정보 패턴 감지)';
      } 
      // 2-2. 난이도 분석 -> 고도 추론 필요 여부 검사 -> 필요 시 Gemini 사용
      else if (isHighComplexityPurpose(purpose)) {
        activeProvider = 'gemini';
        decisionReason = '고성능 추론 요구 작업';
      } 
      // 2-3. 단순 업무 -> 로컬 LLM 사용
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
      // Failover: 로컬 실패 시 Gemini로 우회 구동 (단 API Key가 있어야 함)
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
    // Gemini 호출 (API Key 필수)
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
