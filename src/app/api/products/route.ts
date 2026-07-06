export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../egdesk-helpers';
import { couponCache } from '@/lib/coupon-cache';
import { getTenantId } from '@/lib/tenant';

// GET /api/products : 상품 목록 조회
export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const result = await queryTable('products', {
      filters: { tenant_id: tenantId },
      orderBy: 'id',
      orderDirection: 'DESC'
    });
    
    const products = (result.rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      url: r.url,
      category: r.category,
      menu_category: r.menu_category || '',
      description: r.description,
      main_image_url: r.main_image_url,
      detail_image_url: r.detail_image_url,
      available_methods: r.available_methods || '',
      is_coupon_excludable: Number(r.is_coupon_excludable) || 0
    }));

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/products : 새 상품 생성
export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id, name, price, url, category, menu_category, description, main_image_url, detail_image_url, available_methods, is_coupon_excludable } = await req.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    const newId = id || Date.now().toString();
    const { insertRows } = require('../../../../egdesk-helpers');
    await insertRows('products', [{
      id: newId,
      tenant_id: tenantId,
      name,
      price: price || '',
      url: url || '',
      category: category || '일반상품',
      menu_category: menu_category || '',
      description: description || '',
      main_image_url: main_image_url || '',
      detail_image_url: detail_image_url || '',
      available_methods: available_methods || '',
      is_coupon_excludable: Number(is_coupon_excludable) || 0
    }]);

    // 상품 변조로 캐시 초기화
    couponCache.clear();

    return NextResponse.json({ success: true, id: newId });
  } catch (error: any) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/products : 상품 수정 (Hot Reload Trigger)
export async function PUT(req: Request) {
  try {
    const { id, name, price, url, category, menu_category, description, main_image_url, detail_image_url, available_methods, is_coupon_excludable } = await req.json();

    if (!id) return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });

    const { updateRows } = require('../../../../egdesk-helpers');

    // [부분 갱신 지원] 단일 토글 상태 갱신 시
    if (is_coupon_excludable !== undefined && !name) {
      await updateRows('products', { is_coupon_excludable: Number(is_coupon_excludable) }, { filters: { id: id } });
      couponCache.clear();
      return NextResponse.json({ success: true, id });
    }

    if (!name) return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });

    const updates = {
      name,
      price: price || '',
      url: url || '',
      category: category || '일반상품',
      menu_category: menu_category || '',
      description: description || '',
      main_image_url: main_image_url || '',
      detail_image_url: detail_image_url || '',
      available_methods: Array.isArray(available_methods) ? available_methods.join(',') : (available_methods || ''),
      is_coupon_excludable: Number(is_coupon_excludable) || 0
    };

    await updateRows('products', updates, { filters: { id: id } });

    // 캐시 무효화
    couponCache.clear();

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/products : 상품 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await deleteRows('products', { filters: { id: id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
