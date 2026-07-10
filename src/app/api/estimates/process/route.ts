export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL } from '../../../../../egdesk-helpers';
import { checkRagApproval } from '../../../../lib/rag-approval';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

// 현재 세션의 테넌트 ID 추출 헬퍼
async function resolveTenantId(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return 'default';
  try {
    const payload = decodeJwt(token);
    return (payload.tenant_id as string) || 'default';
  } catch {
    return 'default';
  }
}

/**
 * GET: 발주 대장 및 수주 대장 목록 조회
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

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

    const tenantId = await resolveTenantId();

    if (action === 'po_list') {
      const res = await queryTable('crm_purchase_orders', { filters: { tenant_id: tenantId } });
      const rows = (res.rows || []).filter((a: any) => !a.deleted_at);
      
      // 견적 상세 아이템 데이터 로드
      const itemsRes = await queryTable('crm_estimate_items', { filters: { tenant_id: tenantId } });
      const rawItems = itemsRes.rows || [];
      const itemsMap: Record<string, any[]> = {};
      for (const item of rawItems) {
        const estId = item.estimate_id;
        if (!itemsMap[estId]) itemsMap[estId] = [];
        itemsMap[estId].push(item);
      }

      // 견적 마스터 데이터 로드 (비고란 검색용)
      const estRes = await queryTable('crm_estimates', { filters: { tenant_id: tenantId } });
      const rawEsts = estRes.rows || [];
      const estMap: Record<string, any> = {};
      for (const est of rawEsts) {
        estMap[est.id] = est;
      }

      const enrichedRows = rows.map((po: any) => {
        const estItems = itemsMap[po.estimate_id] || [];
        const itemSearchText = estItems.map(item => {
          const specStr = item.spec ? String(item.spec) : '';
          return `${item.product_name} ${specStr}`;
        }).join(' ');

        const relatedEst = estMap[po.estimate_id];
        let docMemo = '';
        if (relatedEst && relatedEst.tags) {
          try {
            const parsed = JSON.parse(relatedEst.tags);
            docMemo = parsed.document_memo || parsed.tags || '';
          } catch {
            docMemo = relatedEst.tags;
          }
        }

        return {
          ...po,
          is_pending_delete: pendingDocIds.has(po.id),
          item_search_text: itemSearchText,
          document_memo_search: docMemo,
          items: estItems,
          file_url: relatedEst ? relatedEst.file_url : null,
          business_license_url: relatedEst ? relatedEst.business_license_url : null
        };
      });

      const sorted = [...enrichedRows].sort((a: any, b: any) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      return NextResponse.json({ success: true, purchaseOrders: sorted });
    }

    if (action === 'so_list') {
      const res = await queryTable('crm_sales_orders', { filters: { tenant_id: tenantId } });
      const rows = (res.rows || []).filter((a: any) => !a.deleted_at);
      
      // 견적 상세 아이템 데이터 로드
      const itemsRes = await queryTable('crm_estimate_items', { filters: { tenant_id: tenantId } });
      const rawItems = itemsRes.rows || [];
      const itemsMap: Record<string, any[]> = {};
      for (const item of rawItems) {
        const estId = item.estimate_id;
        if (!itemsMap[estId]) itemsMap[estId] = [];
        itemsMap[estId].push(item);
      }

      // 견적 마스터 데이터 로드 (비고란 검색용)
      const estRes = await queryTable('crm_estimates', { filters: { tenant_id: tenantId } });
      const rawEsts = estRes.rows || [];
      const estMap: Record<string, any> = {};
      for (const est of rawEsts) {
        estMap[est.id] = est;
      }

      const enrichedRows = rows.map((so: any) => {
        const estItems = itemsMap[so.estimate_id] || [];
        const itemSearchText = estItems.map(item => {
          const specStr = item.spec ? String(item.spec) : '';
          return `${item.product_name} ${specStr}`;
        }).join(' ');

        const relatedEst = estMap[so.estimate_id];
        let docMemo = '';
        if (relatedEst && relatedEst.tags) {
          try {
            const parsed = JSON.parse(relatedEst.tags);
            docMemo = parsed.document_memo || parsed.tags || '';
          } catch {
            docMemo = relatedEst.tags;
          }
        }

        return {
          ...so,
          is_pending_delete: pendingDocIds.has(so.id),
          item_search_text: itemSearchText,
          document_memo_search: docMemo,
          items: estItems,
          file_url: relatedEst ? relatedEst.file_url : null,
          business_license_url: relatedEst ? relatedEst.business_license_url : null
        };
      });

      const sorted = [...enrichedRows].sort((a: any, b: any) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      return NextResponse.json({ success: true, salesOrders: sorted });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 요청 액션입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error('API estimates process GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: ERP/SCM 발주서 전환, 실물 입고 검수 승인, 수주 등록 및 확인서 발송 처리
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, estimateId, orderId, checkedItems = [], partner_name, partner_phone, total_amount } = body;

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // ────────────────────────────────────────────────────────
    // 1. 받은 견적서 ➡️ 발주서 자동 전환
    // ────────────────────────────────────────────────────────
    if (action === 'create_purchase_order') {
      if (!estimateId || !partner_name) {
        return NextResponse.json({ success: false, error: '견적 번호와 공급처 정보가 누락되었습니다.' }, { status: 400 });
      }

      const poId = `PO-${Date.now()}`;
      
      // 발주 테이블 등록
      await insertRows('crm_purchase_orders', [{
        id: poId,
        estimate_id: estimateId,
        vendor_name: partner_name,
        vendor_phone: partner_phone || '',
        status: 'PENDING_INBOUND', // 입고 대기 플래그
        total_amount: total_amount || 0,
        created_at: nowStr,
        completed_at: ''
      }]);

      // 견적서 상태 업데이트 및 발주번호(purchase_order_number) 매핑
      await updateRows('crm_estimates', { 
        direction_status: 'SENT',
        purchase_order_number: poId
      }, { filters: { id: estimateId } });

      return NextResponse.json({
        success: true,
        message: '받은 견적서가 성공적으로 발주서로 전환되었으며 거래처 발송 대기 상태가 되었습니다.',
        poId
      });
    }

    // ────────────────────────────────────────────────────────
    // [NEW] 1.5. 보낸 발주서 수동 직접 작성 및 등록
    // ────────────────────────────────────────────────────────
    if (action === 'create_purchase_order_manual') {
      const { vendor_name, vendor_phone, vendor_manager, items = [], total_amount } = body;
      if (!vendor_name) {
        return NextResponse.json({ success: false, error: '공급처명은 필수 항목입니다.' }, { status: 400 });
      }
      if (items.length === 0) {
        return NextResponse.json({ success: false, error: '최소 1개 이상의 발주 품목이 필요합니다.' }, { status: 400 });
      }

      // 고유 식별 마스터 ID 및 UUID 생성
      const nowObj = new Date();
      const yy = String(nowObj.getFullYear()).slice(-2);
      const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
      const dd = String(nowObj.getDate()).padStart(2, '0');
      const hh = String(nowObj.getHours()).padStart(2, '0');
      const min = String(nowObj.getMinutes()).padStart(2, '0');
      const ss = String(nowObj.getSeconds()).padStart(2, '0');
      const rand = Math.floor(Math.random() * 90 + 10);

      const estimateId = `EST-SHADOW-${yy}${mm}${dd}-${hh}${min}${ss}`;
      const estUuid = `EST-UUID-${yy}${mm}${dd}-${hh}${min}${ss}-${rand}-${Math.random().toString(36).substring(2, 9)}`;
      
      const poId = `PO-${Date.now()}`;
      const poUuid = `PO-UUID-${yy}${mm}${dd}-${hh}${min}${ss}-${rand}-${Math.random().toString(36).substring(2, 9)}`;

      // 1. crm_estimates 섀도우 레코드 삽입
      await insertRows('crm_estimates', [{
        id: estimateId,
        type: 'INBOUND', // 외부로부터 받은 견적 대용 섀도우
        direction_status: 'SENT', // 발주 전환 완료 상태 매핑
        partner_name: vendor_name,
        partner_phone: vendor_phone || '',
        partner_manager: vendor_manager || '',
        total_amount: total_amount || 0,
        file_url: '수동 발주 작성 자동 매핑',
        ai_parsed: 0,
        tags: JSON.stringify({ document_memo: '수동 직접 기안된 발주서 건입니다.' }),
        uuid: estUuid,
        purchase_order_number: poId,
        created_at: nowStr,
        updated_at: nowStr,
        updated_by: 'system',
        deleted_at: null,
        deleted_by: null,
        restored_at: null,
        restored_by: null
      }]);

      // 방금 삽입된 실제 정수 id 가져오기
      const insertedEstRes = await queryTable('crm_estimates', { filters: { uuid: estUuid }, limit: 1 });
      const insertedEst = insertedEstRes.rows && insertedEstRes.rows.length > 0 ? insertedEstRes.rows[0] : null;
      const realEstimateId = insertedEst ? String(insertedEst.id) : estimateId;

      // 2. crm_estimate_items 디테일 테이블 품목 삽입
      const detailRows = items.map((row: any, idx: number) => {
        const qty = parseInt(row.quantity) || 0;
        const price = parseInt(row.unit_price) || 0;
        const amount = qty * price;
        const itemUuid = `ITEM-UUID-${yy}${mm}${dd}-${hh}${min}${ss}-${idx}-${Math.random().toString(36).substring(2, 9)}`;

        return {
          id: Date.now() + idx,
          estimate_id: realEstimateId,
          product_id: row.product_id || '',
          item_code: row.item_code || '',
          product_name: row.product_name,
          quantity: qty,
          unit_price: price,
          amount: amount,
          delivery_date: row.delivery_date || '',
          spec: row.spec || '',
          uuid: itemUuid,
          updated_at: nowStr,
          updated_by: 'system',
          deleted_at: null,
          deleted_by: null,
          restored_at: null,
          restored_by: null
        };
      });

      await insertRows('crm_estimate_items', detailRows);

      // 3. crm_purchase_orders 발주 레코드 삽입
      await insertRows('crm_purchase_orders', [{
        id: poId,
        estimate_id: realEstimateId,
        vendor_name: vendor_name,
        vendor_phone: vendor_phone || '',
        status: 'PENDING_INBOUND', // 입고 대기 상태
        total_amount: total_amount || 0,
        created_at: nowStr,
        completed_at: '',
        uuid: poUuid,
        updated_at: nowStr,
        updated_by: 'system',
        deleted_at: null,
        deleted_by: null,
        restored_at: null,
        restored_by: null
      }]);

      return NextResponse.json({
        success: true,
        message: '발주서가 성공적으로 직접 기안 및 등록되었습니다.',
        poId
      });
    }

    // ────────────────────────────────────────────────────────
    // 2. 발주 완료 건 ➡️ 실물 검수 승인 및 재고 실반영 (SCM 핵심 루프! ⭐️)
    // ────────────────────────────────────────────────────────
    if (action === 'confirm_inbound') {
      if (!orderId) {
        return NextResponse.json({ success: false, error: '발주 번호가 누락되었습니다.' }, { status: 400 });
      }
      if (checkedItems.length === 0) {
        return NextResponse.json({ success: false, error: '검수할 품목 정보가 없습니다.' }, { status: 400 });
      }

      // 1. 발주 상태 업데이트 (INBOUND_COMPLETED 로 전환)
      await updateRows('crm_purchase_orders', {
        status: 'INBOUND_COMPLETED',
        completed_at: nowStr
      }, { filters: { id: orderId } });

      // 2. 개별 품목별 실물 입고 검수량 반영 및 재고 증대
      for (const item of checkedItems) {
        const checkedQty = parseInt(item.checkedQty) || 0;
        if (checkedQty <= 0) continue;

        // 재고 DB(inventory_items)에 존재하는 품목인지 부분 명칭 매칭 검색 (소프트 삭제 제외)
        const querySearch = `SELECT * FROM inventory_items WHERE name = '${item.product_name}' AND deleted_at IS NULL LIMIT 1`;
        const existingItems = await executeSQL(querySearch);

        if (existingItems && existingItems.length > 0) {
          const dbItem = existingItems[0];
          const newStock = (parseInt(dbItem.stock) || 0) + checkedQty;

          // 재고 수량 가산 업데이트
          await updateRows('inventory_items', { stock: newStock }, { filters: { id: String(dbItem.id) } });

          // 재고 입고 변동 이력(inventory_logs) 적재
          await insertRows('inventory_logs', [{
            itemId: dbItem.id,
            itemName: dbItem.name,
            itemType: dbItem.type,
            changeType: 'in',
            quantity: checkedQty,
            price: dbItem.price,
            operator: '대표 사장님 (ERP 검수입고)',
            note: `발주 연동 실물 검수 완료 입고 (발주번호: ${orderId})`,
            createdAt: nowStr
          }]);
        } else {
          // 존재하지 않는다면 신규 자재 품목(material)으로 임시 자동 생성 적재!
          const newItemId = Date.now() + Math.floor(Math.random() * 100);
          await insertRows('inventory_items', [{
            id: newItemId,
            type: '자재',
            name: item.product_name,
            category: '기타',
            price: item.unit_price || 10000,
            partner: partner_name || '신규 공급처',
            stock: checkedQty,
            safeStock: 10,
            location: 'A홀 입고 검수대',
            description: `발주 연동으로 신규 자동 개설된 품목 (발주번호: ${orderId})`,
            createdAt: nowStr
          }]);

          // 이력 적재
          await insertRows('inventory_logs', [{
            itemId: newItemId,
            itemName: item.product_name,
            itemType: 'material',
            changeType: 'in',
            quantity: checkedQty,
            price: item.unit_price || 10000,
            operator: '대표 사장님 (ERP 검수입고)',
            note: `신규 품목 자동개설 및 검수입고 (발주번호: ${orderId})`,
            createdAt: nowStr
          }]);
        }
      }

      return NextResponse.json({
        success: true,
        message: '실물 입고 검수가 최종 완료되었습니다. 입고 수량이 실시간 재고 대장에 가산되어 반영되었습니다!'
      });
    }

    // ────────────────────────────────────────────────────────
    // 3. 보낸 견적서 ➡️ 수주 등록 자동 전환
    // ────────────────────────────────────────────────────────
    if (action === 'create_sales_order') {
      if (!estimateId || !partner_name) {
        return NextResponse.json({ success: false, error: '견적 번호와 바이어 정보가 누락되었습니다.' }, { status: 400 });
      }

      const soId = `SO-${Date.now()}`;
      const { sales_order_number, order_date } = body;

      // 날짜 포맷 정규화 가드 추가 (예: 2026.06.18 -> 2026-06-18)
      let formattedOrderDate = nowStr;
      if (order_date && order_date.trim()) {
        const cleanDate = order_date.trim().replace(/[\.\/]/g, '-');
        if (cleanDate.length === 10) {
          formattedOrderDate = `${cleanDate} ${nowStr.substring(11)}`;
        } else {
          formattedOrderDate = cleanDate;
        }
      }

      // 수주 등록
      await insertRows('crm_sales_orders', [{
        id: soId,
        estimate_id: estimateId,
        client_order_no: sales_order_number || '',
        customer_name: partner_name,
        customer_phone: partner_phone || '',
        status: 'REGISTERED',
        total_amount: total_amount || 0,
        order_date: formattedOrderDate,
        created_at: nowStr
      }]);

      // 보낸 견적 상태 변경 및 수주 번호 기입
      await updateRows('crm_estimates', { 
        direction_status: 'RECEIVED',
        sales_order_number: sales_order_number || soId
      }, { filters: { id: estimateId } });

      return NextResponse.json({
        success: true,
        message: '보낸 견적서의 바이어 구매 수락이 완료되어 수주 등록이 완료되었습니다.',
        soId
      });
    }

    // ────────────────────────────────────────────────────────
    // 4. 수주 ➡️ 수주확인서 발송 처리
    // ────────────────────────────────────────────────────────
    if (action === 'confirm_sales_order') {
      if (!orderId || !partner_name) {
        return NextResponse.json({ success: false, error: '수주 번호 및 바이어명이 누락되었습니다.' }, { status: 400 });
      }

      // 수주 확인 상태로 갱신
      await updateRows('crm_sales_orders', { status: 'CONFIRMED' }, { filters: { id: orderId } });

      // 수주 확인 모의 발송 문자 내역 적재
      if (partner_phone) {
        const smsId = Date.now();
        await insertRows('message_logs', [{
          id: smsId,
          phone: partner_phone,
          message: `🔔 [이지데스크 수주 확인 완료]
안녕하세요, ${partner_name} 귀하.
귀사께서 신뢰로 의뢰해 주신 수주 주문(번호: ${orderId}) 건에 대해 정밀 검수가 정상 완료되어 출고 스케줄이 배정되었습니다. 수주확인서가 카카오톡으로 발송되었습니다. 안전하고 빠른 딜리버리를 보장하겠습니다. 고맙습니다.`,
          status: 'SUCCESS',
          created_at: nowStr
        }]);
      }

      return NextResponse.json({
        success: true,
        message: '수주 확정이 성공적으로 완료되었으며, 바이어에게 정중한 수주 확인서 알림톡 발송을 완료했습니다!'
      });
    }

    // ────────────────────────────────────────────────────────
    // 5. 수주 등록 건 소프트 삭제
    // ────────────────────────────────────────────────────────
    if (action === 'delete_sales_order') {
      if (!orderId) {
        return NextResponse.json({ success: false, error: '수주 번호가 누락되었습니다.' }, { status: 400 });
      }

      // 1. 수주 정보 조회
      const soRes = await queryTable('crm_sales_orders', { filters: { id: orderId } });
      const so = soRes.rows && soRes.rows.length > 0 ? soRes.rows[0] : null;
      if (!so) {
        return NextResponse.json({ success: false, error: '해당 수주 건이 존재하지 않습니다.' }, { status: 404 });
      }

      // RAG 결재 커넥터를 통한 사내 규정 심사
      const ragResult = await checkRagApproval('sales_order', so);
      if (!ragResult.approved) {
        return NextResponse.json({
          success: false,
          error: `🔒 사내 규정상 자동 삭제가 보류되었습니다. (${ragResult.reason}) 본 건은 최고관리자의 수동 승인이 필요하도록 결재선이 자동 상신되었습니다. AI 컨트롤타워 관제 센터에서 승인 완료 후 삭제가 반영됩니다.`
        }, { status: 400 });
      }

      // 2. 수주 데이터 소프트 삭제 (deleted_at 업데이트)
      await updateRows('crm_sales_orders', {
        deleted_at: nowStr,
        deleted_by: 'system'
      }, { filters: { id: orderId } });

      // 3. 연동된 견적서 상태 복구 (수주 취소에 따른 복구)
      if (so.estimate_id) {
        await updateRows('crm_estimates', {
          direction_status: 'SENT',
          sales_order_number: ''
        }, { filters: { id: so.estimate_id } });
      }

      return NextResponse.json({
        success: true,
        message: '선택하신 수주(발주서 등록) 건이 성공적으로 삭제되었습니다.'
      });
    }

    // ────────────────────────────────────────────────────────
    // 6. 발주 등록 건 소프트 삭제
    // ────────────────────────────────────────────────────────
    if (action === 'delete_purchase_order') {
      if (!orderId) {
        return NextResponse.json({ success: false, error: '발주 번호가 누락되었습니다.' }, { status: 400 });
      }

      // 1. 발주 정보 조회
      const poRes = await queryTable('crm_purchase_orders', { filters: { id: orderId } });
      const po = poRes.rows && poRes.rows.length > 0 ? poRes.rows[0] : null;
      if (!po) {
        return NextResponse.json({ success: false, error: '해당 발주 건이 존재하지 않습니다.' }, { status: 404 });
      }

      // 2. 입고 완료 건 삭제 원천 차단 (하드 가드)
      if (po.status === 'INBOUND_COMPLETED') {
        return NextResponse.json({
          success: false,
          error: '🔒 삭제 불가: 이미 실물 입고 검수가 최종 승인되어 재고 대장에 반영된 발주서는 삭제할 수 없습니다.'
        }, { status: 400 });
      }

      // RAG 결재 커넥터를 통한 사내 규정 심사
      const ragResult = await checkRagApproval('purchase_order', po);
      if (!ragResult.approved) {
        return NextResponse.json({
          success: false,
          error: `🔒 사내 규정상 자동 삭제가 보류되었습니다. (${ragResult.reason}) 본 건은 최고관리자의 수동 승인이 필요하도록 결재선이 자동 상신되었습니다. AI 컨트롤타워 관제 센터에서 승인 완료 후 삭제가 반영됩니다.`
        }, { status: 400 });
      }

      // 3. 발주 데이터 소프트 삭제 (deleted_at 업데이트)
      await updateRows('crm_purchase_orders', {
        deleted_at: nowStr,
        deleted_by: 'system'
      }, { filters: { id: orderId } });

      // 4. 연동된 견적서 상태 복구 (발주 취소에 따른 복구)
      if (po.estimate_id) {
        await updateRows('crm_estimates', {
          direction_status: 'REQUESTED',
          purchase_order_number: ''
        }, { filters: { id: po.estimate_id } });
      }

      return NextResponse.json({
        success: true,
        message: '선택하신 발주 등록 건이 성공적으로 삭제되었습니다.'
      });
    }

    return NextResponse.json({ success: false, error: '유효하지 않은 요청 액션입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('API estimates process error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
