export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

// 최고 관리자(SUPER_ADMIN) 권한 검증 헬퍼
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return false;
  try {
    const payload = decodeJwt(token);
    return payload.role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

/**
 * POST: 양식 A4 배경 이미지 업로드 API (최고관리자 전용)
 * 이미지를 public/uploads/templates/ 디렉토리에 저장하고 웹 경로(/uploads/templates/파일명)를 반환합니다.
 */
export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 검증
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '🔒 권한 차단: 양식 파일 업로드는 최고관리자(SUPER_ADMIN)만 가능합니다.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: '업로드된 파일이 없습니다.' }, { status: 400 });
    }

    // A4 문서 양식 매핑용으로 적합한 포맷 검증 (이미지 JPG, PNG)
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const originalName = file.name || 'document.png';
    const extension = originalName.split('.').pop()?.toLowerCase() || 'png';

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json({ success: false, error: '허용되지 않는 파일 확장자입니다. JPG, JPEG, PNG, WEBP 형태의 이미지 파일만 업로드할 수 있습니다.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 고유 파일 이름 생성 (템플릿 구분 접두어)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `template-${uniqueSuffix}.${extension}`;

    // public/uploads/templates/ 디렉토리 설정
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'templates');
    
    // 디렉토리가 없으면 자동 생성
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // 이미 디렉토리가 존재하면 예외 통과
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // 웹 브라우저에서 접근 가능한 상대 경로 URL 반환
    const url = `/uploads/templates/${filename}`;
    
    return NextResponse.json({ 
      success: true, 
      url,
      filename: file.name
    });

  } catch (error: any) {
    console.error('Template upload failed:', error);
    return NextResponse.json({ success: false, error: error.message || '파일 업로드 처리 도중 오류가 발생했습니다.' }, { status: 500 });
  }
}
