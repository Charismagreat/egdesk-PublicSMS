import { NextResponse } from 'next/server';
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from '@/lib/google-sheets-storage';
import { callSheetsTool } from '@/lib/egdesk-helpers';

export async function GET() {
  try {
    const savedUrl = getSavedGoogleSheetUrl();
    let sheetMetadata: any = null;

    if (savedUrl) {
      try {
        const metadataRes = await callSheetsTool('sheets_get_spreadsheet', { url: savedUrl });
        sheetMetadata = metadataRes;
      } catch (e: any) {
        sheetMetadata = { error: e.message };
      }
    }

    const connectedDomains = [
      { domain: '회사 프로필', key: 'company', path: '/settings', tabName: '회사정보', icon: 'Building' },
      { domain: '거래처 관리 AI', key: 'partners', path: '/partners', tabName: '거래처', icon: 'Handshake' },
      { domain: '직원/계정 관리', key: 'employees', path: '/employees', tabName: '직원목록', icon: 'Users' },
      { domain: '재고/품목 관리', key: 'inventory', path: '/inventory', tabName: '재고품목', icon: 'Package' },
      { domain: 'HR 인사/근태', key: 'hr', path: '/hr/attendance', tabName: '근태관리', icon: 'CalendarDays' },
      { domain: '국세청 홈택스', key: 'hometax', path: '/finance-management', tabName: '홈택스매입/매출', icon: 'Receipt' },
      { domain: '인터넷뱅킹 거래내역', key: 'bank', path: '/finance-management', tabName: '은행거래내역', icon: 'Landmark' },
      { domain: '신용카드 승인내역', key: 'card', path: '/finance-management', tabName: '신용카드', icon: 'CreditCard' },
    ];

    return NextResponse.json({
      success: true,
      savedUrl,
      sheetMetadata,
      connectedDomains
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL이 필요합니다.' }, { status: 400 });
    }

    setSavedGoogleSheetUrl(url);

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
