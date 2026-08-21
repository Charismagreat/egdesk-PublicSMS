import { NextResponse } from 'next/server';
import { getDriveAuthStatus } from '@/lib/egdesk-helpers';

export async function GET() {
  try {
    const authRes = await getDriveAuthStatus().catch(() => ({}));
    const isConnected = authRes?.status === 'connected' || authRes?.connected === true || !!authRes?.email || authRes?.oauth?.hasAccessToken;

    return NextResponse.json({
      success: true,
      email: authRes?.email || (isConnected ? 'Google OAuth 개인 계정 연동됨' : '연동된 계정 없음'),
      isConnected: !!isConnected,
      syncStatus: isConnected ? '실시간 연동 활성화' : '인증 필요',
      lastSyncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
