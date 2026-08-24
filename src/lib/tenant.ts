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

/**
 * 주어진 테이블명이 테넌트 격리 대상인지 여부를 반환합니다.
 */
export function isTenantIsolated(tableName: string): boolean {
  return !TENANT_EXEMPT_TABLES.includes(tableName);
}
