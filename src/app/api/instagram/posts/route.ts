export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { 
  listInstagramHistory, 
  createInstagramPost, 
  listInstagramConnections
} from '../../../../../egdesk-helpers';

// 삭제 억제 블랙리스트 파일 경로 (이지데스크 MCP 이력 삭제 억제용)
const DELETED_POSTS_FILE = path.join(os.tmpdir(), 'egdesk_deleted_instagram_posts.json');

// 삭제된 ID 목록 읽기
function getDeletedPostIds(): Set<string> {
  try {
    if (fs.existsSync(DELETED_POSTS_FILE)) {
      const content = fs.readFileSync(DELETED_POSTS_FILE, 'utf-8');
      const list = JSON.parse(content);
      return new Set(Array.isArray(list) ? list.map(String) : []);
    }
  } catch (e) {
    console.warn('삭제 블랙리스트 읽기 경고:', e);
  }
  return new Set();
}

// 삭제된 ID 추가 기록
function addDeletedPostId(postId: string) {
  try {
    const currentSet = getDeletedPostIds();
    currentSet.add(String(postId));
    fs.writeFileSync(DELETED_POSTS_FILE, JSON.stringify(Array.from(currentSet)), 'utf-8');
    console.log(`📌 [EGDesk MCP] 삭제 억제 블랙리스트에 포스트 추가 완료: ${postId}`);
  } catch (e) {
    console.warn('삭제 블랙리스트 쓰기 에러:', e);
  }
}

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

// 개별 포스팅 고유 타임스탬프 추출 헬퍼 (동일 시각 덮어쓰기 방지)
function extractValidTimestamp(item: any, index: number): string {
  const candidate = 
    item.posted_at || item.postedAt || item.published_at || item.publishedAt || 
    item.created_at || item.createdAt || item.timestamp || item.date || item.scheduled_at || item.scheduledAt;
  
  if (candidate) {
    const parsedDate = new Date(candidate);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  const itemId = String(item.id || '');
  const match = itemId.match(/(\d{13})/);
  if (match) {
    const ts = parseInt(match[1], 10);
    const parsedDate = new Date(ts);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  // 폴백: 15분 간격 시각 분리 차등 적용
  const baseTime = Date.now() - (index * 15 * 60 * 1000 + 3 * 60 * 1000);
  return new Date(baseTime).toISOString();
}

// 1. 100% 이지데스크 순정 MCP 인스타그램 포스팅 및 성과 이력 단일 조회 (삭제 억제 블랙리스트 필터링)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connectionId') || undefined;
    const status = searchParams.get('status') || undefined;

    const deletedSet = getDeletedPostIds();
    let history: any[] = [];
    try {
      const historyRes = await listInstagramHistory({
        connectionId,
        status,
        limit: 100,
      });
      if (historyRes && historyRes.success) {
        const rawHistory = (historyRes as any).history || (historyRes as any).posts || [];

        // 삭제 처리된 ID 100% 억제 필터링 & 로컬 이미지 파일 Base64 변환 & 고유 시각 정규화
        history = rawHistory
          .filter((item: any) => {
            const itemId = String(item.id || item.post_id || '');
            if (deletedSet.has(itemId) || item.deleted_at) {
              return false;
            }
            return true;
          })
          .map((item: any, idx: number) => {
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
                console.warn('이력 이미지 Base64 변환 경고:', fErr.message);
              }
            }

            const validTime = extractValidTimestamp(item, idx);

            return {
              ...item,
              id: item.id || `post_${Date.now()}_${idx}`,
              content: item.caption || item.content || item.text || item.title || '',
              caption: item.caption || item.content || item.text || item.title || '',
              image_url: webImageUrl,
              imageUrl: webImageUrl,
              imagePath: rawImagePath,
              status: (item.status || 'POSTED').toUpperCase(),
              posted_at: item.posted_at || item.postedAt || item.published_at || item.publishedAt || validTime,
              created_at: validTime
            };
          });
      }
    } catch (e: any) {
      console.warn('listInstagramHistory MCP 이력 조회 폴백:', e.message);
    }

    return NextResponse.json({ success: true, posts: history });
  } catch (error: any) {
    console.error('인스타그램 MCP 이력 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 100% 이지데스크 순정 MCP 인스타그램 피드 포스팅 및 실행
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { connectionId, caption, content, image_url, imagePath } = data;

    const finalCaption = caption || content || 'EGDesk AI 생성 포스트';
    const rawImage = imagePath || image_url || '';
    const localAbsolutePath = await ensureLocalImagePath(rawImage);

    let targetConnectionId = connectionId;
    if (!targetConnectionId) {
      const connRes = await listInstagramConnections();
      if (connRes && connRes.success && connRes.connections.length > 0) {
        targetConnectionId = connRes.connections[0].id;
      }
    }

    if (!targetConnectionId) {
      return NextResponse.json({ 
        success: false, 
        error: '포스팅을 수행할 인스타그램 연동 계정이 존재하지 않습니다. 계정을 먼저 등록해 주세요.' 
      }, { status: 400 });
    }

    console.log(`🚀 [EGDesk MCP] Playwright 인스타그램 포스팅 시작 (계정 ID: ${targetConnectionId}, 이미지: ${localAbsolutePath})`);

    const postRes = await createInstagramPost({
      connectionId: targetConnectionId,
      caption: finalCaption,
      imagePath: localAbsolutePath,
    });

    return NextResponse.json({ success: true, result: postRes });
  } catch (error: any) {
    console.error('인스타그램 MCP 포스팅 진행 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. 인스타그램 포스팅 이력 항목 삭제 (삭제 블랙리스트 파일 저장)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId') || searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ success: false, error: '삭제할 포스팅 ID가 지정되지 않았습니다.' }, { status: 400 });
    }

    // 이지데스크 MCP 삭제 억제 블랙리스트에 포스트 ID 추가
    addDeletedPostId(postId);

    console.log(`🗑️ [EGDesk Instagram] 포스팅 이력 블랙리스트 등록 삭제 조치 완료 (ID: ${postId})`);

    return NextResponse.json({ success: true, message: '포스팅 항목이 삭제 조치되었습니다.' });
  } catch (error: any) {
    console.error('인스타그램 포스팅 삭제 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
