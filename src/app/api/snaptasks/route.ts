export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows, executeSQL } from '../../../../egdesk-helpers';

/**
 * GET: 스냅태스크 목록 조회 또는 특정 태스크의 타임라인 마이닝
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const taskId = searchParams.get('task_id');

    // ────────────────────────────────────────────────────────
    // 1. 특정 태스크 상세 타임라인 & 자율 액션 로그 마이닝
    // ────────────────────────────────────────────────────────
    if (action === 'timeline' && taskId) {
      // 마스터 정보 조회
      const taskRes = await queryTable('crm_snaptasks', { filters: { id: taskId } });
      if (!taskRes.rows || taskRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: '존재하지 않는 스냅태스크입니다.' }, { status: 404 });
      }
      const task = taskRes.rows[0];

      // 타임라인 상세 이력 마이닝
      const itemsQuery = `SELECT * FROM crm_snaptask_items WHERE task_id = '${taskId}' AND deleted_at IS NULL ORDER BY created_at ASC`;
      const itemsRes = await executeSQL(itemsQuery) || [];
      const items = (itemsRes && (itemsRes as any).rows) ? (itemsRes as any).rows : (Array.isArray(itemsRes) ? itemsRes : []);

      // 자율 조치 감사 로그 마이닝
      const actionsQuery = `SELECT * FROM crm_snaptask_actions WHERE task_id = '${taskId}' AND deleted_at IS NULL ORDER BY created_at ASC`;
      const actionsRes = await executeSQL(actionsQuery) || [];
      const actions = (actionsRes && (actionsRes as any).rows) ? (actionsRes as any).rows : (Array.isArray(actionsRes) ? actionsRes : []);

      // 연동된 B2B 파트너 및 다중 담당자 명함첩 조회
      let partner = null;
      let partnerContacts: any[] = [];
      if (task.partner_id) {
        try {
          const partnerRes = await queryTable('crm_partners', { filters: { id: task.partner_id } });
          if (partnerRes.rows && partnerRes.rows.length > 0) {
            partner = partnerRes.rows[0];
          }

          const contactsQuery = `SELECT * FROM crm_partner_contacts WHERE partner_id = '${task.partner_id}' AND deleted_at IS NULL ORDER BY is_primary DESC, name ASC`;
          const contactsRes = await executeSQL(contactsQuery) || [];
          partnerContacts = (contactsRes && (contactsRes as any).rows) ? (contactsRes as any).rows : (Array.isArray(contactsRes) ? contactsRes : []);
        } catch (e) {
          console.error('Failed to fetch partner or contacts details:', e);
        }
      }

      return NextResponse.json({
        success: true,
        task,
        items,
        actions,
        partner,
        partnerContacts
      });
    }

    // ────────────────────────────────────────────────────────
    // 2. 활성 스냅태스크 목록 전체 조회 (B2B 파트너 상호명 레프트조인)
    // ────────────────────────────────────────────────────────
    // SQLite 조인을 이용하여 파트너 상호명 및 최종 업데이트 기준 역순 정렬
    const listQuery = `
      SELECT t.*, p.company_name as partner_company_name 
      FROM crm_snaptasks t
      LEFT JOIN crm_partners p ON t.partner_id = p.id
      WHERE t.deleted_at IS NULL
      ORDER BY t.id DESC
    `;
    const listRes = await executeSQL(listQuery) || [];
    const tasks = (listRes && (listRes as any).rows) ? (listRes as any).rows : (Array.isArray(listRes) ? listRes : []);

    return NextResponse.json({
      success: true,
      tasks
    });

  } catch (error: any) {
    console.error('API snaptasks GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 신규 스냅태스크 생성
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: '태스크 제목은 필수 입력 항목입니다.' }, { status: 400 });
    }

    const taskId = `ST-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await insertRows('crm_snaptasks', [{
      id: taskId,
      title: title.trim(),
      status: 'ACTIVE',
      partner_id: null,
      created_at: nowStr,
      updated_at: nowStr
    }]);

    // 첫 가이드성 AI 자율 생성 타임라인 첫발자국 자동 삽입
    await insertRows('crm_snaptask_items', [{
      id: Date.now(),
      task_id: taskId,
      content_text: `[시스템] '${title}' 스냅태스크가 성공적으로 생성되었습니다. 🪐\n여기에 파트너 명함 사진, 녹취 파일, 지도 주소, 상담 메모를 언제든지 스냅하여 던져 주시면 AI 자율 경영 파트너가 즉각 분석을 개시합니다.`,
      file_url: null,
      file_type: 'TEXT',
      ai_analysis: JSON.stringify({ message: "Task initialized" }),
      created_at: nowStr
    }]);

    return NextResponse.json({
      success: true,
      message: '새로운 AI 스냅태스크가 정상 개설되었습니다.',
      taskId
    });

  } catch (error: any) {
    console.error('API snaptasks POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: 스냅태스크 상태 완료 또는 파트너 연동 수정
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, partner_id, title } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '수정할 스냅태스크 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    updates.updated_at = nowStr;

    if (status !== undefined) updates.status = status;
    if (partner_id !== undefined) updates.partner_id = partner_id;
    if (title !== undefined) updates.title = title;

    await updateRows('crm_snaptasks', updates, { filters: { id } });

    return NextResponse.json({
      success: true,
      message: '스냅태스크 상태가 정상 갱신되었습니다.'
    });

  } catch (error: any) {
    console.error('API snaptasks PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: 스냅태스크 및 연동 타임라인/액션 로그 영구 삭제
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 스냅태스크 식별 코드(id)가 누락되었습니다.' }, { status: 400 });
    }

    // 마스터 삭제
    await deleteRows('crm_snaptasks', { filters: { id } });
    
    // 타임라인 아이템 삭제
    try {
      await executeSQL(`DELETE FROM crm_snaptask_items WHERE task_id = '${id}'`);
    } catch (err) {
      console.error('TIMELINE_ITEMS_CLEAN_ERR:', err);
    }

    // 감사로그 삭제
    try {
      await executeSQL(`DELETE FROM crm_snaptask_actions WHERE task_id = '${id}'`);
    } catch (err) {
      console.error('ACTIONS_CLEAN_ERR:', err);
    }

    return NextResponse.json({
      success: true,
      message: '해당 스냅태스크 및 연동된 모든 타임라인 이력이 완전히 영구 소멸되었습니다.'
    });

  } catch (error: any) {
    console.error('API snaptasks DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
