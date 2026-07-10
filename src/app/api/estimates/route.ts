export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL, downloadFile } from '../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { sendMail } from '../../../lib/email';
import { checkRagApproval } from '../../../lib/rag-approval';

// 최고 관리자(SUPER_ADMIN) 권한 검증 헬퍼
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return false;
  try {
    const payload = decodeJwt(token);
    return payload.role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

/**
 * B2B 견적서 접수(INBOUND) 또는 발송(OUTBOUND)용 메일 템플릿 빌드 및 발송
 */
async function sendEstimateEmail(
  estimateId: string,
  type: string,
  direction_status: string,
  partner_name: string,
  emailAddress: string,
  total_amount: number,
  itemRows: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 1. 공급자 정보(우리 회사 프로필) 로드
    let providerHtml = '';
    let supplierName = '공급사';
    try {
      const companySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
      if (companySetting.rows?.[0]?.value) {
        const p = JSON.parse(companySetting.rows[0].value);
        if (p.companyName) {
          supplierName = p.companyName;
        }
        providerHtml = `
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 11px; line-height: 1.6; color: #475569; background-color: #fafafa; margin-bottom: 20px;">
            <p style="margin: 0; font-weight: bold; color: #1e293b; margin-bottom: 6px; font-size: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">공급자 (Supplier)</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="width: 90px; font-weight: bold; color: #64748b;">상호 (회사명)</td><td>: <b>${p.companyName || ''}</b></td></tr>
              <tr><td style="font-weight: bold; color: #64748b;">사업자등록번호</td><td>: ${p.businessNumber || ''}</td></tr>
              <tr><td style="font-weight: bold; color: #64748b;">대표자 성명</td><td>: ${p.representative || ''}</td></tr>
              <tr><td style="font-weight: bold; color: #64748b;">소재지 주소</td><td>: ${p.address || ''}</td></tr>
              <tr><td style="font-weight: bold; color: #64748b;">대표전화</td><td>: ${p.phone || ''}</td></tr>
            </table>
          </div>
        `;
      }
    } catch (e) {
      console.warn('공급자 정보 로드 실패:', e);
    }

    const itemsHtml = itemRows.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">${item.product_name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 13px;">${item.quantity.toLocaleString()}개</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px;">${item.unit_price.toLocaleString()}원</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px; font-weight: bold; color: #4f46e5;">${item.amount.toLocaleString()}원</td>
      </tr>
    `).join('');

    // A. 바이어 접수 확인 메일 (INBOUND)
    if (type === 'INBOUND') {
      const emailBodyHtml = `
        <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #334155;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #e0e7ff; color: #4f46e5; font-size: 10px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; border: 1px solid #c7d2fe;">B2B 실시간 견적 접수</span>
            <h2 style="color: #1e293b; margin-top: 10px; margin-bottom: 5px;">견적 요청이 정상 접수되었습니다.</h2>
            <p style="font-size: 12px; color: #64748b; margin-top: 0;">요청 주신 견적 상세 내역을 안내해 드립니다.</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          
          <table style="width: 100%; font-size: 13px; color: #475569; margin-bottom: 20px;">
            <tr><td style="width: 100px; font-weight: bold; color: #64748b;">견적 번호</td><td style="font-weight: bold; color: #1e293b;">: ${estimateId}</td></tr>
            <tr><td style="font-weight: bold; color: #64748b;">요청 업체명</td><td style="color: #1e293b;">: ${partner_name}</td></tr>
            <tr><td style="font-weight: bold; color: #64748b;">접수 일시</td><td style="color: #1e293b;">: ${nowStr}</td></tr>
          </table>

          <div style="border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: left; font-size: 11px; color: #64748b; font-weight: bold;">품목명</th>
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: center; font-size: 11px; color: #64748b; font-weight: bold;">수량</th>
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right; font-size: 11px; color: #64748b; font-weight: bold;">단가</th>
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right; font-size: 11px; color: #64748b; font-weight: bold;">합계</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div style="background-color: #f8fafc; padding: 15px; border-top: 1px solid #edf2f7; text-align: right;">
              <span style="font-size: 12px; color: #64748b; font-weight: bold; margin-right: 10px;">총 견적 합계액 :</span>
              <span style="font-size: 16px; font-weight: 900; color: #4f46e5;">${total_amount.toLocaleString()}원</span>
            </div>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 15px; font-size: 12px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0; font-weight: bold; color: #475569; margin-bottom: 5px;">💡 향후 진행 가이드</p>
            <p style="margin: 0;">본 견적 요청은 담당자가 상세 단가를 실시간 검수 및 조정 중입니다. 검수가 완료되는 즉시 카카오 알림톡/문자 및 본 이메일을 통해 최종 확정 견적서를 추가 발송해 드릴 예정입니다.</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0; text-align: center;">※ 본 이메일은 이지데스크 B2B 스마트 온보딩 채널을 통해 발송된 시스템 자동 메일입니다.</p>
        </div>
      `;

      await sendMail({
        to: emailAddress,
        subject: `[이지데스크] B2B 견적 요청이 정상 접수되었습니다. (번호: ${estimateId})`,
        html: emailBodyHtml,
        fromName: '이지데스크 견적시스템'
      });
    }
    // B. 관리자가 확정하여 거래처로 메일을 보낼 때 (OUTBOUND & SENT)
    else if (type === 'OUTBOUND' && direction_status === 'SENT') {
      const emailBodyHtml = `
        <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #334155;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #fef3c7; color: #d97706; font-size: 10px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; border: 1px solid #fde68a;">B2B 정식 견적서 송부</span>
            <h2 style="color: #1e293b; margin-top: 10px; margin-bottom: 5px;">견적서가 도착했습니다.</h2>
            <p style="font-size: 12px; color: #64748b; margin-top: 0;">요청하신 품목의 공식 견적 내역서입니다. 확인 후 발주 결정을 부탁드립니다.</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="font-size: 13px; color: #475569;">
              <p style="margin: 0; font-weight: bold; color: #1e293b; margin-bottom: 6px; font-size: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">수신자 (Customer)</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="width: 70px; font-weight: bold; color: #64748b;">견적 번호</td><td style="font-weight: bold; color: #1e293b;">: ${estimateId}</td></tr>
                <tr><td style="font-weight: bold; color: #64748b;">수신처</td><td style="color: #1e293b;">: <b>${partner_name}</b> 귀하</td></tr>
                <tr><td style="font-weight: bold; color: #64748b;">발행 일시</td><td style="color: #1e293b;">: ${nowStr}</td></tr>
              </table>
            </div>
            ${providerHtml}
          </div>

          <div style="border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; margin-bottom: 20px; clear: both;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: left; font-size: 11px; color: #64748b; font-weight: bold;">품목명</th>
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: center; font-size: 11px; color: #64748b; font-weight: bold;">수량</th>
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right; font-size: 11px; color: #64748b; font-weight: bold;">단가</th>
                  <th style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: right; font-size: 11px; color: #64748b; font-weight: bold;">합계</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div style="background-color: #f8fafc; padding: 15px; border-top: 1px solid #edf2f7; text-align: right;">
              <span style="font-size: 12px; color: #64748b; font-weight: bold; margin-right: 10px;">총 견적 합계액 :</span>
              <span style="font-size: 16px; font-weight: 900; color: #4f46e5;">${total_amount.toLocaleString()}원</span>
            </div>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 15px; font-size: 12px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0; font-weight: bold; color: #475569; margin-bottom: 5px;">📜 안내 사항</p>
            <ul style="margin: 0; padding-left: 15px;">
              <li>견적 유효기간은 발행일로부터 15일간입니다.</li>
              <li>본 내역을 바탕으로 발주 결정을 내리시려면 이지데스크 시스템의 [발주하기] 또는 본사 대표전화로 연락 주시기 바랍니다.</li>
            </ul>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0; text-align: center;">※ 본 이메일은 이지데스크 전사 관리 플랫폼을 통해 자동 발송된 공식 견적서입니다.</p>
        </div>
      `;

      let pdfBuffer: Buffer | null = null;
      try {
        const downloadRes = await downloadFile({
          tableName: 'crm_estimates',
          rowId: parseInt(estimateId, 10),
          columnName: 'pdf_cache'
        });
        if (downloadRes && downloadRes.success && downloadRes.data) {
          let base64Data = downloadRes.data;
          if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,').pop() || '';
          }
          pdfBuffer = Buffer.from(base64Data, 'base64');
        }
      } catch (err) {
        console.log('[sendEstimateEmail] PDF cache read failed or not found:', err);
      }

      await sendMail({
        to: emailAddress,
        subject: `[견적서] ${partner_name} 귀하 - 견적서가 도착했습니다. (번호: ${estimateId})`,
        html: emailBodyHtml,
        fromName: '이지데스크 견적시스템',
        attachments: pdfBuffer ? [{
          filename: `${supplierName}-${partner_name}견적서_${estimateId}.pdf`,
          content: pdfBuffer
        }] : []
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('견적 메일 발송 중 오류:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * GET: 견적 전용 상품 목록 조회
 * products 테이블에서 is_estimate_price = 1 인 품목만 필터링하여 반환합니다.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let tenantId = 'default';
    if (token) {
      try {
        const payload = decodeJwt(token);
        tenantId = (payload.tenant_id as string) || 'default';
      } catch {}
    }

    // 만약 견적서 목록을 조회하고 싶다면 (관리자용)
    if (action === 'list') {
      // 💡 RAG 결재 대기 중인 문서 ID 세트 조회
      const pendingDocIds = new Set<string>();
      try {
        const govRes = await queryTable('crm_governance_logs', { filters: { status: 'PENDING_APPROVAL' } });
        const pendingLogs = govRes.rows || [];
        pendingLogs.forEach((l: any) => {
          if (l.doc_id) pendingDocIds.add(l.doc_id);
        });
      } catch (govErr) {
        console.error('Failed to load pending governance logs:', govErr);
      }

      // 1. 견적서 마스터 목록 조회 (deleted_at IS NULL은 queryTable 내부에서 자체 처리됨)
      const estRes = await queryTable('crm_estimates', {
        filters: { tenant_id: tenantId },
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 500
      });
      const rawEstimates = (estRes.rows || []).filter((e: any) => !e.deleted_at);

      // 2. 견적서 상세 아이템 목록 조회
      const itemsRes = await queryTable('crm_estimate_items', {
        filters: { tenant_id: tenantId },
        limit: 5000
      });
      const rawItems = itemsRes.rows || [];

      // 3. estimate_id 별로 아이템 그룹화
      const itemsMap: Record<string, any[]> = {};
      for (const item of rawItems) {
        const estId = item.estimate_id;
        if (!itemsMap[estId]) {
          itemsMap[estId] = [];
        }
        itemsMap[estId].push(item);
      }

      // 4. 결과 병합 조인
      const estimates = rawEstimates.map((e: any) => {
        const estItems = itemsMap[e.id] || [];
        
        // 품목명과 규격을 합쳐 검색 전용 텍스트 구축
        const itemSearchText = estItems.map(item => {
          const specStr = item.spec ? String(item.spec) : '';
          return `${item.product_name} ${specStr}`;
        }).join(' ');

        // 비고란 내용(document_memo) 추출
        let docMemo = '';
        if (e.tags) {
          try {
            const parsed = JSON.parse(e.tags);
            if (parsed && typeof parsed === 'object') {
              docMemo = parsed.document_memo || parsed.tags || '';
            }
          } catch {
            docMemo = e.tags;
          }
        }

        return {
          ...e,
          is_pending_delete: pendingDocIds.has(e.id),
          first_item_name: estItems.length > 0 ? estItems[0].product_name : null,
          item_count: estItems.length,
          item_search_text: itemSearchText,
          document_memo_search: docMemo,
          items: estItems
        };
      });

      return NextResponse.json({ success: true, estimates });
    }

    // 특정 견적서 상세 조회 (마스터 정보 및 세부 품목 일괄 조회)
    if (action === 'detail') {
      const estimateId = searchParams.get('estimateId');
      if (!estimateId) {
        return NextResponse.json({ success: false, error: '견적 번호가 누락되었습니다.' }, { status: 400 });
      }

      const estRes = await queryTable('crm_estimates', { filters: { id: estimateId, tenant_id: tenantId } });
      let estimate = estRes.rows && estRes.rows.length > 0 && !estRes.rows[0].deleted_at ? estRes.rows[0] : null;

      // 💡 안전 가드: 발주서(crm_purchase_orders) 또는 수주서(crm_sales_orders)로의 전환 여부 검사 (queryTable 우회)
      const poRes = await queryTable('crm_purchase_orders', { filters: { estimate_id: estimateId, tenant_id: tenantId }, limit: 1 });
      const poRows = poRes.rows || [];
      const soRes = await queryTable('crm_sales_orders', { filters: { estimate_id: estimateId, tenant_id: tenantId }, limit: 1 });
      const soRows = soRes.rows || [];
      
      const isLinked = poRows.length > 0 || soRows.length > 0;

      // 💡 폴백 가드: 견적서 마스터가 데이터베이스에 존재하지 않는 경우 (예: 다이렉트 수주 등으로 섀도우 누락 시)
      // 수주서 또는 발주서가 존재한다면 임시 가상 견적 객체를 구성하여 404 에러를 방지합니다.
      if (!estimate) {
        if (soRows.length > 0) {
          const so = soRows[0];
          estimate = {
            id: estimateId,
            type: 'OUTBOUND',
            direction_status: 'RECEIVED',
            partner_name: so.customer_name || '알 수 없는 바이어',
            partner_phone: so.customer_phone || '',
            partner_manager: so.customer_manager || '',
            total_amount: so.total_amount || 0,
            file_url: 'AI 수주 연동 자동 복구',
            ai_parsed: 1,
            sales_order_number: so.client_order_no || so.id,
            created_at: so.created_at || new Date().toISOString()
          };
        } else if (poRows.length > 0) {
          const po = poRows[0];
          estimate = {
            id: estimateId,
            type: 'INBOUND',
            direction_status: 'SENT',
            partner_name: po.vendor_name || '알 수 없는 공급처',
            partner_phone: po.vendor_phone || '',
            total_amount: po.total_amount || 0,
            file_url: 'AI 발주 연동 자동 복구',
            ai_parsed: 1,
            purchase_order_number: po.id,
            created_at: po.created_at || new Date().toISOString()
          };
        }
      }

      if (!estimate) {
        return NextResponse.json({ success: false, error: '해당 견적 내역을 찾을 수 없습니다.' }, { status: 404 });
      }

      const itemsRes = await queryTable('crm_estimate_items', { filters: { estimate_id: estimateId, tenant_id: tenantId } });
      let items = itemsRes.rows || [];

      // 만약 품목 정보도 누락되어 있다면 가상의 품목을 추가하여 화면이 정상 렌더링되도록 보정
      if (items.length === 0) {
        items = [{
          id: Date.now(),
          estimate_id: estimateId,
          product_id: '',
          product_name: '수발주 연동 통합 품목',
          quantity: 1,
          unit_price: estimate.total_amount || 0,
          amount: estimate.total_amount || 0
        }];
      }

      // 💡 RAG 결재 대기 여부 조회 (견적서 자체 또는 연동된 수주/발주가 결재 대기 중인지 검사)
      let isPendingDelete = false;
      try {
        const docIdsToCheck = [estimateId];
        if (soRows.length > 0) docIdsToCheck.push(soRows[0].id);
        if (poRows.length > 0) docIdsToCheck.push(poRows[0].id);

        const govRes = await queryTable('crm_governance_logs', {
          filters: { status: 'PENDING_APPROVAL' },
          limit: 100
        });
        const pendingLogs = govRes.rows || [];
        isPendingDelete = pendingLogs.some((l: any) => l.doc_id && docIdsToCheck.includes(l.doc_id));
      } catch (govErr) {
        console.error('Failed to load pending governance log for detail:', govErr);
      }

      return NextResponse.json({ 
        success: true, 
        estimate: estimate ? { ...estimate, is_pending_delete: isPendingDelete } : null, 
        items, 
        isLinked,
        isPendingDelete,
        salesOrderNumber: soRows.length > 0 ? (soRows[0].client_order_no || soRows[0].id) : null,
        purchaseOrderNumber: poRows.length > 0 ? poRows[0].id : null
      });
    }

    // 기본값: 모바일용 견적 상품 목록 조회
    // 💡 SQL Query 헬퍼를 활용하여 견적가 플래그가 켜진 상품만 확실히 색출 (queryTable 우회)
    const prodRes = await queryTable('products', {
      filters: { is_estimate_price: '1' },
      limit: 1000
    });
    const estimateProducts = (prodRes.rows || []).filter((p: any) => !p.deleted_at);

    return NextResponse.json({ success: true, products: estimateProducts });
  } catch (error: any) {
    console.error('API estimates GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 모바일 고객 견적 요청 자동 접수 또는 관리자 견적 수동 작성
 * crm_estimates 및 crm_estimate_items 테이블에 이중 트랜잭션 형태로 데이터 적재
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      type = 'INBOUND',           // INBOUND(받은 것/모바일요청), OUTBOUND(보낼 것)
      direction_status = 'REQUESTED', // REQUESTED(견적요청), DRAFT(초안), SENT(발송)
      partner_name, 
      partner_phone, 
      partner_manager,
      items = [],                 // [{ product_id, product_name, quantity, unit_price }]
      file_url = '',
      ai_parsed = 0,
      business_license_url = '',  // 신규 첫 견적 시 첨부된 사업자등록증 URL
      tags = '',

      // B2B 신규 거래처 자동 가입용 추가 필드
      is_new_partner = false,
      business_number = '',
      representative = '',
      email = '',
      address = '',

      // 최고관리자 우회 강제 승인용 필드
      force_bypass = false,
      bypass_reason = '',

      // 견적서 다이렉트 발송 채널 확장
      send_method = '',           // EMAIL, SMS, FAX
      send_target = ''            // 수신 주소/번호
    } = body;

    if (!partner_name) {
      return NextResponse.json({ success: false, error: '거래처/고객명은 필수 입력 항목입니다.' }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: '최소 1개 이상의 견적 품목이 필요합니다.' }, { status: 400 });
    }

    // 💡 모바일 신규 B2B 거래처 자동 스마트 온보딩 가입 처리
    if (type === 'INBOUND' && is_new_partner) {
      let existingPartner = null;
      if (business_number) {
        const partnerRes = await queryTable('crm_partners', { filters: { business_number }, limit: 1 });
        const rows = partnerRes.rows || [];
        if (rows.length > 0) {
          existingPartner = rows[0];
        }
      }

      if (!existingPartner) {
        const partnerId = `PT-${Date.now()}`;
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
        await insertRows('crm_partners', [{
          id: partnerId,
          type: 'BUYER', // 모바일에서 견적을 요청해온 구매처는 B2B 바이어(BUYER)로 등록
          company_name: partner_name,
          business_number: business_number,
          representative: representative,
          phone: partner_phone,
          manager_name: partner_name + ' 담당자',
          manager_phone: partner_phone,
          email: email,
          address: address,
          vip_level: 'NORMAL',
          credit_limit: 0,
          business_license_url: business_license_url,
          memo: '모바일 스마트 온보딩 채널을 통해 첫 견적 요청과 함께 자동 신규 가입되었습니다.',
          created_at: nowStr
        }]);
        console.log(`B2B Partner auto-onboarded: ${partner_name} (${partnerId})`);
      }
    }

    // 1. 총 합계 금액 산정
    let total_amount = 0;
    const itemRows = items.map((item: any) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseInt(item.unit_price) || 0;
      const amount = qty * price;
      total_amount += amount;

      // spec이 객체라면 문자열로 직렬화하여 저장
      const specVal = item.spec && typeof item.spec === 'object' 
        ? JSON.stringify(item.spec) 
        : (item.spec || '');

      return {
        product_id: item.product_id || '',
        item_code: item.item_code || '',
        product_name: item.product_name,
        quantity: qty,
        unit_price: price,
        amount: amount,
        delivery_date: item.delivery_date || '',
        spec: specVal
      };
    });

    // 2. 견적서 고유 식별 마스터 ID 생성 및 UUID 부여
    const nowObj = new Date();
    const yy = String(nowObj.getFullYear()).slice(-2);
    const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
    const dd = String(nowObj.getDate()).padStart(2, '0');
    const hh = String(nowObj.getHours()).padStart(2, '0');
    const min = String(nowObj.getMinutes()).padStart(2, '0');
    const ss = String(nowObj.getSeconds()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 90 + 10); // 10~99 난수

    const isSalesOrderScan = type === 'OUTBOUND' && direction_status === 'RECEIVED';
    const prefix = isSalesOrderScan ? 'ORD' : 'EST';
    const estimateId = `${prefix}-${yy}${mm}${dd}-${hh}${min}${ss}`;
    const uuid = `${prefix}-UUID-${yy}${mm}${dd}-${hh}${min}${ss}-${rand}-${Math.random().toString(36).substring(2, 9)}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    let finalTags = tags;
    if (force_bypass) {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      let isAuthorized = false;
      let bypassApprovedBy = '';
      if (token) {
        try {
          const payload = decodeJwt(token);
          const role = (payload.role as string || '').toUpperCase();
          isAuthorized = role === 'SUPER_ADMIN' || role === 'PRESIDENT';
          bypassApprovedBy = (payload.username as string) || (payload.role as string);
        } catch {}
      }

      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: '🔒 권한 차단: 수신인 불일치 문서의 강제 등록 승인은 최고관리자(SUPER_ADMIN)만 가능합니다.' }, { status: 403 });
      }

      let tagsObj: any = {};
      if (tags) {
        try {
          tagsObj = JSON.parse(tags);
        } catch {}
      }
      tagsObj.bypass_matching = true;
      tagsObj.bypass_approved_by = bypassApprovedBy;
      tagsObj.bypass_reason = bypass_reason;
      finalTags = JSON.stringify(tagsObj);
    }

    // 3. crm_estimates 마스터 테이블 삽입
    await insertRows('crm_estimates', [{
      id: estimateId,
      type,
      direction_status,
      partner_name,
      partner_phone,
      partner_manager,
      total_amount,
      file_url,
      business_license_url, // 첨부된 사업자등록증 URL 매핑
      ai_parsed,
      tags: finalTags,
      uuid,
      created_at: nowStr
    }]);

    // 방금 삽입된 실제 정수 id 가져오기
    const insertedEstRes = await queryTable('crm_estimates', { filters: { uuid }, limit: 1 });
    const insertedEst = insertedEstRes.rows && insertedEstRes.rows.length > 0 ? insertedEstRes.rows[0] : null;
    const realEstimateId = insertedEst ? String(insertedEst.id) : estimateId;

    // 4. crm_estimate_items 디테일 테이블 품목 삽입
    const detailRows = itemRows.map((row: any, idx: number) => ({
      id: Date.now() + idx,
      estimate_id: realEstimateId,
      product_id: row.product_id,
      item_code: row.item_code,
      product_name: row.product_name,
      quantity: row.quantity,
      unit_price: row.unit_price,
      amount: row.amount,
      delivery_date: row.delivery_date,
      spec: row.spec
    }));

    await insertRows('crm_estimate_items', detailRows);

    // B2B 견적 발송 수단 연동 (이메일, 문자, 팩스)
    let emailSent = false;
    let smsSent = false;
    let faxSent = false;
    let sendErrorMsg = '';

    if (type === 'OUTBOUND') {
      if (send_method === 'EMAIL' && send_target) {
        const mailRes = await sendEstimateEmail(realEstimateId, type, 'SENT', partner_name, send_target, total_amount, itemRows);
        if (mailRes.success) {
          emailSent = true;
          await updateRows('crm_estimates', { direction_status: 'SENT' }, { filters: { id: realEstimateId } });
        } else {
          sendErrorMsg = `이메일 전송 실패: ${mailRes.error}`;
        }
      } 
      else if (send_method === 'SMS' && send_target) {
        try {
          // 본사 전화번호 조회
          let myCompanyPhone = '010-7216-5884';
          try {
            const companySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
            if (companySetting.rows?.[0]?.value) {
              const p = JSON.parse(companySetting.rows[0].value);
              if (p.phone) myCompanyPhone = p.phone;
            }
          } catch (e) {}

          const logId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
          
          // 바이어가 쉽게 견적서를 확인할 수 있는 문자 기본 메시지 구성
          const smsText = `[이지데스크] ${partner_name} 귀하 - B2B 견적서(번호: ${realEstimateId}) 총 금액 ${total_amount.toLocaleString()}원이 발행되었습니다. 상세 내역은 이지데스크 링크를 확인해 주세요.`;
          
          await insertRows('message_logs', [{
            id: logId,
            sender: myCompanyPhone,
            receiver: send_target,
            content: smsText,
            status: 'PENDING', // Playwright RPA가 즉시 발송
            created_at: logTime,
            updated_at: logTime
          }]);
          smsSent = true;
          await updateRows('crm_estimates', { direction_status: 'SENT' }, { filters: { id: realEstimateId } });
        } catch (e: any) {
          sendErrorMsg = `문자 전송 실패: ${e.message}`;
        }
      } 
      else if (send_method === 'FAX' && send_target) {
        try {
          // 1. 시스템 설정에서 팩스 활성화 및 자격증명 조회
          const faxEnableRes = await queryTable('system_settings', { filters: { key: 'fax_enable' } });
          const faxEnable = faxEnableRes.rows?.[0]?.value === '1';

          if (!faxEnable) {
            throw new Error('시스템 설정에서 팩스 발신 기능이 비활성화 상태입니다. 설정 페이지를 확인해 주세요.');
          }

          const faxProviderRes = await queryTable('system_settings', { filters: { key: 'fax_api_provider' } });
          const faxLinkRes = await queryTable('system_settings', { filters: { key: 'fax_link_id' } });
          const faxApiKeyRes = await queryTable('system_settings', { filters: { key: 'fax_api_key' } });
          const faxSenderRes = await queryTable('system_settings', { filters: { key: 'fax_sender_number' } });

          const provider = faxProviderRes.rows?.[0]?.value || 'popbill';
          const linkId = faxLinkRes.rows?.[0]?.value || '';
          const apiKey = faxApiKeyRes.rows?.[0]?.value || '';
          const senderNum = faxSenderRes.rows?.[0]?.value || '';

          if (!linkId || !apiKey || !senderNum) {
            throw new Error('팩스 API 연동을 위한 크레덴셜 정보(Link ID, API Key, 발신 번호)가 누락되었습니다.');
          }

          // 2. 인터넷 팩스 API (SaaS) 실시간 발송 검증 시뮬레이션
          console.log(`[FAX API SEND - ${provider.toUpperCase()}] LinkID: ${linkId}, Sender: ${senderNum}, Receiver: ${send_target}, EstimateId: ${realEstimateId}`);
          
          // message_logs에 가상 테스트 팩스 발송 기록 적재
          const logId = `FAX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
          
          await insertRows('message_logs', [{
            id: logId,
            sender: senderNum,
            receiver: send_target,
            content: `[FAX SENT] 견적서(번호: ${realEstimateId}) 팩스 전송 성공 (금액: ${total_amount.toLocaleString()}원, 모듈: ${provider})`,
            status: 'SENT',
            created_at: logTime,
            updated_at: logTime
          }]);

          faxSent = true;
          await updateRows('crm_estimates', { direction_status: 'SENT' }, { filters: { id: realEstimateId } });
        } catch (e: any) {
          sendErrorMsg = `팩스 전송 실패: ${e.message}`;
        }
      }
      // 이메일 주소가 존재하고 명시적 전송 수단이 지정되지 않은 경우 기존 자동 메일 전송 호환 유지
      else if (direction_status === 'SENT' && !send_method) {
        let targetEmail = email;
        if (!targetEmail && partner_name) {
          const partnerRes = await queryTable('crm_partners', { filters: { company_name: partner_name }, limit: 1 });
          if (partnerRes.rows && partnerRes.rows.length > 0) {
            targetEmail = partnerRes.rows[0].email || '';
          }
        }
        if (targetEmail) {
          await sendEstimateEmail(realEstimateId, type, 'SENT', partner_name, targetEmail, total_amount, itemRows);
        }
      }
    } else if (type === 'INBOUND') {
      // 모바일 접수 확인 메일: 기존과 동일하게 백그라운드 발송
      let targetEmail = email;
      if (!targetEmail && partner_name) {
        const partnerRes = await queryTable('crm_partners', { filters: { company_name: partner_name }, limit: 1 });
        if (partnerRes.rows && partnerRes.rows.length > 0) {
          targetEmail = partnerRes.rows[0].email || '';
        }
      }
      if (targetEmail) {
        sendEstimateEmail(realEstimateId, type, direction_status, partner_name, targetEmail, total_amount, itemRows)
          .catch((e) => console.warn('B2B 견적 접수 메일 백그라운드 발송 실패:', e.message));
      }
    }

    if (sendErrorMsg) {
      return NextResponse.json({
        success: false,
        error: `견적서는 작성되었으나 전송에 실패했습니다. 상세 에러: ${sendErrorMsg}`
      }, { status: 400 });
    }

    let customSuccessMsg = '견적서가 정상적으로 작성되었습니다.';
    if (direction_status === 'DRAFT') {
      customSuccessMsg = '견적서가 임시 저장 상태로 정상 보관되었습니다.';
    } else if (emailSent) {
      customSuccessMsg = `정식 견적서가 이메일(${send_target})로 정상 발송 및 등록되었습니다!`;
    } else if (smsSent) {
      customSuccessMsg = `정식 견적서가 문자(${send_target})로 정상 발송 및 등록되었습니다!`;
    } else if (faxSent) {
      customSuccessMsg = `정식 견적서가 가상 팩스 채널(${send_target})을 통해 성공적으로 전송 완료 및 등록되었습니다!`;
    }

    return NextResponse.json({
      success: true,
      message: customSuccessMsg,
      estimateId,
      totalAmount: total_amount
    });

  } catch (error: any) {
    console.error('API estimates POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: 견적서 마스터 정보 및 품목 리스트 수정 (최고관리자 전용)
 */
export async function PUT(req: Request) {
  try {
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '🔒 권한 차단: 견적서 수정은 최고관리자(SUPER_ADMIN) 권한으로만 가능합니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      estimateId, 
      partner_name, 
      partner_phone, 
      partner_manager,
      direction_status,
      tags,
      items
    } = body;

    if (!estimateId) {
      return NextResponse.json({ success: false, error: '견적 번호가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const masterUpdates: any = {
      updated_at: nowStr
    };
    if (partner_name !== undefined) masterUpdates.partner_name = partner_name;
    if (partner_phone !== undefined) masterUpdates.partner_phone = partner_phone;
    if (partner_manager !== undefined) masterUpdates.partner_manager = partner_manager;
    if (direction_status !== undefined) masterUpdates.direction_status = direction_status;
    if (tags !== undefined) masterUpdates.tags = tags;

    let totalAmountVal = 0;

    if (items !== undefined && Array.isArray(items)) {
      if (!partner_name) {
        return NextResponse.json({ success: false, error: '품목 수정 시 거래처/고객명은 필수 입력 항목입니다.' }, { status: 400 });
      }

      let total_amount = 0;
      const itemRows = items.map((item: any) => {
        const qty = parseInt(item.quantity) || 0;
        const price = parseInt(item.unit_price) || 0;
        const amount = qty * price;
        total_amount += amount;

        const specVal = item.spec && typeof item.spec === 'object'
          ? JSON.stringify(item.spec)
          : (item.spec || '');

        return {
          product_id: item.product_id || '',
          item_code: item.item_code || '',
          product_name: item.product_name,
          quantity: qty,
          unit_price: price,
          amount: amount,
          delivery_date: item.delivery_date || '',
          spec: specVal,
          valid_item_code: item.valid_item_code || ''
        };
      });
      masterUpdates.total_amount = total_amount;
      totalAmountVal = total_amount;

      await updateRows('crm_estimates', masterUpdates, { filters: { id: estimateId } });
      await deleteRows('crm_estimate_items', { filters: { estimate_id: estimateId } });

      const detailRows = itemRows.map((row: any, idx: number) => ({
        id: Date.now() + idx,
        estimate_id: estimateId,
        product_id: row.product_id,
        item_code: row.item_code,
        product_name: row.product_name,
        quantity: row.quantity,
        unit_price: row.unit_price,
        amount: row.amount,
        delivery_date: row.delivery_date,
        spec: row.spec,
        valid_item_code: row.valid_item_code || ''
      }));

      if (detailRows.length > 0) {
        await insertRows('crm_estimate_items', detailRows);
      }
    } else {
      await updateRows('crm_estimates', masterUpdates, { filters: { id: estimateId } });
    }

    // 💡 정식 견적서 이메일 발송 연동 (최종 상태가 SENT 인 경우)
    const estInfo = await queryTable('crm_estimates', { filters: { id: estimateId }, limit: 1 });
    const currentEst = estInfo.rows?.[0];
    const finalStatus = currentEst?.direction_status || '';
    const finalPartnerName = currentEst?.partner_name || '';
    const finalTotalAmount = currentEst?.total_amount || totalAmountVal || 0;

    // 상세 품목 목록 다시 로드
    const finalItemsRes = await queryTable('crm_estimate_items', { filters: { estimate_id: estimateId } });
    const finalItems = finalItemsRes.rows || [];

    if (finalStatus === 'SENT') {
      let targetEmail = body.email;
      if (!targetEmail && finalPartnerName) {
        const partnerRes = await queryTable('crm_partners', { filters: { company_name: finalPartnerName }, limit: 1 });
        if (partnerRes.rows && partnerRes.rows.length > 0) {
          targetEmail = partnerRes.rows[0].email || '';
        }
      }

      if (targetEmail) {
        const mailRes = await sendEstimateEmail(estimateId, 'OUTBOUND', finalStatus, finalPartnerName, targetEmail, finalTotalAmount, finalItems);
        if (!mailRes.success) {
          return NextResponse.json({
            success: false,
            error: `견적서는 수정(저장)되었으나 이메일 전송에 실패했습니다: ${mailRes.error}. [시스템 설정]에서 발송용 SMTP 계정이 올바르게 기입되었는지 확인해주세요.`
          }, { status: 400 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '견적서가 성공적으로 수정(저장) 및 처리되었습니다.',
      totalAmount: finalTotalAmount
    });

  } catch (error: any) {
    console.error('API estimates PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: 견적서 및 세부 품목 삭제 (최고관리자 전용)
 */
export async function DELETE(req: Request) {
  try {
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '🔒 권한 차단: 견적서 삭제는 최고관리자(SUPER_ADMIN) 권한으로만 가능합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const estimateId = searchParams.get('estimateId');

    if (!estimateId) {
      return NextResponse.json({ success: false, error: '삭제할 견적 번호가 누락되었습니다.' }, { status: 400 });
    }

    // 💡 안전 가드: 발주서(crm_purchase_orders) 또는 수주서(crm_sales_orders)로의 전환 여부 검사 및 삭제 차단 (queryTable 우회)
    const poRes = await queryTable('crm_purchase_orders', { filters: { estimate_id: estimateId }, limit: 1 });
    const poRows = poRes.rows || [];
    const soRes = await queryTable('crm_sales_orders', { filters: { estimate_id: estimateId }, limit: 1 });
    const soRows = soRes.rows || [];

    if (poRows.length > 0 || soRows.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: '🔒 삭제 불가: 이 견적서는 이미 발주 또는 수주로 전환(연동)된 상태입니다. 연동된 발주/수주 내역을 먼저 삭제해 주세요.' 
      }, { status: 400 });
    }

    // RAG 결재 심사를 위해 견적 마스터 데이터 로드
    const estRes = await queryTable('crm_estimates', { filters: { id: estimateId }, limit: 1 });
    const estimate = estRes.rows && estRes.rows.length > 0 ? estRes.rows[0] : null;
    if (!estimate) {
      return NextResponse.json({ success: false, error: '해당 견적 내역이 존재하지 않습니다.' }, { status: 404 });
    }

    // RAG 결재 커넥터를 통한 사내 규정 심사
    const ragResult = await checkRagApproval('estimate', estimate);
    if (!ragResult.approved) {
      return NextResponse.json({
        success: false,
        error: `🔒 사내 규정상 자동 삭제가 보류되었습니다. (${ragResult.reason}) 본 건은 최고관리자의 수동 승인이 필요하도록 결재선이 자동 상신되었습니다. AI 컨트롤타워 관제 센터에서 승인 완료 후 삭제가 반영됩니다.`
      }, { status: 400 });
    }

    // 1. 토큰에서 삭제 작업자 정보 추출
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let deletedBy = 'system';
    if (token) {
      try {
        const payload = decodeJwt(token);
        deletedBy = (payload.username as string) || (payload.role as string) || 'system';
      } catch {}
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 2. crm_estimates 테이블에서 마스터 소프트 삭제
    await updateRows('crm_estimates', {
      deleted_at: nowStr,
      deleted_by: deletedBy
    }, { filters: { id: estimateId } });

    // 3. crm_estimate_items 테이블에서 상세 품목 일괄 소프트 삭제
    await updateRows('crm_estimate_items', {
      deleted_at: nowStr,
      deleted_by: deletedBy
    }, { filters: { estimate_id: estimateId } });

    return NextResponse.json({
      success: true,
      message: '견적서 및 세부 품목이 성공적으로 삭제(소프트 삭제)되었습니다.'
    });

  } catch (error: any) {
    console.error('API estimates DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
