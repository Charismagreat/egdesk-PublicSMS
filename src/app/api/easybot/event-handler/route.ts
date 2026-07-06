import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, executeSQL, getGeminiApiKey } from '../../../../../egdesk-helpers';

// 시스템 설정에서 Google API Key 및 모델 조회
async function getAiConfig() {
  try {
    const keyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let googleApiKey = keyRes.rows && keyRes.rows.length > 0 ? keyRes.rows[0].value : null;

    // 만약 DB에 키가 없거나 실물 구글 API 키 형식이 아닌 경우 (SaaS 환경 / ai-caller 활용 등)
    // 이지데스크 프록시를 통해 복호화된 키를 수신하여 구동합니다.
    if (!googleApiKey || !googleApiKey.startsWith('AIzaSy')) {
      try {
        const decryptedKeyRes = await getGeminiApiKey({ name: googleApiKey || '' });
        if (decryptedKeyRes && decryptedKeyRes.success && decryptedKeyRes.apiKey) {
          googleApiKey = decryptedKeyRes.apiKey;
        }
      } catch (keyErr: any) {
        console.error('⚠️ EGDesk에서 실제 구글 API 키를 해독해오는 데 실패했습니다:', keyErr.message);
      }
    }

    const apiKey = googleApiKey || 'wonconduct';

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const model = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    return { apiKey, model };
  } catch (err) {
    console.error('[EasyBot Event Handler] AI 설정 로드 실패:', err);
    return { apiKey: 'wonconduct', model: 'gemini-3.5-flash' };
  }
}

// 룰 기반 Fallback 분석 엔진 (API 키 만료/오류 시 동작)
function useFallbackRuleAnalysis(table: string, action: string, data: any) {
  console.warn(`[EasyBot Event Handler] 룰 기반 자동화 관제 엔진을 작동합니다. (Table: ${table})`);
  
  const dueStr = (days: number) => {
    const targetDate = new Date(Date.now() + 9 * 60 * 60 * 1000 + days * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().slice(0, 10);
  };
  
  // 1. SCM 입고/재고 감지 룰
  if (table === 'products' && (action === 'insert' || action === 'update')) {
    const name = data.name || '';
    const category = data.category || '';
    const price = Number(data.price) || 0;
    
    // 신상 입고 시 (Felt 3D Pigment Zip-Up) ➡️ 후속 마케팅 태스크 자동 할당 (최지우 담당)
    if (name.includes('Felt') || name.includes('Zip-Up')) {
      return {
        requiresAction: true,
        reason: "[SCM 관제] 신상품 Felt 3D Pigment Zip-Up 입고 검수가 완료됨에 따라 후속 자사몰 프로모션 및 숏폼 마케팅 수립을 지시합니다.",
        task: {
          title: "[신상 런칭] 자사몰 특별 쿠폰 발행 및 SNS 숏폼 마케팅 기획",
          content: `상품명: ${name}\n카테고리: ${category}\n판가: ${price.toLocaleString()}원\n\n신상 아우터의 입고 실사 및 바코드 등록이 완료되었습니다. 마케팅팀은 자사몰 전용 15% 할인 쿠폰을 발행하고 인스타그램/틱톡 마케팅 콘텐츠를 자율 제작해주시기 바랍니다.`,
          operator_id: "2", // 최지우 (마케터)
          priority: "high",
          due_date: dueStr(1) // 내일 마감
        }
      };
    }
  }

  // 2. 재고 부족 감지 룰 (물류 실사 로그 시뮬레이션)
  if (table === 'products' && action === 'delete') {
    return {
      requiresAction: true,
      reason: "[재고 관제] Bubble Crop T-shirt 8COL의 재고가 안전재고(500개) 이하인 35개로 급감하였습니다. 품절 예방 리오더가 시급합니다.",
      task: {
        title: "[재고 부족] Bubble Crop T-shirt 안전재고 경보 및 재발주 검토",
        content: "상품명: Bubble Crop T-shirt 8COL\n현재 가용 재고: 35개 (안전재고: 500개)\n\n위 품목의 판매 속도가 급증하여 품절 임박 상태입니다. 물류 MD는 외주 협력사(이로은 공장)에 리오더 수량 및 원단 리드타임을 점검하여 재발주 공문을 기안하시기 바랍니다.",
        operator_id: "3", // 박민주 (물류 MD)
        priority: "critical",
        due_date: dueStr(0) // 오늘 마감
      }
    };
  }

  // 3. 주문 정합성 및 배송 오류 감지 룰
  if (table === 'crm_orders' && (action === 'insert' || action === 'update')) {
    const memo = data.memo || '';
    const address = data.address || '';
    const name = data.name || '';
    
    if (memo.includes('오류') || memo.includes('불명') || address.includes('오류') || address.includes('불명')) {
      return {
        requiresAction: true,
        reason: "[배송 관제] 신규 주문 취합 과정에서 수취인 주소지 누락 및 배송지 불명 오류가 자동 포착되었습니다.",
        task: {
          title: `[오류 주문] 주소 오류 수취인 정보 확인 요망 (${name} 고객)`,
          content: `고객명: ${name}\n주소지: ${address}\n요청메모: ${memo}\n\n무신사 엑셀 주문 취합본 대사 도중 주소 정합성 에러가 발생했습니다. CS 담당자는 해당 바이어/고객에게 연락하여 올바른 배송지를 확인하고 송장을 재발행하십시오.`,
          operator_id: "3", // 박민주 (CS팀 겸임)
          priority: "high",
          due_date: dueStr(1)
        }
      };
    }
  }

  // 4. 주 52시간 인사 리스크 감지 룰
  if (table === 'crm_attendance' && (action === 'insert' || action === 'update')) {
    const status = data.status || '';
    const hours = Number(data.working_hours) || 0;
    const memo = data.memo || '';
    
    if (status === 'OVERTIME_ALERT' || hours >= 12 || memo.includes('52시간')) {
      return {
        requiresAction: true,
        reason: "[인사 관제] 특정 임직원의 주간 누적 근태 기록이 법정 근로시간 한도인 주 52시간에 도달/초과할 위험이 감지되었습니다.",
        task: {
          title: "[근태 경고] 주 52시간 한도 초과 위험자 근무 시간 강제 조정 권고",
          content: `대상자: 이경우 과장 (물류팀)\n누적 근무시간: ${hours}시간 초과\n상태: ${memo}\n\n해당 임직원의 법적 초과근무 한도 위반 위험이 크므로, 인사부 및 파트장은 즉시 대체 휴무를 부여하고 이번 주 잔여 일자 퇴근을 의무화하십시오.`,
          operator_id: "1", // 최고관리자/인사부
          priority: "high",
          due_date: dueStr(0)
        }
      };
    }
  }

  // 5. 법인카드 부정 지출 감지 룰
  if (table === 'crm_expenses' && (action === 'insert' || action === 'update')) {
    const title = data.title || '';
    const memo = data.memo || '';
    const amount = Number(data.amount) || 0;
    const category = data.category || '';
    
    const isLateNight = memo.includes('23:') || memo.includes('00:') || memo.includes('01:') || memo.includes('02:') || memo.includes('03:') || memo.includes('심야') || memo.includes('밤');
    
    const isSuspicious = 
      title.includes('가요주점') || memo.includes('가요주점') || 
      title.includes('주점') || memo.includes('주점') || 
      amount >= 300000 || 
      (category === '접대비' && isLateNight);
      
    if (isSuspicious) {
      return {
        requiresAction: true,
        reason: "[재무 감사] 규정 위반이 의심되는 심야 시간대 주점 고액(30만원 이상) 법인카드 결제가 실시간 감지되어 자동 홀딩되었습니다.",
        task: {
          title: `[지출 경고] 심야 가요주점 결제 지출 증빙 검토 및 소명 제출 요청`,
          content: `금액: ${amount.toLocaleString()}원\n날짜: ${data.expense_date || '미지정'}\n사용목적: ${title}\n상세메모: ${memo}\n\n위 지출 건은 규정된 접대 기준 및 법인카드 사용 지침(23시 이후 주점 제한)을 위반한 징후가 뚜렷합니다. 재무팀 김서준 대리는 해당 품의 결재를 보류하고 담당자의 서면 소명서 제출을 요구하십시오.`,
          operator_id: "4", // 김서준 (재무)
          priority: "critical",
          due_date: dueStr(3)
        }
      };
    }
  }
  
  return {
    requiresAction: false,
    reason: "[Fallback Rule Engine] 분석 결과 추가 후속 조치가 필요하지 않은 정상 이벤트로 확인되었습니다.",
    task: null
  };
}

export async function POST(req: Request) {
  try {
    const event = await req.json();
    const { table, action, timestamp, data, previousData } = event;

    if (!table || !action || !data) {
      return NextResponse.json({ success: false, error: '유효하지 않은 이벤트 스키마입니다.' }, { status: 400 });
    }

    const { apiKey, model } = await getAiConfig();
    let decision = { requiresAction: false, reason: "", task: null as any };

    if (!apiKey) {
      console.warn('[EasyBot Event Handler] Google AI API Key가 등록되지 않아 Fallback 분석을 실행합니다.');
      decision = useFallbackRuleAnalysis(table, action, data);
    } else {
      try {
        // 🏢 DB에서 동적 회사 컨텍스트 조회
        let companyContext = "";
        try {
          const companyContextRes = await queryTable('system_settings', { filters: { key: 'easybot_company_context' } });
          if (companyContextRes.rows && companyContextRes.rows.length > 0) {
            companyContext = companyContextRes.rows[0].value || "";
          }
        } catch (dbErr) {
          console.warn('[EasyBot Event Handler] 회사 컨텍스트 조회 중 DB 오류:', dbErr);
        }

        // 🏢 DB에서 해당 테이블 전용 활성 규칙 목록 조회
        let matchedRules: any[] = [];
        try {
          const rulesRes = await queryTable('easybot_rules', { 
            filters: { target_table: table, is_active: '1' } 
          });
          matchedRules = (rulesRes.rows || []).filter((r: any) => !r.deleted_at);
        } catch (dbRulesErr) {
          console.warn('[EasyBot Event Handler] 관제 규칙 조회 중 DB 오류:', dbRulesErr);
        }

        // 회사 정보 또는 이 테이블에 매핑된 활성 규칙이 누락된 경우 경보 발동 (설정 방법 안내)
        if (!companyContext.trim() || matchedRules.length === 0) {
          console.warn('[EasyBot Event Handler] 회사 정보 또는 감시 규칙이 누락되어 경보 스냅태스크를 발행합니다.');
          const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
          decision = {
            requiresAction: true,
            reason: `[이지봇 관제 경보] 감시 대상 테이블(${table})에 대한 이지봇 에이전트 자율 지침/규칙이 구성되지 않았습니다.`,
            task: {
              title: "⚠️ 이지봇 자율 대행 작동 지침 누락 경보",
              content: `이지봇이 실시간 DB 이벤트를 모니터링하여 위험 감지 및 자동 업무 지시를 내리기 위해 필요한 '회사 소개(Context)' 또는 테이블 [${table}]에 대한 '자율 감시 규칙(Rules)'이 등록되어 있지 않습니다.\n\n지식 관리 AI 페이지로 이동하셔서 사내 지식 기반 자율 지침 생성 기능을 통해 작동 지침과 규칙을 설정 및 저장해 주십시오.`,
              operator_id: "1", // 최고관리자
              priority: "critical",
              due_date: todayStr
            }
          };
        } else {
          // 규칙 정보 프롬프트 조립
          const rulesPromptText = matchedRules.map((rule, idx) => {
            return `[규칙 ${idx + 1}]
- 규칙 ID: ${rule.id}
- 규칙명: ${rule.title}
- 감시 조건식 (conditions_sql): ${rule.conditions_sql}
- 후속 업무 배정자 ID (assignee_id): ${rule.assignee_id}
- 태스크 우선순위 (task_priority): ${rule.task_priority}
- 태스크 제목 템플릿: ${rule.task_title_template}
- 태스크 본문 템플릿: ${rule.task_content_template}`;
          }).join('\n\n');

          // AI에게 제공할 테이블별 상황 분석 프롬프트 설계
          const analysisPrompt = `
You are the Event-Driven Intelligent Agent of "EasyBot" (이지봇).
Your role is to analyze a database change event (INSERT/UPDATE/DELETE) and decide if it poses a business risk or requires a follow-up action (task) based on the active business rules of the company.

[Company Context]:
${companyContext}

[Database Change Event]:
- Table Name: ${table}
- Operation Type: ${action}
- Timestamp (KST): ${timestamp}
- Changed Data (JSON):
${JSON.stringify(data, null, 2)}
${previousData ? `- Previous Data (JSON):\n${JSON.stringify(previousData, null, 2)}` : ''}

[Active Business Rules for Table "${table}"]:
${rulesPromptText}

[Your Instruction]:
1. Evaluate if the changed data satisfies the "감시 조건식 (conditions_sql)" of any of the rules listed above. 
   - Note: The SQL expression in "conditions_sql" describes the condition on the changed data. For example, "amount >= 300000" means you should check if data.amount >= 300000.
2. If the changed data satisfies a rule's condition:
   - Set "requiresAction" to true.
   - Set "reason" to explain why in Korean (e.g. "[규칙명] 조건에 충족하는 이벤트 감지").
   - Set "task" fields:
     - "title": Render the rule's "태스크 제목 템플릿". Replace placeholders in braces like {amount}, {name}, {title}, {expense_date}, etc. with actual values from the Changed Data.
     - "content": Render the rule's "태스크 본문 템플릿". Replace placeholders in braces like {amount}, {name}, {title}, {expense_date}, etc. with actual values from the Changed Data.
     - "operator_id": The rule's "assignee_id" (should be a string like '1', '2', '3', '4').
     - "priority": The rule's "task_priority" ('low', 'medium', 'high', 'critical').
     - "due_date": YYYY-MM-DD (typically today or 1-2 days from now in KST).
3. If the changed data does NOT satisfy any rule's condition:
   - Set "requiresAction" to false.
   - Set "reason" to "No matching rule conditions found."
   - Set "task" to null.

Your response must be in valid JSON format ONLY:
{
  "requiresAction": true,
  "reason": "Explain in Korean",
  "task": {
    "title": "...",
    "content": "...",
    "operator_id": "...",
    "priority": "...",
    "due_date": "YYYY-MM-DD"
  }
}
`;

          // Gemini API 호출
          const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: "당신은 위험을 감지하고 자율적으로 스냅태스크를 생성하는 지능형 관제 비서입니다." }] },
              contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1
              }
            })
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gemini API 호출 중 오류 발생');
          }

          const resData = await response.json();
          const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

          // 토큰 로그 기록
          if (resData.usageMetadata) {
            try {
              const u = resData.usageMetadata;
              const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
              await insertRows('ai_token_usage_logs', [{
                id: `TKE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                model: model,
                purpose: 'easybot-event-analysis',
                prompt_tokens: u.promptTokenCount || 0,
                completion_tokens: u.candidatesTokenCount || 0,
                total_tokens: u.totalTokenCount || 0,
                created_at: nowStr
              }]);
            } catch (logErr) {
              console.error('Event Handler 토큰 로깅 실패:', logErr);
            }
          }

          decision = JSON.parse(resultText);
        }
      } catch (apiErr: any) {
        console.error('[EasyBot Event Handler] AI API 호출 실패로 Fallback 룰을 적용합니다:', apiErr.message);
        decision = useFallbackRuleAnalysis(table, action, data);
      }
    }

    // 만약 AI가 후속 조치가 필요하다고 결정했다면, 자율 스냅태스크 발급
    if (decision.requiresAction && decision.task) {
      const t = decision.task;
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const taskId = `ST-${Date.now()}`;

      // 1. 마스터 테이블 crm_snaptasks 삽입
      await insertRows('crm_snaptasks', [{
        id: taskId,
        title: t.title,
        status: 'ACTIVE', // 대문자 'ACTIVE' 규격 준수
        partner_id: null,
        created_at: nowStr,
        updated_at: nowStr
      }]);

      console.log(`[EasyBot Event Handler] 자율 스냅태스크 발급 완료. ID: ${taskId}, 제목: ${t.title}`);
      
      // 2. 상세 지시 내용을 crm_snaptask_items에 삽입 (우선순위, 마감일, 담당자 정보 포함)
      const detailText = `[AI 자율 작업 지시]\n- 담당: ${t.operator_id === '3' ? '생산품질팀' : t.operator_id === '2' ? '영업팀' : '관리자'}\n- 우선순위: ${t.priority || 'medium'}\n- 마감기한: ${t.due_date || '미지정'}\n\n[상세 내용]\n${t.content}`;
      
      await insertRows('crm_snaptask_items', [{
        id: Date.now(),
        task_id: taskId,
        content_text: detailText,
        file_url: null,
        file_type: 'TEXT',
        ai_analysis: JSON.stringify({ reason: decision.reason, priority: t.priority, due_date: t.due_date }),
        created_at: nowStr
      }]);
    }

    return NextResponse.json({
      success: true,
      requiresAction: decision.requiresAction,
      reason: decision.reason,
      task: decision.task
    });

  } catch (error: any) {
    console.error('EasyBot Event Handler Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '서버 오류가 발생했습니다.',
      stack: error.stack
    }, { status: 500 });
  }
}
