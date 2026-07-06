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
    return NextResponse.json({
      success: true,
      role: payload.role as string || 'SUB_OPERATOR',
      name: payload.name as string || '운영자',
      username: payload.username as string || ''
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
