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
    let res: any = null;
    try {
      res = await downloadFile({
        fileId,
        tableName,
        rowId,
        columnName
      });
    } catch (e: any) {
      console.warn("downloadFile 호출 예외 방어막 작동:", e.message);
    }

    if (!res || !res.data || res.success === false) {
      // 💡 [DB 레코드 경로 파일 직접 서빙 폴백] 스토리지 ID가 아닌 DB 컬럼 파일 경로(/uploads/...)인 경우 로컬 실물 파일 서빙
      if (tableName && rowId && columnName) {
        try {
          const { queryTable } = require('@/../egdesk-helpers');
          const fs = require('fs');
          const path = require('path');
          
          const dbRes = await queryTable(tableName, { filters: { id: rowId } });
          if (dbRes.rows && dbRes.rows.length > 0) {
            const rowData = dbRes.rows[0];
            const rawFilePath = rowData[columnName];

            if (rawFilePath && typeof rawFilePath === 'string') {
              const cleanPath = rawFilePath.startsWith('/') ? rawFilePath.substring(1) : rawFilePath;
              const absPath = path.join(process.cwd(), 'public', cleanPath);

              if (fs.existsSync(absPath)) {
                const fileBuffer = fs.readFileSync(absPath);
                const filename = path.basename(absPath);
                const ext = filename.split('.').pop()?.toLowerCase();
                
                let mimeType = 'application/pdf';
                if (ext === 'png') mimeType = 'image/png';
                else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'gif') mimeType = 'image/gif';
                else if (ext === 'pdf') mimeType = 'application/pdf';

                const headers = new Headers();
                headers.set('Content-Type', mimeType);
                headers.set('Content-Length', fileBuffer.length.toString());
                headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

                return new Response(fileBuffer, {
                  status: 200,
                  headers
                });
              }
            }
          }
        } catch (dbErr) {
          console.warn("DB 레코드 경로 폴백 처리 예외:", dbErr);
        }
      }

      return NextResponse.json(
        { success: false, error: res?.error || '스토리지 및 로컬 스토리지에서 업로드 파일 데이터를 찾을 수 없습니다.' },
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
    // 💡 [특수기호 유실 복원 가드] 이지데스크 스토리지 버킷이 반환하는 data URL 내 특수문자 누락/꼬임에 대응
    const base64Marker = 'base64';
    const markerIdx = base64Data.indexOf(base64Marker);
    if (markerIdx !== -1) {
      base64Data = base64Data.substring(markerIdx + base64Marker.length);
      if (base64Data.startsWith(',') || base64Data.startsWith(';') || base64Data.startsWith('/')) {
        // 단, base64 데이터의 진짜 첫 문자(/ 등)를 자르지 않기 위해 첫 글자가 특수기호인 경우에만 깎아냅니다.
        const firstChar = base64Data.charAt(0);
        if (firstChar === ',' || firstChar === ';') {
          base64Data = base64Data.substring(1);
        }
      }
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
