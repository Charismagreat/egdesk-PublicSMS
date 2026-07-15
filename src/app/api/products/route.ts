export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows, executeSQL } from '../../../../egdesk-helpers';
import { couponCache } from '@/lib/coupon-cache';
import { getTenantId } from '@/lib/tenant';

// GET /api/products : 상품 목록 조회 (서버 사이드 페이지네이션 및 상태 집계)
export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    // ⚡ 테넌트 불일치 자가 복구 가드(Self-Healing Guard):
    // 기존에 다른 테넌트 ID('tenant-guest-id-2222' 또는 NULL)로 적재된 상품 데이터를
    // 현재 세션의 활성 테넌트 ID(tenantId)로 자동 바인딩 보정 처리합니다. (while 루프로 전량 완벽 이식)
    try {
      if (tenantId !== 'tenant-guest-id-2222') {
        while (true) {
          const wrongProdRes = await executeSQL(`SELECT id FROM products WHERE (tenant_id IS NULL OR tenant_id = 'tenant-guest-id-2222' OR tenant_id = 'default') LIMIT 1000`);
          const wrongProdRows = wrongProdRes.rows || [];
          if (wrongProdRows.length === 0) break;
          
          const ids = wrongProdRows.map((r: any) => r.id);
          await updateRows('products', { tenant_id: tenantId }, { ids });
          console.log(`[Self-Healing] Migrated ${ids.length} products to current tenant: ${tenantId}`);
          
          if (wrongProdRows.length < 1000) break;
        }
      } else {
        while (true) {
          const nullRes = await executeSQL("SELECT id FROM products WHERE tenant_id IS NULL LIMIT 1000");
          const nullRows = nullRes.rows || [];
          if (nullRows.length === 0) break;
          
          const ids = nullRows.map((r: any) => r.id);
          await updateRows('products', { tenant_id: tenantId }, { ids });
          
          if (nullRows.length < 1000) break;
        }
      }
    } catch (patchErr: any) {
      console.warn('[Self-Healing Warning] Failed to run tenant migration in products:', patchErr.message);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ACTIVE';
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || '';

    // 1. 전체 조건 카운트 및 데이터 페칭 쿼리 (deleted_at IS NULL 엄격 적용)
    let countQuery = `SELECT COUNT(*) as count FROM products WHERE tenant_id = '${tenantId}' AND status = '${status}' AND deleted_at IS NULL`;
    let dataQuery = `SELECT * FROM products WHERE tenant_id = '${tenantId}' AND status = '${status}' AND deleted_at IS NULL`;

    if (search) {
      const searchCond = ` AND (name LIKE '%${search}%' OR category LIKE '%${search}%' OR description LIKE '%${search}%')`;
      countQuery += searchCond;
      dataQuery += searchCond;
    }

    // 정렬 및 페이징 범위 적용
    dataQuery += ` ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;

    const countRes = await executeSQL(countQuery);
    const filteredCount = countRes.rows?.[0]?.count || 0;

    const dataRes = await executeSQL(dataQuery);
    const rows = dataRes.rows || [];

    const products = rows.map((r: any) => ({
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
      is_coupon_excludable: Number(r.is_coupon_excludable) || 0,
      status: r.status || 'ACTIVE',
      inventory_item_id: r.inventory_item_id || null
    }));

    // 2. 각 탭의 뱃지에 출력될 전체 활성/임시저장 상품 수 통계 산출 (1,000건 제한 우회)
    const statsQuery = `SELECT status, COUNT(*) as count FROM products WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL GROUP BY status`;
    const statsRes = await executeSQL(statsQuery);
    const statsRows = statsRes.rows || [];
    
    let activeCount = 0;
    let draftCount = 0;
    statsRows.forEach((row: any) => {
      if (row.status === 'ACTIVE') activeCount = row.count;
      else if (row.status === 'DRAFT') draftCount = row.count;
    });

    return NextResponse.json({ 
      success: true, 
      products, 
      filteredCount, 
      activeCount, 
      draftCount 
    });
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

    const { id, name, price, url, category, menu_category, description, main_image_url, detail_image_url, available_methods, is_coupon_excludable, status, inventory_item_id } = await req.json();

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
      is_coupon_excludable: Number(is_coupon_excludable) || 0,
      status: status || 'ACTIVE',
      inventory_item_id: inventory_item_id || null
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
    const { id, name, price, url, category, menu_category, description, main_image_url, detail_image_url, available_methods, is_coupon_excludable, status, inventory_item_id } = await req.json();

    if (!id) return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });

    const { updateRows } = require('../../../../egdesk-helpers');

    // [부분 갱신 지원] 단일 토글 상태 갱신 시
    if (is_coupon_excludable !== undefined && !name) {
      await updateRows('products', { is_coupon_excludable: Number(is_coupon_excludable) }, { filters: { id: id } });
      couponCache.clear();
      return NextResponse.json({ success: true, id });
    }

    // [부분 갱신 지원] 완제품 승인 시 상태 및 가격/이미지 부분 업데이트
    if (status !== undefined && !name) {
      const partialUpdates: any = { status };
      if (main_image_url !== undefined) partialUpdates.main_image_url = main_image_url;
      if (price !== undefined) partialUpdates.price = String(price);
      
      await updateRows('products', partialUpdates, { filters: { id: id } });
      couponCache.clear();
      return NextResponse.json({ success: true, id });
    }

    if (!name) return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });

    const updates: any = {
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

    if (status !== undefined) updates.status = status;
    if (inventory_item_id !== undefined) updates.inventory_item_id = inventory_item_id;

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
