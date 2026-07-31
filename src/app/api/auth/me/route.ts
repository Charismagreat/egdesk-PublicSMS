import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    // 토큰이 존재하지 않을 경우 기본 부운영자(SUB_OPERATOR) 상태 반환
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        role: 'SUB_OPERATOR', 
        name: '손님' 
      });
    }

    // JWT 토큰 디코딩하여 페이로드 추출
    const payload = decodeJwt(token);
    const username = payload.username as string || '';
    const name = payload.name as string || '운영자';

    // DB에서 직원의 소속 사업장 정보 조인 조회 시도
    let workplaceId = (payload as any).workplace_id || null;
    let workplaceName = (payload as any).workplace_name || null;
    let workplaceLat = null;
    let workplaceLng = null;
    let avatarUrl: string | null = null;

    try {
      const { executeSQL } = await import('../../../../../egdesk-helpers');
      // 1. crm_employees에서 workplace_id 및 avatar_url 조회
      const empRes = await executeSQL(`
        SELECT e.workplace_id, e.avatar_url, w.name as workplace_name, w.latitude, w.longitude, w.radius_meters
        FROM crm_employees e
        LEFT JOIN crm_workplaces w ON e.workplace_id = w.id AND w.deleted_at IS NULL
        WHERE e.deleted_at IS NULL AND (e.name = '${name}' OR e.email = '${username}')
        LIMIT 1
      `);
      if (empRes.rows && empRes.rows.length > 0) {
        const emp = empRes.rows[0];
        avatarUrl = emp.avatar_url || null;
        if (emp.workplace_name) {
          workplaceId = emp.workplace_id;
          workplaceName = emp.workplace_name;
          workplaceLat = emp.latitude;
          workplaceLng = emp.longitude;
        }
      }

      // 2. 만약 소속 사업장이 없으면 기본 '본사' 지정
      if (!workplaceName) {
        const mainWpRes = await executeSQL(`
          SELECT id, name, latitude, longitude FROM crm_workplaces WHERE deleted_at IS NULL AND is_main = 'Y' LIMIT 1
        `);
        if (mainWpRes.rows && mainWpRes.rows.length > 0) {
          workplaceId = mainWpRes.rows[0].id;
          workplaceName = mainWpRes.rows[0].name;
          workplaceLat = mainWpRes.rows[0].latitude;
          workplaceLng = mainWpRes.rows[0].longitude;
        } else {
          workplaceName = '본사';
        }
      }
    } catch (e) {
      console.warn("Workplace info lookup warning in /api/auth/me:", e);
    }

    return NextResponse.json({
      success: true,
      role: payload.role as string || 'SUB_OPERATOR',
      name: name,
      username: username,
      avatar_url: avatarUrl,
      workplace_id: workplaceId,
      workplace_name: workplaceName || '본사',
      latitude: workplaceLat,
      longitude: workplaceLng
    });
  } catch (error: any) {
    console.error("JWT decoding failed in /api/auth/me:", error);
    return NextResponse.json({ 
      success: false, 
      role: 'SUB_OPERATOR', 
      name: '손님', 
      error: error.message 
    });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: '인증 토큰이 존재하지 않습니다.' }, { status: 401 });
    }

    const payload = decodeJwt(token);
    const username = payload.username as string || '';
    const name = payload.name as string || '운영자';

    const body = await req.json();
    const { avatar_url } = body;

    if (!avatar_url) {
      return NextResponse.json({ success: false, message: '프로필 사진 URL이 유효하지 않습니다.' }, { status: 400 });
    }

    const { executeSQL } = await import('../../../../../egdesk-helpers');
    
    // crm_employees 테이블의 avatar_url 업데이트
    await executeSQL(`
      UPDATE crm_employees
      SET avatar_url = '${avatar_url}', updated_at = datetime('now', 'localtime')
      WHERE deleted_at IS NULL AND (name = '${name}' OR email = '${username}')
    `);

    return NextResponse.json({
      success: true,
      message: '프로필 사진이 정상 교체되었습니다.',
      avatar_url
    });
  } catch (error: any) {
    console.error("Failed to update profile avatar:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
