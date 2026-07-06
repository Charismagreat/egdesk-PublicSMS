export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, updateRows } from '@/../egdesk-helpers';

// 한국 시간 도우미 함수
function getKSTDateString() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * GET: 특정 회의의 할 일 목록 조회
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json({ success: false, error: '회의 식별 번호(meetingId)가 누락되었습니다.' }, { status: 400 });
    }

    const result = await queryTable('crm_meeting_tasks', {
      filters: { meeting_id: String(meetingId), deleted_at: null },
      orderBy: 'id',
      orderDirection: 'ASC'
    });

    return NextResponse.json({ success: true, tasks: result.rows || [] });
  } catch (error: any) {
    console.error('할 일 목록 조회 오류:', error);
    return NextResponse.json({ success: false, error: '할 일 목록을 불러오는 도중 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * PATCH: 특정 할 일의 완료 여부 상태 변경
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json({ success: false, error: '할 일 ID와 대상 상태(status)는 필수 입력 사항입니다.' }, { status: 400 });
    }

    if (status !== 'PENDING' && status !== 'COMPLETED') {
      return NextResponse.json({ success: false, error: '올바르지 않은 완료 상태 값입니다.' }, { status: 400 });
    }

    const nowStr = getKSTDateString();

    await updateRows('crm_meeting_tasks', {
      status,
      updated_at: nowStr,
      updated_by: 'SYSTEM'
    }, { filters: { id: String(taskId) } });

    return NextResponse.json({ success: true, message: '할 일 상태가 업데이트되었습니다.' });
  } catch (error: any) {
    console.error('할 일 상태 업데이트 오류:', error);
    return NextResponse.json({ success: false, error: '할 일 상태를 변경하지 못했습니다.' }, { status: 500 });
  }
}
