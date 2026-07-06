export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable } from '@/../egdesk-helpers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    let operatorId = null;

    if (token) {
      try {
        const payload = decodeJwt(token);
        // 토큰 페이로드에서 사용자 식별자 획득
        // 페이로드 구조에 따라 username 또는 id 활용
        const username = payload.username as string || '';
        const opRes = await queryTable('crm_operators', { filters: { username } });
        if (opRes.rows && opRes.rows.length > 0) {
          const user = opRes.rows[0];
          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.username,
              phone: user.phone || '',
              myCardImageUrl: user.my_card_image_url || ''
            }
          });
        }
      } catch (tokenErr) {
        console.warn('JWT Decode fail, falling back to simulator:', tokenErr);
      }
    }

    // [시뮬레이터/데모 대응] 로그인 정보가 없거나 검증에 실패할 경우, 시연 편의를 위해 첫 번째 직원 계정으로 매핑
    const allOps = await queryTable('crm_operators', { limit: 1 });
    if (allOps.rows && allOps.rows.length > 0) {
      const user = allOps.rows[0];
      return NextResponse.json({
        success: true,
        isSimulated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.username,
          phone: user.phone || '',
          myCardImageUrl: user.my_card_image_url || ''
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: '시스템에 등록된 직원 계정이 존재하지 않습니다. 먼저 대시보드에서 직원 권한을 생성해 주십시오.'
    }, { status: 404 });

  } catch (err: any) {
    console.error('Session get API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
