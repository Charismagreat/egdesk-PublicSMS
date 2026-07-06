import { NextResponse } from 'next/server';
import {
  queryTable,
  insertRows,
  executeSQL
} from '../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: '유효한 품목 데이터 배열이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 1. 기존 DB 내 등록된 모든 품목명(name) 가져와서 중복 방지 캐싱
    const existingNames = new Set<string>();
    try {
      const rowsRes = await executeSQL('SELECT name FROM inventory_items');
      const rows = rowsRes.rows || [];
      rows.forEach((row: any) => {
        if (row.name) {
          existingNames.add(row.name.trim());
        }
      });
    } catch (e) {
      console.warn('기존 재고 품목 목록 조회 실패 (첫 생성 가능성):', e);
    }

    let insertedCount = 0;
    const createdAtStr = new Date().toISOString();

    for (const item of items) {
      const name = item.name?.trim();
      const type = item.type === 'product' ? 'product' : 'material';
      const category = item.category?.trim();

      // 필수값 부재 시 패스
      if (!name || !category) continue;

      // 이미 동일한 이름의 품목이 있는 경우 스킵
      if (existingNames.has(name)) continue;

      const price = Number(item.price) || 0;
      const safeStock = Number(item.safeStock) || 0;
      const stock = Number(item.stock) || 0;
      const partner = item.partner?.trim() || '';
      const location = item.location?.trim() || '';
      const spec = item.spec?.trim() || '';
      const description = item.description?.trim() || '';

      // 단위 구분 파싱
      let unitType = 'count';
      let unitValue = '개';
      let boxContains: number | null = null;

      if (item.unitType === 'weight') {
        unitType = 'weight';
        unitValue = item.unitValue?.trim() || 'g';
      } else if (item.unitType === 'box') {
        unitType = 'box';
        unitValue = '박스';
        boxContains = Number(item.boxContains) || 10;
      }

      // 품목 삽입 실행
      const insertData = {
        type,
        name,
        category,
        price,
        partner,
        stock,
        safeStock,
        location,
        spec,
        unitType,
        unitValue,
        boxContains,
        description,
        tags: item.tags?.trim() || (type === 'product' ? '판매중' : '사용중'),
        barcode: item.barcode?.trim() || '',
        createdAt: createdAtStr
      };

      await insertRows('inventory_items', [insertData]);
      insertedCount++;

      // 최초 재고가 0보다 큰 경우, 변동 로그 함께 생성
      if (stock > 0) {
        const maxIdRes = await executeSQL('SELECT MAX(id) as maxId FROM inventory_items');
        const insertedId = maxIdRes.rows?.[0]?.maxId || 0;

        const logData = {
          itemId: insertedId,
          itemName: name,
          itemType: type,
          changeType: 'in',
          quantity: stock,
          price,
          operator: '시스템 (일괄 등록)',
          note: '최초 기초 재고 등록',
          createdAt: createdAtStr
        };
        await insertRows('inventory_logs', [logData]);
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      totalReceived: items.length
    });

  } catch (error: any) {
    console.error('재고 엑셀 일괄 등록 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고를 등록하는 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
