export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

/**
 * tenant_id를 추출하되, 없을 경우 'default' 폴백을 사용합니다.
 */
async function resolveTenantId(): Promise<string> {
  const tenantId = await getTenantId();
  return tenantId || 'default';
}

/**
 * 테넌트 격리 복합 키 생성
 * 예: 'tenant-guest-id-2222:my_company_profile'
 * 단일 filters 조건으로 정확하게 조회/삭제 가능
 */
function compositeKey(tenantId: string, key: string): string {
  return `${tenantId}:${key}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    const tenantId = await resolveTenantId();
    const cKey = compositeKey(tenantId, key);

    // 1차: 테넌트 복합 키로 정확히 조회 (단일 필터 — 확실한 AND 동작)
    const result = await queryTable('system_settings', { filters: { key: cKey }, limit: 1 });
    const rows = result?.rows || [];

    if (rows.length > 0) {
      return NextResponse.json({ success: true, value: rows[0].value });
    }

    // 2차 폴백: 구버전 단순 key로 저장된 레거시 레코드 조회 (하위 호환)
    const legacyResult = await queryTable('system_settings', { filters: { key }, limit: 1 });
    const legacyRows = (legacyResult?.rows || []).filter(
      (r: any) => !r.tenant_id || r.tenant_id === '' || r.tenant_id === 'default'
    );

    if (legacyRows.length > 0) {
      return NextResponse.json({ success: true, value: legacyRows[0].value });
    }

    return NextResponse.json({ success: true, value: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { key, value } = await req.json();

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    const tenantId = await resolveTenantId();
    const cKey = compositeKey(tenantId, key);

    // 1. 기존 테넌트 전용 레코드 삭제 (단일 필터 — 정확한 조건)
    await deleteRows('system_settings', { filters: { key: cKey } });

    // 2. 새 테넌트 전용 레코드 삽입 (복합 키 사용)
    await insertRows('system_settings', [{
      key: cKey,
      value,
      tenant_id: tenantId,
      _version: 1
    }]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Settings save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
