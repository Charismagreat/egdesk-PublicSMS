import { NextResponse } from 'next/server';
import { downloadFile } from '@/../egdesk-helpers';

// GET: 통합 파일 게이트웨이 뷰잉 및 다운로드 서빙
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId') || undefined;
    const tableName = searchParams.get('tableName') || undefined;
    const rowIdStr = searchParams.get('rowId');
    const columnName = searchParams.get('columnName') || undefined;

    const rowId = rowIdStr ? parseInt(rowIdStr, 10) : undefined;

    if (!fileId && (!tableName || !rowId || !columnName)) {
      return NextResponse.json(
        { success: false, error: '조회 식별 정보(fileId 또는 tableName, rowId, columnName)가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // egdesk-helpers의 downloadFile API 호출
    const res = await downloadFile({
      fileId,
      tableName,
      rowId,
      columnName
    });

    if (!res || !res.success || !res.data) {
      return NextResponse.json(
        { success: false, error: res?.error || '스토리지에서 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const filename = res.filename || 'downloaded_file';
    let mimeType = res.mimeType;

    // MIME Type 자동 추론 폴백
    if (!mimeType) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') mimeType = 'application/pdf';
      else if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'gif') mimeType = 'image/gif';
      else mimeType = 'application/octet-stream';
    }

    // Base64 디코딩 및 바이너리 버퍼 변환
    let base64Data = res.data;
    if (base64Data.includes(';base64,')) {
      base64Data = base64Data.split(';base64,').pop() || '';
    }
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // 브라우저 새 창에서 바로 열리도록 Content-Disposition 헤더 설정
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

    return new Response(fileBuffer, {
      status: 200,
      headers
    });

  } catch (err: any) {
    console.error('GET /api/shared/files error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
