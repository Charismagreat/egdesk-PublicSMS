/**
 * 🔒 클라이언트 브라우저 환경에서 현재 로그인된 테넌트 ID를 추출하고,
 * localStorage / sessionStorage 키에 테넌트 고유 Prefix를 주입하는 유틸리티
 */

export function getClientTenantId(): string {
  if (typeof window === "undefined") return "default";
  try {
    const cookies = document.cookie.split("; ");
    const tokenCookie = cookies.find(row => row.startsWith("auth_token="));
    if (tokenCookie) {
      const token = tokenCookie.split("=")[1];
      const payloadPart = token.split(".")[1];
      if (payloadPart) {
        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const decoded = JSON.parse(jsonPayload);
        if (decoded.tenant_id) {
          return decoded.tenant_id;
        }
      }
    }
  } catch (e) {
    // 디코딩 실패 시 기본값 폴백
  }
  return "default";
}

/**
 * 테넌트별 브라우저 스토리지(localStorage / sessionStorage) 격리 키 생성
 * 예: 'sql_query' -> '_t_tenant-wontrading_sql_query'
 */
export function getTenantStorageKey(rawKey: string): string {
  const tenantId = getClientTenantId();
  const cleanTenant = (tenantId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `_t_${cleanTenant}_${rawKey}`;
}
