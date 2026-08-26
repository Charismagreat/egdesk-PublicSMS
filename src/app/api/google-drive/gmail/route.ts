import { NextResponse } from 'next/server';
import { getDriveAuthStatus, queryTable } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'default';
    let email = '';
    let isConnected = false;

    if (tenantId !== 'default') {
      const tenantAuthRes = await queryTable('system_settings', {
        filters: { key: 'google_drive_oauth_info', tenant_id: tenantId }
      }).catch(() => ({ rows: [] }));

      if (tenantAuthRes.rows && tenantAuthRes.rows.length > 0) {
        try {
          const parsed = JSON.parse(tenantAuthRes.rows[0].value);
          email = parsed.email || '';
          isConnected = true;
        } catch {}
      }
    } else {
      const authRes = await getDriveAuthStatus().catch(() => ({}));
      isConnected = authRes?.status === 'connected' || authRes?.connected === true || !!authRes?.email || authRes?.oauth?.hasAccessToken;
      email = authRes?.email || '';
    }

    return NextResponse.json({
      success: true,
      email: email || (isConnected ? 'Google OAuth 개인 계정 연동됨' : 'Google 계정 연동 시 자동 할당'),
      isConnected: !!isConnected,
      syncStatus: isConnected ? '실시간 연동 활성화' : '인증 대기 중',
      lastSyncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
