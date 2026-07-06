import { fetchGeminiWithFallback } from '../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, executeSQL, listTables, insertRows, createTable } from '../../../../egdesk-helpers';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

let isFeedbackTableInitialized = false;

// user_feedbacks 테이블이 존재하지 않을 시 멱등적으로 자동 신설하는 헬퍼
async function ensureFeedbackTableExists() {
  if (isFeedbackTableInitialized) return;
  try {
    const tableListResult = await listTables();
    let tables: string[] = [];
    if (tableListResult && tableListResult.tables) {
      tables = tableListResult.tables.map((t: any) => t.tableName || t);
    } else if (Array.isArray(tableListResult)) {
      tables = tableListResult.map((t: any) => t.tableName || t);
    } else if (typeof tableListResult === 'object') {
      tables = Object.keys(tableListResult);
    }
    
    const exists = tables.some((t: string) => t === 'user_feedbacks');
    if (!exists) {
      console.log('user_feedbacks 테이블이 존재하지 않아 신규 생성합니다.');
      await createTable(
        '사용자 피드백 및 버그 제보',
        [
          { name: 'id', type: 'TEXT', notNull: true },
          { name: 'user_prompt', type: 'TEXT', notNull: true },
          { name: 'detected_type', type: 'TEXT' }, // 'bug', 'feature_request', 'complaint', 'other'
          { name: 'current_url', type: 'TEXT' },
          { name: 'resolved_status', type: 'TEXT', defaultValue: 'pending' }, // 'pending', 'resolved', 'ignored'
          { name: 'created_at', type: 'TEXT' }
        ],
        {
          tableName: 'user_feedbacks',
          uniqueKeyColumns: ['id'],
          duplicateAction: 'skip'
        }
      );
    }
    isFeedbackTableInitialized = true;
  } catch (err) {
    console.error('user_feedbacks 테이블 초기화 실패:', err);
  }
}

// 로컬 API를 호출하는 헬퍼 함수
async function callLocalApi(path: string, body: any, cookieHeader: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }
  const url = `http://localhost:4000${path}`;
  const response = await fetchGeminiWithFallback(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resData.error || `로컬 API 호출 실패 (상태: ${response.status})`);
  }
  return resData;
}

// 툴 명칭에 맞춰 대행 액션 처리하는 함수
async function executeActionTool(name: string, args: any, cookieHeader: string | null): Promise<any> {
  if (name === 'send_sms') {
    const { receiver_phone, message_content } = args;
    if (!receiver_phone || !message_content) {
      throw new Error('수신자 번호(receiver_phone)와 메시지 내용(message_content)이 모두 필요합니다.');
    }
    return await callLocalApi('/api/sms/send', {
      phoneNumber: receiver_phone,
      message: message_content
    }, cookieHeader);
  } 
  
  if (name === 'register_customer') {
    const { name: custName, phone, tags, memo, address } = args;
    if (!custName || !phone) {
      throw new Error('고객 성명(name)과 연락처(phone)는 필수 항목입니다.');
    }
    return await callLocalApi('/api/customers', {
      name: custName,
      phone,
      tags: tags || '',
      memo: memo || '',
      address: address || ''
    }, cookieHeader);
  } 
  
  if (name === 'approve_expense') {
    const { expense_id, status, comment } = args;
    if (!expense_id || !status) {
      throw new Error('지출 결의서 ID(expense_id)와 상태(status)는 필수 항목입니다.');
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new Error("상태는 'APPROVED' 또는 'REJECTED' 중 하나여야 합니다.");
    }
    return await callLocalApi('/api/expenses/approve', {
      id: expense_id,
      status: status,
      memo: comment || ''
    }, cookieHeader);
  }

  if (name === 'toggle_ocr_receiver_bypass') {
    const { bypass } = args;
    if (bypass === undefined) {
      throw new Error('우회 활성화 여부(bypass) 파라미터가 필요합니다.');
    }
    return await callLocalApi('/api/settings', {
      key: 'bypass_ocr_receiver_check',
      value: bypass ? '1' : '0'
    }, cookieHeader);
  }

  throw new Error(`알 수 없는 도구명입니다: ${name}`);
}

// 자율 액션 감사 로그 적재 함수
async function logActionAudit({
  prompt,
  actionName,
  args,
  status,
  result,
  errorMessage,
  operator
}: {
  prompt: string;
  actionName: string;
  args: any;
  status: 'SUCCESS' | 'FAILED';
  result?: any;
  errorMessage?: string;
  operator: string;
}) {
  try {
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const logId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const uuid = `uuid-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    await insertRows('easybot_action_audit_logs', [{
      id: logId,
      operator_username: operator,
      original_prompt: prompt,
      action_name: actionName,
      arguments_json: JSON.stringify(args || {}),
      status: status,
      execution_result: result ? JSON.stringify(result) : null,
      error_message: errorMessage || null,
      created_at: nowStr,
      uuid: uuid,
      updated_at: nowStr,
      updated_by: operator
    }]);

    console.log(`[감사 로그 기록 완료] Action: ${actionName}, Status: ${status}`);
  } catch (err) {
    console.error('감사 로그 DB 기록 실패:', err);
  }
}

// SELECT 쿼리만 통과시키고 데이터 파괴적인 쿼리는 원천 차단하는 유효성 검사 함수
function isSafeSelectQuery(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();
  // 오직 SELECT 쿼리만 허용
  if (!normalized.startsWith('SELECT')) {
    return false;
  }
  // 위험 키워드가 SQL 내에 포함되어 있는지 검사
  const dangerousKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 
    'REPLACE', 'TRUNCATE', 'RENAME', 'GRANT', 'REVOKE'
  ];
  return !dangerousKeywords.some(keyword => {
    // 단어 경계(\b)를 기준으로 위험 키워드가 들어있는지 정규식 검사
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(normalized);
  });
}

export async function POST(req: Request) {
  try {
    await ensureFeedbackTableExists();
    const { prompt, chatHistory = [], localStorageContext = {}, currentUrl = '/', focusedUiHint = null } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: '질문(prompt)이 누락되었습니다.' }, { status: 400 });
    }

    // 1. DB에서 구글 AI API 키 및 선택된 모델 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [설정 > AI 설정] 또는 DB의 system_settings 테이블에서 google_ai_api_key 값을 먼저 입력해 주세요.' 
      }, { status: 400 });
    }

    // 1-2. DB에서 구글 AI 모델명 조회 (없다면 3.5 기본값 적용)
    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    // === [NEW] 자율 액션 에이전트 (Function Calling) 선제 판별 및 실행 로직 ===
    let operatorUsername = 'admin';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (token) {
        const payload = decodeJwt(token);
        operatorUsername = (payload.username || payload.name || 'admin') as string;
      }
    } catch (e) {
      console.warn('토큰 사용자명 분석 실패, admin 대체:', e);
    }

    const toolDeclarations = [
      {
        name: "send_sms",
        description: "지정한 전화번호로 알림 문자(SMS)를 발송합니다. 사용자가 문자 발송, SMS 전송 등을 요청했을 때 사용합니다.",
        parameters: {
          type: "OBJECT",
          properties: {
            receiver_phone: { type: "STRING", description: "수신자 전화번호 (예: 010-1234-5678)" },
            message_content: { type: "STRING", description: "발송할 문자 메시지 내용" }
          },
          required: ["receiver_phone", "message_content"]
        }
      },
      {
        name: "register_customer",
        description: "신규 고객 정보를 데이터베이스에 신설/등록합니다. 고객 추가, 고객 등록 요청 시 사용합니다.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "고객의 성명" },
            phone: { type: "STRING", description: "고객의 연락처 전화번호 (예: 010-1234-5678)" },
            tags: { type: "STRING", description: "고객 분류 태그 (콤마로 구분, 옵션)" },
            memo: { type: "STRING", description: "고객 관련 특이사항 메모 (옵션)" },
            address: { type: "STRING", description: "고객 주소 (옵션)" }
          },
          required: ["name", "phone"]
        }
      },
      {
        name: "approve_expense",
        description: "지출 결의서(경비 청구 내역)의 결재 상태를 승인(APPROVED) 또는 반려(REJECTED)로 변경합니다.",
        parameters: {
          type: "OBJECT",
          properties: {
            expense_id: { type: "STRING", description: "지출 결의서의 고유 ID (예: exp-01, exp-02 등)" },
            status: { type: "STRING", description: "결재 처리할 상태값. 'APPROVED' (승인) 또는 'REJECTED' (반려)" },
            comment: { type: "STRING", description: "승인/반려 관련 코멘트 의견 (옵션)" }
          },
          required: ["expense_id", "status"]
        }
      },
      {
        name: "toggle_ocr_receiver_bypass",
        description: "받은 발주서(바이어 발주서) 등록 시 수신인 불일치 거절 옵션(수신인 검증 기능)을 켜거나 끕니다. 사용자가 수신인 불일치 거절을 안 뜨게 설정하거나, 수신인 검증을 끄도록(우회 허용) 요청하면 bypass를 true로 설정하고, 다시 정상적으로 수신인 검증을 켜거나 불일치 거절 경고를 활성화하도록 요청하면 bypass를 false로 설정합니다.",
        parameters: {
          type: "OBJECT",
          properties: {
            bypass: { type: "BOOLEAN", description: "검증을 비활성화(우회 허용)하려면 true, 검증을 활성화(정상 검증)하려면 false" }
          },
          required: ["bypass"]
        }
      }
    ];

    // 첫 번째 모델 호출: 도구 사용 여부 감색
    const initialResponse = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "당신은 이지봇이며, 최고관리자의 업무 대행이 가능한 자율 액션 에이전트입니다. 사용자가 문자 발송, 고객 등록, 지출 승인 등을 요구하면 선언된 적절한 도구(tool)를 호출해야 합니다. 단순 데이터 조회, 검색, 현황 파악, 통계 등은 도구를 사용하지 않고 텍스트로만 응답해 주십시오. 정의되지 않은 임의의 도구명을 만들어 호출하지 마십시오." }] },
        contents: [
          ...chatHistory.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        tools: [{ functionDeclarations: toolDeclarations }]
      })
    });

    if (!initialResponse.ok) {
      const err = await initialResponse.json();
      throw new Error(err.error?.message || 'Gemini Initial API 호출 중 오류가 발생했습니다.');
    }

    const initialData = await initialResponse.json();
    const candidate = initialData.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCallPart = parts.find((p: any) => p.functionCall);

    let executeAction = false;
    let name = '';
    let args: any = null;

    if (functionCallPart) {
      name = functionCallPart.functionCall.name;
      args = functionCallPart.functionCall.args;
      const validTools = ['send_sms', 'register_customer', 'approve_expense', 'toggle_ocr_receiver_bypass'];
      if (validTools.includes(name)) {
        executeAction = true;
      } else {
        console.warn(`[이지봇 자율 액션 가드] 정의되지 않은 도구 호출 감지(${name}). DB 조회 분석 로직으로 폴백합니다.`);
      }
    }

    if (executeAction) {
      console.log(`[이지봇 자율 액션 감지] Tool: ${name}, Args:`, args);

      // 1. 활성화 토글 검증 (system_settings 조회)
      let toggleKey = `easybot_action_${name}_enabled`;
      
      // approve_expense의 경우 승인/반려 세부 토글 키 분기 적용
      if (name === 'approve_expense') {
        const status = args.status || 'APPROVED';
        if (status === 'APPROVED') {
          toggleKey = 'easybot_action_approve_expense_approved_enabled';
        } else if (status === 'REJECTED') {
          toggleKey = 'easybot_action_approve_expense_rejected_enabled';
        }
      }

      const toggleRes = await queryTable('system_settings', { filters: { key: toggleKey } });
      const toggleVal = toggleRes.rows && toggleRes.rows.length > 0 ? toggleRes.rows[0].value : '1'; // 설정이 없으면 기본 활성
      const isEnabled = toggleVal !== '0' && toggleVal !== 'false' && toggleVal !== false;

      if (!isEnabled) {
        console.warn(`[자율 액션 가드 발동] ${name} 도구가 시스템 설정에 의해 비활성화되어 있습니다.`);
        
        // 감사 로그에 실패 기록 적재
        await logActionAudit({
          prompt,
          actionName: name,
          args,
          status: 'FAILED',
          errorMessage: '관리자 설정에 의해 비활성화된 기능입니다.',
          operator: operatorUsername
        });

        return NextResponse.json({
          success: true,
          answer: `⚠️ 이 기능(\`${name}\`)은 현재 **AI 컨트롤타워** 설정에 의해 일시적으로 비활성화되어 있습니다. 관리자에게 설정 활성화를 요청해 주세요.`
        });
      }

      // 2. 로컬 API 실행
      let actionResult: any = null;
      let actionError: string | null = null;
      
      const reqCookie = req.headers.get('cookie');

      try {
        actionResult = await executeActionTool(name, args, reqCookie);
      } catch (err: any) {
        console.error(`[자율 액션 실행 에러] Tool: ${name}, Msg:`, err.message);
        actionError = err.message || String(err);
      }

      // 3. 실행 결과 감사 로그 적재
      await logActionAudit({
        prompt,
        actionName: name,
        args,
        status: actionError ? 'FAILED' : 'SUCCESS',
        result: actionResult,
        errorMessage: actionError || undefined,
        operator: operatorUsername
      });

      // 4. 실행 결과를 Gemini에 보내 최종 자연어 답변 유도
      const toolOutput = actionError 
        ? { success: false, error: actionError }
        : { success: true, result: actionResult };

      const secondResponse = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "당신은 이지봇입니다. 방금 실행한 도구(tool)의 실행 결과 데이터(toolOutput)를 참고하여, 사용자에게 업무 처리가 어떻게 완료되었거나 실패했는지를 밝고 신뢰감 주는 말투로 한글로 정성껏 응답해 주세요." }] },
          contents: [
            ...chatHistory.map((msg: any) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            })),
            { role: 'user', parts: [{ text: prompt }] },
            candidate.content,
            {
              role: 'function',
              parts: [
                {
                  functionResponse: {
                    name: name,
                    response: { output: toolOutput }
                  }
                }
              ]
            }
          ]
        })
      });

      if (!secondResponse.ok) {
        const err = await secondResponse.json();
        throw new Error(err.error?.message || 'Gemini Second API 호출 중 오류가 발생했습니다.');
      }

      const secondData = await secondResponse.json();
      const finalAnswer = secondData.candidates?.[0]?.content?.parts?.[0]?.text || "업무 대행 처리를 완료했으나 안내 응답을 생성하지 못했습니다.";

      // 🕒 토큰 사용량 기록 (1차 + 2차 합산 기록)
      const t1 = initialData.usageMetadata || {};
      const t2 = secondData.usageMetadata || {};
      try {
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        await insertRows('ai_token_usage_logs', [{
          id: `TKA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          model: selectedModel,
          purpose: 'easybot-action-execution',
          prompt_tokens: (t1.promptTokenCount || 0) + (t2.promptTokenCount || 0),
          completion_tokens: (t1.candidatesTokenCount || 0) + (t2.candidatesTokenCount || 0),
          total_tokens: (t1.totalTokenCount || 0) + (t2.totalTokenCount || 0),
          created_at: nowStr
        }]);
      } catch (logErr) {
        console.error('Action 토큰 로깅 실패:', logErr);
      }

      return NextResponse.json({
        success: true,
        answer: finalAnswer,
        reply: finalAnswer
      });
    }

    // === 자율 액션 감지 안 되었을 시 기존 조회 및 분석 로직 작동 ===

    // 2. 현재 DB에 어떤 테이블들이 존재하는지 동적으로 리스트업
    let dbTablesInfo = '알 수 없음';
    try {
      const tablesResult = await listTables();
      if (tablesResult && tablesResult.tables) {
        dbTablesInfo = JSON.stringify(tablesResult.tables);
      } else if (Array.isArray(tablesResult)) {
        dbTablesInfo = JSON.stringify(tablesResult);
      } else {
        dbTablesInfo = JSON.stringify(tablesResult);
      }
    } catch (e) {
      console.warn('테이블 목록 조회 실패 (에이전트에 스키마 가이드 제한됨):', e);
    }

    // 💡 [FinanceHub] 보유계좌 잔액 및 금융 내역 스키마 힌트를 AI 모델에 직접 추가 인입
    const financeHubTablesInfo = `
[FinanceHub Accounts Table (accounts)]
- Description: 은행 계좌 보유 현황 및 현재 잔액 정보가 들어있는 테이블입니다.
- Columns:
  - bank_id (TEXT): 은행 식별자 (예: 'ibk', 'hana')
  - account_number (TEXT): 계좌번호
  - account_name (TEXT): 계좌 별칭
  - customer_name (TEXT): 예금주명 (예: '본사')
  - balance (INTEGER): 현재 보유 잔액 (원화)
  - currency (TEXT): 통화 (기본 'KRW')
  - is_active (INTEGER): 활성화 여부 (1: 활성, 0: 비활성)
`;
    dbTablesInfo += "\n" + financeHubTablesInfo;

    // 💡 [Financials] 기업/거래처 재무제표 관리 테이블 스키마 힌트 주입
    const financialsTablesInfo = `
[Financial Statements Table (crm_financial_statements)]
- Description: 본사, 거래처, 관계사들의 연도별 국세청 재무제표 핵심 지표 수치가 보관되는 테이블입니다.
- Columns:
  - id (TEXT PRIMARY KEY): 고유 식별자
  - company_id (TEXT): 회사 식별 키 (본사일 경우 'MY-COMPANY', 거래처는 'PT-XXX' 같은 거래처 ID)
  - company_type (TEXT): 회사 구분 ('MY_COMPANY': 본사, 'PARTNER': 거래처, 'AFFILIATE': 관계사)
  - fiscal_year (INTEGER): 회계 연도 (예: 2025)
  - fiscal_quarter (TEXT): 회계 구분 ('YR': 연도결산, 'Q1'~'Q4')
  - total_assets (INTEGER): 자산총계 (원 단위 정수)
  - total_liabilities (INTEGER): 부채총계 (원 단위 정수)
  - total_equity (INTEGER): 자본총계 (원 단위 정수)
  - revenue (INTEGER): 매출액 (원 단위 정수)
  - operating_income (INTEGER): 영업이익 (원 단위 정수)
  - net_income (INTEGER): 당기순이익 (원 단위 정수)
  - pdf_file_path (TEXT): 원본 PDF 경로

[Financial Statement Detailed Items Table (crm_financial_statement_items)]
- Description: 재무제표에 포함된 상세 계정과목(급여, 복리후생비, 임차료, 현금및현금성자산 등)의 연도별 금액 정보가 저장된 테이블입니다. 특정 연도의 특정 계정과목 금액을 묻는 질문은 이 테이블을 조회해야 합니다.
- Columns:
  - id (TEXT PRIMARY KEY): 고유 식별자
  - statement_id (TEXT): 마스터 재무제표 ID (crm_financial_statements.id와 조인 연동)
  - category (TEXT): 대분류 ('ASSETS', 'LIABILITIES', 'EQUITY', 'REVENUE', 'EXPENSES')
  - account_name (TEXT): 계정과목명 (예: '급여', '복리후생비', '임차료', '현금및현금성자산', '외상매출금' 등)
  - amount (REAL): 금액 (원 단위 정수)

- 중요 분석 및 쿼리 제한 사항 안내:
  - [🚨 초긴급 필독] 백엔드 SQL 방화벽 정책에 의해, 쿼리 텍스트 내에 단어 'DELETE' 및 'CREATE'가 부분 문자열로라도 포함되면(예: 'deleted_at', 'created_at') 실행이 원천 차단됩니다. 따라서 생성하는 SELECT 쿼리 안에 절대 'deleted_at', 'deleted_at IS NULL', 'created_at' 컬럼이나 조건을 포함하지 마십시오. 생성일 정보가 필요하다면 컬럼 조회를 아예 생략하거나 crm_estimates 테이블의 다른 필드를 사용하십시오. 소프트 삭제 필터링은 시스템이 별도로 처리하므로 단순 컬럼만 매핑 조회하십시오.
  - 특정 연도의 특정 계정과목 금액을 검색할 때는 crm_financial_statements와 crm_financial_statement_items를 statement_id 기준으로 JOIN하여 검색해야 합니다.
  - 예시: 2025년 급여 금액 조회 시 (deleted_at 조건을 절대 쓰지 마십시오)
    SELECT i.account_name, i.amount, s.fiscal_year 
    FROM crm_financial_statement_items i
    JOIN crm_financial_statements s ON i.statement_id = s.id
    WHERE s.fiscal_year = 2025 
      AND s.company_id = 'MY-COMPANY' 
      AND i.account_name LIKE '%급여%'
  - 영업이익률 (%) = (operating_income / revenue) * 100
  - 부채비율 (%) = (total_liabilities / total_equity) * 100
  - 자기자본비율 (%) = (total_equity / total_assets) * 100
  - 당기순이익률 (%) = (net_income / revenue) * 100
`;
    dbTablesInfo += "\n" + financialsTablesInfo;

    // ✨ [Inventory] 재고 및 자율 입고 내역 테이블 스키마 텍스트 주입
    const inventoryTablesInfo = `
[Inventory Items Table (inventory_items)]
- Description: 현재 보유한 재고 품목들의 세부 내역 및 수량 정보가 저장된 테이블입니다.
- Columns:
  - id (INTEGER PRIMARY KEY AUTOINCREMENT): 고유 식별자
  - type (TEXT): 품목 유형 ('자재' 또는 '제품')
  - name (TEXT): 품목명
  - category (TEXT): 카테고리 (예: '기타')
  - price (REAL): 단가 (원화)
  - partner (TEXT): 거래처명/공급처명
  - stock (INTEGER): 현재 재고 수량
  - safeStock (INTEGER): 안전 재고 수량
  - spec (TEXT): 규격 및 스펙
  - barcode (TEXT): 바코드 번호 (USB 리더기 혹은 EAN-13 식별번호)

[Inventory Logs Table (inventory_logs)]
- Description: 재고가 변동(입고, 출고, 수정 등)된 모든 감사 이력이 기록된 테이블입니다.
- Columns:
  - id (INTEGER PRIMARY KEY AUTOINCREMENT): 로그 식별자
  - itemId (INTEGER): 연동된 재고 품목 ID (inventory_items.id)
  - itemName (TEXT): 품목명
  - itemType (TEXT): 품목 유형
  - changeType (TEXT): 변동 유형 ('INBOUND': 입고, 'OUTBOUND': 출고, 'ADJUST': 수량조정 등)
  - quantity (INTEGER): 변동 수량
  - price (REAL): 단가
  - operator (TEXT): 변동 처리 작업자 ('AI 이지봇' 등)
  - note (TEXT): 변동 메모
  - createdAt (TEXT): 기록 일자 (YYYY-MM-DD HH:MM:SS)

[Inventory Inbounds Table (crm_inventory_inbounds)]
- Description: 실물 거래명세서/라벨 스캔을 통해 자율적으로 처리된 입고 대장 정보입니다.
- Columns:
  - id (TEXT PRIMARY KEY): 입고번호 (예: 'INB-178...')
  - partner_name (TEXT): 스캔으로 파싱된 거래처/공급처명
  - inbound_date (TEXT): 입고 날짜 (YYYY-MM-DD)
  - total_amount (INTEGER): 해당 입고건의 품목 금액 총액 (수량 * 단가 누적액)
  - pdf_file_path (TEXT): 업로드된 원본 문서 상대 경로
  - created_at (TEXT): 생성 시간

[Inventory Inbound Items Table (crm_inventory_inbound_items)]
- Description: 자율 입고건의 상세 품목 매칭 내역 정보입니다.
- Columns:
  - id (TEXT PRIMARY KEY): 입고 상세 ID (예: 'INB-ITEM-...')
  - inbound_id (TEXT): 연계된 입고 대장 ID (crm_inventory_inbounds.id)
  - item_name (TEXT): 스캔된 품목명
  - spec (TEXT): 규격/스펙
  - quantity (INTEGER): 입고 수량
  - price (INTEGER): 단가
  - barcode (TEXT): 바코드
  - matched_item_id (INTEGER): 실제 재고 대장 매칭 품목 ID (inventory_items.id)
`;
    dbTablesInfo += "\n" + inventoryTablesInfo;

    // 💡 [RND] 기업부설연구소 사후관리 관련 테이블 스키마 힌트 주입
    const rndTablesInfo = `
[R&D Centers Table (rnd_centers)]
- Description: 기업부설연구소 기본 정보가 저장된 테이블입니다.
- Columns:
  - center_id (INTEGER PRIMARY KEY): 연구소 고유 식별자
  - center_name (TEXT): 연구소 명칭 (예: '이지데스크 지능형 소프트웨어 연구소')
  - center_type (TEXT): 연구소 구분 ('RESEARCH_CENTER': 부설연구소, 'RESEARCH_DEPT': 연구개발실)
  - established_date (TEXT): 설립일자 (YYYY-MM-DD)
  - koita_reg_number (TEXT): KOITA 등록번호 (예: 'KOITA-2024-8899')
  - total_area_sqm (REAL): 연구실 전용 면적 (제곱미터)
  - is_active (INTEGER): 연구소 가동 여부 (1: 가동, 0: 폐쇄)

[R&D Staffs Table (rnd_staffs)]
- Description: 부설연구소 소속 연구원 대장입니다.
- Columns:
  - staff_id (INTEGER PRIMARY KEY): 연구원 식별자
  - user_id (INTEGER): 사용자 계정 ID
  - staff_role (TEXT): 담당 역할 ('DIRECTOR': 연구소장, 'RESEARCHER': 전담연구원, 'ASSISTANT': 연구보조원)
  - employment_status (TEXT): 재직 상태 ('ACTIVE': 재직, 'RESIGNED': 퇴사/연구원 제외)
  - degree_level (TEXT): 최종 학위 종류 ('BACHELOR': 학사, 'MASTER': 석사, 'DOCTOR': 박사)
  - major_name (TEXT): 전공 학과명 (예: '컴퓨터공학과')
  - major_category (TEXT): 전공 계열 구분 ('ENGINEERING': 공학계열, 'SCIENCE': 자연과학계열, 'OTHER': 기타 비적격계열)
  - joined_date (TEXT): 연구소 지정일자 (YYYY-MM-DD)

[R&D Spaces Table (rnd_spaces)]
- Description: Vision AI를 통한 연구실 공간 물적 구획 진단 실사 기록입니다.
- Columns:
  - space_check_id (INTEGER PRIMARY KEY): 진단 식별자
  - check_date (TEXT): 진단 일자 (YYYY-MM-DD)
  - image_url_entrance (TEXT): 외부 현판 스냅샷 이미지 경로
  - image_url_layout (TEXT): 내부 전경 스냅샷 이미지 경로
  - signage_status (TEXT): 현판 감지 여부 ('PASS': 합격, 'FAIL': 미부착)
  - partition_status (TEXT): 파티션 높이 적합 여부 ('PASS': 기준충족, 'FAIL': 높이 미달)
  - overall_status (TEXT): 종합 판정 ('적격', '보완필요')
  - inspector_notes (TEXT): 비전 진단 소견 및 권장 조치 메모
  - ai_analysis_result (TEXT): YOLOv8 개체 탐지 바운딩박스 원시 JSON 문자열

[R&D Logs Table (rnd_logs)]
- Description: 일일 R&D 연구개발 실적 일지 대장입니다.
- Columns:
  - log_id (INTEGER PRIMARY KEY): 연구일지 고유 식별자
  - author_id (INTEGER): 작성 연구원 ID (rnd_staffs.staff_id)
  - work_date (TEXT): 일지 작성 및 연구 수행일자 (YYYY-MM-DD)
  - raw_source (TEXT): 원시 정보 출처 ('VOICE': 음성녹음, 'GITHUB': 커밋로그, 'JIRA': 지라티켓)
  - raw_content (TEXT): 원시 텍스트
  - ai_generated_title (TEXT): AI가 요약한 R&D 제목
  - ai_generated_content (TEXT): R&D 4대 문항 포맷의 본문 내용
  - approval_status (TEXT): 전자결재 상태 ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')
  - approver_id (INTEGER): 승인한 연구소장 ID
  - approved_at (TEXT): 최종 결재 승인일시
  - blockchain_hash (TEXT): 블록체인 감사 추적 SHA-256 해시각인 값

[R&D Compliance Alarms Table (rnd_compliance_alarms)]
- Description: 연구소 유지 요건 위반 리스크 상시 감시 및 D-Day 알림 대장입니다.
- Columns:
  - alarm_id (INTEGER PRIMARY KEY): 알림 식별자
  - category (TEXT): 위험 구분 ('STAFF_CHANGE': 연구원 변동/인원부족, 'SPACE_CHECK': 공간 실사 누락/부적합, 'LOG_MISSING': 연구일지 누락)
  - severity (TEXT): 심각도 등급 ('INFO', 'WARNING', 'CRITICAL')
  - message (TEXT): 구체적인 경고 알림 내용
  - due_date (TEXT): 법정 시정 및 변경신고 마감 기한 (YYYY-MM-DD)
  - is_resolved (INTEGER): 조치 완료 여부 (1: 완료, 0: 미해결/대기)

[Estimates Table (crm_estimates)]
- Description: 견적서 및 SCM 거래 마스터 정보가 저장된 테이블입니다. type이 'OUTBOUND'이면 보낸 견적서/받은 발주서, 'INBOUND'이면 받은 견적서/보낸 발주서입니다.
- Columns:
  - id (TEXT PRIMARY KEY): 견적서 고유 ID (ORD-yymmdd-hhmmss 형식)
  - type (TEXT): 거래 방향 ('OUTBOUND' 또는 'INBOUND')
  - direction_status (TEXT): 상세 문서 진행 상태 ('SENT', 'RECEIVED' 등)
  - partner_name (TEXT): 거래처 상호명
  - partner_phone (TEXT): 거래처 연락처
  - partner_manager (TEXT): 거래처 담당자명
  - total_amount (INTEGER): 총 공급금액 합계
  - file_url (TEXT): 첨부 파일 저장 경로 (OCR 분석 발주서인 경우 base64 이미지 데이터)
  - tags (TEXT): 수주/발주 부가 정보 JSON 문자열 (예: {"business_number":"...", "delivery_date":"..."})
  - sales_order_number (TEXT): 수주(발주등록)번호 또는 바이어 측의 실제 원본 문서상 발주번호
  - purchase_order_number (TEXT): 공급사로 보낸 구매발주서 번호
  - created_at (TEXT): 등록 일시 (YYYY-MM-DD HH:MM:SS)

[Estimate Items Table (crm_estimate_items)]
- Description: 견적서 및 SCM 거래 문서에 포함된 개별 상세 품목 정보가 저장된 테이블입니다.
- Columns:
  - id (INTEGER PRIMARY KEY AUTOINCREMENT): 품목 상세 식별자
  - estimate_id (TEXT): 연계된 견적서/발주등록 ID (crm_estimates.id 와 JOIN 가능)
  - product_id (TEXT): 연계 제품 ID (비어있을 수 있음)
  - product_name (TEXT): 품목명 (주목: 컬럼명이 product_name 입니다)
  - item_code (TEXT): 품목코드 (예: DCOM-301920)
  - quantity (REAL): 수량
  - unit_price (INTEGER): 단가 (주목: 컬럼명이 unit_price 입니다)
  - amount (INTEGER): 금액 (수량 * 단가)
  - delivery_date (TEXT): 품목별 개별 납기일 (YYYY-MM-DD)
  - spec (TEXT): 규격 및 5대 세부 원가정보가 포함된 JSON 문자열입니다. json_extract() 함수를 활용하여 이 컬럼에서 파싱해야 합니다. (절대 DELETE 같은 키워드는 쿼리에 쓰지 마세요)
    * json_extract(spec, '$.cost_breakdown.material_cost') : 자재비 (원 단위 정수)
    * json_extract(spec, '$.cost_breakdown.processing_cost') : 외주가공/작업비 (원 단위 정수)
    * json_extract(spec, '$.cost_breakdown.overhead_cost') : 일반관리비 (원 단위 정수)
    * json_extract(spec, '$.cost_breakdown.other_expenses') : 기타경비 (원 단위 정수)
    * json_extract(spec, '$.cost_breakdown.delivery_expense') : 운반비 (원 단위 정수)
    * json_extract(spec, '$.settlement_type') : 정산방식 (예: '1식', '시간당', '단가당' 등)
    * json_extract(spec, '$.delivery_date') : 품목별 개별 납기일 (예: '2026-07-30')

[Purchase Orders Table (crm_purchase_orders)]
- Description: 공급처(벤더)로 발송한 구매 발주서 마스터 정보가 저장된 테이블입니다.
- Columns:
  - id (INTEGER PRIMARY KEY AUTOINCREMENT): 구매발주 고유식별 번호
  - estimate_id (TEXT): 연계된 견적서 ID (crm_estimates.id 와 JOIN 가능)
  - vendor_name (TEXT): 공급처 상호명
  - vendor_phone (TEXT): 공급처 연락처
  - status (TEXT): 상태
  - total_amount (INTEGER): 발주 총 금액
  - created_at (TEXT): 발주 등록일시

[Sales Orders Table (crm_sales_orders)]
- Description: 바이어로부터 접수한 수주서 마스터 정보가 저장된 테이블입니다.
- Columns:
  - id (TEXT PRIMARY KEY): 수주서 고유 ID (SO-로 시작)
  - estimate_id (TEXT): 연계된 견적서/발주등록 ID (crm_estimates.id 와 JOIN 가능)
  - client_order_no (TEXT): 바이어 측 실제 원본 문서상의 발주번호
  - customer_name (TEXT): 바이어 상호명
  - customer_phone (TEXT): 바이어 연락처
  - customer_manager (TEXT): 바이어 담당자명
  - status (TEXT): 상태 (예: 'REGISTERED')
  - total_amount (INTEGER): 수주 총 금액
  - delivery_date (TEXT): 최종 납기일 (YYYY-MM-DD)
  - created_at (TEXT): 수주 등록일시

- 중요 분석 및 쿼리 제한 사항 안내:
  - crm_estimates, crm_estimate_items, crm_purchase_orders, crm_sales_orders 조회를 요청할 때, 품목별 상세 비용 명세(자재비 등)나 품목별 개별 납기일 조건이 자연어에 포함되어 있으면 반드시 crm_estimate_items 테이블과 조인(JOIN)하여 json_extract(spec, '$.cost_breakdown.material_cost') 또는 json_extract(spec, '$.delivery_date') 등을 통해 조회해 내야 합니다.
  - 쿼리 내에 단어 'DELETE' 및 'CREATE'가 부분 문자열로라도 포함되면(예: 'deleted_at', 'created_at') 실행이 원천 차단됩니다. 따라서 생성하는 SELECT 쿼리 안에 절대 'deleted_at', 'deleted_at IS NULL', 'created_at' 컬럼이나 조건을 포함하지 마십시오. 생성일 정보가 필요하다면 컬럼 조회를 아예 생략하거나 crm_estimates 테이블의 다른 필드를 사용하십시오. 소프트 삭제 필터링은 시스템이 별도로 처리하므로 단순 컬럼만 매핑 조회하십시오.
  - 예시 1: 외주작업비가 4,000원 이상인 품목의 발주건 거래처명을 찾을 때 (deleted_at 조건을 절대 쓰지 마십시오):
    SELECT e.partner_name, i.product_name, json_extract(i.spec, '$.cost_breakdown.processing_cost') AS processing_cost
    FROM crm_estimate_items i
    JOIN crm_estimates e ON i.estimate_id = e.id
    WHERE CAST(json_extract(i.spec, '$.cost_breakdown.processing_cost') AS INTEGER) >= 4000
  - 예시 2: 특정 품목별 납기일(예: '2026-07-30')에 해당하는 품목명과 발주처를 찾을 때 (deleted_at 조건을 절대 쓰지 마십시오):
    SELECT e.partner_name, i.product_name, json_extract(i.spec, '$.delivery_date') AS delivery_date
    FROM crm_estimate_items i
    JOIN crm_estimates e ON i.estimate_id = e.id
    WHERE json_extract(i.spec, '$.delivery_date') = '2026-07-30'
`;
    dbTablesInfo += "\n" + rndTablesInfo;

    // 💡 [RAG] 모든 기업의 연도별 재무제표 세부 계정과목 트리(JSON) 로드 및 프롬프트 RAG 인입
    let financialStatementsRAG = '';
    try {
      const finRes = await queryTable('crm_financial_statements', { filters: { deleted_at: null as any } });
      const finRows = finRes.rows || [];
      if (finRows.length > 0) {
        const partnersRes = await queryTable('crm_partners', {});
        const partnerMap = {};
        if (partnersRes && partnersRes.rows) {
          for (const p of partnersRes.rows) {
            partnerMap[p.id] = p.company_name || p.name || p.id;
          }
        }
 
        financialStatementsRAG = "\n============================\n[회사별/연도별 재무제표 세부 계정과목 및 JSON 내역 (RAG)]\n";
        for (const row of finRows) {
          const companyName = row.company_id === 'MY-COMPANY' ? '본사' : (partnerMap[row.company_id] || row.company_id);
          financialStatementsRAG += '- 회사명: ' + companyName + ' (ID: ' + row.company_id + ', 구분: ' + (row.company_type === 'MY_COMPANY' ? '본사' : '거래처/관계사') + '), 연도: ' + row.fiscal_year + '년, 분기: ' + row.fiscal_quarter + '\n';
          financialStatementsRAG += '  * 6대 핵심 지표: 자산총계: ' + row.total_assets + '원, 부채총계: ' + row.total_liabilities + '원, 자본총계: ' + row.total_equity + '원, 매출액: ' + row.revenue + '원, 영업이익: ' + row.operating_income + '원, 당기순이익: ' + row.net_income + '원\n';
          
          let rawJson = row.parsed_raw_json;
          if (!rawJson) {
            try {
              const fallbackItems = await queryTable('crm_financial_statement_items', {
                filters: {
                  statement_id: row.id,
                  deleted_at: null as any
                }
              });
              if (fallbackItems && fallbackItems.rows && fallbackItems.rows.length > 0) {
                rawJson = JSON.stringify(fallbackItems.rows);
              }
            } catch (err) {
              console.warn('폴백 상세 계정과목 로드 실패:', err);
            }
          }
          
          if (rawJson) {
            financialStatementsRAG += '  * 세부 계정과목 트리 데이터: ' + rawJson + '\n';
          }
          financialStatementsRAG += '\n';
        }
        financialStatementsRAG += '============================\n';
      }
    } catch (ragErr) {
      console.warn('재무제표 RAG 컨텍스트 빌드 실패:', ragErr);
    }
    dbTablesInfo += "\n" + financialStatementsRAG;

    // 3. STEP 1: 사용자의 질문을 분석하여 DB 조회가 필요한지 확인하고 SELECT 쿼리 생성
    const step1SystemPrompt = `
You are the database analysis engine of "EasyBot" (이지봇), a premium management assistant.
Your task is to analyze the user's inquiry and determine if it requires querying the SQLite database.

If it requires database queries:
- Write a valid SQLite SELECT query.
- You can query ANY table (including system_settings, customers, orders, transactions, message_logs, coupons, etc.).
- Ensure that the query is strictly a SELECT statement. Never suggest UPDATE, INSERT, or DELETE.
- Use explicit column names or '*' where appropriate.
- [🚨 CRITICAL] NEVER include columns containing the words "DELETE" or "CREATE" (such as "deleted_at", "created_at") in your query. The backend firewall blocks queries containing these words as substrings. Do not add soft-delete filtering to the query; the backend system handles this automatically.
- ALWAYS output in JSON format only.

Available Database Tables Info:
${dbTablesInfo}

Your response must be in valid JSON format ONLY:
{
  "requiresQuery": true,
  "sql": "SELECT COUNT(*) as total_customers FROM customers",
  "reason": "To count the number of registered customers in the database.",
  "requiresManual": false
}

If no database query is needed (e.g. general greeting, chit-chat, explaining browser state):
{
  "requiresQuery": false,
  "sql": null,
  "reason": "General conversation or browser context only.",
  "requiresManual": false
}

If the user is asking about how to use the system, menus, manuals, guides, or troubleshooting (such as resetting Naver blog session, setting point earning rates, coupon restrictions, multi-page checking, or point OTP security):
{
  "requiresQuery": false,
  "sql": null,
  "reason": "User is asking for system usage instructions or troubleshooting guides.",
  "requiresManual": true
}
`;

    const step1Response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: step1SystemPrompt }] },
        contents: [
          ...chatHistory.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1 // SQL 생성의 정확성을 극대화하기 위해 낮은 온도로 설정
        }
      })
    });

    if (!step1Response.ok) {
      const err = await step1Response.json();
      throw new Error(err.error?.message || 'Gemini Step-1 API 호출 중 오류가 발생했습니다.');
    }

    const step1Data = await step1Response.json();
    const step1Text = step1Data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // 🕒 Step 1 토큰 사용량 로깅
    if (step1Data.usageMetadata) {
      try {
        const u = step1Data.usageMetadata;
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        
        await insertRows('ai_token_usage_logs', [{
          id: `TK1-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          model: selectedModel,
          purpose: 'easybot-sql-generation',
          prompt_tokens: u.promptTokenCount || 0,
          completion_tokens: u.candidatesTokenCount || 0,
          total_tokens: u.totalTokenCount || 0,
          created_at: nowStr
        }]);
      } catch (logErr: any) {
        console.error('Step 1 토큰 로깅 실패:', logErr);
        try {
          const fs = require('fs');
          const path = require('path');
          const logDir = path.join(process.cwd(), 'scratch');
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          fs.appendFileSync(
            path.join(logDir, 'easybot_error.log'),
            `[${new Date().toISOString()}] Step 1 토큰 로깅 실패: ${logErr.message}\nStack: ${logErr.stack}\n\n`
          );
        } catch (e) {}
      }
    }
    
    let sqlPlan = { requiresQuery: false, sql: null as string | null, reason: "", requiresManual: false };
    try {
      sqlPlan = JSON.parse(step1Text);
    } catch (e) {
      console.error('SQL Plan JSON 파싱 실패:', step1Text);
    }

    // 4. SQL 실행 (필요한 경우)
    let sqlQueryResult: any = null;
    let sqlError: string | null = null;

    if (sqlPlan.requiresQuery && sqlPlan.sql) {
      const sqlToExecute = sqlPlan.sql;
      
      // 보안 안전성 검증
      if (!isSafeSelectQuery(sqlToExecute)) {
        sqlError = `보안 제한: 오직 데이터 조회(SELECT) 쿼리만 안전하게 실행할 수 있습니다. 생성된 쿼리는 실행이 거부되었습니다: "${sqlToExecute}"`;
      } else {
        try {
          // 쿼리에 financehub 관련 테이블(accounts 등)이 포함되어 있는지 대소문자 무관하게 검사
          const lowerSQL = sqlToExecute.toLowerCase();
          const isFinanceHubQuery = lowerSQL.includes('accounts') || 
                                    lowerSQL.includes('bank_transactions') ||
                                    lowerSQL.includes('card_transactions');
          
          const queryRes = await executeSQL(sqlToExecute);
          sqlQueryResult = queryRes;
        } catch (err: any) {
          console.error('SQL 실행 오류:', err);
          sqlError = err.message || String(err);
        }
      }
    }

    // 매뉴얼 지식 베이스 읽기 (RAG)
    let manualContext = "";
    if (sqlPlan.requiresManual) {
      try {
        const manualPath = path.join(process.cwd(), 'src', 'docs', 'egdesk-manual.md');
        manualContext = fs.readFileSync(manualPath, 'utf8');
      } catch (err) {
        console.error('매뉴얼 파일 읽기 실패:', err);
      }
    }

    // 5. STEP 2: 최종 대답 합성 (질문 + 로컬저장소 컨텍스트 + SQL 결과)
    const step2SystemPrompt = `
당신은 이지데스크(EGDESK) 프로젝트의 지능형 관리자 비서 "이지봇"(EasyBot)입니다.
사용자에게 친근하면서도 매우 전문적인 한글 어투로 대답해 주세요.

당신은 다음 리소스를 모두 활용하여 질문에 답할 수 있습니다:
1. 사용자 브라우저의 로컬 저장소(LocalStorage) 상태 스냅샷: 사용자의 현재 UI 상태, 토큰, 발송 대기 메시지 등이 들어있습니다.
2. 서버 SQLite 데이터베이스 조회 결과: 테이블 스키마나 쿼리를 직접 수행해 추출해 낸 최신 비즈니스 데이터입니다.
3. 시스템 공식 매뉴얼: 사용법 및 가이드 안내가 필요할 때 지식 베이스로 사용합니다.

답변 작성 규칙:
- 반드시 한국어로 대답해 주세요. (gemini_added_memories 규칙 필수 준수)
- 코드나 SQL 쿼리를 설명해야 할 때는 백틱(\`\`)을 활용해 가시성 높은 마크다운 코드로 표기해 주세요.
- 표(Table), 리스트, 볼드체 등을 활용하여 프리미엄 SaaS의 위젯 안에서 읽기 편한 완벽한 텍스트 구조로 만들어 주세요.
- 만약 SQL 쿼리가 실패했거나 오류가 있었다면, 관리자가 원인을 파악할 수 있도록 SQL 오류 메시지를 보여주며 원인 진단을 도와주세요.
- 챗봇 자체에서 데이터를 임의로 수정/삭제(UPDATE/DELETE)할 수 없음을 인지하되, SELECT를 통한 깊이 있는 데이터 분석 및 인사이트 제공에 집중해 주세요.
- [중요 💡] 만약 사용자가 특정 메뉴나 페이지로 직접 이동하기를 희망한다는 의도가 명백히 감지되면(예: "금융 정보 페이지로 가줘", "지출 관리 열어줘", "홈페이지 빌더 가자"), 최종 답변의 가장 마지막 줄에 정확하게 \`[REDIRECT:이동할_경로]\` (예: \`[REDIRECT:/finance]\`, \`[REDIRECT:/expenses]\`, \`[REDIRECT:/sms]\`, \`[REDIRECT:/settings]\`, \`[REDIRECT:/my-db]\`, \`[REDIRECT:/estimates]\`) 태그를 단독 라인으로 기입해 주세요. 시스템이 이를 감지하여 관리자에게 확인 창을 띄워 페이지를 실시간 자동 이동시킵니다.
- [중요 🔗] 만약 답변에 견적서(Estimates), 발주서(Purchase Orders), 수주서(Sales Orders) 데이터가 포함되어 있고 각각의 고유 ID(예: \`ORD-260623-215908\`)가 존재하는 경우, 사용자가 클릭하여 상세 내역을 바로 조회할 수 있도록 각 ID에 \`[ORD-260623-215908](/estimates?detail_id=ORD-260623-215908)\` 형식으로 마크다운 링크를 반드시 걸어주세요.
- [중요 🧭] 견적서/발주서/수주서 등을 조회하거나 찾는 의도가 감지되어 결과를 응답하는 경우, 최종 답변의 가장 마지막 줄에 정확하게 \`[REDIRECT:/estimates?detail_id=조회된첫번째ID]\` (만약 단일 건 또는 특정 건이 대표로 매치될 경우) 또는 \`[REDIRECT:/estimates]\` (여러 건이 검색되어 리스트를 보여줘야 할 경우) 태그를 단독 라인으로 반드시 기입해 주세요. 이를 통해 대화창 뒤에서 관련 견적서/발주서 관리 화면으로 실시간 이동하고 상세 모달이 자동 팝업됩니다.
- [중요 ⚠️] 만약 사용자가 특정 직무나 작업 지시(스냅태스크)를 내리는 의도가 명백히 감지되면(예: "최우영 대리에게 안전센서 점검 6월 10일까지 마감인 고화질 스냅태스크 발행해줘"), 최종 답변의 가장 마지막 줄에 정확하게 \`[CREATE_TASK:담당자ID:우선순위:마감일(YYYY-MM-DD):제목:내용]\` (예: \`[CREATE_TASK:3:high:2026-06-10:안전센서 정기 점검:절삭기 가동 부위의 감지 센서 작동 여부 정밀 점검 요망]\`) 태그를 단독 라인으로 기입해 주세요. (담당자ID 후보: '1'=관리자/대표, '2'=영업팀, '3'=생산품질팀 / 우선순위 후보: 'low', 'medium', 'high', 'critical'). 그리고 답변 내용에는 "요청하신 작업 지시 사항이 이지봇 시스템을 통해 생산품질팀 담당자에게 정식으로 즉시 발급되었습니다. 해당 스냅태스크 진척 상황은 작업 대장에서 실시간 모니터링됩니다."와 같이 든든하고 신뢰감을 주는 멘트를 포함해 주세요.
- [중요 🧭] 사용자가 현재 보고 있는 페이지 주소는 아래의 [현재 보고 있는 페이지 URL] 항목에 제공됩니다. 사용자의 현재 화면 위치 맥락을 고려하여, 페이지 성격에 꼭 맞는 맥락형 친절한 답변을 작성해 주세요. (예: /expenses인 경우 지출 관리 현황에 초점을 맞춰 응대)
- [중요 🧭] 사용자가 "이 부분은 어떻게 써?", "이거 뭐야?" 처럼 지사 대명사로 특정 영역을 가리켜 질문하는 경우, 아래의 [현재 사용자가 마우스 호버/포커싱하여 가리키고 있는 UI 요소 힌트] 정보를 최우선 참조하여 해당 컴포넌트의 가이드라인을 1:1 맞춤형으로 아주 상세하게 직접 설명해 주세요.
- [중요 ⚠️] 만약 사용자가 시스템의 버그, 불편함, 건의사항, 개선 필요, 불만 사항, 또는 신규 기능 추가 요청 등을 명확하게 제기하는 의도가 감지되면(예: "재고 관리가 이상해요", "버그 있어요", "이 부분 추가해 줘", "너무 느려요", "이메일 알림 연동해줘"), 최종 답변의 가장 마지막 줄에 정확하게 \`[FEEDBACK:유형:핵심제보요약]\` (예: \`[FEEDBACK:bug:재고 바코드 리더 오작동]\`, \`[FEEDBACK:feature_request:이메일 알림 연동 희망]\`, \`[FEEDBACK:complaint:발송 속도가 너무 느림]\`) 태그를 단독 라인으로 기입해 주세요. (유형 후보: 'bug', 'feature_request', 'complaint', 'other'). 그리고 답변 내용에는 "제보해 주신 소중한 버그/의견은 관리자 피드백 보드에 정식으로 즉시 접수되었습니다. 개발팀과 함께 신속하게 검토하여 개선하겠습니다!"와 같이 상냥하고 신뢰감을 주는 접수 완료 멘트를 포함해 주세요.
- [중요 🧪] 만약 사용자가 연구소 사진(외부 현판 혹은 내부 구획 등)을 업로드하며 공간 검증을 요청하거나 자가진단을 명하는 의도가 감지되면, 다른 설명 글을 완전히 생략하고 오직 다음 형식의 단독 메시지로만 응답해 주세요 (JSON 외에 다른 일반 텍스트나 사족을 절대 덧붙이지 마세요):
  \`[RND_SPACE_PREVIEW:{"entrance_image": "/images/rnd/entrance_good.jpg", "layout_image": "/images/rnd/layout_need_improvement.jpg", "signage_status": "PASS", "partition_status": "FAIL", "overall_status": "보완필요", "inspector_notes": "이지봇 분석 결과: 출입구 현판은 적합하게 감지되었으나, 내부 파티션 높이가 1.05m로 추정되어 법정 기준(1.2m)에 미달하여 보완이 필요합니다."}]\`
- [중요 📝] 만약 사용자가 R&D 연구일지 작성을 요청하거나 음성 스케치/Git 커밋 로그/Jira 태스크 내역을 보내면서 일지 초안 작성을 요구하는 상황이 명백히 감지되면, R&D 필수 4대 구성 요건(1. 연구 배경, 2. 실험 방법, 3. 결과 분석, 4. 향후 계획)에 부합하는 정밀하고 학술적인 일지 본문 내용을 지능적으로 자동 작문하고, 다른 설명 글을 완전히 생략하고 오직 다음 형식의 단독 메시지로만 응답해 주세요 (JSON 외에 다른 일반 텍스트나 사족을 절대 덧붙이지 마세요):
  \`[RND_LOG_PREVIEW:{"author_id": 3, "work_date": "오늘날짜(YYYY-MM-DD)", "raw_source": "VOICE 또는 GITHUB 또는 JIRA", "raw_content": "사용자가 보내온 원문 또는 요약 텍스트", "ai_generated_title": "AI가 요약한 R&D 제목", "ai_generated_content": "1. 연구 배경: ...\\n2. 실험 방법: ...\\n3. 결과 분석: ...\\n4. 향후 계획: ..."}]\`

${manualContext ? `\n============================\n[공식 시스템 매뉴얼 지식 베이스 (RAG)]\n${manualContext}\n\n-> 지시사항: 사용자가 시스템 사용법, 메뉴 구조, 가이드라인 등을 묻고 있습니다. 지어내지 말고, 위 매뉴얼 내용에 기반하여 가장 정확하고 친절하게 대답해 주세요.\n============================\n` : ''}
[현재 보고 있는 페이지 URL]:
${currentUrl}

[현재 사용자가 마우스 호버/포커싱하여 가리키고 있는 UI 요소 힌트]:
${focusedUiHint || '없음 (사용자가 특정 컴포넌트를 마우스 호버/포커싱하지 않고 일반 질문 중)'}

[LocalStorage 상태 스냅샷]:
${JSON.stringify(localStorageContext, null, 2)}

[SQLite DB 실행된 쿼리 및 결과]:
- 쿼리 실행 요구 여부: ${sqlPlan.requiresQuery ? '예' : '아니오'}
- 시도한 SQL 쿼리: ${sqlPlan.sql || '없음'}
- 쿼리 실행 결과: ${sqlQueryResult ? JSON.stringify(sqlQueryResult, null, 2) : '결과 없음'}
- 쿼리 에러 내용: ${sqlError || '에러 없음'}
`;

    const step2Response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: step2SystemPrompt }] },
        contents: [
          ...chatHistory.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.5
        }
      })
    });

    if (!step2Response.ok) {
      const err = await step2Response.json();
      throw new Error(err.error?.message || 'Gemini Step-2 API 호출 중 오류가 발생했습니다.');
    }

    const step2Data = await step2Response.json();
    let finalAnswer = step2Data.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 생성하는 데 실패했습니다.";

    // [REDIRECT:경로] 태그 감지 및 추출, 그리고 마크다운 링크로 치환
    let redirectUrl: string | null = null;
    const redirectMatch = finalAnswer.match(/\[REDIRECT:(.*?)\]/);
    if (redirectMatch) {
      redirectUrl = redirectMatch[1].trim();
      finalAnswer = finalAnswer.replace(/\[REDIRECT:(.*?)\]/g, `[바로가기 (${redirectUrl})](${redirectUrl})`).trim();
    }

    // [CREATE_TASK:담당자ID:우선순위:마감일:제목:내용] 태그 감지 시 crm_snaptasks 테이블에 자동 발급 처리
    const taskMatch = finalAnswer.match(/\[CREATE_TASK:(.*?):(.*?):(.*?):(.*?):(.*?)\]/);
    if (taskMatch) {
      const opId = taskMatch[1].trim();
      const priority = taskMatch[2].trim();
      const dueDate = taskMatch[3].trim();
      const title = taskMatch[4].trim();
      const content = taskMatch[5].trim();

      try {
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const taskId = `ST-${Date.now()}`;

        // 1. 마스터 테이블 crm_snaptasks 삽입
        await insertRows('crm_snaptasks', [{
          id: taskId,
          title: title,
          status: 'ACTIVE',
          partner_id: null,
          created_at: nowStr,
          updated_at: nowStr
        }]);

        // 2. 상세 지시 내용을 crm_snaptask_items에 삽입
        const detailText = `[이지봇 작업 지시]\n- 담당자: ${opId === '3' ? '생산품질팀' : opId === '2' ? '영업팀' : '관리자'}\n- 우선순위: ${priority}\n- 마감기한: ${dueDate}\n\n[상세 내용]\n${content}`;

        await insertRows('crm_snaptask_items', [{
          id: Date.now(),
          task_id: taskId,
          content_text: detailText,
          file_url: null,
          file_type: 'TEXT',
          ai_analysis: JSON.stringify({ source: 'easybot-chat', priority, due_date: dueDate }),
          created_at: nowStr
        }]);

        console.log(`[이지봇 자율 태스크 기입 완료] ID: ${taskId}, 제목: ${title}, 담당자: ${opId}`);
      } catch (dbErr) {
        console.error('자율 스냅태스크 DB 저장 실패:', dbErr);
      }

      // 최종 답변 본문에서 개발용 트리거 태그 깔끔히 소거
      finalAnswer = finalAnswer.replace(/\[CREATE_TASK:.*?\]/g, '').trim();
    }

    // [FEEDBACK:유형:내용] 태그 감지 시 user_feedbacks 테이블에 안전하게 접수 및 적재
    const feedbackMatch = finalAnswer.match(/\[FEEDBACK:(.*?):(.*?)\]/);
    if (feedbackMatch) {
      const detectedType = feedbackMatch[1].trim();
      const feedbackContent = feedbackMatch[2].trim();
      
      try {
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        await insertRows('user_feedbacks', [{
          id: `FB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user_prompt: feedbackContent,
          detected_type: detectedType,
          current_url: currentUrl,
          resolved_status: 'pending',
          created_at: nowStr
        }]);
        console.log(`[피드백 접수 처리 완료] 유형: ${detectedType}, 내용: ${feedbackContent}, 위치: ${currentUrl}`);
      } catch (dbErr) {
        console.error('피드백 접수 DB 저장 실패:', dbErr);
      }

      // 최종 답변 본문에서 개발용 트리거 태그 깔끔히 소거
      finalAnswer = finalAnswer.replace(/\[FEEDBACK:.*?\]/g, '').trim();
    }

    // 🕒 Step 2 토큰 사용량 로깅
    if (step2Data.usageMetadata) {
      try {
        const u = step2Data.usageMetadata;
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        
        await insertRows('ai_token_usage_logs', [{
          id: `TK2-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          model: selectedModel,
          purpose: 'easybot-response',
          prompt_tokens: u.promptTokenCount || 0,
          completion_tokens: u.candidatesTokenCount || 0,
          total_tokens: u.totalTokenCount || 0,
          created_at: nowStr
        }]);
      } catch (logErr) {
        console.error('Step 2 토큰 로깅 실패:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      answer: finalAnswer,
      reply: finalAnswer, // 클라이언트의 data.reply 참조 호환성을 위해 추가
      redirectUrl: redirectUrl, // 리다이렉트 자동 수행을 위한 경로 정보 추가
      sql: sqlPlan.sql,
      sqlSuccess: sqlPlan.requiresQuery ? !sqlError : null,
      sqlError
    });

  } catch (error: any) {
    console.error('EasyBot API Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
