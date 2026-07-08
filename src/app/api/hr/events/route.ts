export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows } from '../../../../../egdesk-helpers';

/**
 * 전사 회사 일정 조회
 */
// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'default';
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR';
    return { isAuthorized, role, name, username, tenantId };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

/**
 * 전사 회사 일정 조회
 */
export async function GET() {
  try {
    const { isAuthorized, tenantId, username: loggedUsername } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const filters: any = {};
    if (loggedUsername !== 'admin') {
      filters.tenant_id = tenantId;
    }

    const eventsRes = await queryTable('crm_company_events', { filters, orderBy: 'start_date', orderDirection: 'ASC' });
    const eventsList = (eventsRes.rows || []).filter((e: any) => !e.deleted_at);

    return NextResponse.json({
      success: true,
      events: eventsList
    });
  } catch (error: any) {
    console.error('Events GET API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * 회사 공유 일정 등록, 수정 및 삭제 (동적 Action 분기)
 */
export async function POST(req: Request) {
  try {
    const { action, ...payload } = await req.json();

    const { isAuthorized, tenantId, role: sessionRole } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    // 캘린더 편집 권한 제한 (최고관리자 또는 대표자)
    if (sessionRole !== 'SUPER_ADMIN' && sessionRole !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '회사 캘린더 일정을 수정할 수 있는 권한이 없습니다.' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const sessionUser = decodeJwt(token!);
    const operatorId = sessionUser.id;

    const now = new Date();

    // ==========================================
    // 📂 액션 1: 신규 일정 등록 (CREATE)
    // ==========================================
    if (action === 'CREATE') {
      const { title, start_date, end_date, event_type, description } = payload;

      if (!title || !start_date || !end_date || !event_type) {
        return NextResponse.json({ success: false, error: '일정의 필수 입력 필드가 누락되었습니다.' }, { status: 400 });
      }

      const newEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        start_date,
        end_date,
        event_type,
        description: description || '',
        created_by: operatorId,
        tenant_id: tenantId,
        created_at: now.toISOString()
      };

      await insertRows('crm_company_events', [newEvent]);

      return NextResponse.json({
        success: true,
        message: '회사 공유 일정이 성공적으로 등록되어 캘린더에 마운트 완료되었습니다 📅',
        event: newEvent
      });
    }

    // ==========================================
    // 📂 액션 2: 일정 삭제 (DELETE)
    // ==========================================
    if (action === 'DELETE') {
      const { event_id } = payload;

      if (!event_id) {
        return NextResponse.json({ success: false, error: '삭제할 일정 ID가 누락되었습니다.' }, { status: 400 });
      }

      await deleteRows('crm_company_events', { filters: { id: event_id, tenant_id: tenantId } });

      return NextResponse.json({
        success: true,
        message: '선택하신 회사 캘린더 일정이 안전하게 삭제 완료되었습니다 🗑️'
      });
    }

    return NextResponse.json({ success: false, error: '잘못된 액션 요청입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('Events POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
