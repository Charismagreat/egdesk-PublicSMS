/**
 * 앱 시스템 설정 헬퍼 (서버 사이드 전용)
 *
 * system_settings 테이블을 직접 queryTable로 조회하는 모든 곳을
 * 이 헬퍼로 대체하면 테넌트 격리가 자동으로 적용됩니다.
 *
 * 사용 예시:
 *   const apiKey = await getAppSetting('google_ai_api_key', tenantId);
 */

import { queryTable, insertRows, deleteRows } from '../../egdesk-helpers';

/**
 * 복합 키 생성: '{tenantId}:{key}' 형태
 */
function compositeKey(tenantId: string, key: string): string {
  return `${tenantId}:${key}`;
}

/**
 * 시스템 설정 값을 읽어옵니다.
 * - tenantId가 제공되면 해당 테넌트 전용 값을 우선 조회합니다.
 * - 테넌트 전용 값이 없으면 레거시(단순 키) 데이터로 폴백합니다.
 *
 * @param key      설정 키 (예: 'google_ai_api_key')
 * @param tenantId 테넌트 ID (없으면 레거시 조회)
 * @returns        설정 값 문자열 또는 null
 */
export async function getAppSetting(key: string, tenantId?: string | null): Promise<string | null> {
  try {
    // 1차: 테넌트 전용 복합 키로 조회
    if (tenantId && tenantId !== 'default') {
      const cKey = compositeKey(tenantId, key);
      const result = await queryTable('system_settings', { filters: { key: cKey }, limit: 1 });
      const rows = result?.rows || [];
      if (rows.length > 0 && rows[0].value) {
        return String(rows[0].value);
      }
    }

    // 2차 폴백: 레거시 단순 키로 조회 (하위 호환)
    const legacyResult = await queryTable('system_settings', { filters: { key }, limit: 1 });
    const legacyRows = (legacyResult?.rows || []).filter(
      (r: any) => !r.tenant_id || r.tenant_id === '' || r.tenant_id === 'default'
    );
    if (legacyRows.length > 0 && legacyRows[0].value) {
      return String(legacyRows[0].value);
    }

    return null;
  } catch (e) {
    console.error(`[getAppSetting] 설정 조회 실패 (key: ${key}, tenant: ${tenantId}):`, e);
    return null;
  }
}

/**
 * 시스템 설정 값을 저장합니다.
 * - tenantId가 제공되면 테넌트 전용 복합 키로 저장합니다.
 *
 * @param key      설정 키
 * @param value    저장할 값
 * @param tenantId 테넌트 ID
 */
export async function setAppSetting(key: string, value: string, tenantId?: string | null): Promise<void> {
  const effectiveTenantId = (tenantId && tenantId !== 'default') ? tenantId : 'default';
  const cKey = compositeKey(effectiveTenantId, key);

  // 기존 레코드 삭제 후 재삽입
  await deleteRows('system_settings', { filters: { key: cKey } });
  await insertRows('system_settings', [{
    key: cKey,
    value,
    tenant_id: effectiveTenantId
  }]);
}
