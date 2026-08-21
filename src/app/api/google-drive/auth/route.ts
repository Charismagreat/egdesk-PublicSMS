import { NextResponse } from 'next/server';
import { startDriveAuthLogin, getDriveAuthStatus } from '@/lib/egdesk-helpers';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { forceConsent = false } = body;

    const result = await startDriveAuthLogin({ forceConsent });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Google Drive auth login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Google OAuth 로그인 요청 실패' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await getDriveAuthStatus();
    return NextResponse.json({
      success: true,
      auth: result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '인증 상태 조회 실패' },
      { status: 500 }
    );
  }
}
