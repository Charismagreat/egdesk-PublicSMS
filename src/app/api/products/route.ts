export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows, executeSQL, updateRows } from '../../../../egdesk-helpers';
import { couponCache } from '@/lib/coupon-cache';
import { getTenantId } from '@/lib/tenant';
import { backfillFinishedGoodsToProducts } from '@/lib/sync-products-helper';

// GET /api/products : 상품 목록 조회 (서버 사이드 페이지네이션 및 상태 집계)

export async function GET(req: Request) {
  try {
    let tenantId = await getTenantId();
    if (!tenantId) {
      tenantId = 'default';
    }

    // ⚡ 0건 방지 및 테넌트 자가 복구 가드(Self-Healing Guard):
    // products 테이블 데이터가 0건일 경우, 재고 완제품(inventory_items) 항목들을 자동으로 동기화 백필합니다.
    try {
      const checkRes = await queryTable('products', { limit: 1 });
      const currentRows = checkRes.rows || [];
      if (currentRows.length === 0) {
        console.log('[Self-Healing] products table is empty. Running auto-backfill from inventory...');
        await backfillFinishedGoodsToProducts();
      }
    } catch (selfHealingErr: any) {
      console.warn('[Self-Healing Warning] Auto-backfill check warning:', selfHealingErr.message);
    }

    // ⚡ 테넌트 불일치 자가 복구 가드(Self-Healing Guard):
    // 타 환경(다른 컴퓨터/세션)에서 접속 시 기존 테넌트('tenant-guest-id-2222', 'default', NULL 등)로 적재된
    // 모든 상품 데이터를 현재 세션의 활성 테넌트 ID(tenantId)로 자동 마이그레이션 바인딩합니다.
    try {
      // ⚡ brand, spec, unit 컬럼 무손실 인앱 마이그레이션 자동 보정
      await executeSQL(`ALTER TABLE products ADD COLUMN brand TEXT`).catch(() => {});
      await executeSQL(`ALTER TABLE products ADD COLUMN spec TEXT`).catch(() => {});
      await executeSQL(`ALTER TABLE products ADD COLUMN unit TEXT`).catch(() => {});

      if (tenantId) {
        await executeSQL(`UPDATE products SET tenant_id = '${tenantId}' WHERE tenant_id IS NULL OR tenant_id = 'default' OR tenant_id = '' OR (tenant_id != '${tenantId}' AND tenant_id = 'tenant-guest-id-2222')`).catch(() => {});
        console.log(`[Self-Healing] Successfully bound products to current active tenant: ${tenantId}`);
      }
    } catch (patchErr: any) {
      console.warn('[Self-Healing Warning] Failed to run tenant migration in products:', patchErr.message);
    }

    const isAllMode = searchParams.get('all') === 'true' || searchParams.get('limit') === 'all';
    const page = Number(searchParams.get('page')) || 1;
    const limitParam = searchParams.get('limit');
    const limit = isAllMode ? 100000 : (Number(limitParam) || 10);
    const offset = isAllMode ? 0 : (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || '';

    // 1. 전체 조건 카운트 및 데이터 페칭 쿼리 (SQL 방화벽 에러 감지 시 queryTable로 폴백)
    let rows = [];
    let filteredCount = 0;

    try {
      let countQuery = `
        SELECT COUNT(DISTINCT p.id) as count 
        FROM products p 
        LEFT JOIN inventory_items inv ON (p.inventory_item_id IS NOT NULL AND (p.inventory_item_id = inv.id OR CAST(p.inventory_item_id AS TEXT) = CAST(inv.id AS TEXT)))
        WHERE p.tenant_id = '${tenantId}' AND p.status = '${status}'
      `;
      let dataQuery = `
        SELECT p.*, 
               inv.spec as inventory_spec, 
               inv.unitValue as inventory_unit,
               inv.barcode as inventory_barcode,
               COALESCE(inv.stock, 0) as inventory_stock
        FROM products p
        LEFT JOIN inventory_items inv ON (p.inventory_item_id IS NOT NULL AND (p.inventory_item_id = inv.id OR CAST(p.inventory_item_id AS TEXT) = CAST(inv.id AS TEXT)))
        WHERE p.tenant_id = '${tenantId}' AND p.status = '${status}'
      `;

      if (search) {
        const searchCond = ` AND (p.name LIKE '%${search}%' OR p.category LIKE '%${search}%' OR p.brand LIKE '%${search}%' OR p.description LIKE '%${search}%' OR inv.spec LIKE '%${search}%')`;
        countQuery += searchCond;
        dataQuery += searchCond;
      }

      if (isAllMode) {
        dataQuery += ` GROUP BY p.id ORDER BY p.id DESC`;
      } else {
        dataQuery += ` GROUP BY p.id ORDER BY p.id DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const countRes = await executeSQL(countQuery);
      filteredCount = countRes.rows?.[0]?.count || 0;

      const dataRes = await executeSQL(dataQuery);
      rows = dataRes.rows || [];
      
      // 소프트 삭제 레코드 배제 필터링
      rows = rows.filter((r: any) => !r.deleted_at);
    } catch (err) {
      console.warn('[executeSQL Fallback] queryTable로 폴백하여 상품 데이터를 조회합니다:', err);
      
      const queryRes = await queryTable('products', {
        limit: 10000,
        orderBy: 'id',
        orderDirection: 'DESC'
      });
      let allRows = queryRes.rows || [];
      
      // 재고 마스터 테이블 로드 (메모리 조인용)
      let invItems: any[] = [];
      try {
        const invRes = await queryTable('inventory_items', { limit: 10000 });
        invItems = invRes.rows || [];
      } catch (invErr) {
        console.error('폴백 중 재고 목록 로드 실패:', invErr);
      }
      
      // 메모리 기반 테넌트, 삭제, 상태 필터링
      allRows = allRows.filter((r: any) => !r.deleted_at && r.tenant_id === tenantId && (r.status || 'ACTIVE') === status);
      
      if (search) {
        const cleanSearch = search.toLowerCase();
        allRows = allRows.filter((r: any) => 
          (r.name && String(r.name).toLowerCase().includes(cleanSearch)) ||
          (r.category && String(r.category).toLowerCase().includes(cleanSearch)) ||
          (r.brand && String(r.brand).toLowerCase().includes(cleanSearch)) ||
          (r.description && String(r.description).toLowerCase().includes(cleanSearch))
        );
      }
      
      filteredCount = allRows.length;
      const sliced = allRows.slice(offset, offset + limit);
      
      // 메모리 상에서 inventory_barcode 및 inventory_stock 필드 바인딩 백필
      rows = sliced.map((r: any) => {
        const matched = invItems.find(i => String(i.id) === String(r.inventory_item_id) || (r.name && i.name === r.name));
        return {
          ...r,
          inventory_barcode: matched ? matched.barcode : null,
          inventory_stock: matched ? matched.stock : 0,
          inventory_spec: r.spec || (matched ? matched.spec : null),
          inventory_unit: r.unit || (matched ? matched.unitValue : null)
        };
      });
    }

    const products = rows.map((r: any) => {
      let validItemCode = '';
      if (r.inventory_item_id) {
        validItemCode = r.inventory_barcode ? String(r.inventory_barcode).trim() : `INV-${r.inventory_item_id}`;
      } else {
        validItemCode = 'INV-UNASSIGNED';
      }

      return {
        id: r.id,
        name: r.name,
        price: r.price,
        brand: r.brand || '',
        spec: r.spec || '',
        unit: r.unit || '',
        inventory_spec: r.inventory_spec || r.spec || '',
        inventory_unit: r.inventory_unit || r.unit || '',
        inventory_barcode: r.inventory_barcode || '',
        url: r.url,
        category: r.category,
        menu_category: r.menu_category || '',
        description: r.description || '',
        main_image_url: r.main_image_url,
        detail_image_url: r.detail_image_url,
        available_methods: r.available_methods || '',
        is_coupon_excludable: r.is_coupon_excludable !== undefined && r.is_coupon_excludable !== null ? Number(r.is_coupon_excludable) : 1,
        itemCode: validItemCode,
        stock: r.inventory_stock !== undefined && r.inventory_stock !== null ? Number(r.inventory_stock) : 0,
        status: r.status || 'ACTIVE',
        inventory_item_id: r.inventory_item_id || null
      };
    });

    // 2. 각 탭의 뱃지에 출력될 전체 활성/임시저장 상품 수 통계 산출 (에러 감지 시 폴백 적용)
    let activeCount = 0;
    let draftCount = 0;
    
    try {
      const statsQuery = `SELECT status, COUNT(*) as count FROM products WHERE tenant_id = '${tenantId}' GROUP BY status`;
      const statsRes = await executeSQL(statsQuery);
      const statsRows = statsRes.rows || [];
      statsRows.forEach((row: any) => {
        if (row.status === 'ACTIVE') activeCount = row.count;
        else if (row.status === 'DRAFT') draftCount = row.count;
      });
    } catch (statsErr) {
      console.warn('[Stats executeSQL Fallback] queryTable로 통계 폴백 계산:', statsErr);
      const statsQueryRes = await queryTable('products', { limit: 10000 });
      let allStatsRows = statsQueryRes.rows || [];
      allStatsRows = allStatsRows.filter((r: any) => !r.deleted_at && r.tenant_id === tenantId);
      
      allStatsRows.forEach((row: any) => {
        const rowStatus = row.status || 'ACTIVE';
        if (rowStatus === 'ACTIVE') activeCount++;
        else if (rowStatus === 'DRAFT') draftCount++;
      });
    }

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

    const { id, name, price, brand, url, category, menu_category, description, main_image_url, detail_image_url, available_methods, is_coupon_excludable, status, inventory_item_id } = await req.json();

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
      brand: brand || '',
      url: url || '',
      category: category || '일반상품',
      menu_category: menu_category || '',
      description: description || '',
      main_image_url: main_image_url || '',
      detail_image_url: detail_image_url || '',
      available_methods: available_methods || '',
      is_coupon_excludable: is_coupon_excludable !== undefined && is_coupon_excludable !== null ? Number(is_coupon_excludable) : 1,
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
    const { id, name, price, brand, url, category, menu_category, description, main_image_url, detail_image_url, available_methods, is_coupon_excludable, status, inventory_item_id } = await req.json();

    if (!id) return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });

    const { updateRows } = require('../../../../egdesk-helpers');

    // [부분 갱신 지원] 단일 토글 상태 갱신 시
    if (is_coupon_excludable !== undefined && !name) {
      const isNum = !isNaN(Number(id));
      const opt: any = { filters: { id: String(id) } };
      if (isNum) opt.ids = [Number(id)];
      await updateRows('products', { is_coupon_excludable: Number(is_coupon_excludable) }, opt);
      couponCache.clear();
      return NextResponse.json({ success: true, id });
    }

    // [부분 갱신 지원] 완제품 승인 시 상태 및 가격/이미지 부분 업데이트
    if (status !== undefined && !name) {
      const partialUpdates: any = { status };
      if (main_image_url !== undefined) partialUpdates.main_image_url = main_image_url;
      if (price !== undefined) partialUpdates.price = String(price);
      if (brand !== undefined) partialUpdates.brand = String(brand);
      
      const isNum = !isNaN(Number(id));
      const opt: any = { filters: { id: String(id) } };
      if (isNum) opt.ids = [Number(id)];
      await updateRows('products', partialUpdates, opt);
      couponCache.clear();
      return NextResponse.json({ success: true, id });
    }

    if (!name) return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });

    const updates: any = {
      name,
      price: price || '',
      brand: brand || '',
      url: url || '',
      category: category || '스토어용',
      menu_category: menu_category || '',
      description: description || '',
      main_image_url: main_image_url || '',
      detail_image_url: detail_image_url || '',
      available_methods: Array.isArray(available_methods) ? available_methods.join(',') : (available_methods || ''),
      is_coupon_excludable: Number(is_coupon_excludable) || 0
    };

    if (status !== undefined) updates.status = status;
    if (inventory_item_id !== undefined) updates.inventory_item_id = inventory_item_id;

    console.log(`[Debug Product PUT] Target ID: ${id}`);
    console.log(`[Debug Product PUT] Received category:`, category);
    console.log(`[Debug Product PUT] Updates object:`, JSON.stringify(updates));

    const isNumericId = !isNaN(Number(id));
    const updateOptions: any = { filters: { id: String(id) } };
    if (isNumericId) {
      updateOptions.ids = [Number(id)];
    }

    const result = await updateRows('products', updates, updateOptions);
    console.log(`[Debug Product PUT] updateRows DB result:`, JSON.stringify(result));

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
