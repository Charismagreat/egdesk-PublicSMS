import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: '업로드할 파일이 없습니다.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 원본 파일명 안전 정제 및 고유 타임스탬프 결합
    const originalName = file.name || 'attachment';
    const ext = originalName.split('.').pop() || 'dat';
    const pureBase = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const filename = `${Date.now()}_${pureBase}.${ext}`;

    // public/uploads/customs 디렉토리에 실물 파일 저장
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'customs');
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // 이미 존재하는 경우 무시
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/customs/${filename}`;
    
    return NextResponse.json({ 
      success: true, 
      url, 
      name: originalName,
      size: file.size,
      type: file.type 
    });
  } catch (error: any) {
    console.error('대용량 파일 업로드 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

