export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { unstable_noStore as noStore } from 'next/cache';
import { queryTable, insertRows, deleteRows } from '../../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

import { DEFAULT_MENU_ITEMS } from '@/lib/menu-metadata';

/**
 * GET: 시스템 메뉴 설정 목록 조회 및 자동 백필
 */
export async function GET() {
  try {
    noStore(); // Next.js fetch 캐싱 방지

    // 0. 테넌트 격리: 현재 로그인한 사용자의 tenant_id로 필터링 (없으면 'default' 폴백)
    const rawTenantId = await getTenantId();
    const tenantId = rawTenantId || 'default';

    // 1. DB에서 저장된 메뉴 설정 조회 (테넌트 격리 적용)
    const result = await queryTable('system_menu_settings', { filters: { tenant_id: tenantId }, orderBy: 'sort_order', orderDirection: 'ASC' });
    let rows = result.rows || [];

    // 1-1. 테넌트 전용 데이터가 없으면 tenant_id가 NULL인 레거시 데이터로 폴백
    if (rows.length === 0 && tenantId !== 'default') {
      const legacyResult = await queryTable('system_menu_settings', { orderBy: 'sort_order', orderDirection: 'ASC' });
      const legacyRows = (legacyResult.rows || []).filter((r: any) => !r.tenant_id);
      if (legacyRows.length > 0) {
        rows = legacyRows;
      }
    }


    // 2. 만약 DB가 비어있는 초기 온보딩 상태라면 기본값으로 백필(자동 적재) 수행
    if (rows.length === 0) {
      console.log('메뉴 설정이 비어있어 기본값으로 초기 온보딩 백필을 수행합니다.');
      
      const insertData = DEFAULT_MENU_ITEMS.map((item, index) => ({
        menu_href: item.href,
        is_enabled: 1, // 최초에는 모두 활성화 상태
        sort_order: (index + 1) * 10, // 10, 20, 30... 정렬 가중치 할당
        tenant_id: tenantId
      }));

      await insertRows('system_menu_settings', insertData);

      // 백필 완료 후 다시 조회
      const freshResult = await queryTable('system_menu_settings', { filters: { tenant_id: tenantId }, orderBy: 'sort_order', orderDirection: 'ASC' });
      rows = freshResult.rows || [];
    } else {
      // 3. 혹시나 새로운 개발로 인해 기본 메뉴(DEFAULT_MENU_ITEMS)에 누락된 메뉴가 DB에 없는지 체크하여 보완
      const dbHrefs = new Set(rows.map((r: any) => r.menu_href));
      const missingItems = DEFAULT_MENU_ITEMS.filter(item => !dbHrefs.has(item.href));

      if (missingItems.length > 0) {
        console.log(`새로 추가된 메뉴 ${missingItems.length}건을 발견하여 추가 백필합니다.`);
        
        // 현재 DB 내 최대 sort_order 획득
        let maxOrder = Math.max(...rows.map((r: any) => r.sort_order || 0), 0);
        
        const insertMissingData = missingItems.map((item, index) => {
          maxOrder += 10;
          return {
            menu_href: item.href,
            is_enabled: 1,
            sort_order: maxOrder,
            tenant_id: tenantId
          };
        });

        await insertRows('system_menu_settings', insertMissingData);

        // 전체 다시 갱신
        const refreshedResult = await queryTable('system_menu_settings', { filters: { tenant_id: tenantId }, orderBy: 'sort_order', orderDirection: 'ASC' });
        rows = refreshedResult.rows || [];
      }
    }

    // 4. DB에는 존재하지만 현재 기본 메뉴 정의(DEFAULT_MENU_ITEMS)에는 존재하지 않는 구버전 메뉴 청소
    const defaultHrefs = new Set(DEFAULT_MENU_ITEMS.map(item => item.href));
    const staleHrefs = rows.filter((r: any) => !defaultHrefs.has(r.menu_href)).map((r: any) => r.menu_href);

    if (staleHrefs.length > 0) {
      console.log(`더 이상 사용되지 않는 구버전 메뉴 ${staleHrefs.length}건을 감지하여 DB에서 제거합니다:`, staleHrefs);
      for (const staleHref of staleHrefs) {
        await deleteRows('system_menu_settings', { filters: { menu_href: staleHref } });
      }
      
      // 삭제 완료 후 최종 목록 재조회
      const finalResult = await queryTable('system_menu_settings', { filters: { tenant_id: tenantId }, orderBy: 'sort_order', orderDirection: 'ASC' });
      rows = finalResult.rows || [];
    }

    // 5. 프론트엔드로 내려보내기 전 중복 메뉴 제거 및 모든 레코드의 is_enabled 값을 확실하게 숫자형(1 또는 0)으로 변환
    const seen = new Set<string>();
    const uniqueRows = rows.filter((r: any) => {
      const href = (r.menu_href || "").trim();
      if (seen.has(href)) return false;
      seen.add(href);
      return true;
    });

    const sanitizedRows = uniqueRows.map((r: any) => ({
      ...r,
      is_enabled: Number(r.is_enabled) === 1 ? 1 : 0
    }));

    // 문자열 사전식 정렬 왜곡 방지를 위해 숫자 기준 정렬 강제 적용
    sanitizedRows.sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    return NextResponse.json(
      { success: true, menuSettings: sanitizedRows },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error: any) {
    console.error('메뉴 설정 조회 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '메뉴 설정을 조회하는 도중 오류가 발생했습니다.',
      details: error.message || String(error),
      stack: error.stack
    }, { status: 500 });
  }
}

/**
 * POST: 최고관리자(SUPER_ADMIN) 권한 검증 후 메뉴 설정 일괄 업데이트
 */
export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 가드
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const payload = decodeJwt(token);
    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '메뉴 편집 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.' }, { status: 403 });
    }

    // 2. 요청 바디 추출
    const { settings } = await req.json();
    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ success: false, error: '올바른 메뉴 설정 데이터 포맷이 아닙니다.' }, { status: 400 });
    }

    // 3. 전송받은 갱신 설정 맵 구축
    const settingsMap = new Map<string, { is_enabled: number; sort_order: number }>();
    settings.forEach((item: any) => {
      settingsMap.set(item.menu_href, {
        is_enabled: (Number(item.is_enabled) === 1 || item.is_enabled === true) ? 1 : 0,
        sort_order: Number(item.sort_order)
      });
    });

    // 4. DB 내 현재 테넌트 데이터 조회하여 갱신 비대상(비활성 메뉴) 상태값 보존용으로 활용
    const tenantId = (payload as any).tenant_id as string;
    const currentRes = await queryTable('system_menu_settings', { filters: { tenant_id: tenantId } }).catch(() => ({ rows: [] }));
    const currentRows = currentRes.rows || [];
    const currentMap = new Map<string, any>();
    currentRows.forEach((r: any) => {
      currentMap.set(r.menu_href, r);
    });

    // 5. DEFAULT_MENU_ITEMS 명세를 기준으로 병합하여 45개 전체 데이터 무손실 빌드
    let maxSortOrder = Math.max(...settings.map((item: any) => Number(item.sort_order) || 0), 0);
    if (maxSortOrder === 0) maxSortOrder = 450;

    const mergedInsertData = DEFAULT_MENU_ITEMS.map((defaultItem) => {
      const href = defaultItem.href;

      if (settingsMap.has(href)) {
        const val = settingsMap.get(href)!;
        return {
          menu_href: href,
          is_enabled: val.is_enabled,
          sort_order: val.sort_order,
          tenant_id: tenantId
        };
      }

      const existing = currentMap.get(href);
      maxSortOrder += 10;
      return {
        menu_href: href,
        is_enabled: existing ? Number(existing.is_enabled) : 0,
        sort_order: existing ? Number(existing.sort_order) : maxSortOrder,
        tenant_id: tenantId
      };
    });

    // 6. 기존 레코드 전체 삭제 후 병합된 45개 데이터 전체 재적재
    const idsToDelete = currentRows.map((r: any) => r.id).filter((id: any) => id !== undefined);
    if (idsToDelete.length > 0) {
      await deleteRows('system_menu_settings', { ids: idsToDelete });
    }
    await insertRows('system_menu_settings', mergedInsertData);

    return NextResponse.json({ success: true, message: '사이드바 메뉴 설정이 성공적으로 저장되었습니다.' });
  } catch (error: any) {
    console.error('메뉴 설정 저장 오류:', error);
    return NextResponse.json({ success: false, error: '메뉴 설정을 저장하는 도중 오류가 발생했습니다.' }, { status: 500 });
  }
}
