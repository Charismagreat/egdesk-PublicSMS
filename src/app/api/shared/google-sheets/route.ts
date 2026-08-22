import { NextResponse } from 'next/server';

function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

function extractGid(input: string): string | null {
  if (!input) return null;
  const match = input.match(/[?&#]gid=(\d+)/);
  return match && match[1] ? match[1] : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url, sheetUrl, spreadsheetId: inputId, sheetName: requestedSheetName, sampleRows = 20, fetchAllRows = true } = body;

    const targetUrl = url || sheetUrl || '';
    const spreadsheetId = extractSpreadsheetId(targetUrl || inputId);
    const gid = extractGid(targetUrl);

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: '유효한 구글 스프레드시트 URL 또는 Spreadsheet ID가 아닙니다.' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:8080';

    // 1. 구글 시트 전체 구조 및 메타데이터 조회
    const fullRes = await fetch(`${apiUrl}/sheets/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'sheets_get_full_context',
        arguments: {
          spreadsheetId,
          sampleRows: Math.min(sampleRows, 20)
        }
      })
    });

    if (!fullRes.ok) {
      const errText = await fullRes.text();
      return NextResponse.json(
        { success: false, error: `EGDesk Sheets API 통신 오류 (${fullRes.status}): ${errText}` },
        { status: fullRes.status }
      );
    }

    const mcpData = await fullRes.json();
    if (!mcpData.success && mcpData.error) {
      return NextResponse.json(
        { success: false, error: mcpData.error },
        { status: 400 }
      );
    }

    let contextResult: any = null;
    if (mcpData.result?.content?.[0]?.text) {
      try {
        contextResult = JSON.parse(mcpData.result.content[0].text);
      } catch (e) {
        contextResult = mcpData.result.content[0].text;
      }
    } else if (mcpData.result) {
      contextResult = mcpData.result;
    }

    const sheetsData: any[] = contextResult?.sheetsData || contextResult?.sheets || [];
    const metadata = contextResult?.metadata || contextResult;
    const spreadsheetTitle = metadata?.title || '구글 스프레드시트';

    if (!sheetsData || sheetsData.length === 0) {
      return NextResponse.json(
        { success: false, error: '구글 시트에서 시트(탭) 데이터를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const availableSheets: string[] = sheetsData.map((s: any) => s.sheetTitle || s.title || s.sheetName);

    // 대상 시트 선택 로직
    let targetSheet: any = null;
    if (requestedSheetName) {
      targetSheet = sheetsData.find(
        (s: any) => (s.sheetTitle || s.title || s.sheetName) === requestedSheetName
      );
    }

    if (!targetSheet && gid && metadata?.sheets) {
      const matchedMeta = metadata.sheets.find((s: any) => String(s.sheetId) === String(gid));
      if (matchedMeta) {
        targetSheet = sheetsData.find(
          (s: any) => (s.sheetTitle || s.title || s.sheetName) === matchedMeta.title
        );
      }
    }

    if (!targetSheet) {
      targetSheet = sheetsData[0];
    }

    const selectedTitle = targetSheet.sheetTitle || targetSheet.title || targetSheet.sheetName;

    // 만약 전체 행(fetchAllRows) 조회가 요청되었을 경우 sheets_get_range로 전체 로드
    let allRows: any[][] = targetSheet.sampleData || [];
    let headers: string[] = targetSheet.headers || [];

    if (fetchAllRows) {
      try {
        const rangeRes = await fetch(`${apiUrl}/sheets/tools/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'sheets_get_range',
            arguments: {
              spreadsheetId,
              range: `'${selectedTitle}'!A1:ZZ5000`
            }
          })
        });

        if (rangeRes.ok) {
          const rangeJson = await rangeRes.json();
          let rangeData: any[][] = [];
          if (rangeJson.result?.content?.[0]?.text) {
            try {
              const textParsed = JSON.parse(rangeJson.result.content[0].text);
              rangeData = textParsed.values || textParsed.data || textParsed || [];
            } catch (e) {
              // fallback
            }
          }
          if (Array.isArray(rangeData) && rangeData.length > 0) {
            headers = rangeData[0] || headers;
            allRows = rangeData.slice(1);
          }
        }
      } catch (err) {
        console.warn('Fallback to sample data on range fetch error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetTitle,
      sheetName: selectedTitle,
      availableSheets,
      headers,
      rows: allRows,
      data: [headers, ...allRows],
      rowCount: allRows.length
    });
  } catch (error: any) {
    console.error('Shared Google Sheets fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
