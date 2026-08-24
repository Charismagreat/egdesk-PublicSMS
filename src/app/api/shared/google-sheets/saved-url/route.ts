export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

const VALID_DOMAINS = [
  'default',
  'hometax',
  'partners',
  'bank',
  'card',
  'inventory',
  'customer',
  'product',
  'hr_attendance',
  'sales_orders',
  'purchase_orders',
  'estimates',
  'statement'
];

function sanitizeDomain(domain?: string | null): string {
  if (!domain) return 'default';
  const clean = domain.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return VALID_DOMAINS.includes(clean) ? clean : clean.slice(0, 30);
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(req.url);
    const rawDomain = searchParams.get('domain') || 'default';
    const domain = sanitizeDomain(rawDomain);

    const settingKey = `google_sheet_config_${domain}`;
    const legacyKey = `google_sheet_url_${domain}`;

    const filterObj: Record<string, string> = { key: settingKey };
    if (tenantId && tenantId !== 'all') {
      filterObj.tenant_id = tenantId;
    }

    let res = await queryTable('system_settings', { filters: filterObj }).catch(() => ({ rows: [] }));
    let configData = null;

    if (res.rows && res.rows.length > 0) {
      try {
        configData = JSON.parse(res.rows[0].value);
      } catch {
        configData = { url: res.rows[0].value };
      }
    } else {
      const legacyFilter: Record<string, string> = { key: legacyKey };
      if (tenantId && tenantId !== 'all') legacyFilter.tenant_id = tenantId;
      const legacyRes = await queryTable('system_settings', { filters: legacyFilter }).catch(() => ({ rows: [] }));
      if (legacyRes.rows && legacyRes.rows.length > 0) {
        configData = { url: legacyRes.rows[0].value };
      }
    }

    return NextResponse.json({
      success: true,
      domain,
      config: configData || { url: '', sheetName: '', recentSheets: [] }
    });
  } catch (error: any) {
    console.error('Failed to get saved google sheet config:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId() || 'default';
    const body = await req.json().catch(() => ({}));
    const { domain: rawDomain, url, sheetName, title } = body;

    const domain = sanitizeDomain(rawDomain);
    const cleanUrl = typeof url === 'string' ? url.trim() : '';

    if (!cleanUrl) {
      return NextResponse.json({ success: false, error: 'URL은 필수 입력값입니다.' }, { status: 400 });
    }

    const settingKey = `google_sheet_config_${domain}`;

    const filterObj: Record<string, string> = { key: settingKey };
    if (tenantId && tenantId !== 'all') filterObj.tenant_id = tenantId;

    const existing = await queryTable('system_settings', { filters: filterObj }).catch(() => ({ rows: [] }));
    let existingConfig: any = { recentSheets: [] };
    let rowId: string | number | null = null;

    if (existing.rows && existing.rows.length > 0) {
      rowId = existing.rows[0].id;
      try {
        existingConfig = JSON.parse(existing.rows[0].value);
      } catch {
        existingConfig = { recentSheets: [] };
      }
    }

    let recentSheets: Array<{ url: string; sheetName?: string; title?: string; lastUsed: string }> = Array.isArray(existingConfig.recentSheets) ? existingConfig.recentSheets : [];

    recentSheets = recentSheets.filter(s => s.url !== cleanUrl);
    recentSheets.unshift({
      url: cleanUrl,
      sheetName: sheetName || undefined,
      title: title || undefined,
      lastUsed: new Date().toISOString()
    });
    recentSheets = recentSheets.slice(0, 5);

    const newConfigValue = JSON.stringify({
      url: cleanUrl,
      sheetName: sheetName || '',
      title: title || '',
      updatedAt: new Date().toISOString(),
      recentSheets
    });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (rowId) {
      await updateRows('system_settings', {
        value: newConfigValue,
        updated_at: now
      }, { filters: { id: String(rowId) } });
    } else {
      await insertRows('system_settings', [{
        key: settingKey,
        value: newConfigValue,
        description: `Google Sheet Config for ${domain}`,
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      }]);
    }

    return NextResponse.json({
      success: true,
      domain,
      config: {
        url: cleanUrl,
        sheetName: sheetName || '',
        title: title || '',
        recentSheets
      }
    });
  } catch (error: any) {
    console.error('Failed to save google sheet config:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
