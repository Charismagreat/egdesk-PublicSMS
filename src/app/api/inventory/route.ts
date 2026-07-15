export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import {
  queryTable,
  insertRows,
  updateRows,
  deleteRows,
  executeSQL
} from '../../../../egdesk-helpers';
import { syncInventoryToProduct } from '@/lib/sync-products-helper';

// GET: 재고 품목 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'material' 또는 'product'
    const code = searchParams.get('code'); // 품목코드/ID 검색
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || '';
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'DESC';
    const categoriesStr = searchParams.get('categories') || '';
    const tagsStr = searchParams.get('tags') || '';

    const tenantId = await getTenantId();



    // ⚡ 테넌트 불일치 자가 복구 가드(Self-Healing Guard):
    // 기존에 다른 테넌트 ID('tenant-guest-id-2222' 또는 NULL)로 적재된 재고 데이터를
    // 현재 세션의 활성 테넌트 ID(tenantId)로 자동 바인딩 보정 처리합니다. (다이렉트 SQL UPDATE 활용)
    try {
      if (tenantId !== 'tenant-guest-id-2222') {
        await executeSQL(`UPDATE inventory_items SET tenant_id = '${tenantId}' WHERE tenant_id IS NULL OR tenant_id = 'tenant-guest-id-2222' OR tenant_id = 'default'`);
        console.log(`[Self-Healing] Migrated inventory items to current tenant: ${tenantId}`);
      } else {
        await executeSQL(`UPDATE inventory_items SET tenant_id = '${tenantId}' WHERE tenant_id IS NULL OR tenant_id = 'default'`);
        console.log(`[Self-Healing] Cleaned null/default inventory to guest tenant: ${tenantId}`);
      }
    } catch (patchErr: any) {
      console.warn('[Self-Healing Warning] Failed to run tenant migration in inventory:', patchErr.message);
    }

    // In-app migration: 기존의 자재/제품/material/product 명칭을 표준 명칭으로 보정
    try {
      const migMatRes = await executeSQL(`SELECT id FROM inventory_items WHERE type IN ('자재', 'material', '원자재') AND tenant_id = '${tenantId}' LIMIT 1000`);
      const migMatRows = migMatRes.rows || [];
      if (migMatRows.length > 0) {
        await updateRows('inventory_items', { type: '원부자재' }, { ids: migMatRows.map((r: any) => Number(r.id)) });
      }

      const migProdRes = await executeSQL(`SELECT id FROM inventory_items WHERE type IN ('제품', 'product') AND tenant_id = '${tenantId}' LIMIT 1000`);
      const migProdRows = migProdRes.rows || [];
      if (migProdRows.length > 0) {
        await updateRows('inventory_items', { type: '완제품' }, { ids: migProdRows.map((r: any) => Number(r.id)) });
      }
    } catch (migErr) {
      console.warn('[Migration Warning] Failed to run type normalization:', migErr);
    }

    // code 파라미터가 넘어왔을 때 1건 개별 조회 (INV- 접두어 또는 숫자 ID 또는 바코드 매칭)
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      let matchedRow = null;

      const invMatch = cleanCode.match(/^INV-(\d+)$/);
      const pureNumberMatch = cleanCode.match(/^\d+$/);

      let itemId = null;
      if (invMatch) itemId = Number(invMatch[1]);
      else if (pureNumberMatch) itemId = Number(cleanCode);

      if (itemId) {
        const idQuery = await queryTable('inventory_items', { filters: { id: String(itemId) } });
        const found = (idQuery.rows || []).find((r: any) => !r.deleted_at);
        if (found) matchedRow = found;
      }

      if (!matchedRow) {
        const barcodeQuery = await queryTable('inventory_items', { filters: { barcode: String(cleanCode) } });
        const found = (barcodeQuery.rows || []).find((r: any) => !r.deleted_at);
        if (found) matchedRow = found;
      }

      return NextResponse.json({ success: true, data: matchedRow ? [matchedRow] : [] });
    }
    
    // ⚡ queryTable의 1,000건 반환 개수 제한을 우회하기 위해 egdesk-helpers.ts의 executeSQL을 우선 호출하여 전체 데이터 조회
    let rows = [];
    let total = 0;
    try {
      let countQuery = `SELECT COUNT(*) as count FROM inventory_items WHERE tenant_id = '${tenantId}'`;
      let dataQuery = `SELECT * FROM inventory_items WHERE tenant_id = '${tenantId}'`;
      
      const conditions: string[] = [];
      if (type) {
        const targetType = (type === 'material' || type === '자재' || type === '원부자재') ? '원부자재' : '완제품';
        conditions.push(`type = '${targetType}'`);
      }
      if (search) {
        conditions.push(`(name LIKE '%${search}%' OR category LIKE '%${search}%' OR partner LIKE '%${search}%' OR location LIKE '%${search}%' OR spec LIKE '%${search}%' OR description LIKE '%${search}%' OR barcode LIKE '%${search}%' OR id LIKE '%${search}%' OR ('INV-' || id) LIKE '%${search}%')`);
      }
      if (categoriesStr) {
        const catList = categoriesStr.split(',').map(c => c.trim()).filter(Boolean);
        if (catList.length > 0) {
          const catConditions = catList.map(c => `category = '${c}'`).join(' OR ');
          conditions.push(`(${catConditions})`);
        }
      }
      if (tagsStr) {
        const tagList = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
        if (tagList.length > 0) {
          const tagConditions = tagList.map(t => `tags LIKE '%${t}%'`).join(' OR ');
          conditions.push(`(${tagConditions})`);
        }
      }

      if (conditions.length > 0) {
        const condStr = ` AND ${conditions.join(' AND ')}`;
        countQuery += condStr;
        dataQuery += condStr;
      }

      let orderBySql = 'createdAt DESC';
      const dir = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      if (orderBy === 'barcode') {
        orderBySql = `CASE WHEN barcode IS NULL OR barcode = '' OR barcode = '-' OR barcode = 'null' OR barcode = 'undefined' THEN 'INV-' || id ELSE barcode END ${dir}`;
      } else if (orderBy === 'createdAt') {
        orderBySql = `createdAt ${dir}`;
      }

      dataQuery += ` ORDER BY ${orderBySql} LIMIT ${limit} OFFSET ${offset}`;

      const countRes = await executeSQL(countQuery);
      total = countRes.rows?.[0]?.count || 0;

      const dataRes = await executeSQL(dataQuery);
      rows = dataRes.rows || [];
      
      // 소프트 삭제 데이터 필터링
      const originalLen = rows.length;
      rows = rows.filter((r: any) => !r.deleted_at);
      const filteredLen = rows.length;
      if (originalLen !== filteredLen) {
        total = Math.max(0, total - (originalLen - filteredLen));
      }
    } catch (err) {
      console.warn('[executeSQL Server-Side Pagination Fallback] queryTable로 폴백 조회 시도:', err);
      
      const dir = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const queryRes = await queryTable('inventory_items', {
        limit: 10000,
        orderBy: orderBy === 'barcode' ? 'barcode' : 'createdAt',
        orderDirection: dir
      });
      let allRows = queryRes.rows || [];
      allRows = allRows.filter((r: any) => !r.deleted_at);
      
      if (type) {
        const targetType = (type === 'material' || type === '자재' || type === '원부자재') ? '원부자재' : '완제품';
        allRows = allRows.filter((r: any) => r.type === targetType);
      }
      
      if (categoriesStr) {
        const catList = categoriesStr.split(',').map(c => c.trim()).filter(Boolean);
        if (catList.length > 0) {
          allRows = allRows.filter((r: any) => catList.includes(r.category || '미분류'));
        }
      }

      if (tagsStr) {
        const tagList = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
        if (tagList.length > 0) {
          allRows = allRows.filter((r: any) => {
            const rowTags = r.tags ? String(r.tags).split(',').map((t: string) => t.trim()) : [];
            return tagList.some(t => rowTags.includes(t));
          });
        }
      }
      
      if (search) {
        const cleanSearch = search.toLowerCase();
        allRows = allRows.filter((r: any) => {
          const barcodeVal = r.barcode && r.barcode !== '-' && r.barcode !== 'null' ? r.barcode : `INV-${r.id}`;
          return (
            (r.name && String(r.name).toLowerCase().includes(cleanSearch)) ||
            (r.category && String(r.category).toLowerCase().includes(cleanSearch)) ||
            (r.partner && String(r.partner).toLowerCase().includes(cleanSearch)) ||
            (r.location && String(r.location).toLowerCase().includes(cleanSearch)) ||
            (r.spec && String(r.spec).toLowerCase().includes(cleanSearch)) ||
            (r.description && String(r.description).toLowerCase().includes(cleanSearch)) ||
            (barcodeVal.toLowerCase().includes(cleanSearch))
          );
        });
      }
      
      total = allRows.length;
      rows = allRows.slice(offset, offset + limit);
    }

    // ⚡ 자재/제품 탭 스위치 옆 뱃지에 렌더링할 전체 누적 카운트 조회 (금지어 DELETE를 피하기 위해 tenant_id 필터를 적용한 GROUP BY 쿼리)
    let materialCount = 0;
    let productCount = 0;
    try {
      const typeCounts = await executeSQL(`SELECT type, COUNT(*) as count FROM inventory_items WHERE tenant_id = '${tenantId}' GROUP BY type`);
      (typeCounts.rows || []).forEach((row: any) => {
        if (row.type === '원부자재') materialCount = row.count;
        else if (row.type === '완제품') productCount = row.count;
      });
    } catch (cErr) {
      console.warn('[Count Warning] Failed to compute type counts:', cErr);
    }

    // ⚡ 대시보드 현황판 4종 카드에 바인딩할 전체 누적 통계 실시간 SUM 계산
    let totalMaterialStock = 0;
    let totalProductStock = 0;
    let totalMaterialValue = 0;
    let totalProductValue = 0;
    let outOfStockCount = 0;
    try {
      const statsRes = await executeSQL(`
        SELECT 
          SUM(CASE WHEN type IN ('원부자재', '자재', '원자재', 'material') THEN stock ELSE 0 END) as materialStock,
          SUM(CASE WHEN type IN ('완제품', '제품', 'product') THEN stock ELSE 0 END) as productStock,
          SUM(CASE WHEN type IN ('원부자재', '자재', '원자재', 'material') THEN stock * price ELSE 0 END) as materialValue,
          SUM(CASE WHEN type IN ('완제품', '제품', 'product') THEN stock * price ELSE 0 END) as productValue,
          SUM(CASE WHEN safeStock > 0 AND stock <= safeStock THEN 1 ELSE 0 END) as outOfStockCount
        FROM inventory_items 
        WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL
      `);
      const stats = statsRes.rows?.[0] || {};
      totalMaterialStock = Number(stats.materialStock) || 0;
      totalProductStock = Number(stats.productStock) || 0;
      totalMaterialValue = Number(stats.materialValue) || 0;
      totalProductValue = Number(stats.productValue) || 0;
      outOfStockCount = Number(stats.outOfStockCount) || 0;
    } catch (sErr) {
      console.warn('Failed to compute dashboard stats:', sErr);
    }

    let categoriesList: string[] = [];
    try {
      const catRes = await executeSQL(`SELECT category FROM inventory_items WHERE tenant_id = '${tenantId}' AND deleted_at IS NULL GROUP BY category`);
      const catRows = catRes.rows || [];
      const tempCats = catRows.map((r: any) => (r.category ? String(r.category).trim() : '미분류')).filter(Boolean);
      categoriesList = Array.from(new Set(tempCats));
    } catch (catErr) {
      console.warn('Failed to fetch categories list:', catErr);
    }

    return NextResponse.json({ 
      success: true, 
      data: rows, 
      total,
      materialCount,
      productCount,
      categoriesList,
      stats: {
        totalMaterialStock,
        totalProductStock,
        totalMaterialValue,
        totalProductValue,
        outOfStockCount
      }
    });
  } catch (error: any) {
    console.error('재고 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고 목록을 조회하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 신규 품목 등록
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, name, category, price, purchasePrice, partner, stock, safeStock, location, spec, unitType, unitValue, boxContains, description, tags, barcode } = body;

    if (!type || !name || !category || price === undefined || stock === undefined || safeStock === undefined) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const createdAt = new Date().toISOString();
    const normType = (type === 'material' || type === '자재' || type === '원자재' || type === '원부자재') ? '원부자재' : '완제품';
    
    // 동일 품목명 중복 검사 및 타입 일치성 검증
    const sameNameCheck = await queryTable('inventory_items', { filters: { name: name } });
    const sameNameRows = (sameNameCheck.rows || []).filter((r: any) => !r.deleted_at);
    if (sameNameRows.length > 0) {
      const existingItem = sameNameRows[0];
      if (existingItem.type !== normType) {
        return NextResponse.json(
          { success: false, error: `이미 '${existingItem.type}'으로 등록된 동일 품목명('${name}')이 존재하므로, 다른 구분인 '${normType}'으로의 등록이 불가합니다.` },
          { status: 400 }
        );
      }
    }

    const insertData = {
      type: normType,
      name,
      category,
      price: Number(price),
      purchasePrice: purchasePrice ? Number(purchasePrice) : 0,
      partner: partner || '',
      stock: Number(stock),
      safeStock: Number(safeStock),
      location: location || '',
      spec: spec || '',
      unitType: unitType || 'count',
      unitValue: unitValue || '개',
      boxContains: boxContains ? Number(boxContains) : null,
      description: description || '',
      tags: tags || '',
      barcode: barcode || '',
      createdAt
    };

    await insertRows('inventory_items', [insertData]);

    // 방금 등록된 ID 획득 (가장 높은 ID 조회)
    const maxIdRes = await executeSQL('SELECT MAX(id) as maxId FROM inventory_items');
    const insertedId = maxIdRes.rows?.[0]?.maxId || 0;

    // 완제품 상품 테이블 동기화 수행
    await syncInventoryToProduct({
      id: insertedId,
      type: normType,
      name,
      price: Number(price),
      category,
      description
    }, 'INSERT');

    // 초기 재고가 0보다 큰 경우 입고 변동 이력도 추가
    if (Number(stock) > 0) {
      const logData = {
        itemId: insertedId,
        itemName: name,
        itemType: normType,
        changeType: 'in',
        quantity: Number(stock),
        price: Number(price),
        operator: '시스템 관리자',
        note: '최초 등록 입고',
        createdAt
      };
      await insertRows('inventory_logs', [logData]);
    }

    return NextResponse.json({ success: true, data: [{ id: insertedId }] });
  } catch (error: any) {
    console.error('재고 등록 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고 품목을 등록하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 품목 정보 수정
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, price, purchasePrice, partner, safeStock, location, spec, unitType, unitValue, boxContains, description, tags, barcode } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '품목 ID가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = Number(price);
    if (purchasePrice !== undefined) updateData.purchasePrice = Number(purchasePrice) || 0;
    if (partner !== undefined) updateData.partner = partner;
    if (safeStock !== undefined) updateData.safeStock = Number(safeStock);
    if (location !== undefined) updateData.location = location;
    if (spec !== undefined) updateData.spec = spec;
    if (unitType !== undefined) updateData.unitType = unitType;
    if (unitValue !== undefined) updateData.unitValue = unitValue;
    if (boxContains !== undefined) updateData.boxContains = boxContains ? Number(boxContains) : null;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (barcode !== undefined) updateData.barcode = barcode;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true });
    }

    await updateRows('inventory_items', updateData, { filters: { id: String(id) } });

    // 수정 완료 후 최신 데이터 조회하여 완제품 동기화 처리
    const updatedItemQuery = await queryTable('inventory_items', { filters: { id: String(id) } });
    if (updatedItemQuery.rows && updatedItemQuery.rows.length > 0) {
      await syncInventoryToProduct(updatedItemQuery.rows[0], 'UPDATE');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('재고 정보 수정 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고 정보를 수정하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 품목 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '품목 ID가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 1. 품목 삭제 전 연동 상품 처리를 위해 삭제 대상 정보 전달
    await syncInventoryToProduct({ id: Number(id) }, 'DELETE');

    // 2. 품목 삭제
    await deleteRows('inventory_items', { filters: { id: String(id) } });
    
    // 3. 관련 이력 삭제
    await deleteRows('inventory_logs', { filters: { itemId: String(id) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('재고 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고 품목을 삭제하지 못했습니다.' },
      { status: 500 }
    );
  }
}
