import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/../egdesk-helpers';
import { couponCache } from '@/lib/coupon-cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { products } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { success: false, error: '유효한 상품 데이터 배열이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 1. 기존 DB에 등록된 모든 상품명(name) 가져와 중복 확인 및 스킵용 캐싱
    const existingProducts = new Set<string>();
    try {
      const dbProducts = await queryTable('products');
      if (dbProducts && Array.isArray(dbProducts.rows)) {
        dbProducts.rows.forEach((row: any) => {
          if (row.name) existingProducts.add(row.name.trim());
        });
      }
    } catch (e) {
      console.warn('기존 상품 목록 조회 실패:', e);
    }

    let insertedCount = 0;

    for (const p of products) {
      const name = p.name?.trim();
      if (!name) continue;

      // 이름 중복 시 자동 스킵
      if (existingProducts.has(name)) continue;

      const id = p.id || `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const price = Number(p.price) || 0;
      const url = p.url?.trim() || '';
      const category = p.category?.trim() || '일반상품';
      const menu_category = p.menu_category?.trim() || '';
      const description = p.description?.trim() || '';
      const main_image_url = p.main_image_url?.trim() || '';
      const detail_image_url = p.detail_image_url?.trim() || '';
      const available_methods = p.available_methods?.trim() || '';
      const is_coupon_excludable = Number(p.is_coupon_excludable) || 0;

      const productRow = {
        id,
        name,
        price,
        url,
        category,
        menu_category,
        description,
        main_image_url,
        detail_image_url,
        available_methods,
        is_coupon_excludable
      };

      try {
        await insertRows('products', [productRow]);
        insertedCount++;
        // 중복 방지 Set에 추가해 다음 루프에서 방어
        existingProducts.add(name);
      } catch (insertErr) {
        console.error(`상품 [${name}] 일괄 등록 에러:`, insertErr);
      }
    }

    // 캐시 무효화
    couponCache.clear();

    return NextResponse.json({
      success: true,
      count: insertedCount,
      totalReceived: products.length
    });

  } catch (error: any) {
    console.error('상품 엑셀 일괄 등록 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message || '상품을 일괄 등록하는 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
