export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { updateRows, queryTable } from '../../../../../egdesk-helpers';

export async function PUT(req: Request) {
  try {
    const { is_coupon_excludable, productIds } = await req.json();

    if (is_coupon_excludable === undefined || is_coupon_excludable === null) {
      return NextResponse.json({ success: false, error: 'is_coupon_excludable 값은 필수입니다.' }, { status: 400 });
    }

    const targetValue = Number(is_coupon_excludable);

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      // 특정 상품 ID 리스트 일괄 처리
      await updateRows('products', {
        is_coupon_excludable: targetValue
      }, { ids: productIds });
    } else {
      // 판매 중인 전체 상품 일괄 처리
      const activeProductsRes = await queryTable('products', { limit: 10000, filters: { status: 'ACTIVE' } });
      const activeRows = activeProductsRes.rows || [];
      
      if (activeRows.length > 0) {
        const ids = activeRows.map((r: any) => r.id);
        await updateRows('products', {
          is_coupon_excludable: targetValue
        }, { ids });
      }
    }

    return NextResponse.json({
      success: true,
      message: `성공적으로 전체 상품의 쿠폰 적용 상태가 ${targetValue === 0 ? '전체 허용 🟢' : '전체 제외 ⚪'} 상태로 일괄 변경되었습니다.`
    });
  } catch (error: any) {
    console.error('쿠폰 적용 원클릭 일괄 변경 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
