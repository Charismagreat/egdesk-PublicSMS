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

// 웹 URL 또는 Base64 이미지를 Playwright가 인식할 수 있는 로컬 파일 절대 경로로 변환하는 헬퍼
async function ensureLocalImagePath(inputUrlOrData: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const filename = `ig_upload_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
  const localFilePath = path.join(tmpDir, filename);

  // 1. 이미 로컬 파일 시스템 경로인 경우
  if (fs.existsSync(inputUrlOrData)) {
    return inputUrlOrData;
  }

  // 2. Base64 Data URL 인 경우
  if (inputUrlOrData.startsWith('data:image')) {
    const base64Data = inputUrlOrData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(localFilePath, buffer);
    return localFilePath;
  }

  // 3. HTTP/HTTPS 웹 이미지 URL인 경우 (다운로드 후 로컬 보존)
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

  // 기본 폴백 이미지 다운로드
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

// 1. 이지데스크 MCP 인스타그램 포스팅 및 성과 이력 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connectionId') || undefined;
    const status = searchParams.get('status') || undefined;

    let history: any[] = [];
    try {
      const historyRes = await listInstagramHistory({
        connectionId,
        status,
        limit: 100,
      });
      if (historyRes && historyRes.success) {
        const rawHistory = historyRes.history || [];

        // 이력 데이터 규격 정규화 및 로컬 이미지 파일 Base64 변환
        history = rawHistory.map((item: any) => {
          const rawImagePath = item.image_url || item.imageUrl || item.imagePath || item.image_path || '';
          let webImageUrl = rawImagePath;

          // 로컬 디스크 파일 경로인 경우 Base64 Data URI로 자동 변환
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
      }
    } catch (e: any) {
      console.warn('listInstagramHistory fallback:', e.message);
    }

    return NextResponse.json({ success: true, posts: history });
  } catch (error: any) {
    console.error('인스타그램 MCP 이력 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. 이지데스크 MCP 인스타그램 피드 포스팅 및 실행
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { connectionId, caption, content, image_url, imagePath } = data;

    const finalCaption = caption || content || 'EGDesk AI 생성 포스트';
    const rawImage = imagePath || image_url || '';

    // Playwright가 읽을 수 있는 로컬 파일 절대 경로 준비
    const localAbsolutePath = await ensureLocalImagePath(rawImage);

    let targetConnectionId = connectionId;

    // connectionId가 생략된 경우 등록된 첫 번째 계정 자동 선택
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

    // 이지데스크 MCP Playwright 포스팅 매크로 구동
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
