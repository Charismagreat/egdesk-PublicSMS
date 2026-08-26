import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'default';
    let savedUrl = '';
    let sheetMetadata: any = null;

    const res = await queryTable('system_settings', {
      filters: { key: 'google_sheet_config_default', tenant_id: tenantId }
    }).catch(() => ({ rows: [] }));

    if (res.rows && res.rows.length > 0) {
      try {
        const parsed = JSON.parse(res.rows[0].value);
        savedUrl = parsed.url || '';
      } catch {
        savedUrl = res.rows[0].value || '';
      }
    }

    if (savedUrl) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:8080';
        const sheetRes = await fetch(`${apiUrl}/sheets/tools/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'sheets_get_spreadsheet',
            arguments: { url: savedUrl }
          })
        });
        if (sheetRes.ok) {
          sheetMetadata = await sheetRes.json();
        }
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
    const tenantId = (await getTenantId()) || 'default';
    const body = await req.json().catch(() => ({}));
    const { url } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL이 필요합니다.' }, { status: 400 });
    }

    const cleanUrl = String(url).trim();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const existing = await queryTable('system_settings', {
      filters: { key: 'google_sheet_config_default', tenant_id: tenantId }
    }).catch(() => ({ rows: [] }));

    const configValue = JSON.stringify({
      url: cleanUrl,
      updatedAt: now
    });

    if (existing.rows && existing.rows.length > 0) {
      await updateRows('system_settings', {
        value: configValue,
        updated_at: now
      }, { filters: { id: existing.rows[0].id } });
    } else {
      await insertRows('system_settings', [{
        key: 'google_sheet_config_default',
        value: configValue,
        description: 'Google Sheet Default Config',
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      }]);
    }

    return NextResponse.json({ success: true, url: cleanUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
