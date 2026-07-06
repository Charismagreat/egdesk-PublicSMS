import { NextResponse } from 'next/server';
import { queryTable } from '../../../../../egdesk-helpers';
import { couponCache } from '@/lib/coupon-cache';

// POST /api/coupons/verify : 쿠폰 코드 유효성 검증 및 할인 금액 계산
export async function POST(req: Request) {
  try {
    const { code, orderAmount, cart_items } = await req.json();

    if (!code) {
      return NextResponse.json({ success: false, error: '쿠폰 코드를 입력해주세요.' }, { status: 400 });
    }

    // 1) 인메모리(RAM) 캐시에서 쿠폰 검색 시도 (DB I/O 차단)
    let coupons: any[] | null = couponCache.getCoupons();
    if (!coupons) {
      // 캐시가 비어있을 경우에만 DB 로딩 수행 (최초 1회)
      console.log('[Verify Cache Miss] 쿠폰 데이터를 DB에서 로딩하여 RAM 캐시에 적재합니다.');
      const allCouponsResult = await queryTable('coupons', {});
      let allRestrictionsRows: any[] = [];
      try {
        const restrictionsResult = await queryTable('crm_coupons_restrictions', {});
        allRestrictionsRows = restrictionsResult.rows || [];
      } catch (e) {}

      const mappedCoupons = (allCouponsResult.rows || []).map((c: any) => {
        const matched = allRestrictionsRows.filter((r: any) => r.coupon_id === c.id);
        return { ...c, restrictions: matched };
      });
      
      couponCache.setCoupons(mappedCoupons);
      couponCache.setRestrictions(allRestrictionsRows);
      coupons = mappedCoupons;
    }

    const couponsList: any[] = coupons || [];
    const coupon = couponsList.find((c: any) => c.code === code.toUpperCase().trim());

    if (!coupon) {
      return NextResponse.json({ success: false, error: '존재하지 않거나 유효하지 않은 쿠폰입니다.' });
    }

    if (coupon.status !== 'active') {
      return NextResponse.json({ success: false, error: '사용할 수 없거나 만료된 쿠폰입니다.' });
    }

    // 현재 KST 날짜 구하기 (서버 시간 기준 KST 변환)
    const kstOffset = 9 * 60 * 60 * 1000;
    const todayStr = new Date(Date.now() + kstOffset).toISOString().split('T')[0];

    if (coupon.expires_at && todayStr > coupon.expires_at) {
      return NextResponse.json({ success: false, error: '유효기간이 만료된 쿠폰입니다.' });
    }

    const minOrder = Number(coupon.min_order_amount) || 0;
    const amount = Number(orderAmount) || 0;

    // --- [제한 조건 Whitelist/Blacklist 검증 파이프라인 시작] ---
    const restrictionRows = coupon.restrictions || [];
    let applicableTotalAmount = amount;
    let appliedItems = [];
    const hasCartItems = cart_items && Array.isArray(cart_items) && cart_items.length > 0;

    if (hasCartItems) {
      const hasInclude = restrictionRows.some((r: any) => r.restriction_type === 'INCLUDE');
      const includeProducts = new Set(restrictionRows.filter((r: any) => r.restriction_type === 'INCLUDE' && r.target_type === 'PRODUCT').map((r: any) => String(r.target_value).trim()));
      const includeCategories = new Set(restrictionRows.filter((r: any) => r.restriction_type === 'INCLUDE' && r.target_type === 'CATEGORY').map((r: any) => String(r.target_value).trim()));

      const excludeProducts = new Set(restrictionRows.filter((r: any) => r.restriction_type === 'EXCLUDE' && r.target_type === 'PRODUCT').map((r: any) => String(r.target_value).trim()));
      const excludeCategories = new Set(restrictionRows.filter((r: any) => r.restriction_type === 'EXCLUDE' && r.target_type === 'CATEGORY').map((r: any) => String(r.target_value).trim()));

      applicableTotalAmount = 0;

      for (const item of cart_items) {
        let isExcluded = false;
        let exclusionReason = null;

        const pIdStr = String(item.product_id || '').trim();
        const categoryStr = String(item.category || item.menu_category || '').trim();
        const isCouponExcludable = Number(item.is_coupon_excludable) || 0;

        // [대체안 B] 상품 테이블의 쿠폰 제외 역정규화 플래그(is_coupon_excludable) 선제적 차단 (조인 비용 0)
        if (isCouponExcludable === 1) {
          isExcluded = true;
          exclusionReason = 'EXCLUDED_PRODUCT_FLAG'; // "쿠폰 제외로 등록된 상품입니다."
        }

        // 1) Whitelist(허용 지정) 필터링
        if (!isExcluded && hasInclude) {
          const matchProduct = includeProducts.has(pIdStr);
          const matchCategory = includeCategories.has(categoryStr);
          if (!matchProduct && !matchCategory) {
            isExcluded = true;
            exclusionReason = 'EXCLUDED_BY_LIMIT'; // "쿠폰 적용 가능한 상품/분류가 아닙니다."
          }
        }

        // 2) Blacklist(제외 지정) 필터링
        if (!isExcluded) {
          if (excludeProducts.has(pIdStr)) {
            isExcluded = true;
            exclusionReason = 'EXCLUDED_PRODUCT';
          } else if (excludeCategories.has(categoryStr)) {
            isExcluded = true;
            exclusionReason = 'EXCLUDED_CATEGORY';
          }
        }

        const itemTotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);

        if (!isExcluded) {
          applicableTotalAmount += itemTotal;
        }

        appliedItems.push({
          product_id: item.product_id,
          is_excluded: isExcluded,
          exclusion_reason: exclusionReason,
          applicable_amount: isExcluded ? 0 : itemTotal
        });
      }

      // 제한 조건 검증 결과 최종적으로 장바구니 내 쿠폰 적용 가능한 상품이 전혀 없는 경우
      if (applicableTotalAmount === 0) {
        return NextResponse.json({ success: false, error: '선택하신 상품은 본 쿠폰의 할인 적용 대상이 아닙니다.' });
      }
    }

    // 3) 최소 주문 금액 검증
    const comparisonAmount = hasCartItems ? applicableTotalAmount : amount;
    if (minOrder > 0 && comparisonAmount < minOrder) {
      if (hasCartItems && applicableTotalAmount < amount) {
        return NextResponse.json({ success: false, error: `제한 품목을 제외한 쿠폰 적용 가능 대상 금액(${applicableTotalAmount.toLocaleString()}원)이 최소 주문 조건 ${minOrder.toLocaleString()}원을 충족해야 합니다.` });
      }
      return NextResponse.json({ success: false, error: `최소 주문 금액 ${minOrder.toLocaleString()}원을 충족해야 합니다.` });
    }

    // --- [할인 계산 엔진] ---
    let discountAmount = 0;
    const discountVal = Number(coupon.discount_value) || 0;

    if (coupon.discount_type === 'percent') {
      discountAmount = Math.floor(comparisonAmount * (discountVal / 100));
    } else {
      discountAmount = discountVal;
    }
    
    // 할인이 결제 가능 대상을 넘을 수 없음
    if (discountAmount > comparisonAmount) {
      discountAmount = comparisonAmount;
    }

    return NextResponse.json({ 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discount_type,
        discountValue: discountVal,
        discountAmount: discountAmount,
        applied_items: appliedItems.length > 0 ? appliedItems : null
      }
    });

  } catch (error: any) {
    console.error('Failed to verify coupon:', error);
    return NextResponse.json({ success: false, error: '시스템 오류가 발생했습니다.' }, { status: 500 });
  }
}
