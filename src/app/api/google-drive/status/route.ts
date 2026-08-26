import { NextResponse } from 'next/server';
import { getDriveAuthStatus, getDriveStatus, listDriveWatchedFolders, queryTable } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'default';

    const [authRes, statusRes] = await Promise.allSettled([
      getDriveAuthStatus(),
      getDriveStatus()
    ]);

    let auth = authRes.status === 'fulfilled' ? authRes.value : { status: 'error', error: '인증 상태 확인 실패' };
    const status = statusRes.status === 'fulfilled' ? statusRes.value : { status: 'unknown' };

    // 테넌트별 저장된 감시 폴더 조회
    const foldersDbRes = await queryTable('system_settings', {
      filters: { key: 'google_drive_watched_folders', tenant_id: tenantId }
    }).catch(() => ({ rows: [] }));

    let folders: any[] = [];
    if (foldersDbRes.rows && foldersDbRes.rows.length > 0) {
      try {
        folders = JSON.parse(foldersDbRes.rows[0].value);
      } catch {
        folders = [];
      }
    } else if (tenantId === 'default') {
      const legacyRes = await listDriveWatchedFolders().catch(() => ({}));
      folders = legacyRes?.folders || legacyRes || [];
    }

    // 테넌트별 OAuth 연동 상태 격리 (기본 테넌트가 아니면 테넌트 전용 연동 상태 확인)
    if (tenantId !== 'default') {
      const tenantAuthRes = await queryTable('system_settings', {
        filters: { key: 'google_drive_oauth_info', tenant_id: tenantId }
      }).catch(() => ({ rows: [] }));

      if (tenantAuthRes.rows && tenantAuthRes.rows.length > 0) {
        try {
          const parsed = JSON.parse(tenantAuthRes.rows[0].value);
          auth = { status: 'connected', connected: true, email: parsed.email || '연동됨' };
        } catch {}
      } else {
        // 신규 테넌트는 아직 Google 계정을 직접 연동하지 않은 상태이므로 타사 계정 이메일 비노출
        auth = { status: 'disconnected', connected: false, email: '' };
      }
    }

    return NextResponse.json({
      success: true,
      auth,
      status,
      folders: Array.isArray(folders) ? folders : []
    });
  } catch (error: any) {
    console.error('Google Drive status API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '구글 드라이브 상태 조회 실패' },
      { status: 500 }
    );
  }
}
