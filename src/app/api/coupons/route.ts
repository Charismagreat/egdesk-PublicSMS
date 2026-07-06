export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, deleteRows } from '../../../../egdesk-helpers';
import { couponCache } from '@/lib/coupon-cache';

// GET /api/coupons : 발급된 쿠폰 목록 조회
export async function GET() {
  try {
    // 1) 인메모리 캐시가 존재하는 경우 즉시 반환 (수 ms 수준의 극도 성능 실현)
    const cached = couponCache.getCoupons();
    if (cached) {
      return NextResponse.json({ success: true, coupons: cached });
    }

    const result = await queryTable('coupons', {
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
    
    // 각 쿠폰에 매핑된 제한 조건 조회 및 병합
    let restrictionsRows: any[] = [];
    try {
      const restrictionsResult = await queryTable('crm_coupons_restrictions', {});
      restrictionsRows = restrictionsResult.rows || [];
    } catch (e) {
      console.log('crm_coupons_restrictions table might be empty or not loaded yet.');
    }

    const couponsWithRestrictions = (result.rows || []).map((c: any) => {
      const matched = restrictionsRows.filter((r: any) => r.coupon_id === c.id);
      return { ...c, restrictions: matched };
    });
    
    // 2) 인메모리 캐시 적재
    couponCache.setCoupons(couponsWithRestrictions);
    
    return NextResponse.json({ success: true, coupons: couponsWithRestrictions });
  } catch (error: any) {
    console.error('Failed to fetch coupons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/coupons : 새 쿠폰 발행
export async function POST(req: Request) {
  try {
    const { code, name, discount_type, discount_value, min_order_amount, status, count, prefix, expires_at, restrictions } = await req.json();

    if (!name || !discount_value) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 });
    }

    const numCount = Number(count) || 1;
    const isBulk = numCount > 1;

    if (!isBulk && !code) {
      return NextResponse.json({ success: false, error: 'Coupon code is required for single issue' }, { status: 400 });
    }

    const rows = [];
    const timestamp = Date.now();

    for (let i = 0; i < numCount; i++) {
      let finalCode = '';
      if (isBulk) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        finalCode = `${prefix ? prefix.toUpperCase() + '-' : ''}${randomStr}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      } else {
        finalCode = code.toUpperCase().trim();
      }

      rows.push({
        id: `${timestamp}-${i}`,
        code: finalCode,
        name,
        discount_type: discount_type || 'amount',
        discount_value: Number(discount_value) || 0,
        min_order_amount: Number(min_order_amount) || 0,
        status: status || 'active',
        expires_at: expires_at || null,
        created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
      });
    }

    await insertRows('coupons', rows);

    // 제한 조건 데이터 일괄 저장 (있을 경우)
    if (restrictions && Array.isArray(restrictions) && restrictions.length > 0) {
      const restrictionRows = [];
      const restrictionTimestamp = Date.now();
      let rIdx = 0;

      for (const res of restrictions) {
        for (const coupon of rows) {
          restrictionRows.push({
            id: `${restrictionTimestamp}-${rIdx++}`,
            coupon_id: coupon.id,
            restriction_type: res.restriction_type,
            target_type: res.target_type,
            target_value: String(res.target_value).trim(),
            created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)
          });
        }
      }

      if (restrictionRows.length > 0) {
        await insertRows('crm_coupons_restrictions', restrictionRows);
      }
    }

    // 데이터가 변조되었으므로 인메모리 캐시 일괄 무효화
    couponCache.clear();

    return NextResponse.json({ success: true, count: numCount });
  } catch (error: any) {
    console.error('Failed to create coupon:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/coupons : 쿠폰 삭제 (비활성화)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await deleteRows('coupons', { filters: { id } });
    
    try {
      await deleteRows('crm_coupons_restrictions', { filters: { coupon_id: id } });
    } catch (e) {
      console.log('Error deleting restrictions or table empty:', e);
    }

    // 캐시 초기화
    couponCache.clear();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete coupon:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/coupons : 쿠폰 정보 수정 (status 등)
export async function PUT(req: Request) {
  try {
    const { id, code, status } = await req.json();

    if (!id && !code) {
      return NextResponse.json({ success: false, error: 'ID or Code is required' }, { status: 400 });
    }

    const filters: Record<string, string> = {};
    if (id) filters.id = String(id);
    if (code) filters.code = String(code);

    await updateRows('coupons', { status: status || 'used' }, { filters });

    // 캐시 초기화
    couponCache.clear();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update coupon:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

