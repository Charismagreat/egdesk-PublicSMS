export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { 
  listInstagramHistory, 
  createInstagramPost, 
  listInstagramConnections,
  queryTable,
  insertRows,
  createTable,
  executeSQL
} from '../../../../../egdesk-helpers';

// 웹 URL 또는 Base64 이미지를 Playwright가 인식할 수 있는 로컬 파일 절대 경로로 변환하는 헬퍼
async function ensureLocalImagePath(inputUrlOrData: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const filename = `ig_upload_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
  const localFilePath = path.join(tmpDir, filename);

  if (fs.existsSync(inputUrlOrData)) {
    return inputUrlOrData;
  }

  if (inputUrlOrData.startsWith('data:image')) {
    const base64Data = inputUrlOrData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(localFilePath, buffer);
    return localFilePath;
  }

  if (inputUrlOrData.startsWith('http://') || inputUrlOrData.startsWith('https://')) {
    try {
      const res = await fetch(inputUrlOrData);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(localFilePath, buffer);
        return localFilePath;
      }
    } catch (e) {
      console.warn('이미지 URL 로컬 다운로드 실패 경고:', e);
    }
  }

  const fallbackUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
  try {
    const res = await fetch(fallbackUrl);
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));
    return localFilePath;
  } catch (e) {
    return localFilePath;
  }
}

// crm_instagram_posts 테이블 보장 헬퍼
async function ensurePostTable() {
  await createTable('crm_instagram_posts', [
    { name: 'id', type: 'TEXT' },
    { name: 'connection_id', type: 'TEXT' },
    { name: 'product_id', type: 'TEXT' },
    { name: 'caption', type: 'TEXT' },
    { name: 'content', type: 'TEXT' },
    { name: 'image_url', type: 'TEXT' },
    { name: 'image_path', type: 'TEXT' },
    { name: 'status', type: 'TEXT' },
    { name: 'scheduled_at', type: 'TEXT' },
    { name: 'posted_at', type: 'TEXT' },
    { name: 'error_message', type: 'TEXT' },
  ]).catch(() => {});
}

// 1. 이지데스크 MCP 및 DB 통합 인스타그램 포스팅 이력 조회 (deleted_at IS NULL 필터링 무조건 적용)
export async function GET(req: Request) {
  try {
    await ensurePostTable();
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connectionId') || undefined;
    const status = searchParams.get('status') || undefined;

    // 1) DB 대장 테이블에서 소프트 삭제된 항목 ID 스캔
    let deletedPostIds = new Set<string>();
    try {
      const deletedRes = await executeSQL('SELECT id FROM crm_instagram_posts WHERE deleted_at IS NOT NULL');
      if (deletedRes.rows && deletedRes.rows.length > 0) {
        deletedRes.rows.forEach((r: any) => {
          if (r.id) deletedPostIds.add(String(r.id));
        });
      }
    } catch (dbErr: any) {
      console.warn('소프트 삭제 목록 스캔 경고:', dbErr.message);
    }

    // 2) DB 대장 테이블(crm_instagram_posts)에서 정상 항목(deleted_at IS NULL) 조회
    let dbPosts: any[] = [];
    try {
      const dbRes = await executeSQL('SELECT * FROM crm_instagram_posts WHERE deleted_at IS NULL ORDER BY created_at DESC');
      if (dbRes.rows && dbRes.rows.length > 0) {
        dbPosts = dbRes.rows;
      }
    } catch (dbErr: any) {
      console.warn('DB 포스트 대장 조회 경고:', dbErr.message);
    }

    // 3) 이지데스크 MCP listInstagramHistory 도구에서 이력 조회
    let mcpPosts: any[] = [];
    try {
      const historyRes = await listInstagramHistory({
        connectionId,
        status,
        limit: 100,
      });
      if (historyRes && historyRes.success) {
        mcpPosts = (historyRes as any).history || (historyRes as any).posts || [];
      }
    } catch (e: any) {
      console.warn('listInstagramHistory MCP 이력 조회 폴백:', e.message);
    }

    // 4) DB 대장과 MCP 이력 통합 결합 및 중복/삭제 제거
    const combinedMap = new Map<string, any>();

    // DB 항목 우선 삽입
    dbPosts.forEach((item: any) => {
      const itemId = String(item.id);
      if (!deletedPostIds.has(itemId)) {
        combinedMap.set(itemId, item);
      }
    });

    // MCP 항목 병합
    mcpPosts.forEach((item: any) => {
      const itemId = String(item.id || item.post_id || '');
      if (itemId && !deletedPostIds.has(itemId) && !item.deleted_at) {
        if (!combinedMap.has(itemId)) {
          combinedMap.set(itemId, item);
        }
      }
    });

    // 5) 이미지 Base64 변환 및 규격 정규화
    const finalPosts = Array.from(combinedMap.values()).map((item: any) => {
      const rawImagePath = item.image_url || item.imageUrl || item.imagePath || item.image_path || '';
      let webImageUrl = rawImagePath;

      if (rawImagePath && typeof window === 'undefined') {
        try {
          if (fs.existsSync(rawImagePath)) {
            const fileBuffer = fs.readFileSync(rawImagePath);
            const ext = path.extname(rawImagePath).toLowerCase().replace('.', '') || 'jpeg';
            const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            webImageUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
          }
        } catch (fErr: any) {
          console.warn('이미지 Base64 변환 경고:', fErr.message);
        }
      }

      return {
        ...item,
        id: item.id || `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        content: item.content || item.caption || item.text || item.title || '등록된 포스팅 문구',
        caption: item.caption || item.content || item.text || '등록된 포스팅 문구',
        image_url: webImageUrl,
        imageUrl: webImageUrl,
        imagePath: rawImagePath,
        status: item.status || 'PUBLISHED',
        created_at: item.created_at || item.publishedAt || item.createdAt || new Date().toISOString()
      };
    });

    return NextResponse.json({ success: true, posts: finalPosts });
  } catch (error: any) {
    console.error('인스타그램 MCP 이력 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 이지데스크 MCP 인스타그램 피드 포스팅 및 DB 대장 등록
export async function POST(req: Request) {
  try {
    await ensurePostTable();
    const data = await req.json();
    const { connectionId, caption, content, image_url, imagePath, product_id, status, scheduled_at } = data;

    const finalCaption = caption || content || 'EGDesk AI 생성 포스트';
    const rawImage = imagePath || image_url || '';
    const localAbsolutePath = await ensureLocalImagePath(rawImage);
    
    const newPostId = `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const nowIso = new Date().toISOString();
    const targetStatus = status || (scheduled_at ? 'SCHEDULED' : 'POSTED');

    // DB 대장에 포스팅 등록 (deleted_at: null)
    await insertRows('crm_instagram_posts', [{
      id: newPostId,
      connection_id: connectionId || 'default',
      product_id: product_id || null,
      caption: finalCaption,
      content: finalCaption,
      image_url: rawImage,
      image_path: localAbsolutePath,
      status: targetStatus,
      scheduled_at: scheduled_at || null,
      created_at: nowIso,
      updated_at: nowIso,
      updated_by: 'system'
    }]).catch(() => {});

    let postRes: any = { success: true };

    // 즉시 포스팅인 경우 이지데스크 MCP Playwright 포스팅 매크로 실행
    if (targetStatus === 'POSTED') {
      let targetConnectionId = connectionId;
      if (!targetConnectionId) {
        const connRes = await listInstagramConnections();
        if (connRes && connRes.success && connRes.connections.length > 0) {
          targetConnectionId = connRes.connections[0].id;
        }
      }

      if (targetConnectionId) {
        console.log(`🚀 [EGDesk MCP] Playwright 포스팅 구동 (계정: ${targetConnectionId})`);
        postRes = await createInstagramPost({
          connectionId: targetConnectionId,
          caption: finalCaption,
          imagePath: localAbsolutePath,
        }).catch((e: any) => ({ success: false, error: e.message }));
      }
    }

    return NextResponse.json({ success: true, result: postRes, postId: newPostId });
  } catch (error: any) {
    console.error('인스타그램 MCP 포스팅 진행 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 인스타그램 포스팅 이력 및 예약 내역 소프트 삭제 (deleted_at IS NULL 준수)
export async function DELETE(req: Request) {
  try {
    await ensurePostTable();
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId') || searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ success: false, error: '삭제할 포스팅 ID가 지정되지 않았습니다.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const existCheck = await queryTable('crm_instagram_posts', {
      filters: { id: String(postId) }
    }).catch(() => ({ rows: [] }));

    if (existCheck.rows && existCheck.rows.length > 0) {
      const safeId = String(postId).replace(/'/g, "''");
      await executeSQL(
        `UPDATE crm_instagram_posts SET deleted_at = '${nowIso}', deleted_by = 'user' WHERE id = '${safeId}'`
      );
    } else {
      await insertRows('crm_instagram_posts', [{
        id: String(postId),
        status: 'DELETED',
        deleted_at: nowIso,
        deleted_by: 'user'
      }]);
    }

    console.log(`🗑️ [EGDesk Instagram] 포스팅 소프트 삭제(deleted_at IS NOT NULL) 완전 적용 완료 (ID: ${postId})`);

    return NextResponse.json({ success: true, message: '포스팅 항목이 성공적으로 삭제되었습니다.' });
  } catch (error: any) {
    console.error('인스타그램 포스팅 삭제 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
