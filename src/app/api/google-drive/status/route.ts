import { NextResponse } from 'next/server';
import { getDriveAuthStatus, getDriveStatus, listDriveWatchedFolders } from '@/lib/egdesk-helpers';

export async function GET() {
  try {
    const [authRes, statusRes, foldersRes] = await Promise.allSettled([
      getDriveAuthStatus(),
      getDriveStatus(),
      listDriveWatchedFolders()
    ]);

    const auth = authRes.status === 'fulfilled' ? authRes.value : { status: 'error', error: '인증 상태 확인 실패' };
    const status = statusRes.status === 'fulfilled' ? statusRes.value : { status: 'unknown' };
    const folders = foldersRes.status === 'fulfilled' ? (foldersRes.value?.folders || foldersRes.value || []) : [];

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
