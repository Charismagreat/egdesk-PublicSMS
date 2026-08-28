/**
 * 테넌트 컨텍스트 유틸리티 (서버 사이드 전용)
 *
 * Next.js 서버 컴포넌트 및 API Route 핸들러에서 현재 로그인한 사용자의
 * tenant_id를 auth_token 쿠키로부터 안전하게 추출합니다.
 *
 * 사용 예시:
 *   const tenantId = await getTenantId();
 *   const result = await queryTable('crm_customers', { filters: { tenant_id: tenantId } });
 */

import { jwtVerify, decodeJwt } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'egdesk-super-secret-key'
);

/**
 * 현재 로그인 세션의 tenant_id를 서버 사이드에서 추출합니다.
 * API Route 혹은 Server Component 내부에서만 호출 가능합니다.
 *
 * @returns tenant_id 문자열 (로그인되지 않은 경우 null 반환)
 */
export async function getTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const tenantId = (payload as any).tenant_id;
      if (typeof tenantId === 'string') return tenantId;
    } catch {
      const payload = decodeJwt(token);
      const tenantId = (payload as any).tenant_id;
      if (typeof tenantId === 'string') return tenantId;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 현재 로그인 세션의 사용자 정보 전체를 서버 사이드에서 추출합니다.
 *
 * @returns { id, username, name, role, tenant_id } 혹은 null
 */
export async function getSessionUser(): Promise<{
  id: number;
  username: string;
  name: string;
  role: string;
  tenant_id: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    let p: any = null;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      p = payload;
    } catch {
      p = decodeJwt(token);
    }

    if (!p || !p.tenant_id) return null;

    return {
      id: Number(p.id) || 0,
      username: p.username || 'user',
      name: p.name || 'User',
      role: p.role || 'GUEST',
      tenant_id: p.tenant_id
    };
  } catch (e) {
    return null;
  }
}

/**
 * 테넌트 격리가 필요 없는 공용 테이블 목록
 * (시스템 설정, 메뉴 설정 등은 테넌트별로 독립 운영되므로 격리 대상에 포함됩니다.)
 * 격리 예외 테이블이 필요한 경우 이 목록에 추가합니다.
 */
export const TENANT_EXEMPT_TABLES: string[] = [
  // 시스템 전역 설정이 아닌 테넌트별 메뉴/설정도 격리 대상이므로 현재는 비어있습니다.
  // 예시: 'global_announcements'
];

import { queryTable } from '../../egdesk-helpers';

/**
 * 주어진 테이블명이 테넌트 격리 대상인지 여부를 반환합니다.
 */
export function isTenantIsolated(tableName: string): boolean {
  return !TENANT_EXEMPT_TABLES.includes(tableName);
}

/**
 * 테넌트 격리를 지원하는 시스템 설정 조회 헬퍼 (서버 사이드 전용)
 * 1. 현재 세션의 tenant_id를 확인하여 `${tenant_id}:${key}` 우선 조회
 * 2. 존재하지 않는 경우 단순 `key`로 폴백 조회
 *
 * @param key 조회할 설정 키 (예: 'my_company_profile', 'google_ai_model' 등)
 * @param defaultValue 값이 없을 경우 반환할 기본값
 * @returns 설정값 문자열 또는 null
 */
export async function getTenantSetting(key: string, defaultValue: string | null = null): Promise<string | null> {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const cKey = `${tenantId}:${key}`;

    // 1차: 테넌트 복합 키로 우선 조회
    const result = await queryTable('system_settings', { filters: { key: cKey }, limit: 1 });
    const rows = result?.rows || [];
    if (rows.length > 0 && rows[0].value !== undefined && rows[0].value !== null) {
      return rows[0].value;
    }

    // 2차: 단순 키 레거시 레코드 폴백 조회
    const legacyResult = await queryTable('system_settings', { filters: { key }, limit: 1 });
    const legacyRows = (legacyResult?.rows || []).filter(
      (r: any) => !r.tenant_id || r.tenant_id === '' || r.tenant_id === 'default' || r.tenant_id === tenantId
    );
    if (legacyRows.length > 0 && legacyRows[0].value !== undefined && legacyRows[0].value !== null) {
      return legacyRows[0].value;
    }

    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
}
