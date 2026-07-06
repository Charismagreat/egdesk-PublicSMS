/**
 * 이커머스 초경량 인메모리(RAM) 캐시 매니저 (Redis 대체안 A)
 * 
 * 외부 데몬(Redis) 프로세스 종속성 없이 Node.js 전역 런타임 메모리(RAM) 상에
 * 쿠폰 및 제한 조건 데이터를 캐싱하여 네트워크 지연이 0인 수 마이크로초(μs) 대의 응답 성능을 보장합니다.
 */

let cachedCoupons: any[] | null = null;
let cachedRestrictions: any[] | null = null;

export const couponCache = {
  /**
   * 캐시된 쿠폰 목록 반환
   */
  getCoupons: (): any[] | null => {
    return cachedCoupons;
  },

  /**
   * 쿠폰 목록 캐시 적재
   */
  setCoupons: (coupons: any[]): void => {
    cachedCoupons = coupons;
  },

  /**
   * 캐시된 제한 조건 목록 반환
   */
  getRestrictions: (): any[] | null => {
    return cachedRestrictions;
  },

  /**
   * 제한 조건 목록 캐시 적재
   */
  setRestrictions: (restrictions: any[]): void => {
    cachedRestrictions = restrictions;
  },

  /**
   * 캐시 전체 초기화 (Eviction)
   * 쿠폰 신설, 삭제, 또는 상품 쿠폰 제외 플래그 변경 시 호출하여 데이터 정합성 유지
   */
  clear: (): void => {
    cachedCoupons = null;
    cachedRestrictions = null;
    console.log('[In-Memory Cache] 쿠폰 및 제한 조건 캐시가 성공적으로 만료(초기화)되었습니다.');
  }
};
