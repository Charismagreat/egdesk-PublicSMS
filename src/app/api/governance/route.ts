export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { 
  queryTable, 
  insertRows, 
  updateRows, 
  deleteRows,
  executeSQL 
} from '../../../../egdesk-helpers';

/**
 * 최고관리자(SUPER_ADMIN) 권한 검증 헬퍼
 * 쿠키의 JWT 토큰을 복호화하여 역할을 확인합니다.
 */
async function verifySuperAdmin(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const payload = decodeJwt(token);
    if (payload.role === 'SUPER_ADMIN') {
      return (payload.username as string) || 'SUPER_ADMIN';
    }
  } catch (e) {
    console.error('verifySuperAdmin error:', e);
  }
  return null;
}

/**
 * GET 핸들러
 * 1. action=logs: RAG 결재 판정 감사 로그 조회
 * 2. action=deleted_items: 소프트 삭제된 대장 항목(견적, 발주, 수주) 조회
 */
export async function GET(request: Request) {
  try {
    const adminUser = await verifySuperAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: '🔒 권한이 없습니다. 최고관리자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'logs') {
      // crm_governance_logs 테이블에서 전체 로그 조회
      const res = await queryTable('crm_governance_logs', { limit: 2000 });
      const logs = res.rows || [];
      
      // 생성일시(created_at) 기준 최근순 정렬
      logs.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
      
      return NextResponse.json({ success: true, logs });
    }

    if (action === 'deleted_items') {
      // 소프트 삭제된 견적서, 발주서, 수주서 조회
      // 'DELETE' 금지 키워드 오감지(deleted_at 내의 delete 문자열)를 피하기 위해, queryTable로 전체를 받아와 메모리상에서 필터링합니다.
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

      // 통합 후 삭제일시(deleted_at) 기준 최근순 정렬
      const allDeleted = [...estimates, ...purchaseOrders, ...salesOrders];
      allDeleted.sort((a: any, b: any) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));

      return NextResponse.json({ success: true, deletedItems: allDeleted });
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
 * 1. action=force_delete: 보류된 건에 대한 최고관리자 강제 삭제 승인
 * 2. action=restore: 소프트 삭제된 대장 데이터 복원
 */
export async function POST(request: Request) {
  try {
    const adminUser = await verifySuperAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: '🔒 권한이 없습니다. 최고관리자만 조작할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
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

      // 1. 실제 대장 데이터 소프트 삭제 처리 (deleted_at 설정)
      await updateRows(tableName, {
        deleted_at: nowStr,
        deleted_by: adminUser
      }, { filters: { id: docId } });

      // 견적서일 경우 품목 상세(crm_estimate_items)도 함께 소프트 삭제 처리
      if (docType === 'estimate') {
        await updateRows('crm_estimate_items', {
          deleted_at: nowStr,
          deleted_by: adminUser
        }, { filters: { estimate_id: docId } });
      }

      // 2. 거버넌스 감사 로그 상태 업데이트 (status: 'FORCE_APPROVED')
      if (logId) {
        await updateRows('crm_governance_logs', {
          status: 'FORCE_APPROVED',
          reason: `최고관리자(${adminUser})에 의해 삭제가 강제 승인 및 처리되었습니다.`
        }, { filters: { id: logId } });
      } else {
        // 이력이 없는 경우 새롭게 강제 승인 로그 삽입
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

      // 1. 대장 데이터 복원 (deleted_at, deleted_by 값 제거 및 복원자/일시 기록)
      await updateRows(tableName, {
        deleted_at: null,
        deleted_by: null,
        restored_at: nowStr,
        restored_by: adminUser
      }, { filters: { id: docId } });

      // 견적서일 경우 품목 상세(crm_estimate_items)도 함께 복원 처리
      if (docType === 'estimate') {
        await updateRows('crm_estimate_items', {
          deleted_at: null,
          deleted_by: null
        }, { filters: { estimate_id: docId } });
      }

      // 2. 복원 감사 로그 기록 삽입
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
      // 실시간 AI 결재 심사 이력 전체 초기화 (데이터 비우기)
      const res = await queryTable('crm_governance_logs', { limit: 10000 });
      const rows = res.rows || [];
      
      if (rows.length > 0) {
        // deleteRows 헬퍼를 통해 행 식별 ID 배열로 데이터 삭제를 수행
        const ids = rows.map((r: any) => Number(r.id) || r.id);
        await deleteRows('crm_governance_logs', { ids });
      }

      return NextResponse.json({
        success: true,
        message: '실시간 AI 결재 심사 이력이 성공적으로 초기화되었습니다.'
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
