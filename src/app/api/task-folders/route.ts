export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows, uploadFile, executeSQL } from '../../../../egdesk-helpers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'list') {
      // deleted_at IS NULL 규칙 적용
      const res = await queryTable('crm_task_folders', {
        orderBy: 'created_at DESC'
      });
      const rows = res.rows || [];
      const activeRows = rows.filter((r: any) => !r.deleted_at);
      return NextResponse.json({ success: true, folders: activeRows });
    }

    if (action === 'items') {
      const folderId = searchParams.get('folderId');
      if (!folderId) {
        return NextResponse.json({ success: false, error: 'folderId가 필요합니다.' }, { status: 400 });
      }

      // deleted_at IS NULL 규칙 적용
      const res = await queryTable('crm_task_folder_items', {
        orderBy: 'created_at DESC'
      });
      const rows = res.rows || [];
      const activeRows = rows.filter((r: any) => !r.deleted_at && String(r.folder_id) === String(folderId));
      return NextResponse.json({ success: true, items: activeRows });
    }

    return NextResponse.json({ success: false, error: '올바르지 않은 action입니다.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

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
        created_at: nowStr
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
      if (fileBuffer && rowId) {
        try {
          const uploadRes = await uploadFile('crm_task_folder_items', rowId, 'file_url', fileName, fileBuffer.toString('base64'));
          if (uploadRes && uploadRes.success) {
            const gatewayUrl = `/api/shared/files?tableName=crm_task_folder_items&rowId=${rowId}&columnName=file_url`;
            // 💡 [원격 보존] uploadFile이 안전하게 기입한 스토리지 원본 매핑을 보존하기 위해 updateRows 덮어쓰기를 비활성화합니다.
            // await updateRows('crm_task_folder_items', { file_url: gatewayUrl }, { filters: { id: String(rowId) } });
            newItem.file_url = gatewayUrl;
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

    if (action === 'create_folder') {
      const { name, description } = body;
      if (!name) {
        return NextResponse.json({ success: false, error: '폴더명이 필요합니다.' }, { status: 400 });
      }

      const res = await insertRows('crm_task_folders', [{
        name: name,
        description: description || '',
        created_by: '현장 모바일',
        created_at: nowStr
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
        created_at: nowStr
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
