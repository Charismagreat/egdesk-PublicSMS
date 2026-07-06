/**
 * RAG 기반 지식 관리 AI 삭제 결재 판정 시스템
 * 설명과 주석은 한국어로 작성되었습니다.
 */
import { 
  queryTable, 
  listBusinessIdentitySnapshots, 
  listKnowledgeDocuments, 
  getKnowledgeDocument,
  insertRows,
  updateRows
} from '../../egdesk-helpers';
import { fetchGeminiWithFallback } from './gemini-fallback';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { getAppSetting } from '@/lib/app-settings';
import { getTenantId } from '@/lib/tenant';

/**
 * AI 결재 심사 로그를 crm_governance_logs 테이블에 영구 저장합니다.
 */
async function saveGovernanceLog(
  docType: 'estimate' | 'purchase_order' | 'sales_order',
  docData: any,
  status: string,
  reason: string
) {
  try {
    let operator = 'system';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (token) {
        const payload = decodeJwt(token);
        operator = (payload.username as string) || (payload.role as string) || 'system';
      }
    } catch (e) {
      operator = docData?.updated_by || docData?.operator || 'system';
    }

    const docId = docData?.id || 'unknown';
    let docTitle = '';
    const totalAmount = docData?.total_amount ? Number(docData.total_amount) : 0;
    const amountText = `${totalAmount.toLocaleString()}원`;

    if (docType === 'estimate') {
      docTitle = `${docData?.partner_name || '거래처 미상'} 견적서 (${amountText})`;
    } else if (docType === 'purchase_order') {
      docTitle = `${docData?.vendor_name || '공급처 미상'} 발주서 (${amountText})`;
    } else if (docType === 'sales_order') {
      docTitle = `${docData?.customer_name || '고객 미상'} 수주서 (${amountText})`;
    } else {
      docTitle = `문서 ID: ${docId}`;
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 중복 방지 가드: 동일한 문서의 'PENDING_APPROVAL' 상태 로그가 존재한다면 업데이트만 수행
    if (status === 'PENDING_APPROVAL') {
      const existRes = await queryTable('crm_governance_logs', {
        filters: { doc_type: docType, doc_id: docId, status: 'PENDING_APPROVAL' }
      });
      const existRows = existRes.rows || [];
      if (existRows.length > 0) {
        const existLog = existRows[0];
        const updates = {
          created_at: nowStr,
          updated_at: nowStr,
          reason: reason,
          operator: operator,
          updated_by: operator
        };
        await updateRows('crm_governance_logs', updates, { filters: { id: existLog.id } });
        console.log(`[Governance Log] Updated existing PENDING_APPROVAL log for ${docType} ID: ${docId}`);
        return;
      }
    }

    const logId = `${docType}_del_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const logRow = {
      id: logId,
      doc_type: docType,
      doc_id: docId,
      doc_title: docTitle,
      status: status,
      reason: reason,
      operator: operator,
      created_at: nowStr,
      uuid: logId,
      updated_at: nowStr,
      updated_by: operator
    };

    await insertRows('crm_governance_logs', [logRow]);
    console.log(`[Governance Log] Successfully recorded deletion request log for ${docType} ID: ${docId}`);
  } catch (error) {
    console.error('Failed to save governance log:', error);
  }
}

/**
 * 견적서, 발주서, 수주서 삭제 요청 시 사내 규정을 조회(RAG)하여 자동 전결 승인 여부를 심사합니다.
 */
export async function checkRagApproval(
  docType: 'estimate' | 'purchase_order' | 'sales_order',
  docData: any
): Promise<{ approved: boolean; reason: string; status: 'APPROVED_AUTO' | 'PENDING_APPROVAL' }> {
  try {
    // 1. Google Gemini API 키 및 모델 설정 조회
    const tenantId = await getTenantId();
    const apiKey = await getAppSetting('google_ai_api_key', tenantId);

    if (!apiKey) {
      // API 키가 없으면 보안상 안전하게 수동 결재 대기로 판정
      return { 
        approved: false, 
        status: 'PENDING_APPROVAL', 
        reason: '구글 AI API 키가 시스템에 등록되지 않았습니다. 안전을 위해 삭제가 보류되었습니다.' 
      };
    }

    const selectedModelValue = await getAppSetting('google_ai_model', tenantId);
    const selectedModel = selectedModelValue || 'gemini-3.5-flash';

    // 2. RAG 지식 문서 스토어에서 삭제/취소/전결 관련 규정 마이닝
    let rlsRulesText = '';
    try {
      let snapshotId = 'default_snapshot';
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        snapshotId = snapshots[0].id || snapshots[0].uuid || snapshotId;
      }
      
      const docsRes = await listKnowledgeDocuments(snapshotId);
      const rawDocs = docsRes?.documents || docsRes || [];
      
      const fullDocs = await Promise.all(
        rawDocs.map(async (d: any) => {
          const docId = d.id || d.document_id || d.uuid;
          if (!d.content && docId) {
            try {
              const detail = await getKnowledgeDocument(docId);
              return { ...d, ...detail };
            } catch {
              return d;
            }
          }
          return d;
        })
      );

      // 승인된 문서 중 '삭제', '취소', '전결', '반품', '규정' 등의 키워드가 포함된 문서를 RAG 컨텍스트로 취합
      const approvedRules = fullDocs.filter((d: any) => {
        const contentStr = d.content || '';
        const isApproved = contentStr.includes('**결재상태**: APPROVED') || contentStr.includes('**결재상태**: APPROVED_AUTO') || d.status === 'APPROVED' || d.status === 'APPROVED_AUTO';
        const hasKeyword = contentStr.includes('삭제') || contentStr.includes('취소') || contentStr.includes('전결') || contentStr.includes('규정') || d.title.includes('삭제') || d.title.includes('취소') || d.title.includes('전결');
        return isApproved && hasKeyword;
      });

      if (approvedRules.length > 0) {
        rlsRulesText = approvedRules.map((d: any, idx: number) => {
          const content = d.content || '';
          const dividerIndex = content.lastIndexOf('\n\n--- \n*   **작성자**:');
          const cleanBody = dividerIndex !== -1 ? content.substring(0, dividerIndex).trim() : content;
          return `[사내 규정 #${idx + 1}] ${d.title}\n${cleanBody}`;
        }).join('\n\n');
      }
    } catch (e) {
      console.error('RAG 지식 마이닝 실패:', e);
    }

    // 만약 RAG 규정이 하나도 등록되지 않았다면, 안전을 위해 보류하는 기본 정책 또는 안내 적용
    if (!rlsRulesText) {
      rlsRulesText = `[기본 규정] 
- 모든 삭제는 기본적으로 수동 결재 대기(PENDING_APPROVAL)를 따릅니다.
- 10만 원 미만의 오등록 건에 한해 자동 전결 승인(APPROVED_AUTO)이 가능합니다.`;
    }

    // 3. Gemini 판정 프롬프트 작성
    const prompt = `
당신은 B2B 전문 AI 의사결정 서한 판독기 및 사내 데이터 가버넌스 통제 에이전트입니다.
사용자가 다음 문서를 삭제하려고 합니다.
사내 업무 규정(RAG)을 참조하여, 이 삭제 요청을 즉시 승인(APPROVED_AUTO)할지, 아니면 수동 결재선 승인이 필요하도록 보류(PENDING_APPROVAL)할지 심사해 주십시오.

### 📌 삭제 요청 문서 정보:
- 문서 종류: ${docType === 'estimate' ? '견적서' : docType === 'purchase_order' ? '발주서' : '수주서'}
- 문서 데이터: ${JSON.stringify(docData, null, 2)}

### 📖 사내 지식 및 규정 규칙 (RAG):
${rlsRulesText}

### ⚖️ 판정 지침:
1. 제공된 [사내 지식 및 규정 규칙]에 정확히 매칭하여 심사하십시오.
2. 만약 규정 규칙에서 허용하는 명시적인 자동 전결 기준(예: "단순 변심 및 입고 전 발주 취소 자동 승인", "10만원 미만 단순 오등록 자동 승인" 등)에 부합하는 경우에만 status를 "APPROVED_AUTO"로 판정하십시오.
3. 규정 규칙에 부합하지 않거나, 금액 기준을 초과하거나, 상태 조건 미달 또는 해석이 모호한 경우에는 안전을 위해 반드시 status를 "PENDING_APPROVAL"로 판정하십시오.
4. "reason" 필드에는 사용자가 납득할 수 있도록 판정의 근거가 된 사내 규정 번호/제목과 구체적인 이유(금액 초과, 상태 조건 미달 등)를 친절한 한국어로 자세하게 서술하십시오.

### 📝 응답 형식 (Markdown 없이 순수 JSON만 반환):
{
  "status": "APPROVED_AUTO" 또는 "PENDING_APPROVAL",
  "reason": "사내 전결 규정 제X조에 의거, 발주 금액 100만 원 초과 건은 시스템 자동 삭제가 제한되며 수동 결재선 승인이 필요합니다."
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 통신 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    let parsedData;
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse Gemini RAG Approval response:', responseText);
      throw new Error('AI 분석 결과를 JSON으로 변환하는 데 실패했습니다.');
    }

    const approved = parsedData.status === 'APPROVED_AUTO';
    
    // AI 결재 판정 로그 저장
    await saveGovernanceLog(docType, docData, parsedData.status || 'PENDING_APPROVAL', parsedData.reason || '');

    return {
      approved,
      status: parsedData.status || 'PENDING_APPROVAL',
      reason: parsedData.reason || '규정 분석 실패로 인해 안전을 위해 결재 대기 처리되었습니다.'
    };

  } catch (error: any) {
    console.error('RAG Approval check error:', error);
    const fallbackReason = `RAG 결재 심사 오류로 인해 삭제가 보류되었습니다. (에러: ${error.message})`;
    
    // 예외 상황 시에도 거버넌스 로그에 보류 상태로 기록
    try {
      await saveGovernanceLog(docType, docData, 'PENDING_APPROVAL', fallbackReason);
    } catch (logErr) {
      console.error('Failed to save fallback governance log:', logErr);
    }

    // 예외 발생 시 안전을 위한 폴백 (수동 결재 대기)
    return {
      approved: false,
      status: 'PENDING_APPROVAL',
      reason: fallbackReason
    };
  }
}
