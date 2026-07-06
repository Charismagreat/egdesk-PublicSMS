export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, updateRows, deleteRows } from '../../../../../egdesk-helpers';

/**
 * 최고관리자(SUPER_ADMIN) 권한 검증 공통 헬퍼
 */
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const payload = decodeJwt(token);
  if (payload.role !== 'SUPER_ADMIN') {
    throw new Error('피드백 관리 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.');
  }
}

/**
 * GET: 접수된 사용자 피드백 목록 페이징 및 필터링 조회
 */
export async function GET(req: Request) {
  try {
    await verifySuperAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    // 전체 피드백 로드 (최신순)
    const result = await queryTable('user_feedbacks', {
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    let filtered = result.rows || [];

    // 1. 제보 유형 필터링
    if (type !== 'all') {
      filtered = filtered.filter((item: any) => item.detected_type === type);
    }

    // 2. 처리 상태 필터링
    if (status !== 'all') {
      filtered = filtered.filter((item: any) => item.resolved_status === status);
    }

    // 3. 검색어 필터링 (제보 내용 또는 페이지 경로)
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((item: any) => 
        (item.user_prompt || '').toLowerCase().includes(q) ||
        (item.current_url || '').toLowerCase().includes(q)
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedFeedbacks = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      feedbacks: paginatedFeedbacks,
      totalCount,
      totalPages,
      currentPage: page
    });
  } catch (error: any) {
    console.error('피드백 목록 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '피드백 목록을 조회하는 도중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

/**
 * PATCH: 피드백 처리 상태 업데이트
 */
export async function PATCH(req: Request) {
  try {
    await verifySuperAdmin();

    const { id, resolved_status } = await req.json();

    if (!id || !resolved_status) {
      return NextResponse.json({
        success: false,
        error: '피드백 고유 식별자(id) 또는 업데이트할 상태값(resolved_status)이 누락되었습니다.'
      }, { status: 400 });
    }

    const allowedStatuses = ['pending', 'in_progress', 'resolved', 'ignored'];
    if (!allowedStatuses.includes(resolved_status)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 처리 상태값입니다.'
      }, { status: 400 });
    }

    // SQLite 데이터베이스의 user_feedbacks 행 업데이트
    await updateRows('user_feedbacks', 
      { resolved_status }, 
      { filters: { id } }
    );

    return NextResponse.json({
      success: true,
      message: '피드백 상태가 변경되었습니다.'
    });
  } catch (error: any) {
    console.error('피드백 상태 업데이트 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '피드백 상태를 업데이트하는 도중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

/**
 * DELETE: 선택된 다중 피드백 목록 일괄 삭제
 */
export async function DELETE(req: Request) {
  try {
    await verifySuperAdmin();

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: '삭제 처리할 피드백 고유 식별자 목록(ids)이 누락되었습니다.'
      }, { status: 400 });
    }

    // DSN에 따라 deleteRows 헬퍼를 루프 돌려 레코드 순차 말소
    for (const targetId of ids) {
      await deleteRows('user_feedbacks', { filters: { id: targetId } });
    }

    return NextResponse.json({
      success: true,
      message: '선택한 피드백이 안전하게 일괄 삭제 완료되었습니다. 🟢'
    });
  } catch (error: any) {
    console.error('피드백 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '피드백 삭제 중 예상치 못한 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
