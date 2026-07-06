export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '@/../egdesk-helpers';

// 사용자 토큰에서 권한 역할(Role)을 확인하는 헬퍼 함수
async function getRoleFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'SUB_OPERATOR';
    const payload = decodeJwt(token);
    return payload.role as string || 'SUB_OPERATOR';
  } catch (e) {
    return 'SUB_OPERATOR';
  }
}

// GET: 안전보건방침 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const filters: Record<string, any> = {};
    if (year) {
      filters.year = year;
    }

    const policiesRes = await queryTable('safety_policies', {
      filters,
      orderBy: 'year',
      orderDirection: 'DESC'
    });

    return NextResponse.json({
      success: true,
      policies: policiesRes.rows || []
    });
  } catch (error: any) {
    console.error('Error fetching safety policies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 안전보건방침 등록 및 업데이트
export async function POST(request: Request) {
  try {
    // 권한 검증: 최고관리자(SUPER_ADMIN) 또는 대표자(PRESIDENT)만 안전보건방침을 작성/수정 가능
    const role = await getRoleFromToken();
    if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '최고관리자 또는 대표자만 안전보건방침을 설정할 수 있습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { year, policy_title, targets_json, established_by } = body;

    if (!year || !policy_title || !targets_json || !established_by) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // uniqueKeyColumns가 ['year']이므로 중복 시 update 처리됨 (setup-db.ts 참고)
    await insertRows('safety_policies', [{
      id: Date.now(), // 기본 ID는 현재 타임스탬프
      year,
      policy_title,
      targets_json: typeof targets_json === 'string' ? targets_json : JSON.stringify(targets_json),
      established_at: nowStr,
      established_by
    }]);

    return NextResponse.json({ success: true, message: '안전보건방침이 성공적으로 등록/갱신되었습니다.' });
  } catch (error: any) {
    console.error('Error saving safety policy:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
