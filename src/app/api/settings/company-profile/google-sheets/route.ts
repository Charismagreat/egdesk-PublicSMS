import { NextResponse } from 'next/server';

/**
 * 구글 시트 URL에서 Spreadsheet ID 추출하는 헬퍼
 */
function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 순수 ID인 경우 (영문 대소문자, 숫자, 하이픈, 언더스코어로 구성된 20자 이상의 문자열)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // Google Sheets URL 형식
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * 구글 시트 URL에서 gid 추출하는 헬퍼
 */
function extractGid(input: string): string | null {
  if (!input) return null;
  const match = input.match(/[?&#]gid=(\d+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * 구글 시트 2D 배열 및 헤더 데이터를 회사 프로필 객체로 매핑
 */
function mapSheetDataToCompanyProfile(sheetData: {
  headers: string[];
  sampleData: any[][];
}): any {
  const { headers, sampleData } = sheetData;
  if (!headers || headers.length === 0) return null;

  // 첫 번째 행 데이터를 가져옴 (헤더 다음의 실제 1행)
  const firstRow = sampleData && sampleData.length > 0 ? sampleData[0] : null;
  if (!firstRow) return null;

  const findVal = (keywords: string[], defaultIdx: number) => {
    // 1. 헤더 키워드 매칭
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').replace(/\s+/g, '').toLowerCase();
      if (keywords.some(kw => h.includes(kw.toLowerCase()))) {
        const val = firstRow[i];
        return val !== undefined && val !== null ? String(val).trim() : '';
      }
    }

    // 2. 인덱스 매칭 폴백
    if (firstRow[defaultIdx] !== undefined && firstRow[defaultIdx] !== null) {
      return String(firstRow[defaultIdx]).trim();
    }

    return '';
  };

  return {
    companyName: findVal(['회사명', '상호'], 0),
    representative: findVal(['대표자', '대표명', '대표'], 1),
    businessNumber: findVal(['사업자등록번호', '사업자번호'], 2),
    phone: findVal(['대표전화번호', '대표전화', '전화번호', '연락처'], 3),
    email: findVal(['대표이메일', '이메일'], 4),
    homepage: findVal(['홈페이지주소', '홈페이지', '웹사이트'], 5),
    sidebarMainTitle: findVal(['사이드바메인타이틀', '메인타이틀'], 6),
    sidebarSubTitle: findVal(['사이드바서브타이틀', '서브타이틀'], 7),
    address: findVal(['본점소재지주소', '본점주소', '소재지', '주소'], 8),
    bankName: findVal(['입금은행명', '은행명', '입금은행', '은행'], 9),
    accountNumber: findVal(['계좌번호', '입금계좌'], 10),
    accountHolder: findVal(['예금주'], 11)
  };
}

export async function POST(req: Request) {
  try {
    const { url, spreadsheetId: inputSpreadsheetId, sheetName: requestedSheetName } = await req.json();

    const spreadsheetId = extractSpreadsheetId(url || inputSpreadsheetId);
    const gid = extractGid(url || '');

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: '유효한 구글 스프레드시트 URL 또는 Spreadsheet ID가 아닙니다.' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:8080';

    // 1. 구글 시트 전체 구조 및 샘플 데이터 조회
    const toolRes = await fetch(`${apiUrl}/sheets/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'sheets_get_full_context',
        arguments: {
          spreadsheetId,
          sampleRows: 10
        }
      })
    });

    if (!toolRes.ok) {
      const errText = await toolRes.text();
      return NextResponse.json(
        { success: false, error: `EGDesk Sheets API 통신 오류 (${toolRes.status}): ${errText}` },
        { status: toolRes.status }
      );
    }

    const mcpData = await toolRes.json();
    if (!mcpData.success && mcpData.error) {
      return NextResponse.json(
        { success: false, error: mcpData.error },
        { status: 400 }
      );
    }

    // MCP 응답 파싱
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

    // sheetsData 목록 추출 (egdesk sheets MCP 규격)
    const sheetsData: any[] = contextResult?.sheetsData || contextResult?.sheets || [];
    const metadata = contextResult?.metadata || contextResult;
    const spreadsheetTitle = metadata?.title || '구글 스프레드시트';

    if (!sheetsData || sheetsData.length === 0) {
      return NextResponse.json(
        { success: false, error: '구글 시트에서 시트(탭) 데이터를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 전체 시트명 목록
    const availableSheets: string[] = sheetsData.map((s: any) => s.sheetTitle || s.title || s.sheetName);

    // 대상 시트 선택 알고리즘
    let targetSheet: any = null;

    // 1. 명시적으로 요청한 시트명이 있는 경우
    if (requestedSheetName) {
      targetSheet = sheetsData.find(
        (s: any) => (s.sheetTitle || s.title || s.sheetName) === requestedSheetName
      );
    }

    // 2. URL에 gid가 포함되어 있는 경우 metadata.sheets와 대조
    if (!targetSheet && gid && metadata?.sheets) {
      const matchedMeta = metadata.sheets.find((s: any) => String(s.sheetId) === String(gid));
      if (matchedMeta) {
        targetSheet = sheetsData.find(
          (s: any) => (s.sheetTitle || s.title || s.sheetName) === matchedMeta.title
        );
      }
    }

    // 3. '회사' 또는 '프로필' 또는 '표준양식' 키워드가 들어간 시트 우선 검색
    if (!targetSheet) {
      targetSheet = sheetsData.find((s: any) => {
        const title = (s.sheetTitle || s.title || s.sheetName || '').toLowerCase();
        return title.includes('회사') || title.includes('프로필') || title.includes('표준양식');
      });
    }

    // 4. 헤더에 '회사명' 또는 '사업자'가 포함된 시트 우선 검색
    if (!targetSheet) {
      targetSheet = sheetsData.find((s: any) => {
        const headers = s.headers || [];
        return headers.some((h: any) => String(h).includes('회사') || String(h).includes('사업자'));
      });
    }

    // 5. 기본 첫 번째 시트
    if (!targetSheet) {
      targetSheet = sheetsData[0];
    }

    const currentSheetTitle = targetSheet.sheetTitle || targetSheet.title || targetSheet.sheetName;

    const profileObj = mapSheetDataToCompanyProfile({
      headers: targetSheet.headers || [],
      sampleData: targetSheet.sampleData || []
    });

    if (!profileObj || (!profileObj.companyName && !profileObj.representative && !profileObj.businessNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: `[${currentSheetTitle}] 시트에서 회사 정보 필수 항목(회사명/대표자/사업자등록번호)을 판독하지 못했습니다.`,
          sheetTitle: spreadsheetTitle,
          sheetName: currentSheetTitle,
          availableSheets,
          detectedHeaders: targetSheet.headers
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetTitle,
      sheetName: currentSheetTitle,
      availableSheets,
      profile: profileObj
    });
  } catch (error: any) {
    console.error('Google Sheets company profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
