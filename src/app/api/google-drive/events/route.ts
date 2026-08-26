import { NextResponse } from 'next/server';
import { listDriveEvents, queryTable } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const downloadedOnly = searchParams.get('downloadedOnly') === 'true';
    const since = searchParams.get('since') || undefined;

    // 신규 테넌트인 경우 해당 테넌트의 감시 폴더 등록 여부 확인
    if (tenantId !== 'default') {
      const foldersRes = await queryTable('system_settings', {
        filters: { key: 'google_drive_watched_folders', tenant_id: tenantId }
      }).catch(() => ({ rows: [] }));

      let watchedFolderIds: string[] = [];
      if (foldersRes.rows && foldersRes.rows.length > 0) {
        try {
          const parsed = JSON.parse(foldersRes.rows[0].value);
          watchedFolderIds = parsed.map((f: any) => typeof f === 'string' ? f : f.id || f.folderId);
        } catch {}
      }

      if (watchedFolderIds.length === 0) {
        return NextResponse.json({
          success: true,
          events: []
        });
      }
    }

    const res = await listDriveEvents({
      limit,
      downloadedOnly,
      since
    });

    const events = res?.events || res || [];

    return NextResponse.json({
      success: true,
      events: Array.isArray(events) ? events : []
    });
  } catch (error: any) {
    console.error('Google Drive events API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '드라이브 이벤트 내역 조회 실패' },
      { status: 500 }
    );
  }
}
