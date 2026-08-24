export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL } from '@/../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export interface GoogleSheetPreset {
  id: string;
  title: string;
  url: string;
  sheetName?: string;
  isDefault?: boolean;
  domain?: string;
  createdAt: string;
  updatedAt: string;
}

function getSettingKey(domain: string = 'default'): string {
  const cleanDomain = (domain || 'default').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `google_sheet_presets_${cleanDomain}`;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId() || 'default';
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || 'default';

    if (domain === 'all') {
      // 전사 모든 도메인의 프리셋 일괄 조회
      let sql = "SELECT * FROM system_settings WHERE key LIKE 'google_sheet_presets_%'";
      const params: any[] = [];
      if (tenantId && tenantId !== 'all') {
        sql += " AND (tenant_id = ? OR tenant_id IS NULL)";
        params.push(tenantId);
      }

      const res = await executeSQL(sql, params).catch(() => ({ rows: [] }));
      const allPresets: Record<string, GoogleSheetPreset[]> = {};
      const flatPresets: Array<GoogleSheetPreset & { domain: string }> = [];

      for (const row of res.rows || []) {
        const dom = row.key.replace('google_sheet_presets_', '');
        try {
          const parsed = JSON.parse(row.value);
          if (Array.isArray(parsed)) {
            allPresets[dom] = parsed;
            parsed.forEach(p => {
              flatPresets.push({ ...p, domain: dom });
            });
          }
        } catch {}
      }

      return NextResponse.json({
        success: true,
        domain: 'all',
        allPresets,
        flatPresets
      });
    }

    const settingKey = getSettingKey(domain);
    const filterObj: Record<string, string> = { key: settingKey };
    if (tenantId && tenantId !== 'all') {
      filterObj.tenant_id = tenantId;
    }

    const res = await queryTable('system_settings', { filters: filterObj }).catch(() => ({ rows: [] }));
    let presets: GoogleSheetPreset[] = [];

    if (res.rows && res.rows.length > 0) {
      try {
        const parsed = JSON.parse(res.rows[0].value);
        if (Array.isArray(parsed)) {
          presets = parsed;
        }
      } catch {
        presets = [];
      }
    }

    const defaultPreset = presets.find(p => p.isDefault) || (presets.length > 0 ? presets[0] : null);

    return NextResponse.json({
      success: true,
      domain,
      presets,
      defaultPreset
    });
  } catch (error: any) {
    console.error('Failed to get google sheet presets:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId() || 'default';
    const body = await req.json().catch(() => ({}));
    const { action = 'save', domain = 'default', preset, presetId, newTitle } = body;

    const settingKey = getSettingKey(domain);
    const filterObj: Record<string, string> = { key: settingKey };
    if (tenantId && tenantId !== 'all') {
      filterObj.tenant_id = tenantId;
    }

    const existingRes = await queryTable('system_settings', { filters: filterObj }).catch(() => ({ rows: [] }));
    let presets: GoogleSheetPreset[] = [];
    let rowId: string | number | null = null;

    if (existingRes.rows && existingRes.rows.length > 0) {
      rowId = existingRes.rows[0].id;
      try {
        const parsed = JSON.parse(existingRes.rows[0].value);
        if (Array.isArray(parsed)) presets = parsed;
      } catch {
        presets = [];
      }
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (action === 'save') {
      if (!preset || !preset.url || !preset.title) {
        return NextResponse.json({ success: false, error: '시트 이름과 URL은 필수입니다.' }, { status: 400 });
      }

      const id = preset.id || `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isDefault = Boolean(preset.isDefault);
      const targetSheetName = (preset.sheetName || '').trim();

      if (isDefault) {
        presets.forEach(p => { p.isDefault = false; });
      }

      // 동일 ID이거나, [동일 URL + 동일 탭]인 경우 갱신, 아니면 신규 탭 프리셋으로 추가!
      const existingIndex = presets.findIndex(p => 
        p.id === id || 
        (p.url.trim() === preset.url.trim() && (p.sheetName || '').trim() === targetSheetName)
      );

      if (existingIndex >= 0) {
        presets[existingIndex] = {
          ...presets[existingIndex],
          title: preset.title.trim(),
          url: preset.url.trim(),
          sheetName: targetSheetName,
          domain,
          isDefault: isDefault || (presets.length === 1 ? true : presets[existingIndex].isDefault),
          updatedAt: now
        };
      } else {
        presets.unshift({
          id,
          title: preset.title.trim(),
          url: preset.url.trim(),
          sheetName: targetSheetName,
          domain,
          isDefault: isDefault || presets.length === 0,
          createdAt: now,
          updatedAt: now
        });
      }
    } else if (action === 'delete') {
      if (!presetId) {
        return NextResponse.json({ success: false, error: '삭제할 프리셋 ID가 필요합니다.' }, { status: 400 });
      }
      const deletedWasDefault = presets.find(p => p.id === presetId)?.isDefault;
      presets = presets.filter(p => p.id !== presetId);
      if (deletedWasDefault && presets.length > 0) {
        presets[0].isDefault = true;
      }
    } else if (action === 'set_default') {
      if (!presetId) {
        return NextResponse.json({ success: false, error: '프리셋 ID가 필요합니다.' }, { status: 400 });
      }
      presets.forEach(p => {
        p.isDefault = (p.id === presetId);
      });
    } else if (action === 'rename') {
      if (!presetId || !newTitle) {
        return NextResponse.json({ success: false, error: 'ID와 새 이름이 필요합니다.' }, { status: 400 });
      }
      const target = presets.find(p => p.id === presetId);
      if (target) {
        target.title = newTitle.trim();
        target.updatedAt = now;
      }
    }

    const newJson = JSON.stringify(presets);

    if (existingRes.rows && existingRes.rows.length > 0) {
      await updateRows('system_settings', {
        value: newJson,
        updated_at: now
      }, { filters: filterObj });
    } else {
      await insertRows('system_settings', [{
        key: settingKey,
        value: newJson,
        description: `Google Sheet Presets for ${domain}`,
        tenant_id: tenantId,
        created_at: now,
        updated_at: now
      }]);
    }

    const defaultPreset = presets.find(p => p.isDefault) || (presets.length > 0 ? presets[0] : null);

    return NextResponse.json({
      success: true,
      domain,
      presets,
      defaultPreset
    });
  } catch (error: any) {
    console.error('Failed to update google sheet presets:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
