/**
 * 테이블오더 무단 어뷰징 방지용 테이블 보안 토큰 헬퍼
 */

const SECRET_SALT = "EGDESK_TABLE_ORDER_SALT_2026";

/**
 * 테이블 ID와 솔트를 조합하여 8자리 결정론적 해시 토큰 생성
 */
export function generateTableToken(tableId: string): string {
  if (!tableId) return "";
  const str = `${tableId}:${SECRET_SALT}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // 16진수 절대값 8자리 추출
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return hex.slice(0, 8);
}

/**
 * 전달받은 토큰이 해당 테이블의 정식 토큰과 일치하는지 검증
 */
export function verifyTableToken(tableId: string, token: string): boolean {
  if (!tableId || !token) return false;
  const expectedToken = generateTableToken(tableId);
  return expectedToken.toLowerCase() === token.toLowerCase();
}
