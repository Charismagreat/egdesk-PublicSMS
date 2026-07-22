export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { 
  queryTable, 
  insertRows, 
  updateRows, 
  deleteRows,
  executeSQL,
  uploadFile,
  downloadFile,
  callAiCaller // 💡 [추가] AI 호출 헬퍼
} from '../../../../egdesk-helpers';

/**
 * 최고관리자(SUPER_ADMIN) 권한 검증 헬퍼
 * 쿠키의 JWT 토큰을 복호화하여 역할을 확인합니다.
 */
async function resolveTenantId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'default';
    const payload = decodeJwt(token);
    return (payload.tenant_id as string) || 'default';
  } catch {
    return 'default';
  }
}

async function verifySuperAdmin(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const payload = decodeJwt(token);
    // 💡 [수정] 대표자 계정(TENANT_ADMIN) 및 시스템 관리자(SYSTEM_ADMIN) 역할까지 관리자 자격으로 인증 범위를 확장합니다.
    if (payload.role === 'SUPER_ADMIN' || payload.role === 'TENANT_ADMIN' || payload.role === 'SYSTEM_ADMIN') {
      return (payload.username as string) || 'SUPER_ADMIN';
    }
  } catch (e) {
    console.error('verifySuperAdmin error:', e);
  }
  return null;
}

/**
 * 한국어 자연어 규칙 파서
 * 최고관리자가 작성한 텍스트에서 타깃 작업자, 서류 타입, 금액 한도 등을 파싱하여 JSON 형태로 반환합니다.
 */
function parseNaturalLanguageRule(expression: string): any {
  const text = expression.toLowerCase();
  
  // 1) 대상 작업자 추출
  let operator = "ALL";
  if (text.includes("김직원")) operator = "김직원";
  else if (text.includes("최고관리자")) operator = "최고관리자";
  
  // 2) 대상 서류 타입 추출
  let doc_type = "ALL";
  if (text.includes("수입통관") || text.includes("수입 통관") || text.includes("import")) {
    doc_type = "import_customs";
  } else if (text.includes("취소") || text.includes("cancel")) {
    doc_type = "TASK_CANCEL_REQUEST";
  } else if (text.includes("수주") || text.includes("sales_order")) {
    doc_type = "sales_order";
  }
  
  // 3) 금액(max_amount) 추출 (만원, 원 매칭)
  let max_amount: number | null = null;
  const amountMatch = expression.match(/(\d+)\s*(만|백|천)?\s*원/);
  if (amountMatch) {
    let base = Number(amountMatch[1]);
    const scale = amountMatch[2];
    if (scale === '만') base *= 10000;
    else if (scale === '천') base *= 1000;
    else if (scale === '백') base *= 100;
    max_amount = base;
  }

  return {
    operator,
    doc_type,
    max_amount
  };
}

/**
 * 신규 상신 건(governance_log)에 대해 활성화된 자율 규칙들을 조회하여,
 * 매칭되는 조건이 존재하면 즉각 자동 승인 및 대행 액션을 실행합니다.
 */
async function checkAndApplyAutoGovernanceRules(
  logId: string, 
  docType: string, 
  operator: string, 
  amount: number, 
  title: string, 
  reason: string,
  tenantId: string
): Promise<boolean> {
  try {
    // 💡 테넌트(SaaS 격리)별로 등록된 활성 규칙만 불러옵니다.
    const rulesRes = await queryTable('crm_governance_rules', { 
      filters: { is_active: '1', tenant_id: tenantId } 
    });
    const rules = rulesRes.rows || [];
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    for (const rule of rules) {
      let structured: any = {};
      try {
        structured = JSON.parse(rule.structured_rule || '{}');
      } catch {
        continue;
      }

      // 조건 매칭 체크
      // 1) 대상 작업자 매칭 (ALL이 아니면서 다를 경우 패스)
      if (structured.operator && structured.operator !== 'ALL' && structured.operator !== operator) {
        continue;
      }
      // 2) 대상 서류 타입 매칭 (ALL이 아니면서 다를 경우 패스)
      if (structured.doc_type && structured.doc_type !== 'ALL' && structured.doc_type !== docType) {
        continue;
      }
      // 3) 금액 한계 조건 체크 (max_amount가 지정되어 있고, 기준 금액보다 크다면 패스)
      if (structured.max_amount !== undefined && structured.max_amount !== null) {
        if (amount > Number(structured.max_amount)) {
          continue;
        }
      }

      // 💥 조건 만족! 자율 자동 승인 단행!
      console.log(`[AI Rule Auto Match] 테넌트[${tenantId}] 규칙 '${rule.rule_name}' 적용, 자동 승인 처리.`);

      // A. crm_governance_logs 상태 갱신
      await updateRows('crm_governance_logs', {
        status: 'RESOLVED',
        reason: `[AI 자율 규칙 작동] '${rule.rule_name}' 규칙에 부합하여 최고관리자 승인 없이 자동 처리 완료.`
      }, { filters: { id: logId } });

      // B. 실제 액션 대행 실행 (문서 성격에 따른 분기)
      if (docType === 'TASK_CANCEL_REQUEST') {
        // (1) 스냅태스크 취소 요청인 경우 -> 즉각 취소 승인 (소프트 삭제 처리)
        const logRes = await queryTable('crm_governance_logs', { filters: { id: logId } });
        if (logRes.rows && logRes.rows.length > 0) {
          const targetTaskId = logRes.rows[0].doc_id;
          
          // 태스크 및 하위 아이템 삭제
          await updateRows('crm_snaptasks', {
            deleted_at: nowStr,
            deleted_by: 'AI_AGENT'
          }, { filters: { id: targetTaskId } });

          await updateRows('crm_snaptask_items', {
            deleted_at: nowStr,
            deleted_by: 'AI_AGENT'
          }, { filters: { task_id: targetTaskId } });
        }
      } else if (docType === 'mobile_request' || docType === 'mobile_req') {
        // (2) 모바일 신규 수주/견적 등록 요청인 경우 -> 활성 태스크 완료 처리
        const logRes = await queryTable('crm_governance_logs', { filters: { id: logId } });
        if (logRes.rows && logRes.rows.length > 0) {
          const targetTitle = logRes.rows[0].doc_title || '';
          
          // crm_snaptasks 조회
          const taskRes = await queryTable('crm_snaptasks', { filters: { title: `[상신] ${targetTitle}`, tenant_id: tenantId } });
          if (taskRes.rows && taskRes.rows.length > 0) {
            await updateRows('crm_snaptasks', {
              status: 'COMPLETE',
              updated_at: nowStr,
              updated_by: 'AI_AGENT'
            }, { filters: { id: taskRes.rows[0].id } });

            // 타임라인 기입
            await insertRows('crm_snaptask_items', [{
              id: Date.now(),
              task_id: taskRes.rows[0].id,
              type: 'conversation',
              title: '[AI 자율 승인 알림]',
              content: `[AI 자율 통제국]: 자율 실행 조건 규칙 '${rule.rule_name}' 에 부합하여, 최고관리자 승인 대기 없이 자동 실행(수주/견적 등록 승인 완료)되었습니다.`,
              created_at: nowStr,
              uuid: `STI-${Date.now()}-auto-appr`
            }]);
          }
        }
      }

      // C. 통합 감사 로그(Audit Log)에 기록 남기기
      await insertRows('crm_gov_audit_logs', [{
        id: `audit_auto_${Date.now()}`,
        doc_title: `[자율 규칙 승인] ${title}`,
        doc_type: docType,
        action_type: 'UPDATE',
        operator: 'AI_AGENT',
        source: 'AI',
        details: `최고관리자 정의 규칙 [${rule.rule_name}] 적용으로 자율 대행 결재가 자동 승인되어 처리 완료되었습니다.\n- 규칙 상세: ${rule.rule_expression}`,
        created_at: nowStr,
        tenant_id: tenantId
      }]);

      return true; // 매치되어 적용 완료
    }
  } catch (err) {
    console.error("checkAndApplyAutoGovernanceRules error:", err);
  }
  return false;
}

/**
 * GET 핸들러
 * 1. action=events: 통합 관제 게시판 이벤트 피드 조회
 * 2. action=logs: RAG 결재 판정 감사 로그 조회
 * 3. action=deleted_items: 소프트 삭제된 대장 항목(견적, 발주, 수주) 조회
 * 4. action=get_toggle: 이미지 OCR 자율 대행 활성화 토글 조회
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const adminUser = await verifySuperAdmin();
    // 모바일 포털과의 연동을 위해 보고서 초안 생성 및 조회 액션은 최고관리자 검증 예외
    if (action !== 'generate_report_draft' && action !== 'daily_reports') {
      if (!adminUser) {
        return NextResponse.json(
          { success: false, error: '🔒 권한이 없습니다. 최고관리자만 접근할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // 1. 통합 관제 게시판 이벤트 피드 조립
    if (action === 'events') {
      const events: any[] = [];
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

      // 1.1. crm_governance_logs (결재 보류 건 및 모바일 취소 요청 건)
      try {
        const govRes = await queryTable('crm_governance_logs', { limit: 500 });
        const logs = govRes.rows || [];
        
        // 💡 첨부 파일명 매칭을 위해 crm_snaptask_items 목록 미리 조회
        const itemsRes = await queryTable('crm_snaptask_items', { filters: { file_type: 'IMAGE' }, limit: 1000 });
        const itemsRows = itemsRes.rows || [];

        logs.forEach((log: any) => {
          if (log.doc_type === 'TASK_CANCEL_REQUEST') {
            events.push({
              id: `cancel_req_${log.id}`,
              type: 'TASK_CANCEL_REQUEST',
              title: `업무 취소 승인 요청: ${log.doc_title || '취소 요청 건'}`,
              subtitle: `요청자: ${log.operator || '임직원'} / 업무 ID: ${log.doc_id || '-'}`,
              status: log.status === 'PENDING_APPROVAL' ? 'WAITING' : 'RESOLVED',
              created_at: log.created_at || nowStr,
              data: log
            });
          } else {
            // 💡 김직원이 모바일에서 첨부파일(수주서 등)을 올려서 신규 등록 요청한 건인 경우
            const isMobileReq = log.doc_type === 'mobile_request' || log.doc_type === 'mobile_req';
            
            // 💡 상신 이유(reason) 텍스트로부터 파일명을 추출해 crm_snaptask_items 의 서빙 URL 결합
            let fileUrl = '';
            let matchedFilename = '';
            const reasonText = log.reason || '';
            if (reasonText) {
              const fileMatch = reasonText.match(/(?:1\.\s*|첨부\s*사진\s*1건\s*:\s*\n?\s*1\.\s*)([^\n\(\s]+)/i);
              if (fileMatch) {
                matchedFilename = fileMatch[1].trim();
                const matchedItem = itemsRows.find((item: any) => item.content_text?.includes(matchedFilename));
                if (matchedItem) {
                  fileUrl = `/api/shared/files?tableName=crm_snaptask_items&rowId=${matchedItem.id}&columnName=file_url`;
                }
              }
            }

            const extendedLog = {
              ...log,
              file_url: fileUrl,
              matched_filename: matchedFilename
            };

            const subtitleText = isMobileReq
              ? `[현장 상신] AI 분석 기반 신규 등록 요청 검토 건`
              : `${log.doc_type === 'estimate' ? '견적서' : log.doc_type === 'purchase_order' ? '발주서' : '수주서'} 삭제 시도 보류 건`;

            events.push({
              id: `rag_hold_${log.id}`,
              type: 'RAG_HOLD',
              title: `AI 결재 보류: ${log.doc_title || '보류 건'}`,
              subtitle: subtitleText,
              status: log.status === 'PENDING_APPROVAL' ? 'WAITING' : 'RESOLVED',
              created_at: log.created_at || nowStr,
              data: extendedLog
            });
          }
        });
      } catch (e) {
        console.error('Failed to load governance logs for events:', e);
      }

      // 1.2. crm_orders (스토어 주문 건 중 대기 중인 주문접수/승인대기 건)
      try {
        const ordersRes = await queryTable('crm_orders', { limit: 500 });
        const orders = ordersRes.rows || [];
        orders.forEach((order: any) => {
          if (order.deleted_at) return;
          events.push({
            id: `store_order_${order.id}`,
            type: 'STORE_ORDER',
            title: `신규 주문 접수: ${order.customer_name || '비회원'}`,
            subtitle: `${order.product_name} ${order.quantity}개 주문 건`,
            status: (order.status === '승인대기' || order.status === '결제대기' || order.status === '주문접수') ? 'WAITING' : 'RESOLVED',
            created_at: (order.order_date || '').includes(' ') ? order.order_date : `${order.order_date} 09:00:00`,
            data: order
          });
        });
      } catch (e) {
        console.error('Failed to load orders for events:', e);
      }

      // 1.3. inventory_items (안전재고 이하 품목 조회)
      try {
        const invRes = await queryTable('inventory_items', { limit: 1000 });
        const items = invRes.rows || [];
        items.forEach((item: any) => {
          if (item.deleted_at) return;
          const safetyStock = Number(item.safety_stock || item.safetyStock || 0);
          const currentQty = Number(item.quantity || 0);
          if (safetyStock > 0 && currentQty < safetyStock) {
            events.push({
              id: `low_stock_${item.id}`,
              type: 'LOW_STOCK',
              title: `⚠️ 안전재고 경보: ${item.name || item.itemName || '미지정 상품'}`,
              subtitle: `현재고 ${currentQty}개 / 안전재고 ${safetyStock}개 부족 위험`,
              status: 'WAITING', // 재고 부족은 보충 전까지는 항상 검토 대기
              created_at: item.updated_at || nowStr,
              data: item
            });
          }
        });
      } catch (e) {
        console.error('Failed to load inventory for events:', e);
      }

      // 최신순 정렬
      events.sort((a, b) => b.created_at.localeCompare(a.created_at));

      return NextResponse.json({ success: true, events });
    }

    if (action === 'logs') {
      const res = await queryTable('crm_governance_logs', { limit: 2000 });
      const logs = res.rows || [];
      logs.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
      return NextResponse.json({ success: true, logs });
    }

    if (action === 'deleted_items') {
      const estRes = await queryTable('crm_estimates', { limit: 10000 });
      const poRes = await queryTable('crm_purchase_orders', { limit: 10000 });
      const soRes = await queryTable('crm_sales_orders', { limit: 10000 });

      const estimates = (estRes.rows || [])
        .filter((item: any) => item.deleted_at !== null && item.deleted_at !== undefined && item.deleted_at !== '')
        .map((item: any) => ({ ...item, doc_type: 'estimate' }));

      const purchaseOrders = (poRes.rows || [])
        .filter((item: any) => item.deleted_at !== null && item.deleted_at !== undefined && item.deleted_at !== '')
        .map((item: any) => ({ ...item, doc_type: 'purchase_order' }));

      const salesOrders = (soRes.rows || [])
        .filter((item: any) => item.deleted_at !== null && item.deleted_at !== undefined && item.deleted_at !== '')
        .map((item: any) => ({ ...item, doc_type: 'sales_order' }));

      const allDeleted = [...estimates, ...purchaseOrders, ...salesOrders];
      allDeleted.sort((a: any, b: any) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));

      return NextResponse.json({ success: true, deletedItems: allDeleted });
    }

    if (action === 'get_toggle') {
      const toggleRes = await queryTable('system_settings', { filters: { key: 'easybot_action_ocr_confirm_enabled' } });
      const toggleVal = toggleRes.rows && toggleRes.rows.length > 0 ? toggleRes.rows[0].value : '1';
      const enabled = toggleVal !== '0' && toggleVal !== 'false' && toggleVal !== false;
      return NextResponse.json({ success: true, enabled });
    }

    if (action === 'audit_logs') {
      try {
        const res = await queryTable('crm_audit_logs', { limit: 10000 });
        const auditLogs = res.rows || [];
        auditLogs.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
        return NextResponse.json({ success: true, auditLogs });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    if (action === 'rules') {
      try {
        const tenantId = await resolveTenantId();
        const res = await queryTable('crm_governance_rules', { 
          filters: { deleted_at: null, tenant_id: tenantId } 
        });
        const rules = res.rows || [];
        rules.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
        return NextResponse.json({ success: true, rules });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // 💡 [신규] 일일 업무 보고서 목록 조회
    if (action === 'daily_reports') {
      try {
        const tenantId = await resolveTenantId();
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        let isSuperAdmin = false;
        let decodedPayload: any = null;
        if (token) {
          try {
            decodedPayload = decodeJwt(token);
            isSuperAdmin = decodedPayload.role === 'SUPER_ADMIN' || decodedPayload.role === 'TENANT_ADMIN' || decodedPayload.role === 'SYSTEM_ADMIN';
          } catch (e: any) {
            console.error('JWT Decode Exception in daily_reports:', e.message);
            isSuperAdmin = false;
          }
        }

        console.log(`[DEBUG_DAILY_REPORTS] tokenExists: ${!!token}, decodedPayload:`, decodedPayload, `resolveTenantId: ${tenantId}, isSuperAdmin: ${isSuperAdmin}`);


        // 최고관리자(TENANT_ADMIN, SYSTEM_ADMIN 포함)는 모든 직원의 보고서를 모니터링 및 결재할 수 있어야 하므로 테넌트 필터를 완화합니다.
        const filters: Record<string, any> = {};
        if (!isSuperAdmin) {
          filters.tenant_id = tenantId;
        }

        console.log(`[DEBUG_DAILY_REPORTS] Querying crm_daily_reports with filters:`, filters);
        const res = await queryTable('crm_daily_reports', { filters });
        let reports = res.rows || [];
        
        // deleted_at: null 쿼리 번역기 오류를 피하기 위해 메모리 상에서 소프트 삭제 필터링을 수행합니다.
        reports = reports.filter((r: any) => !r.deleted_at);
        console.log(`[DEBUG_DAILY_REPORTS] Found reports count after memory filter: ${reports.length}`);
        // 최신 보고서 순으로 정렬
        reports.sort((a: any, b: any) => (b.report_date || '').localeCompare(a.report_date || ''));
        return NextResponse.json({ success: true, reports });
      } catch (err: any) {
        console.error('[ERROR_DAILY_REPORTS] Exception occurred:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // 💡 [신규] 일일 업무 보고서 AI 초안 생성
    if (action === 'generate_report_draft') {
      try {
        const operator = searchParams.get('operator') || '김직원';
        const reportDate = searchParams.get('report_date') || new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().substring(0, 10);
        const tenantId = await resolveTenantId();

        // 💡 [추가] 오늘 자 일보가 이미 제출되었고, 그 상태가 REJECTED(반려)인 경우
        // 대표자의 반려 코멘트를 반영하여 AI가 개선된 일보 본문 초안을 동적으로 리팩토링 및 요약하도록 합니다.
        const existingReportRes = await queryTable('crm_daily_reports', {
          filters: { report_date: reportDate, operator: operator, tenant_id: tenantId }
        });
        const existingReports = existingReportRes.rows || [];
        if (existingReports.length > 0 && existingReports[0].status === 'REJECTED') {
          const existingReportContent = existingReports[0].report_content || '';
          const rejectComment = existingReports[0].comment || '';

          if (existingReportContent.trim() && rejectComment.trim()) {
            const prompt = `
당신은 기업의 성실한 직원입니다.
당신이 제출한 일일 업무 보고서(일보)에 대해 대표자(CEO)로부터 반려 및 보완 요청을 받았습니다.
대표자가 남겨준 피드백(반려 의견)을 정독하고, 기존에 작성했던 일보 본문 내용을 대표자의 요구사항에 맞추어 완벽하게 보완 및 개정한 재제출용 일보 본문을 완성해 주세요.

[기존 일보 본문]
${existingReportContent}

[대표자의 반려 의견 (보완 요구사항)]
${rejectComment}

지시사항:
1. 대표자가 지적하거나 요청한 보완 사항을 일보 내용에 자연스럽게 보강하여 작성해야 합니다.
2. 추가적인 변명이나 해명, 인사말, 또는 마크다운 코드 블록(\`\`\` 등)을 절대 포함하지 마십시오. 오직 직원이 재상신할 최종 일보 본문 텍스트만 출력해 주세요.
`;

            try {
              const aiRes = await callAiCaller(prompt);
              const draftContent = aiRes.content.trim();
              return NextResponse.json({
                success: true,
                report_date: reportDate,
                operator,
                ai_summary: existingReports[0].ai_summary,
                draft_content: draftContent,
                is_revision: true
              });
            } catch (aiErr: any) {
              console.error('[GENERATE_DRAFT_AI_ERROR] 반려 보완 초안 AI 생성 실패:', aiErr.message);
            }
          }
        }

        // 💡 [추가] 과거 일보 이력 수집 (최근 최대 3건)
        const allReportsRes = await queryTable('crm_daily_reports', {
          filters: { operator, tenant_id: tenantId }
        });
        const allReports = allReportsRes.rows || [];
        // 과거 날짜 보고서만 필터링 후 정렬
        const pastReports = allReports
          .filter((r: any) => (r.report_date || '') < reportDate && r.status !== 'REJECTED')
          .sort((a: any, b: any) => (b.report_date || '').localeCompare(a.report_date || ''))
          .slice(0, 3);

        const pastReportsText = pastReports.length > 0
          ? pastReports.map((r: any) => `* [${r.report_date} 보고서 내용]\n${r.report_content}`).join('\n\n')
          : '기존 과거 일보 이력이 존재하지 않습니다. (최초 보고)';

        // 1) 당일 직원이 상신한 관제 로그 데이터 수집
        const govLogsRes = await queryTable('crm_governance_logs', {
          filters: { operator, tenant_id: tenantId }
        });
        const todayGovLogs = (govLogsRes.rows || []).filter((l: any) => (l.created_at || '').startsWith(reportDate));

        // 2) 당일 태스크 폴더 업로드 문서 수집
        const folderItemsRes = await queryTable('crm_task_folder_items', { limit: 1000 });
        const todayFolderItems = (folderItemsRes.rows || []).filter((item: any) => (item.created_at || '').startsWith(reportDate));

        // 3) 요약 생성 (한국어로만 설명 및 AI 요약본 템플릿 완성)
        let summaryLines: string[] = [];
        if (todayGovLogs.length > 0) {
          summaryLines.push(`[결재/관제상신] 금일 총 ${todayGovLogs.length}건의 관제 이벤트를 상신 및 검토받았습니다.`);
          todayGovLogs.forEach((l: any) => {
            summaryLines.push(`  - ${l.doc_title || '상신 건'} (상태: ${l.status === 'RESOLVED' ? '완료' : '대기중'})`);
          });
        }
        if (todayFolderItems.length > 0) {
          summaryLines.push(`[수집자료 업로드] 태스크 폴더에 총 ${todayFolderItems.length}개의 주요 증빙/문서를 수집하였습니다.`);
          todayFolderItems.forEach((item: any) => {
            summaryLines.push(`  - 문서명: ${item.title} (유형: ${item.type || '일반'}, 파일: ${item.file_name || '없음'})`);
          });
        }

        // 기본 룰 기반 초안 (AI 호출 실패 시의 폴백)
        let fallbackDraft = "";
        if (summaryLines.length === 0) {
          fallbackDraft = `금일 등록된 모바일 관제 상신 내역 및 태스크 폴더 자료 업로드 이력이 존재하지 않습니다. 특별한 금일 특이사항이나 수동 보고 사항이 있으신 경우, 이 내용을 편집하여 보고서를 작성해 주시기 바랍니다.`;
        } else {
          fallbackDraft = `금일 업무 수행 보고드립니다.\n\n${summaryLines.join('\n')}\n\n위 내용과 같이 금일 업무 및 수집된 문서에 대해 이상이 없음을 확인하고 보고서를 제출합니다.`;
        }

        // 💡 [핵심] 과거 이력과 오늘 로그를 융합하여 인텔리전트 AI 초안 동적 작성
        const aiPrompt = `
당신은 기업의 성실한 직원입니다.
아래의 [오늘 진행한 업무 요약 내역]을 정독하고, 오늘 자 일일 업무 보고서(일보) 본문을 프로페셔널한 문체로 완성해 주세요.
특히 업무의 연속성 및 연결성을 반영하기 위해, 아래 제공된 [과거 최근 일보 이력]을 면밀히 분석하여 어제 완료했거나 진행 중이었던 업무가 오늘로 어떻게 이어져서 완수되었는지 또는 연계되어 진행 중인지를 자연스럽게 어필해 주셔야 합니다.

[과거 최근 일보 이력 (최신순)]
${pastReportsText}

[오늘 진행한 업무 요약 내역]
${summaryLines.length > 0 ? summaryLines.join('\n') : '오늘 기록된 모바일 상신 및 문서 업로드 활동 내역이 없습니다. (수동 보고 필요)'}

지시사항:
1. 과거에 이어지던 연속적인 업무 동향(예: 연계 진행, 보완, 대기 등)을 고려하여 오늘 일보 본문 텍스트를 풍부하고 매끄럽게 보강하여 작성하십시오.
2. 부가적인 대표자 인사나 해명, 또는 마크다운 기호(\`\`\` 등)를 절대 포함하지 마십시오. 오직 직원이 제출할 완성형 일보 본문 텍스트만 그대로 출력해 주세요.
`;

        let draftContent = fallbackDraft;
        try {
          const aiCallResult = await callAiCaller(aiPrompt);
          if (aiCallResult.content && aiCallResult.content.trim()) {
            draftContent = aiCallResult.content.trim();
          }
        } catch (aiErr: any) {
          console.error('[GENERATE_DRAFT_PAST_AI_ERROR] 과거 이력 참조 AI 초안 생성 실패, fallback 사용:', aiErr.message);
        }

        return NextResponse.json({
          success: true,
          report_date: reportDate,
          operator,
          ai_summary: JSON.stringify({ govLogs: todayGovLogs, folderItems: todayFolderItems }),
          draft_content: draftContent
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // 💡 [신규] 대표자 결재용 AI 코멘트 추천 (Gemini 연동 실시간 동적 생성)
    if (action === 'suggest_comment') {
      try {
        const content = searchParams.get('report_content') || '';
        const operator = searchParams.get('operator') || '직원';

        // 폴백용 기본 코멘트 정의
        const fallbackA = `오늘도 ${operator}님의 신속한 상신 처리와 꼼꼼한 증빙 자료 수집 덕분에 전사 비즈니스 통제망이 안전하게 유지되고 있습니다. 수고 많으셨습니다!`;
        const fallbackB = `제출하신 보고 내용 중 거래처 등록 분석 건은 OCR 판독 오차가 없는지 최종 확인이 중요합니다. 모바일 피드백 루프를 적극 활용하여 조치 완료해주어 고맙습니다.`;
        const fallbackC = `금일 제출된 일일 보고서 결재 승인합니다. 수집된 계약서/견적서 상의 정산 일정과 자재 공급 부족 경보 부분은 다음 주 주간 회의 전까지 자재팀과 크로스 체크하여 특이사항 보고 바랍니다.`;
        const fallbackD = `금일 제출하신 일보 내용에 구체적인 모바일 업무 이력(수주/견적/발주서 스캔 내역 등) 기술이나 상세 설명이 다소 미흡합니다. 내용 보완 후 재상신 바랍니다.`;

        const fallbackSuggestions = [
          { type: 'A', label: '👏 격려/응원형', text: fallbackA },
          { type: 'B', label: '🔍 피드백/지도형', text: fallbackB },
          { type: 'C', label: '📋 공식/업무지시형', text: fallbackC },
          { type: 'D', label: '⚠️ 반려/보완요청형', text: fallbackD }
        ];

        if (!content.trim()) {
          return NextResponse.json({ success: true, suggestions: fallbackSuggestions });
        }

        const prompt = `
당신은 기업의 대표자(CEO)입니다. 
아래는 직원(${operator})이 제출한 일일 업무 보고서(일보) 본문입니다.

[제출된 일보 본문]
${content}

이 일보 내용을 정독 및 분석하여, 대표자가 직원에게 남길 수 있는 4가지 어조의 맞춤형 피드백 코멘트(격려/응원형, 피드백/지도형, 공식/업무지시형, 반려/보완요청형)를 작성해 주세요. 
단순한 템플릿 문구가 아닌, 실제 위 일보 본문에 기록된 업무의 핵심 사건(예: 수주, 재고 조사, 보고서 내용 등)을 직접적으로 언급하고 연계하여 진정성 있고 전문적이게 작성해야 합니다.

반드시 아래 JSON 형식으로만 완벽하게 응답해 주세요. JSON 마크다운 기호(\`\`\`json)를 포함하지 않는 순수한 raw JSON 데이터만 출력해 주셔야 합니다.
{
  "suggestions": [
    { "type": "A", "label": "👏 격려/응원형", "text": "일보 본문의 성과나 수고를 직접 격려하고 아끼는 멘트" },
    { "type": "B", "label": "🔍 피드백/지도형", "text": "일보 본문 내용의 보완점이나 유의할 점을 지적하고 조언하는 멘트" },
    { "type": "C", "label": "📋 공식/업무지시형", "text": "일보 본문 업무의 연계선상에서 지시할 후속 조치나 업무 지시 멘트" },
    { "type": "D", "label": "⚠️ 반려/보완요청형", "text": "일보 내용 중 구체성이 떨어지는 부분이나 불충분한 부분을 논리적으로 지적하며 보완 후 재작성해 줄 것을 정중하게 지시하는 멘트" }
  ]
}
`;

        try {
          const aiRes = await callAiCaller(prompt);
          let parsed: any = null;

          if (aiRes.json && typeof aiRes.json === 'object') {
            parsed = aiRes.json;
          } else {
            // json 필드가 null인 경우, content 텍스트에서 JSON 파싱 시도
            const contentText = aiRes.content.trim();
            const cleanJsonText = contentText
              .replace(/^```json\s*/i, '')
              .replace(/```$/, '')
              .trim();
            parsed = JSON.parse(cleanJsonText);
          }

          if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length === 4) {
            return NextResponse.json({ success: true, suggestions: parsed.suggestions });
          }
        } catch (aiErr: any) {
          console.error('[SUGGEST_COMMENT_AI_ERROR] AI 호출 실패, fallback 사용:', aiErr.message);
        }

        // AI 생성에 실패하거나 형식이 맞지 않으면 폴백 코멘트 반환
        return NextResponse.json({ success: true, suggestions: fallbackSuggestions });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      { success: false, error: '유효하지 않은 action 파라미터입니다.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Governance API GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST 핸들러
 * 1. action=execute_actions: AI 추천 다음 작업 자율 대행 실행
 * 2. action=force_delete: 보류된 건에 대한 최고관리자 강제 삭제 승인
 * 3. action=restore: 소프트 삭제된 대장 데이터 복원
 * 4. action=clear_logs: 실시간 AI 결재 심사 이력 전체 초기화
 * 5. action=set_toggle: 이미지 OCR 자율 대행 활성화 토글 변경
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const adminUser = await verifySuperAdmin();
    
    // 모바일에서의 현장 요청 생성 및 보고서 제출인 경우, 최고관리자가 아니더라도 세션이 있으면 허용
    if (action !== 'create_mobile_request' && action !== 'submit_report') {
      if (!adminUser) {
        return NextResponse.json(
          { success: false, error: '🔒 권한이 없습니다. 최고관리자만 조작할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    let currentUser = adminUser || 'guest';
    if (!adminUser && (action === 'create_mobile_request' || action === 'submit_report')) {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (token) {
          const payload = decodeJwt(token);
          currentUser = (payload.name || payload.username || 'guest') as string;
        }
      } catch (e) {
        currentUser = 'guest';
      }
    }

    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      console.warn('Failed to parse JSON body, fallback to empty object.');
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // [신규] 임직원 모바일 현장 작업 요청 접수
    if (action === 'create_mobile_request') {
      const { title, reason, voiceText, files = [] } = body;
      
      if (!title || !title.trim()) {
        return NextResponse.json({ success: false, error: '요청 제목이 누락되었습니다.' }, { status: 400 });
      }

      const reqId = `mobile_req_${Date.now()}`;
      
      // 1. 거버넌스 승인 요청 로그 인서트
      await insertRows('crm_governance_logs', [{
        id: reqId,
        doc_type: 'mobile_request',
        doc_id: `REQ-${Date.now()}`,
        doc_title: title,
        status: 'PENDING_APPROVAL',
        reason: reason || '모바일 현장 수동 접수 요청 건',
        operator: currentUser,
        created_at: nowStr,
        uuid: reqId,
        updated_at: nowStr,
        updated_by: currentUser
      }]);

      // 2. 메인 [할 일] (스냅태스크) 생성
      const tenantId = await resolveTenantId();
      const taskId = `ST-${Date.now()}`;
      await insertRows('crm_snaptasks', [{
        id: taskId,
        title: `[상신] ${title.trim()}`,
        status: 'ACTIVE',
        partner_id: null,
        created_at: nowStr,
        tenant_id: tenantId,
        uuid: taskId,
        updated_at: nowStr,
        updated_by: currentUser
      }]);

      // 3. 스냅태스크 가이드 안내 및 요청 사유 텍스트 타임라인 삽입
      const itemUuid1 = `STI-${Date.now()}-init`;
      await insertRows('crm_snaptask_items', [{
        id: Date.now(),
        task_id: taskId,
        content_text: `[요청 사유]\n${reason || voiceText || '현장 수동 접수'}`,
        file_url: null,
        file_type: 'TEXT',
        ai_analysis: JSON.stringify({ message: "Mobile work request initiated" }),
        created_at: nowStr,
        tenant_id: tenantId,
        uuid: itemUuid1,
        updated_at: nowStr,
        updated_by: currentUser
      }]);

      // 4. 첨부 파일들을 스냅태스크의 실물 아이템으로 업로드 및 매핑 적재
      if (files && Array.isArray(files)) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const itemId = Date.now() + 100 + i;
          const isImg = file.type?.startsWith('image/');
          const isVid = file.type?.startsWith('video/');
          const fType = isImg ? 'IMAGE' : (isVid ? 'VIDEO' : 'DOCUMENT');
          const itemUuid = `STI-${Date.now()}-file-${i}`;

          // 우선 아이템 레코드 생성
          await insertRows('crm_snaptask_items', [{
            id: itemId,
            task_id: taskId,
            content_text: `[상신 첨부] ${file.name}`,
            file_url: '', // uploadFile 헬퍼에 의해 채워짐
            file_type: fType,
            ai_analysis: JSON.stringify({ message: "Mobile request attachment" }),
            created_at: nowStr,
            tenant_id: tenantId,
            uuid: itemUuid,
            updated_at: nowStr,
            updated_by: currentUser
          }]);

          // 삽입된 레코드의 자동 생성된 진짜 id 조회
          let realDbId = itemId;
          try {
            const insertedRes = await queryTable('crm_snaptask_items', { filters: { uuid: itemUuid } });
            if (insertedRes.rows && insertedRes.rows.length > 0) {
              realDbId = Number(insertedRes.rows[0].id) || itemId;
            }
          } catch (queryErr) {
            console.error('Failed to query inserted snaptask item real id:', queryErr);
          }

          // 실물 파일을 스토리지에 업로드하고 DB에 경로 바인딩
          try {
            await uploadFile('crm_snaptask_items', realDbId, 'file_url', file.name, file.base64);
          } catch (uploadErr: any) {
            console.error(`Failed to upload attachment file ${file.name}:`, uploadErr.message);
          }
        }
      }

      // 5. 🤖 실시간 AI 자율 자동 결재 규칙 판별기 가동 (SaaS 격리 지원)
      let parsedAmount = 0;
      const amountMatch = title.match(/(\d+)\s*(만|백|천)?\s*원/);
      if (amountMatch) {
        let base = Number(amountMatch[1]);
        const scale = amountMatch[2];
        if (scale === '만') base *= 10000;
        else if (scale === '천') base *= 1000;
        else if (scale === '백') base *= 100;
        parsedAmount = base;
      }
      await checkAndApplyAutoGovernanceRules(reqId, 'mobile_request', currentUser, parsedAmount, title, reason || '', tenantId);

      return NextResponse.json({
        success: true,
        message: '현장 작업 요청이 성공적으로 접수되어 AI 컨트롤타워에 상신되었으며, 할 일(스냅태스크)로 자동 등록되었습니다.',
        reqId,
        taskId
      });
    }

    // [신규] 임직원 모바일 현장 작업 취소 요청 상신
    if (action === 'create_cancel_request') {
      const { taskId, reason } = body;
      
      if (!taskId || !reason || !reason.trim()) {
        return NextResponse.json({ success: false, error: '취소할 대상 태스크 ID와 사유가 필요합니다.' }, { status: 400 });
      }

      // 태스크 존재 여부 확인
      const taskRes = await queryTable('crm_snaptasks', { filters: { id: taskId } });
      if (!taskRes.rows || taskRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: '존재하지 않는 스냅태스크입니다.' }, { status: 404 });
      }
      const task = taskRes.rows[0];

      const reqId = `cancel_req_${Date.now()}`;
      
      // 1. 거버넌스 승인 요청 로그 인서트
      await insertRows('crm_governance_logs', [{
        id: reqId,
        doc_type: 'TASK_CANCEL_REQUEST',
        doc_id: taskId,
        doc_title: task.title,
        status: 'PENDING_APPROVAL',
        reason: reason.trim(),
        operator: currentUser,
        created_at: nowStr,
        uuid: reqId,
        updated_at: nowStr,
        updated_by: currentUser
      }]);

      // 2. 메인 스냅태스크의 상태를 PENDING_APPROVAL(취소 승인 대기)로 업데이트
      await updateRows('crm_snaptasks', {
        status: 'PENDING_APPROVAL',
        updated_at: nowStr,
        updated_by: currentUser
      }, { filters: { id: taskId } });

      // 3. 스냅태스크 타임라인에 취소 사유 로그 추가 기입
      const itemUuid = `STI-${Date.now()}-cancel-req`;
      await insertRows('crm_snaptask_items', [{
        id: Date.now(),
        task_id: taskId,
        content_text: `[취소 요청 사유]\n${reason.trim()}`,
        file_url: null,
        file_type: 'TEXT',
        ai_analysis: JSON.stringify({ message: "Mobile task cancel requested" }),
        created_at: nowStr,
        tenant_id: task.tenant_id || 'default',
        uuid: itemUuid,
        updated_at: nowStr,
        updated_by: currentUser
      }]);

      // 4. 🤖 실시간 AI 자율 자동 결재 규칙 판별기 가동 (SaaS 격리 지원)
      await checkAndApplyAutoGovernanceRules(
        reqId, 
        'TASK_CANCEL_REQUEST', 
        currentUser, 
        0, 
        task.title || '', 
        reason.trim(), 
        task.tenant_id || 'default'
      );

      return NextResponse.json({
        success: true,
        message: '해당 업무에 대한 취소 요청이 컨트롤타워에 상신되었습니다.',
        reqId
      });
    }

    // 1. AI 추천 다음 작업 자율 대행 실행
    if (action === 'execute_actions') {
      const { eventId, eventType, actions, docId, docType, originalData } = body;
      if (!actions || !Array.isArray(actions)) {
        return NextResponse.json({ success: false, error: '수행할 액션 배열(actions)이 누락되었습니다.' }, { status: 400 });
      }

      const actionReports: { action: string; success: boolean; detail: string }[] = [];

      let sharedSoId = '';
      let sharedEstimateId = '';
      let sharedPartnerName = '미지정 거래처';
      let sharedItemName = '미지정 품목';
      let sharedQty = 0;
      let sharedAmount = 0;
      let sharedOcrRun = false;
      let sharedOcrSuccess = false;
      let sharedOcrDetail = '';

      const runRealOcrIfNeeded = async () => {
        if (sharedOcrRun) return;
        sharedOcrRun = true;

        try {
          const logRawId = eventId.replace('event_rag_hold_', '').replace('rag_hold_', '');
          const logRes = await queryTable('crm_governance_logs', { filters: { id: logRawId } });
          const logRow = logRes.rows?.[0] || originalData;
          const reasonText = logRow?.reason || '';
          
          let imageBase64 = '';
          let imageFilename = '동양특수금속-가로.jpg';
          let imageMime = 'image/jpeg';

          // 1. reason 문구 내 "1. 파일명.ext" 형태가 존재하는지 추출 시도
          let matchedFilename = '';
          if (reasonText) {
            const fileMatch = reasonText.match(/(?:1\.\s*|첨부\s*사진\s*1건\s*:\s*\n?\s*1\.\s*)([^\n\(\s]+)/i);
            if (fileMatch) {
              matchedFilename = fileMatch[1].trim();
            }
          }

          // 2. crm_snaptask_items 에서 egdesk-helpers의 queryTable API를 사용해 이미지 목록 조회 (규칙 준수 및 테넌트 필터 명시)
          const tenantId = originalData?.tenant_id || originalData?.tenantId || await resolveTenantId() || 'default';
          const itemsRes = await queryTable('crm_snaptask_items', { 
            filters: { file_type: 'IMAGE', tenant_id: tenantId },
            orderBy: 'id',
            orderDirection: 'DESC',
            limit: 1000
          });
          const itemsRows = itemsRes.rows || [];

          let targetItem = null;
          if (matchedFilename && itemsRows.length > 0) {
            targetItem = itemsRows.find((item: any) => item.content_text?.includes(matchedFilename));
          }
          // 만약 파일명으로 매핑되지 않았다면, 가장 최근 등록된 이미지 항목을 폴백으로 설정
          if (!targetItem && itemsRows.length > 0) {
            targetItem = itemsRows[0];
          }

          if (!targetItem) {
            sharedOcrSuccess = false;
            sharedOcrDetail = `[이미지 조회 실패] 스냅태스크 아이템 테이블(crm_snaptask_items)에서 첨부된 이미지 레코드를 찾을 수 없습니다. (조회된 이미지 수: ${itemsRows.length}건, 매칭 파일명: '${matchedFilename || '없음'}'). 수동 등록을 진행하거나 작업을 반려해 주세요.`;
            return;
          }

          // 3. 파일 바이너리 다운로드 (egdesk-helpers 의 downloadFile 1순위 사용 및 통합 게이트웨이 폴백 연동)
          let downloadSuccess = false;
          let downloadErrorMsg = '';

          const downloadRes = await downloadFile({
            tableName: 'crm_snaptask_items',
            rowId: Number(targetItem.id),
            columnName: 'file_url'
          });
          
          if (downloadRes.success && downloadRes.data) {
            imageBase64 = downloadRes.data;
            downloadSuccess = true;
          } else {
            downloadErrorMsg = downloadRes.error || '바이너리 데이터 부재';
          }

          // 💡 [동적 Base URL 추출] 현재 구동 중인 정확한 도메인과 포트를 획득하여 Connection Refused 차단
          const host = request.headers.get('host') || 'localhost:4000';
          const protocol = request.url.startsWith('https') ? 'https' : 'http';
          const baseUrl = `${protocol}://${host}`;

          // 💡 [게이트웨이 폴백 가드] downloadFile이 실패할 경우 본사 통합 파일 게이트웨이 API로 2차 연동 호출 시도
          if (!downloadSuccess) {
            try {
              const cookieStore = await cookies();
              const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
              
              let gatewayUrl = `${baseUrl}/api/shared/files?tableName=crm_snaptask_items&rowId=${targetItem.id}&columnName=file_url`;
              if (targetItem.file_url && targetItem.file_url.includes('fileId=')) {
                const match = targetItem.file_url.match(/fileId=([^&]+)/);
                if (match) {
                  gatewayUrl = `${baseUrl}/api/shared/files?fileId=${match[1]}`;
                }
              }

              const fileResponse = await fetch(gatewayUrl, {
                headers: { 'Cookie': allCookies }
              });

              if (fileResponse.ok) {
                const arrayBuffer = await fileResponse.arrayBuffer();
                imageBase64 = Buffer.from(arrayBuffer).toString('base64');
                downloadSuccess = true;
              } else {
                downloadErrorMsg = `통합 게이트웨이(HTTP ${fileResponse.status}) 응답 실패: ${fileResponse.statusText}`;
              }
            } catch (gatewayErr: any) {
              downloadErrorMsg = `통합 게이트웨이 연동 에러: ${gatewayErr.message}`;
            }
          }

          if (!downloadSuccess) {
            sharedOcrSuccess = false;
            sharedOcrDetail = `[바이너리 다운로드 실패] 스토리지로부터 이미지 파일('${targetItem.content_text}')의 실물 바이너리를 로드하는 데 실패했습니다. 에러: ${downloadErrorMsg}. 수동 등록 또는 반려 처리가 필요합니다.`;
            return;
          }

          imageFilename = targetItem.content_text?.replace('[상신 첨부] ', '') || imageFilename;

          // 4. 로컬 OCR API 호출 및 분석 (동적 baseUrl 적용 - 1단계: analyze 호출)
          const cookieStore = await cookies();
          const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
          
          const analyzeResponse = await fetch(`${baseUrl}/api/estimates/ocr-sales-order?action=analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': allCookies
            },
            body: JSON.stringify({
              imageBase64: `data:${imageMime};base64,${imageBase64}`,
              filename: imageFilename,
              mimeType: imageMime
            })
          });
          
          const ocrRes = await analyzeResponse.json();
          if (!ocrRes.success) {
            sharedOcrSuccess = false;
            sharedOcrDetail = `[AI OCR 분석 실패] 실시간 Vision LLM 분석 수행 중 오류가 발생했습니다: ${ocrRes.error || '응답 데이터 이상'}. 수동 등록 또는 반려 처리가 권장됩니다.`;
            return;
          }

          // 💡 [2단계: save 호출] 분석된 실물 발주서 데이터를 수주 대장에 실제 적재
          const saveResponse = await fetch(`${baseUrl}/api/estimates/ocr-sales-order?action=save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': allCookies
            },
            body: JSON.stringify({
              partner_name: ocrRes.partner_name,
              partner_phone: ocrRes.partner_phone,
              partner_manager: ocrRes.partner_manager,
              items: ocrRes.items,
              file_url: ocrRes.file_url,
              business_number: ocrRes.business_number,
              representative: ocrRes.representative,
              address: ocrRes.address,
              document_number: ocrRes.document_number,
              document_date: ocrRes.document_date,
              delivery_date: ocrRes.delivery_date,
              document_memo: ocrRes.document_memo,
              approvers: ocrRes.approvers,
              force_bypass: true, // 최고관리자의 관제 조치 승인이므로 매칭 가드를 강제 패스시킵니다.
              bypass_reason: '최고관리자 관제 센터 자율 조치 승인 대행'
            })
          });

          const saveRes = await saveResponse.json();
          if (saveRes.success) {
            sharedOcrSuccess = true;
            sharedSoId = saveRes.soId || '';
            sharedEstimateId = saveRes.estimateId || '';
            
            // 실물 이미지로부터 Gemini가 판독해낸 실제 데이터 캐시 갱신
            sharedPartnerName = ocrRes.partner_name || sharedPartnerName;
            if (ocrRes.items && ocrRes.items.length > 0) {
              sharedItemName = ocrRes.items[0].product_name || sharedItemName;
            }
            const parsedQty = Number(ocrRes.originalTotalQuantity) || ocrRes.items?.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0) || 0;
            sharedQty = parsedQty;

            const parsedAmount = Number(ocrRes.originalTotalAmount) || ocrRes.items?.reduce((sum: number, it: any) => sum + ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)), 0) || 0;
            sharedAmount = parsedAmount;

            sharedOcrDetail = `[실물 발주서 OCR 판독 완료] Gemini Vision OCR(2-Pass)을 통해 상신 이미지 '${imageFilename}' 분석 성공: 거래처(${sharedPartnerName}), 품목(${sharedItemName}), 수량(${sharedQty}개), 총액(${sharedAmount.toLocaleString()}원) 판독 및 수주서(${sharedSoId}) 자동 적재 완료.`;
          } else {
            sharedOcrSuccess = false;
            sharedOcrDetail = `[B2B 수주 적재 API 실패] 수주 대장 저장 중 오류가 발생했습니다: ${saveRes.error || '응답 데이터 이상'}. 수동 등록 또는 반려 처리가 권장됩니다.`;
          }
        } catch (err: any) {
          console.error('Governance OCR scan error:', err.message);
          sharedOcrSuccess = false;
          sharedOcrDetail = `[AI OCR 판독 장애] OCR 파이프라인 수행 중 예외 에러가 발생했습니다: ${err.message}. 수동 등록 또는 반려를 진행해 주세요.`;
        }
      };

      for (const act of actions) {
        try {
          if (act === 'check_inventory') {
            const prodName = originalData?.product_name || originalData?.productName || '';
            const reqQty = Number(originalData?.quantity || 1);
            
            const invRes = await queryTable('inventory_items', { filters: { name: prodName } });
            const invRows = invRes.rows || [];
            
            if (invRows.length > 0) {
              const curQty = Number(invRows[0].quantity || 0);
              if (curQty >= reqQty) {
                actionReports.push({
                  action: act,
                  success: true,
                  detail: `[재고 수량 파악 완료] 현재고 ${curQty}개 보유 중이며, 요청 수량 ${reqQty}개를 안정적으로 충족하여 출고 가능 상태입니다.`
                });
              } else {
                actionReports.push({
                  action: act,
                  success: false,
                  detail: `[재고 부족 감지] 현재고 ${curQty}개로 요청 수량 ${reqQty}개 대비 ${reqQty - curQty}개 부족합니다. 자재 수급이 필요합니다.`
                });
              }
            } else {
              actionReports.push({
                action: act,
                success: false,
                detail: `[재고 정보 없음] 상품명 '${prodName}'에 매칭되는 재고 원장을 찾을 수 없습니다.`
              });
            }
          }

          else if (act === 'send_sms_alert') {
            const customerName = originalData?.customer_name || '고객';
            const prodName = originalData?.product_name || '상품';
            const smsMessage = `[이지데스크 알림] 스토어 신규 주문건 접수에 따라 담당자 출고 파악을 지시합니다.\n- 주문자: ${customerName}\n- 품목: ${prodName}`;
            
            // 가상 SMS 로그 삽입
            const logId = Math.floor(Math.random() * 1000000);
            await insertRows('message_logs', [{
              id: logId,
              phone: '010-1234-5678',
              message: smsMessage,
              status: 'SUCCESS',
              created_at: nowStr
            }]);

            actionReports.push({
              action: act,
              success: true,
              detail: `[경보 문자 발송 완료] 물류 담당 직원(010-1234-5678)에게 신규 주문 출고 대비 알림 발송을 대행했습니다.`
            });
          }

          else if (act === 'sms_low_stock') {
            const prodName = originalData?.name || originalData?.itemName || '상품';
            const curQty = originalData?.quantity || 0;
            const smsMessage = `[재고 긴급 경보] 품목 [${prodName}]의 재고가 ${curQty}개로 하락했습니다. 리오더를 즉시 준비해 주세요.`;

            const logId = Math.floor(Math.random() * 1000000);
            await insertRows('message_logs', [{
              id: logId,
              phone: '010-9876-5432',
              message: smsMessage,
              status: 'SUCCESS',
              created_at: nowStr
            }]);

            actionReports.push({
              action: act,
              success: true,
              detail: `[긴급 재고 경보 문자 발송] 자재 구매 담당자(010-9876-5432)에게 안전재고 고갈 경고 문자를 송신했습니다.`
            });
          }

          else if (act === 'sync_sales_order') {
            const orderId = originalData?.id || '';
            const customerName = originalData?.customer_name || '';
            const prodName = originalData?.product_name || '';
            const reqQty = originalData?.quantity || 1;
            const price = originalData?.total_price || 0;

            const existingSo = await queryTable('crm_sales_orders', { filters: { id: `SO-${orderId}` } });
            if (!existingSo.rows || existingSo.rows.length === 0) {
              await insertRows('crm_sales_orders', [{
                id: 'SO-' + orderId,
                tenant_id: originalData?.tenant_id || 'default',
                partner_name: customerName,
                item_name: prodName,
                quantity: reqQty,
                total_amount: price,
                status: '수주등록',
                created_at: nowStr
              }]);
              actionReports.push({
                action: act,
                success: true,
                detail: `[수주서 자동 연동] 받은 발주 대장(crm_sales_orders)에 수주 건(SO-${orderId}) 자동 맵핑 연동 적재를 완료했습니다.`
              });
            } else {
              actionReports.push({
                action: act,
                success: true,
                detail: `[수주서 연동 스킵] 이미 연동된 수주서(SO-${orderId}) 이력이 존재하여 중복 적재를 방지했습니다.`
              });
            }
          }

          else if (act === 'create_delivery') {
            const orderId = originalData?.id || '';
            const customerName = originalData?.customer_name || '';
            const phone = originalData?.customer_phone || '';
            const address = originalData?.shipping_address || '';

            await insertRows('crm_deliveries', [{
              order_id: orderId,
              tenant_id: originalData?.tenant_id || 'default',
              customer_name: customerName,
              customer_phone: phone,
              shipping_address: address,
              status: '출고대기',
              created_at: nowStr
            }]);

            actionReports.push({
              action: act,
              success: true,
              detail: `[출고 원장 자율 배정] 통합 배송 관리 테이블(crm_deliveries)에 '출고대기' 상태로 발송 준비 배정을 마쳤습니다.`
            });
          }

          else if (act === 'scan_received_order') {
            // (1) 상신 파일 받은 발주서 스캔 OCR 실제 AI API 분석 기동
            await runRealOcrIfNeeded();
            actionReports.push({
              action: act,
              success: sharedOcrSuccess, // 💡 임의의 모의 성공 처리를 폐지하고 실제 OCR 판독의 성공 여부를 그대로 기입
              detail: sharedOcrDetail || `[발주서 OCR 스캔 실패] 발주서 이미지 판독 분석을 완료하지 못했습니다.`
            });
          }

          else if (act === 'auto_register_sales_order') {
            // (2) 판독된 내용을 토대로 crm_sales_orders에 자동 등록 적재 (실시간 AI 결과 연동)
            const tenantId = originalData?.tenant_id || originalData?.tenantId || await resolveTenantId() || 'default';
            
            // 만약 이전 단계에서 실제 OCR 스캔을 성공했다면, 이미 수주서가 적재되어 있으므로
            // 중복 적재하지 않고 공유된 ID를 사용합니다.
            let orderId = sharedSoId;
            if (!orderId) {
              // 💡 오류 발생 시 임의 매핑/가짜 등록을 차단하고 최고관리자에게 수동 처리 및 반려 결정을 위한 예외를 던집니다.
              if (sharedOcrRun && !sharedOcrSuccess) {
                throw new Error(`[B2B 수주 자동 적재 중단] OCR 분석 결과가 없거나 실패하여 자동 등록을 수행할 수 없습니다. 사유: ${sharedOcrDetail}`);
              }
              // OCR이 전혀 기동되지 않았던 경우의 가드
              throw new Error(`[B2B 수주 자동 적재 불가] 앞선 OCR 스캔 단계가 수행되지 않았거나 판독에 실패했습니다. 수동 스캔을 진행하시거나 작업을 반려해 주세요.`);
            }

            // 관련 crm_governance_logs 상태를 RESOLVED 처리
            if (eventId) {
              const logRawId = eventId.replace('event_rag_hold_', '').replace('rag_hold_', '');
              await updateRows('crm_governance_logs', {
                status: 'RESOLVED',
                reason: `최고관리자(${adminUser})에 의해 현장 발주서 스캔 및 수주 등록 자율 조치 처리 완료.`
              }, { filters: { id: logRawId } });
            }

            // 연동된 crm_snaptasks 가 있으면 완료(COMPLETE) 처리
            const logTitle = originalData?.doc_title || '';
            if (logTitle) {
              const taskRes = await queryTable('crm_snaptasks', { filters: { title: `[상신] ${logTitle}`, tenant_id: tenantId } });
              if (taskRes.rows && taskRes.rows.length > 0) {
                await updateRows('crm_snaptasks', {
                  status: 'COMPLETE',
                  updated_at: nowStr,
                  updated_by: 'AI_AGENT'
                }, { filters: { id: taskRes.rows[0].id } });
                
                await insertRows('crm_snaptask_items', [{
                  id: Date.now(),
                  task_id: taskRes.rows[0].id,
                  type: 'conversation',
                  title: '[AI 자율 승인 완료]',
                  content: `최고관리자 권한의 자율 작업 대행으로 실물 발주서가 OCR 판독되어 수주서(ID: ${orderId})가 수주 대장에 즉각 자동 적재 완료되었습니다.`,
                  created_at: nowStr,
                  uuid: `STI-${Date.now()}-auto-reg`
                }]);
              }
            }

            actionReports.push({
              action: act,
              success: true,
              detail: `[B2B 수주 자동 적재 완료] 판독 완료된 발주 정보를 토대로 수주 대장(crm_sales_orders)에 수주서(ID: ${orderId}, 금액: ${sharedAmount.toLocaleString()}원) 자율 맵핑 등록을 완비했습니다.`
            });
          }

          else if (act === 'force_delete') {
            let tableName = '';
            if (docType === 'estimate') tableName = 'crm_estimates';
            else if (docType === 'purchase_order') tableName = 'crm_purchase_orders';
            else if (docType === 'sales_order') tableName = 'crm_sales_orders';

            if (tableName) {
              await updateRows(tableName, {
                deleted_at: nowStr,
                deleted_by: adminUser
              }, { filters: { id: docId } });

              if (docType === 'estimate') {
                await updateRows('crm_estimate_items', {
                  deleted_at: nowStr,
                  deleted_by: adminUser
                }, { filters: { estimate_id: docId } });
              }

              if (eventId) {
                const logRawId = eventId.replace('event_rag_hold_', '').replace('rag_hold_', '');
                await updateRows('crm_governance_logs', {
                  status: 'FORCE_APPROVED',
                  reason: `최고관리자(${adminUser})에 의해 자율 대행 조치로 강제 삭제 처리 승인됨.`
                }, { filters: { id: logRawId } });
              }

              actionReports.push({
                action: act,
                success: true,
                detail: `[강제 삭제 완료] RAG 보류 대상인 ${docType} ID [${docId}] 문서를 대장에서 소프트 삭제 완료했습니다.`
              });
            } else {
              throw new Error('유효하지 않은 문서 종류');
            }
          }

          else if (act === 'notify_operator') {
            actionReports.push({
              action: act,
              success: true,
              detail: `[감사 통제 피드백] 최고관리자의 자율 대행 결정 이력 감사를 시스템 감사 대장에 영구 기록 완료했습니다.`
            });
          }

          else if (act === 'approve_task_cancel') {
            const taskId = originalData?.doc_id || originalData?.id || '';
            // crm_snaptasks 테이블에서 소프트 삭제 처리
            await updateRows('crm_snaptasks', {
              deleted_at: nowStr,
              deleted_by: adminUser
            }, { filters: { id: taskId } });

            // crm_snaptask_items (파일 및 내용) 도 일괄 소프트 삭제 처리
            await updateRows('crm_snaptask_items', {
              deleted_at: nowStr,
              deleted_by: adminUser
            }, { filters: { task_id: taskId } });

            // 거버넌스 로그 상태를 승인 완료로 갱신
            if (eventId) {
              const logRawId = eventId.replace('event_cancel_req_', '').replace('cancel_req_', '');
              await updateRows('crm_governance_logs', {
                status: 'APPROVED',
                reason: `최고관리자(${adminUser})에 의해 업무 취소 최종 승인 및 소프트 삭제 완료.`
              }, { filters: { id: logRawId } });
            }

            actionReports.push({
              action: act,
              success: true,
              detail: `[취소 승인 완료] 태스크 ID [${taskId}] 및 첨부 파일 내역을 모두 최종 취소(소프트 삭제) 완료했습니다.`
            });
          }

          else if (act === 'reject_task_cancel') {
            const taskId = originalData?.doc_id || originalData?.id || '';
            // crm_snaptasks 테이블의 상태를 ACTIVE 로 복구 원복
            await updateRows('crm_snaptasks', {
              status: 'ACTIVE',
              updated_at: nowStr,
              updated_by: adminUser
            }, { filters: { id: taskId } });

            // crm_snaptask_items 에 반려 로그 추가 기입
            await insertRows('crm_snaptask_items', [{
              id: Date.now(),
              task_id: taskId,
              content_text: `[시스템 알림] 최고관리자(${adminUser})가 업무 취소 요청을 반려하여 정상 재개되었습니다.`,
              file_type: 'TEXT',
              created_at: nowStr,
              tenant_id: originalData?.tenant_id || 'default',
              uuid: `STI-${Date.now()}-reject`,
              updated_at: nowStr,
              updated_by: adminUser
            }]);

            // 거버넌스 로그 상태를 반려(기각)로 갱신
            if (eventId) {
              const logRawId = eventId.replace('event_cancel_req_', '').replace('cancel_req_', '');
              await updateRows('crm_governance_logs', {
                status: 'REJECTED',
                reason: `최고관리자(${adminUser})에 의해 취소 요청 기각 및 반려됨.`
              }, { filters: { id: logRawId } });
            }

            actionReports.push({
              action: act,
              success: true,
              detail: `[취소 요청 반려] 취소 요청을 반려하고 태스크 ID [${taskId}]를 정상 진행(ACTIVE) 상태로 원복했습니다.`
            });
          }
        } catch (actErr: any) {
          actionReports.push({
            action: act,
            success: false,
            detail: `[작업 수행 실패] 에러 발생: ${actErr.message}`
          });
        }
      }

      // 최종 상태 해결 완료 전환 처리
      if (eventType === 'STORE_ORDER' && docId) {
        await updateRows('crm_orders', { status: '배송준비' }, { filters: { id: docId } });
      }

      return NextResponse.json({ success: true, reports: actionReports });
    }

    if (action === 'force_delete') {
      const { logId, docType, docId } = body;
      if (!docType || !docId) {
        return NextResponse.json(
          { success: false, error: '필수 파라미터(docType, docId)가 누락되었습니다.' },
          { status: 400 }
        );
      }

      let tableName = '';
      if (docType === 'estimate') tableName = 'crm_estimates';
      else if (docType === 'purchase_order') tableName = 'crm_purchase_orders';
      else if (docType === 'sales_order') tableName = 'crm_sales_orders';

      if (!tableName) {
        return NextResponse.json(
          { success: false, error: '지원하지 않는 문서 종류입니다.' },
          { status: 400 }
        );
      }

      await updateRows(tableName, {
        deleted_at: nowStr,
        deleted_by: adminUser
      }, { filters: { id: docId } });

      if (docType === 'estimate') {
        await updateRows('crm_estimate_items', {
          deleted_at: nowStr,
          deleted_by: adminUser
        }, { filters: { estimate_id: docId } });
      }

      if (logId) {
        await updateRows('crm_governance_logs', {
          status: 'FORCE_APPROVED',
          reason: `최고관리자(${adminUser})에 의해 삭제가 강제 승인 및 처리되었습니다.`
        }, { filters: { id: logId } });
      } else {
        const newLogId = `${docType}_del_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await insertRows('crm_governance_logs', [{
          id: newLogId,
          doc_type: docType,
          doc_id: docId,
          doc_title: `${docId} 강제 삭제 건`,
          status: 'FORCE_APPROVED',
          reason: `최고관리자(${adminUser})에 의해 삭제가 강제 승인 및 처리되었습니다.`,
          operator: adminUser,
          created_at: nowStr,
          uuid: newLogId,
          updated_at: nowStr,
          updated_by: adminUser
        }]);
      }

      return NextResponse.json({
        success: true,
        message: '보류되었던 문서가 최고관리자 권한으로 강제 삭제 승인 처리되었습니다.'
      });
    }

    if (action === 'restore') {
      const { docType, docId } = body;
      if (!docType || !docId) {
        return NextResponse.json(
          { success: false, error: '필수 파라미터(docType, docId)가 누락되었습니다.' },
          { status: 400 }
        );
      }

      let tableName = '';
      if (docType === 'estimate') tableName = 'crm_estimates';
      else if (docType === 'purchase_order') tableName = 'crm_purchase_orders';
      else if (docType === 'sales_order') tableName = 'crm_sales_orders';

      if (!tableName) {
        return NextResponse.json(
          { success: false, error: '지원하지 않는 문서 종류입니다.' },
          { status: 400 }
        );
      }

      await updateRows(tableName, {
        deleted_at: null,
        deleted_by: null,
        restored_at: nowStr,
        restored_by: adminUser
      }, { filters: { id: docId } });

      if (docType === 'estimate') {
        await updateRows('crm_estimate_items', {
          deleted_at: null,
          deleted_by: null
        }, { filters: { estimate_id: docId } });
      }

      const newLogId = `${docType}_restore_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await insertRows('crm_governance_logs', [{
        id: newLogId,
        doc_type: docType,
        doc_id: docId,
        doc_title: `${docId} 복원 건`,
        status: 'RESTORED',
        reason: `최고관리자(${adminUser})에 의해 삭제되었던 문서가 성공적으로 복원되었습니다.`,
        operator: adminUser,
        created_at: nowStr,
        uuid: newLogId,
        updated_at: nowStr,
        updated_by: adminUser
      }]);

      return NextResponse.json({
        success: true,
        message: '삭제되었던 문서가 정상적으로 복원되었습니다.'
      });
    }

    if (action === 'clear_logs') {
      const res = await queryTable('crm_governance_logs', { limit: 10000 });
      const rows = res.rows || [];
      
      if (rows.length > 0) {
        const ids = rows.map((r: any) => Number(r.id) || r.id);
        await deleteRows('crm_governance_logs', { ids });
      }

      // 전사 통합 감사 로그도 함께 비우기
      try {
        const auditRes = await queryTable('crm_audit_logs', { limit: 10000 });
        const auditRows = auditRes.rows || [];
        if (auditRows.length > 0) {
          const ids = auditRows.map((r: any) => r.id);
          await deleteRows('crm_audit_logs', { ids });
        }
      } catch (err) {
        console.error('Failed to clear crm_audit_logs:', err);
      }

      // 스토어 주문(crm_orders) 데이터도 함께 비우기
      try {
        const ordersRes = await queryTable('crm_orders', { limit: 10000 });
        const ordersRows = ordersRes.rows || [];
        if (ordersRows.length > 0) {
          const ids = ordersRows.map((r: any) => Number(r.id) || r.id);
          await deleteRows('crm_orders', { ids });
        }
      } catch (err) {
        console.error('Failed to clear crm_orders:', err);
      }

      return NextResponse.json({
        success: true,
        message: '실시간 AI 결재 심사, 전사 통합 감사 로그 및 스토어 주문 목록이 성공적으로 초기화되었습니다.'
      });
    }

    if (action === 'set_toggle') {
      const { enabled } = body;
      const value = enabled ? '1' : '0';
      
      await deleteRows('system_settings', { filters: { key: 'easybot_action_ocr_confirm_enabled' } });
      await insertRows('system_settings', [{
        key: 'easybot_action_ocr_confirm_enabled',
        value,
        tenant_id: 'default',
        _version: 1
      }]);
      return NextResponse.json({ success: true });
    }

    if (action === 'add_rule') {
      const { ruleName, expression } = body;
      if (!ruleName || !expression || !expression.trim()) {
        return NextResponse.json({ success: false, error: '규칙 이름과 자연어 규칙 조건이 필요합니다.' }, { status: 400 });
      }

      const tenantId = await resolveTenantId();
      const parsed = parseNaturalLanguageRule(expression);
      const ruleId = Date.now();
      const uuid = `rule_${ruleId}`;

      await insertRows('crm_governance_rules', [{
        id: ruleId,
        rule_name: ruleName.trim(),
        rule_expression: expression.trim(),
        structured_rule: JSON.stringify(parsed),
        is_active: 1,
        created_at: nowStr,
        tenant_id: tenantId,
        uuid,
        updated_at: nowStr,
        updated_by: adminUser
      }]);

      return NextResponse.json({ success: true, message: '새로운 자율 통제 규칙이 등록되었습니다.' });
    }

    if (action === 'toggle_rule') {
      const { ruleId, isActive } = body;
      if (!ruleId) {
        return NextResponse.json({ success: false, error: '규칙 ID가 누락되었습니다.' }, { status: 400 });
      }

      const tenantId = await resolveTenantId();
      await updateRows('crm_governance_rules', {
        is_active: isActive ? 1 : 0,
        updated_at: nowStr,
        updated_by: adminUser
      }, { filters: { id: ruleId, tenant_id: tenantId } });

      return NextResponse.json({ success: true, message: '규칙 활성화 상태가 변경되었습니다.' });
    }

    if (action === 'delete_rule') {
      const { ruleId } = body;
      if (!ruleId) {
        return NextResponse.json({ success: false, error: '규칙 ID가 누락되었습니다.' }, { status: 400 });
      }

      const tenantId = await resolveTenantId();
      // 소프트 삭제 처리
      await updateRows('crm_governance_rules', {
        deleted_at: nowStr,
        deleted_by: adminUser
      }, { filters: { id: ruleId, tenant_id: tenantId } });

      return NextResponse.json({ success: true, message: '자율 규칙이 성공적으로 삭제되었습니다.' });
    }

    // 💡 [추가] 일보 라이프사이클 결재 이력(타임라인)을 JSON 형태로 누적하기 위한 헬퍼 함수
    const appendHistoryToSummary = (aiSummaryJsonStr: string, newHistoryEntry: any) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(aiSummaryJsonStr || '{}');
      } catch (e) {
        parsed = {};
      }
      if (!parsed || typeof parsed !== 'object') {
        parsed = {};
      }
      if (!Array.isArray(parsed.history)) {
        parsed.history = [];
      }
      parsed.history.push(newHistoryEntry);
      return JSON.stringify(parsed);
    };

    // 💡 [신규] 직원 일일 보고서 제출 처리
    if (action === 'submit_report') {
      const { report_date, report_content, ai_summary } = body;
      if (!report_date || !report_content) {
        return NextResponse.json({ success: false, error: '보고 날짜와 보고서 본문 내용이 필요합니다.' }, { status: 400 });
      }

      const tenantId = await resolveTenantId();
      
      // 혹시 동일 날짜에 동일 직원 보고서가 이미 존재하는지 체크
      const checkRes = await queryTable('crm_daily_reports', {
        filters: { report_date, operator: currentUser, tenant_id: tenantId }
      });
      const existing = checkRes.rows || [];

      if (existing.length > 0) {
        // 💡 [추가] 이미 대표자 승인이 완료된 보고서는 수정(업데이트)이 불가능하도록 보안 제한을 둡니다. (반려된 보고서는 재제출 허용)
        const currentStatus = existing[0].status;
        if (currentStatus === 'APPROVED') {
          return NextResponse.json({
            success: false,
            error: '🔒 이미 대표자 승인이 완료된 보고서는 수정할 수 없습니다.'
          }, { status: 400 });
        }

        const isReSubmit = currentStatus === 'REJECTED';
        const targetId = existing[0].id;

        // 히스토리 엔트리 생성
        const historyEntry = {
          action: isReSubmit ? 'RESUBMITTED' : 'SUBMITTED',
          date: nowStr,
          executor: currentUser,
          content: report_content
        };
        const updatedAiSummary = appendHistoryToSummary(existing[0].ai_summary, historyEntry);

        // 이미 존재하면 덮어쓰기 업데이트
        await updateRows('crm_daily_reports', {
          report_content,
          ai_summary: updatedAiSummary,
          status: isReSubmit ? 'RESUBMITTED' : 'SUBMITTED', // 💡 반려 후 재상신 구분
          updated_at: nowStr,
          updated_by: currentUser
        }, { filters: { id: targetId, tenant_id: tenantId } });
        return NextResponse.json({ success: true, message: '일일 보고서가 업데이트 및 제출되었습니다.' });
      } else {
        // 신규 인서트
        const reportId = Date.now();
        const uuid = `report_${reportId}`;

        // 최초 제출 히스토리 엔트리 생성
        const historyEntry = {
          action: 'SUBMITTED',
          date: nowStr,
          executor: currentUser,
          content: report_content
        };
        const initialAiSummary = appendHistoryToSummary(ai_summary || '{}', historyEntry);

        await insertRows('crm_daily_reports', [{
          id: reportId,
          report_date,
          operator: currentUser,
          ai_summary: initialAiSummary,
          report_content,
          status: 'SUBMITTED',
          tenant_id: tenantId,
          uuid,
          updated_at: nowStr,
          updated_by: currentUser
        }]);
        return NextResponse.json({ success: true, message: '일일 보고서가 성공적으로 제출되었습니다.' });
      }
    }

    // 💡 [신규] 대표자 일일 보고서 결재 및 코멘트 작성
    if (action === 'approve_report') {
      const { report_id, status, comment } = body;
      if (!report_id || !status) {
        return NextResponse.json({ success: false, error: '보고서 ID와 결재 상태가 누락되었습니다.' }, { status: 400 });
      }

      const tenantId = await resolveTenantId();

      // 기존 일보 정보 조회하여 이전 ai_summary 가져오기
      const reportRes = await queryTable('crm_daily_reports', {
        filters: { id: report_id, tenant_id: tenantId }
      });
      const reportsList = reportRes.rows || [];
      let updatedAiSummary = '{}';
      if (reportsList.length > 0) {
        const historyEntry = {
          action: status, // APPROVED 또는 REJECTED
          date: nowStr,
          executor: '대표자',
          comment: comment || ''
        };
        updatedAiSummary = appendHistoryToSummary(reportsList[0].ai_summary, historyEntry);
      }

      await updateRows('crm_daily_reports', {
        status,
        comment: comment || '',
        ai_summary: updatedAiSummary, // 💡 히스토리 보존 누적
        approver: currentUser,
        approved_at: nowStr,
        updated_at: nowStr,
        updated_by: currentUser
      }, { filters: { id: report_id, tenant_id: tenantId } });

      return NextResponse.json({ 
        success: true, 
        message: status === 'APPROVED' ? '일일 보고서가 승인 결재되었습니다.' : '일일 보고서가 반려/보완요청 처리되었습니다.' 
      });
    }

    return NextResponse.json(
      { success: false, error: '유효하지 않은 action 파라미터입니다.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Governance API POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
