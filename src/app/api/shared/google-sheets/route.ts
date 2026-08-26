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

    // 대상 시트 선택 로직: URL에 명시된 gid가 있으면 최우선 매칭 (정확한 탭 로드 보장)
    let targetSheet: any = null;

    if (gid) {
      // 1. metadata.sheets에서 gid 매칭 후 타이틀로 탐색 (가장 정확)
      if (Array.isArray(metadata?.sheets)) {
        const matchedMeta = metadata.sheets.find(
          (s: any) => String(s.sheetId ?? s.id ?? s.properties?.sheetId ?? '') === String(gid)
        );
        if (matchedMeta) {
          const title = matchedMeta.properties?.title || matchedMeta.title || matchedMeta.sheetTitle;
          targetSheet = sheetsData.find(
            (s: any) => (s.sheetTitle || s.title || s.sheetName) === title
          );
        }
      }

      // 2. sheetsData에서 직접 gid 매칭
      if (!targetSheet) {
        targetSheet = sheetsData.find(
          (s: any) => String(s.sheetId ?? s.id ?? s.properties?.sheetId ?? '') === String(gid)
        );
      }
    }

    // gid가 없거나 gid로 못 찾은 경우 요청된 시트명으로 탐색
    if (!targetSheet && requestedSheetName) {
      targetSheet = sheetsData.find(
        (s: any) => (s.sheetTitle || s.title || s.sheetName) === requestedSheetName
      );
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
            // 헤더 행 스마트 탐색 (홈택스 표준 6행 또는 일반 1행 탐색)
            let headerIdx = 0;
            for (let i = 0; i < Math.min(rangeData.length, 10); i++) {
              const row = rangeData[i];
              if (Array.isArray(row)) {
                const rowStr = row.map(c => String(c || '').replace(/\s+/g, '')).join(' ');
                const matches = ['작성일자', '승인번호', '공급자', '공급받는자', '합계금액', '공급가액', '거래일자', '거래일시', '적요', '입금', '출금', '잔액', '가맹점', '카드번호', '승인금액'].filter(k => rowStr.includes(k));
                if (matches.length >= 2) {
                  headerIdx = i;
                  break;
                }
              }
            }
            headers = (rangeData[headerIdx] || []).map(h => String(h || '').trim());
            allRows = rangeData.slice(headerIdx + 1).filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim() !== ''));
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
