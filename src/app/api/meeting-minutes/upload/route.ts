export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: '업로드할 파일이 없습니다.' }, { status: 400 });
    }

    // 파일 데이터를 ArrayBuffer로 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 저장 디렉토리 생성 및 보장
    const uploadDir = path.join(process.cwd(), 'public/uploads/meetings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 파일 확장자 결정 및 고유 파일명 생성
    const ext = file.name ? path.extname(file.name) : '.webm';
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // 파일 쓰기
    fs.writeFileSync(filepath, buffer);
    console.log(`🎙️ Audio file uploaded and saved to: ${filepath}`);

    // 웹에서 접근 가능한 URL 반환
    const audioUrl = `/uploads/meetings/${filename}`;

    return NextResponse.json({
      success: true,
      audioUrl
    });
  } catch (error: any) {
    console.error('오디오 파일 업로드 오류:', error);
    return NextResponse.json({ success: false, error: '서버에 오디오 파일을 저장하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
