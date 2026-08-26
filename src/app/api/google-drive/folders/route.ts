import { NextResponse } from 'next/server';
import { listDriveWatchedFolders, setDriveTargetFolders, initDriveSync, queryTable, insertRows, updateRows } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

// Helper to extract Folder ID from Google Drive URLs
function extractFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match URLs like https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ...
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'default';
    
    // 테넌트별 저장된 감시 폴더 조회
    const res = await queryTable('system_settings', {
      filters: { key: 'google_drive_watched_folders', tenant_id: tenantId }
    }).catch(() => ({ rows: [] }));

    let folders: any[] = [];
    if (res.rows && res.rows.length > 0) {
      try {
        folders = JSON.parse(res.rows[0].value);
      } catch {
        folders = [];
      }
    } else if (tenantId === 'default') {
      // 기본 테넌트에 한해서만 레거시 폴백 지원
      const legacyRes = await listDriveWatchedFolders().catch(() => ({}));
      folders = legacyRes?.folders || legacyRes || [];
    }

    return NextResponse.json({
      success: true,
      folders: Array.isArray(folders) ? folders : []
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '감시 폴더 목록 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await req.json().catch(() => ({}));
    const { folderInput, folderIds, initialize = false, snapshot = false } = body;

    let targetIds: string[] = [];

    if (Array.isArray(folderIds)) {
      targetIds = folderIds.map((id: string) => extractFolderId(id)).filter(Boolean);
    } else if (folderInput) {
      const extracted = extractFolderId(folderInput);
      if (!extracted) {
        return NextResponse.json({ success: false, error: '유효한 폴더 ID 또는 URL을 입력해 주세요.' }, { status: 400 });
      }

      // 기존 테넌트 감시 폴더 조회 후 병합
      const res = await queryTable('system_settings', {
        filters: { key: 'google_drive_watched_folders', tenant_id: tenantId }
      }).catch(() => ({ rows: [] }));

      let currentFolders: any[] = [];
      if (res.rows && res.rows.length > 0) {
        try {
          currentFolders = JSON.parse(res.rows[0].value);
        } catch {}
      }

      const currentIds = currentFolders.map((f: any) => typeof f === 'string' ? f : f.id || f.folderId);
      const set = new Set([...currentIds, extracted]);
      targetIds = Array.from(set);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: '등록할 폴더가 지정되지 않았습니다.' }, { status: 400 });
    }

    let result: any;
    if (initialize) {
      result = await initDriveSync({ folderIds: targetIds, snapshot });
    } else {
      result = await setDriveTargetFolders(targetIds);
    }

    const updatedFolders = targetIds.map(id => ({
      id,
      name: `구글 드라이브 폴더 (${id.slice(0, 8)}...)`,
      url: `https://drive.google.com/drive/folders/${id}`
    }));

    // 테넌트 DB에 저장
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const existing = await queryTable('system_settings', {
      filters: { key: 'google_drive_watched_folders', tenant_id: tenantId }
    }).catch(() => ({ rows: [] }));

    if (existing.rows && existing.rows.length > 0) {
      await updateRows('system_settings', {
        value: JSON.stringify(updatedFolders),
        updated_at: now
      }, { filters: { id: existing.rows[0].id } });
    } else {
      await insertRows('system_settings', [{
        key: 'google_drive_watched_folders',
        value: JSON.stringify(updatedFolders),
        description: 'Google Drive Watched Folders',
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      }]);
    }

    return NextResponse.json({
      success: true,
      result,
      folders: updatedFolders
    });
  } catch (error: any) {
    console.error('Google Drive folders API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '폴더 등록 실패' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ success: false, error: '삭제할 folderId가 누락되었습니다.' }, { status: 400 });
    }

    const res = await queryTable('system_settings', {
      filters: { key: 'google_drive_watched_folders', tenant_id: tenantId }
    }).catch(() => ({ rows: [] }));

    let currentFolders: any[] = [];
    let rowId: any = null;
    if (res.rows && res.rows.length > 0) {
      rowId = res.rows[0].id;
      try {
        currentFolders = JSON.parse(res.rows[0].value);
      } catch {}
    }

    const filteredFolders = currentFolders.filter((f: any) => {
      const id = typeof f === 'string' ? f : f.id || f.folderId;
      return id !== folderId;
    });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    if (rowId) {
      await updateRows('system_settings', {
        value: JSON.stringify(filteredFolders),
        updated_at: now
      }, { filters: { id: rowId } });
    }

    const remainingIds = filteredFolders.map((f: any) => typeof f === 'string' ? f : f.id || f.folderId);
    await setDriveTargetFolders(remainingIds).catch(() => {});

    return NextResponse.json({
      success: true,
      folders: filteredFolders
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '감시 폴더 삭제 실패' },
      { status: 500 }
    );
  }
}
