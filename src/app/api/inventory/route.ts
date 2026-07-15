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

    const tenantId = await getTenantId();



    // ⚡ 자가 복구 가드(Self-Healing Guard): 
    // 기존 마이그레이션 또는 대량 업로드 시 tenant_id가 NULL로 적재된 레코드들을 현재 로그인된 테넌트 세션 ID로 자동 바인딩 보정 (Max 2,000건씩 안전 슬라이싱)
    try {
      const nullRes = await executeSQL("SELECT id FROM inventory_items WHERE tenant_id IS NULL LIMIT 2000");
      const nullRows = nullRes.rows || [];
      if (nullRows.length > 0) {
        const ids = nullRows.map((r: any) => Number(r.id));
        await updateRows('inventory_items', { tenant_id: tenantId }, { ids });
        console.log(`[Self-Healing] Successfully bound ${ids.length} NULL tenant_id items to ${tenantId}`);
      }
    } catch (patchErr) {
      console.warn('[Self-Healing Warning] Failed to bind NULL tenant_ids via updateRows:', patchErr);
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
        conditions.push(`(name LIKE '%${search}%' OR category LIKE '%${search}%' OR partner LIKE '%${search}%' OR location LIKE '%${search}%' OR spec LIKE '%${search}%')`);
      }

      if (conditions.length > 0) {
        const condStr = ` AND ${conditions.join(' AND ')}`;
        countQuery += condStr;
        dataQuery += condStr;
      }

      dataQuery += ` ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`;

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
      const queryRes = await queryTable('inventory_items', {
        limit: 10000,
        orderBy: 'createdAt',
        orderDirection: 'DESC'
      });
      let allRows = queryRes.rows || [];
      allRows = allRows.filter((r: any) => !r.deleted_at);
      
      if (type) {
        const targetType = (type === 'material' || type === '자재' || type === '원부자재') ? '원부자재' : '완제품';
        allRows = allRows.filter((r: any) => r.type === targetType);
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

    return NextResponse.json({ 
      success: true, 
      data: rows, 
      total,
      materialCount,
      productCount
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
    const { type, name, category, price, partner, stock, safeStock, location, spec, unitType, unitValue, boxContains, description, tags, barcode } = body;

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
    const { id, name, category, price, partner, safeStock, location, spec, unitType, unitValue, boxContains, description, tags, barcode } = body;

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

    // 1. 품목 삭제
    await deleteRows('inventory_items', { filters: { id: String(id) } });
    
    // 2. 관련 이력 삭제
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
