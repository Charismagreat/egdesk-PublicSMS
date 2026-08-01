import { NextResponse } from 'next/server';
import { queryTable } from '../../../../../egdesk-helpers';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { setupDatabase } from '@/lib/setup-db';

let isDbInitialized = false;

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'egdesk-super-secret-key');

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: '아이디와 비밀번호를 모두 입력해주세요.' }, { status: 400 });
    }

    // 1. 운영자 조회 (최초 미설치/미생성 환경 자동 감지 가드)
    let result = await queryTable('crm_operators', { filters: { username } }).catch(() => ({ rows: [] }));

    // 계정이 없거나 DB가 비어있는 경우, 최초 1회 setupDatabase()를 자동 가동하여 디폴트 계정 시딩 후 재조회
    if (!result.rows || result.rows.length === 0) {
      if (!isDbInitialized) {
        console.log('⚠️ 운영자 계정이 없거나 DB가 초기화되지 않았습니다. setupDatabase()를 자동 트리거합니다...');
        await setupDatabase();
        isDbInitialized = true;
        result = await queryTable('crm_operators', { filters: { username } }).catch(() => ({ rows: [] }));
      }
    }

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 계정입니다.' }, { status: 401 });
    }

    const user = result.rows[0];

    // 2. 비밀번호 검증
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // 3. JWT 토큰 생성
    const token = await new SignJWT({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      tenant_id: user.tenant_id || 'tenant-default-id'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h') // 24시간 유지
      .sign(JWT_SECRET);

    // 4. 쿠키에 토큰 설정
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id || 'tenant-default-id'
      }
    });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
