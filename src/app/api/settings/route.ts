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

    // 2차 폴백: 'default' 테넌트인 경우에만 구버전 단순 key 레거시 레코드 조회 (신규 테넌트의 타사 정보 유입 원천 차단)
    if (tenantId === 'default') {
      const legacyResult = await queryTable('system_settings', { filters: { key }, limit: 1 });
      const legacyRows = (legacyResult?.rows || []).filter(
        (r: any) => !r.tenant_id || r.tenant_id === '' || r.tenant_id === 'default'
      );

      if (legacyRows.length > 0) {
        return NextResponse.json({ success: true, value: legacyRows[0].value });
      }
    }

    return NextResponse.json({ success: true, value: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🇰🇷 대한민국 주요 시/구/동 지역별 스마트 폴백 좌표 사전
const KOREA_REGION_FALLBACKS: Record<string, { lat: number; lng: number }> = {
  "거북섬": { lat: 37.3385, lng: 126.6845 },
  "정왕동": { lat: 37.3458, lng: 126.7365 },
  "시흥": { lat: 37.3802, lng: 126.8029 },
  "안산": { lat: 37.3219, lng: 126.8309 },
  "송도": { lat: 37.3925, lng: 126.6394 },
  "인천": { lat: 37.4563, lng: 126.7052 },
  "수원": { lat: 37.2636, lng: 127.0286 },
  "판교": { lat: 37.3948, lng: 127.1119 },
  "분당": { lat: 37.3827, lng: 127.1189 },
  "성남": { lat: 37.4200, lng: 127.1265 },
  "강남": { lat: 37.4979, lng: 127.0276 },
  "서초": { lat: 37.4837, lng: 127.0324 },
  "여의도": { lat: 37.5218, lng: 126.9242 },
  "마포": { lat: 37.5663, lng: 126.9016 },
  "종로": { lat: 37.5730, lng: 126.9794 },
  "중구": { lat: 37.5636, lng: 126.9975 },
  "서울": { lat: 37.5665, lng: 126.9780 },
  "화성": { lat: 37.1995, lng: 126.8315 },
  "평택": { lat: 36.9921, lng: 127.1129 },
  "천안": { lat: 36.8151, lng: 127.1139 },
  "대전": { lat: 36.3504, lng: 127.3845 },
  "대구": { lat: 35.8714, lng: 128.6014 },
  "부산": { lat: 35.1796, lng: 129.0756 },
  "울산": { lat: 35.5384, lng: 129.3114 },
  "광주": { lat: 35.1595, lng: 126.8526 }
};

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
  if (!address || !address.trim()) {
    return { latitude: 37.5665, longitude: 126.9780 };
  }
  const cleanAddr = address.trim();

  // 1. OpenStreetMap Nominatim 지오코딩 실시간 조회 시도 (타임아웃 2.5초)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const queryUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddr)}&countrycodes=kr&limit=1`;
    const res = await fetch(queryUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EGDesk-Geocoder/1.0 (contact@wonce.co.kr)'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng) && lat > 33 && lat < 43 && lng > 124 && lng < 132) {
          return {
            latitude: Math.round(lat * 10000) / 10000,
            longitude: Math.round(lng * 10000) / 10000
          };
        }
      }
    }
  } catch (err) {}

  // 2. 지역명 매핑 폴백
  for (const [regionKeyword, coords] of Object.entries(KOREA_REGION_FALLBACKS)) {
    if (cleanAddr.includes(regionKeyword)) {
      return { latitude: coords.lat, longitude: coords.lng };
    }
  }

  return { latitude: 37.5665, longitude: 126.9780 };
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

    // 🌟 3. 회사 프로필(my_company_profile) 저장 시 대표 본사(crm_workplaces) 자동 일치 동기화
    if (key === 'my_company_profile' && value) {
      try {
        const profile = typeof value === 'string' ? JSON.parse(value) : value;
        const headquartersAddress = profile.headquartersAddress || profile.address || '';
        if (headquartersAddress && headquartersAddress.trim()) {
          const nowStr = new Date().toISOString();
          const coords = await geocodeAddress(headquartersAddress);
          
          const { updateRows, queryTable } = await import('../../../../egdesk-helpers');
          const wpRes = await queryTable('crm_workplaces', { filters: { tenant_id: tenantId } }).catch(() => ({ rows: [] }));
          const activeWorkplaces = (wpRes.rows || []).filter((r: any) => !r.deleted_at);
          const mainWp = activeWorkplaces.find((r: any) => r.is_main === 'Y') || activeWorkplaces[0];

          if (mainWp) {
            await updateRows('crm_workplaces', {
              address: headquartersAddress,
              latitude: coords.latitude,
              longitude: coords.longitude,
              updated_at: nowStr
            }, { filters: { id: String(mainWp.id), tenant_id: tenantId } });
          } else {
            await insertRows('crm_workplaces', [{
              name: '본사',
              address: headquartersAddress,
              latitude: coords.latitude,
              longitude: coords.longitude,
              radius_meters: 500,
              is_main: 'Y',
              tenant_id: tenantId,
              created_at: nowStr,
              updated_at: nowStr
            }]);
          }
        }
      } catch (syncErr) {
        console.warn('사업장 대표 본사 자동 동기화 실패:', syncErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Settings save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
