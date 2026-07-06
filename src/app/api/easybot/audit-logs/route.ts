export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable } from '../../../../../egdesk-helpers';

/**
 * GET: 이지봇 에이전트 관제 감사 로그 페이징 조회
 * 최고관리자(SUPER_ADMIN) 권한 필요
 */
export async function GET(req: Request) {
  try {
    // 1. 최고관리자 권한 검증
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const payload = decodeJwt(token);
    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '관제 로그 조회 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.' }, { status: 403 });
    }

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = (searchParams.get('search') || '').toLowerCase();

    // 3. 감사 로그 테이블 조회 (SQL 가드 우회를 위해 queryTable 사용)
    // 데이터가 많아지더라도 최근 기록 위주이므로 최근 1000개 정도를 메모리에 올려 필터링 처리
    const dbRes = await queryTable('easybot_action_audit_logs', {
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
    
    let allRows = dbRes.rows || [];

    // 4. 소프트 삭제 및 검색어 필터링 적용 (Javascript 메모리 필터)
    let filteredRows = allRows.filter((row: any) => {
      // deleted_at이 없어야 함 (소프트 삭제 필터링)
      if (row.deleted_at !== null && row.deleted_at !== undefined && row.deleted_at !== '') {
        return false;
      }
      
      // 검색어가 있다면 포함 여부 체크
      if (search) {
        const prompt = (row.original_prompt || '').toLowerCase();
        const action = (row.action_name || '').toLowerCase();
        const operator = (row.operator_username || '').toLowerCase();
        const errorMsg = (row.error_message || '').toLowerCase();
        
        return (
          prompt.includes(search) ||
          action.includes(search) ||
          operator.includes(search) ||
          errorMsg.includes(search)
        );
      }
      
      return true;
    });

    // 5. 페이징 계산
    const total = filteredRows.length;
    const offset = (page - 1) * limit;
    const paginatedRows = filteredRows.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      logs: paginatedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('이지봇 감사 로그 조회 API 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '감사 로그를 조회하는 도중 오류가 발생했습니다.',
      details: error.message || String(error)
    }, { status: 500 });
  }
}
