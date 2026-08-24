import { NextResponse } from 'next/server';
import { sanitizeBusinessNumber, sanitizePhoneNumber, sanitizeEmail } from '@/lib/data-validator';

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
 * 구글 시트 2D 배열 및 헤더 데이터를 회사 프로필 객체로 매핑 (정밀 키워드 매칭 엔진)
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

  // 정규화된 헤더 배열 (공백, 특수문자 제거 후 소문자화)
  const cleanHeaders = headers.map(h => String(h || '').replace(/[\s\(\)\[\]\-_]/g, '').toLowerCase());

  const findVal = (
    positiveKeywords: string[],
    negativeKeywords: string[],
    defaultIdx: number
  ) => {
    // 1단계: 완전 일치 (Exact Match)
    for (let i = 0; i < cleanHeaders.length; i++) {
      const h = cleanHeaders[i];
      if (positiveKeywords.some(kw => h === kw.replace(/[\s\(\)\[\]\-_]/g, '').toLowerCase())) {
        const val = firstRow[i];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }

    // 2단계: 부분 일치 (Contains Match with Negative Keyword Exclusions)
    for (let i = 0; i < cleanHeaders.length; i++) {
      const h = cleanHeaders[i];
      // 제외 키워드가 포함되어 있다면 매칭 금지
      if (negativeKeywords.some(neg => h.includes(neg.replace(/[\s\(\)\[\]\-_]/g, '').toLowerCase()))) {
        continue;
      }
      if (positiveKeywords.some(kw => h.includes(kw.replace(/[\s\(\)\[\]\-_]/g, '').toLowerCase()))) {
        const val = firstRow[i];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }

    // 3단계: 기본 인덱스 폴백
    if (firstRow[defaultIdx] !== undefined && firstRow[defaultIdx] !== null && String(firstRow[defaultIdx]).trim() !== '') {
      return String(firstRow[defaultIdx]).trim();
    }

    return '';
  };

  const rawCompanyName = findVal(['회사명상호', '회사명', '상호명', '상호', '법인명', '업체명'], [], 0);
  const rawRep = findVal(['대표자성함', '대표자명', '대표자', '대표명', '대표', '성함', '대표이사'], ['전화', '이메일', '연락처'], 1);
  const rawBizNum = findVal(['사업자등록번호', '사업자번호', '등록번호', '사업자'], [], 2);
  const rawPhone = findVal(['대표전화번호', '대표전화', '회사전화', '전화번호', '연락처', '고객센터', '유선전화', '전화'], ['팩스', '휴대폰', '이메일', '대표자', '성함'], 3);
  const rawEmail = findVal(['대표이메일', '이메일주소', '회사이메일', '이메일', '전자우편', 'email'], [], 4);
  const rawHomepage = findVal(['홈페이지주소', '홈페이지', '웹사이트주소', '웹사이트', '웹페이지', '회사홈페이지', 'homepage', 'url'], [], 5);
  const rawSidebarMain = findVal(['사이드바메인타이틀', '메인타이틀', '시스템타이틀', '헤더타이틀', '메인명칭'], [], 6);
  const rawSidebarSub = findVal(['사이드바서브타이틀', '서브타이틀', '시스템설명', '부타이틀', '서브명칭'], [], 7);
  // 본점소재지주소: 홈페이지, 웹사이트, 이메일, url 등의 키워드 엄격 제외
  const rawAddress = findVal(
    ['본점소재지주소', '본점소재지', '사업장소재지', '사업장주소', '본점주소', '본사주소', '회사주소', '도로명주소', '소재지', '주소', '회사위치'],
    ['홈페이지', '웹사이트', '이메일', '전자우편', 'url', 'site', '도메인'],
    8
  );
  // 무통장 입금 계좌
  const rawBankName = findVal(
    ['입금은행명', '입금은행', '거래은행명', '거래은행', '은행명', '은행'],
    ['계좌', '예금주', '번호'],
    9
  );
  const rawAccountNumber = findVal(
    ['입금계좌번호', '입금계좌', '계좌번호', '통장번호', '계좌'],
    ['은행명', '예금주'],
    10
  );
  const rawAccountHolder = findVal(
    ['예금주성명', '예금주명', '예금주', '계좌주'],
    ['은행', '계좌번호'],
    11
  );

  // 데이터 정규화 적용
  const bizValidation = sanitizeBusinessNumber(rawBizNum);
  const phoneValidation = sanitizePhoneNumber(rawPhone);
  const emailValidation = sanitizeEmail(rawEmail);

  return {
    companyName: rawCompanyName,
    representative: rawRep,
    businessNumber: bizValidation.formatted || rawBizNum,
    phone: phoneValidation.formatted || rawPhone,
    email: emailValidation.isValid ? emailValidation.value : rawEmail,
    homepage: rawHomepage,
    sidebarMainTitle: rawSidebarMain,
    sidebarSubTitle: rawSidebarSub,
    address: rawAddress,
    bankName: rawBankName,
    accountNumber: rawAccountNumber,
    accountHolder: rawAccountHolder
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
