export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows, uploadFile, executeSQL } from '../../../../egdesk-helpers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // 사용자 세션의 테넌트 ID 및 권한, 계정명 추출
  let userTenantId = 'default';
  let userRole = 'EMPLOYEE';
  let userName = 'guest-1';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      const payload = decodeJwt(token);
      userTenantId = (payload.tenant_id as string) || 'default';
      userRole = (payload.role as string) || 'EMPLOYEE';
      userName = (payload.username as string) || 'guest-1';
    }
  } catch (e) {
    console.error('Failed to parse JWT payload in task-folders API:', e);
  }

  try {
    if (action === 'list') {
      // deleted_at IS NULL 규칙 적용
      const res = await queryTable('crm_task_folders', {
        orderBy: 'created_at DESC'
      });
      const rows = res.rows || [];
      
      // 계정 수준 격리 필터링
      const activeRows = rows.filter((r: any) => {
        if (r.deleted_at) return false;
        
        if (userRole === 'SUPER_ADMIN') {
          // 최고 관리자는 본인(guest)이 생성했거나 '최고관리자' 명의의 폴더만 조회
          return r.created_by === 'guest' || r.created_by === '최고관리자';
        } else {
          // 일반 임직원은 본인(userName)이 생성했거나, 이전 생성값 '현장 모바일' 인 것만 조회
          return r.created_by === userName || r.created_by === '현장 모바일';
        }
      });
      return NextResponse.json({ success: true, folders: activeRows });
    }

    if (action === 'items') {
      const folderId = searchParams.get('folderId');
      if (!folderId) {
        return NextResponse.json({ success: false, error: 'folderId가 필요합니다.' }, { status: 400 });
      }

      // deleted_at IS NULL 규칙 및 최신순 정렬 적용
      const res = await queryTable('crm_task_folder_items', {
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      const rows = res.rows || [];
      
      // 테넌트 및 폴더 매칭 필터링
      const activeRows = rows.filter((r: any) => 
        !r.deleted_at && 
        String(r.folder_id) === String(folderId) && 
        String(r.tenant_id) === String(userTenantId)
      );
      
      // 최신순 정렬 재확보 (자바스크립트 수준의 이중 가드)
      activeRows.sort((a: any, b: any) => {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (parseInt(b.id) || 0) - (parseInt(a.id) || 0);
      });

      return NextResponse.json({ success: true, items: activeRows });
    }

    return NextResponse.json({ success: false, error: '올바르지 않은 action입니다.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  let action = searchParams.get('action');
  const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  // 사용자 세션의 테넌트 ID 및 권한, 계정명 추출
  let userTenantId = 'default';
  let userRole = 'EMPLOYEE';
  let userName = 'guest-1';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      const payload = decodeJwt(token);
      userTenantId = (payload.tenant_id as string) || 'default';
      userRole = (payload.role as string) || 'EMPLOYEE';
      userName = (payload.username as string) || 'guest-1';
    }
  } catch (e) {
    console.error('Failed to parse JWT payload in POST task-folders API:', e);
  }

  try {
    // 💡 Multipart Form 업로드인 경우 (실물 파일 동시 업로드)
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const folderId = formData.get('folderId');
      const tags = formData.get('tags');
      const title = formData.get('title');
      const content = formData.get('content');
      const file = formData.get('file') as File | null;

      if (!folderId || !title) {
        return NextResponse.json({ success: false, error: '필수 필드가 누락되었습니다.' }, { status: 400 });
      }

      let fileName = '';
      let fileSize = '';
      let fileBuffer: Buffer | null = null;

      if (file && file.size > 0) {
        fileName = file.name;
        const sizeInKb = file.size / 1024;
        fileSize = sizeInKb > 1024 
          ? (sizeInKb / 1024).toFixed(1) + ' MB' 
          : sizeInKb.toFixed(1) + ' KB';
        fileBuffer = Buffer.from(await file.arrayBuffer());
      }

      // 💡 [ID 명시적 매핑] SQLite 자동생성 키 누락 우회: 직접 Max ID + 1 산출
      const itemsRes = await queryTable('crm_task_folder_items', {});
      const items = itemsRes.rows || [];
      const nextId = items.length > 0 ? Math.max(...items.map((c: any) => parseInt(c.id) || 0)) + 1 : 1;

      // 1. 우선 crm_task_folder_items 행 추가 (임시 file_url = '')
      const res = await insertRows('crm_task_folder_items', [{
        id: nextId,
        folder_id: Number(folderId),
        tags: (tags as string) || '',
        title: title as string,
        content: (content as string) || '',
        file_name: fileName,
        file_size: fileSize,
        file_url: '',
        created_at: nowStr,
        tenant_id: userTenantId,
        uuid: `STI-${nextId}-item`,
        created_by: userName
      }]);

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }

      const rowId = nextId;
      const newItem = {
        id: nextId,
        folder_id: Number(folderId),
        tags: (tags as string) || '',
        title: title as string,
        content: (content as string) || '',
        file_name: fileName,
        file_size: fileSize,
        file_url: '',
        created_at: nowStr
      };

      // 2. 파일 스토리지 업로드 처리
      if (fileBuffer && rowId && file) {
        try {
          const fileMime = file.type || 'image/jpeg';
          const dataUrl = `data:${fileMime};base64,${fileBuffer.toString('base64')}`;
          const uploadRes = await uploadFile('crm_task_folder_items', rowId, 'file_url', fileName, dataUrl);
          if (uploadRes && uploadRes.success) {
            // 💡 [진짜 파일 ID 업데이트] downloadFile이 스토리지에서 바이너리를 안전히 역추적하도록 파일 ID를 기록합니다.
            const storageFileId = uploadRes.fileId || `file_${rowId}_${fileName}`;
            await updateRows('crm_task_folder_items', { file_url: storageFileId }, { filters: { id: String(rowId) } });
            newItem.file_url = storageFileId;
          } else {
            console.error("uploadFile returned failed status:", uploadRes);
            return NextResponse.json({ success: false, error: `파일 업로드 스토리지 보관 실패: ${uploadRes?.error || '알 수 없는 오류'}` }, { status: 500 });
          }
        } catch (uploadErr: any) {
          console.error("uploadFile exception:", uploadErr.message);
          return NextResponse.json({ success: false, error: `파일 업로드 예외 발생: ${uploadErr.message}` }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, item: newItem });
    }

    const body = await req.json();
    if (!action && body && body.action) {
      action = body.action;
    }

    if (action === 'create_folder') {
      const { name, description } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: '폴더명이 필요합니다.' }, { status: 400 });
      }

      const res = await insertRows('crm_task_folders', [{
        name: name,
        description: description || '',
        created_by: userName,
        created_at: nowStr,
        tenant_id: userTenantId,
        uuid: `STF-${Date.now()}-folder`
      }]);

      if (res.success) {
        return NextResponse.json({ success: true, folder: res.rows?.[0] });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
    }

    if (action === 'create_item') {
      const { folderId, tags, title, content, fileName, fileSize, fileUrl } = body;
      if (!folderId || !title) {
        return NextResponse.json({ success: false, error: '필수 필드가 누락되었습니다.' }, { status: 400 });
      }

      const itemsRes = await queryTable('crm_task_folder_items', {});
      const items = itemsRes.rows || [];
      const nextId = items.length > 0 ? Math.max(...items.map((c: any) => parseInt(c.id) || 0)) + 1 : 1;

      const res = await insertRows('crm_task_folder_items', [{
        id: nextId,
        folder_id: Number(folderId),
        tags: tags || '',
        title,
        content: content || '',
        file_name: fileName || '',
        file_size: fileSize || '',
        file_url: fileUrl || '',
        created_at: nowStr,
        tenant_id: userTenantId,
        uuid: `STI-${nextId}-item`,
        created_by: userName
      }]);

      if (res.success) {
        return NextResponse.json({ 
          success: true, 
          item: {
            id: nextId,
            folder_id: Number(folderId),
            tags: tags || '',
            title,
            content: content || '',
            file_name: fileName || '',
            file_size: fileSize || '',
            file_url: fileUrl || '',
            created_at: nowStr
          }
        });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
    }

    if (action === 'delete_folder') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });
      }

      const res = await updateRows('crm_task_folders', {
        deleted_at: nowStr,
        deleted_by: '최고관리자'
      }, { ids: [Number(id)] });

      // Cascading soft delete to folder items using updateRows with filters
      try {
        await updateRows('crm_task_folder_items', {
          deleted_at: nowStr,
          deleted_by: '최고관리자'
        }, { filters: { folder_id: String(id) } });
      } catch (e: any) {
        console.error("Failed cascading delete to items:", e.message);
      }

      if (res.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
    }

    if (action === 'delete_item') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });
      }

      const res = await updateRows('crm_task_folder_items', {
        deleted_at: nowStr,
        deleted_by: '최고관리자'
      }, { ids: [Number(id)] });

      if (res.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
    }

    if (action === 'update_item') {
      const { id, title, tags } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });
      }

      const updateFields: any = {
        updated_at: nowStr,
        updated_by: '최고관리자'
      };
      if (title !== undefined) {
        updateFields.title = title;
      }
      if (tags !== undefined) {
        updateFields.tags = tags;
      }
      if (body.folder_id !== undefined) {
        updateFields.folder_id = Number(body.folder_id);
      }

      const res = await updateRows('crm_task_folder_items', updateFields, { ids: [Number(id)] });

      if (res.success) {
        return NextResponse.json({ success: true, item: res.rows?.[0] });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
    }

    if (action === 'update_folder') {
      const { id, name, description } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });
      }

      const updateFields: any = {
        updated_at: nowStr,
        updated_by: '최고관리자'
      };
      if (name !== undefined) {
        updateFields.name = name;
      }
      if (description !== undefined) {
        updateFields.description = description;
      }

      const res = await updateRows('crm_task_folders', updateFields, { ids: [Number(id)] });

      if (res.success) {
        return NextResponse.json({ success: true, folder: res.rows?.[0] });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: '올바르지 않은 action입니다.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
