import { NextResponse } from 'next/server';
import { listDriveWatchedFolders, setDriveTargetFolders, initDriveSync } from '@/lib/egdesk-helpers';

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
    const res = await listDriveWatchedFolders();
    const folders = res?.folders || res || [];
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

      // 기존 감시 폴더 조회 후 병합
      const currentRes = await listDriveWatchedFolders().catch(() => ({}));
      const currentFolders = Array.isArray(currentRes?.folders) ? currentRes.folders : (Array.isArray(currentRes) ? currentRes : []);
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

    const updatedFoldersRes = await listDriveWatchedFolders().catch(() => ({}));
    const updatedFolders = updatedFoldersRes?.folders || updatedFoldersRes || [];

    return NextResponse.json({
      success: true,
      result,
      folders: Array.isArray(updatedFolders) ? updatedFolders : []
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
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ success: false, error: '삭제할 folderId가 누락되었습니다.' }, { status: 400 });
    }

    const currentRes = await listDriveWatchedFolders().catch(() => ({}));
    const currentFolders = Array.isArray(currentRes?.folders) ? currentRes.folders : (Array.isArray(currentRes) ? currentRes : []);
    const currentIds = currentFolders.map((f: any) => typeof f === 'string' ? f : f.id || f.folderId);

    const filteredIds = currentIds.filter((id: string) => id !== folderId);

    await setDriveTargetFolders(filteredIds);

    const updatedFoldersRes = await listDriveWatchedFolders().catch(() => ({}));
    const updatedFolders = updatedFoldersRes?.folders || updatedFoldersRes || [];

    return NextResponse.json({
      success: true,
      folders: Array.isArray(updatedFolders) ? updatedFolders : []
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '감시 폴더 삭제 실패' },
      { status: 500 }
    );
  }
}
