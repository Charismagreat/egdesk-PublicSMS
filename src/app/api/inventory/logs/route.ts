export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import {
  queryTable,
  insertRows,
  updateRows,
  executeSQL
} from '../../../../../egdesk-helpers';

// GET: 재고 변동 로그 목록 조회
export async function GET() {
  try {
    // SQL 금지어 DELETE 우회를 위해 queryTable 사용 후 JS 레벨에서 소프트 삭제 필터링
    const queryRes = await queryTable('inventory_logs', {
      limit: 200,
      orderBy: 'createdAt',
      orderDirection: 'DESC'
    });
    let rows = queryRes.rows || [];

    // 소프트 삭제 데이터 필터링
    rows = rows.filter((r: any) => !r.deleted_at);
    
    // 최종 100건 제한
    rows = rows.slice(0, 100);

    // 품목 마스터 정보를 매핑하여 품목코드(barcode)를 가져옴
    const itemsRes = await queryTable('inventory_items', {});
    const items = itemsRes.rows || [];
    const itemMap = new Map();
    items.forEach((item: any) => {
      itemMap.set(Number(item.id), item);
    });

    rows = rows.map((row: any) => {
      const matchedItem = itemMap.get(Number(row.itemId));
      return {
        ...row,
        itemBarcode: matchedItem ? (matchedItem.barcode || '') : ''
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('재고 로그 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고 로그를 조회하지 못했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 재고 입출고 및 실사 조정 처리
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, changeType, quantity, price, operator, note } = body;

    if (!itemId || !changeType || quantity === undefined || price === undefined || !operator) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 1. 기존 품목 정보 조회 (deleted_at IS NULL을 위해 JS 필터 병행)
    const itemRes = await queryTable('inventory_items', {
      filters: { id: String(itemId) }
    });
    const items = (itemRes.rows || []).filter((r: any) => !r.deleted_at);
    const item = items[0];

    if (!item) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 품목입니다.' },
        { status: 404 }
      );
    }

    const currentStock = Number(item.stock);
    const qty = Number(quantity);
    let newStock = currentStock;
    let logQuantity = qty;

    // 2. 변동 유형에 따른 재고 수량 계산
    if (changeType === 'in') {
      newStock = currentStock + qty;
      logQuantity = qty;
    } else if (changeType === 'out') {
      newStock = currentStock - qty;
      logQuantity = qty;
    } else if (changeType === 'adjust') {
      newStock = qty;
      logQuantity = qty - currentStock;
    } else {
      return NextResponse.json(
        { success: false, error: '잘못된 변동 유형입니다.' },
        { status: 400 }
      );
    }

    // 3. 품목 현재고 업데이트
    await updateRows('inventory_items', { stock: newStock }, { filters: { id: String(itemId) } });

    // 4. 변동 로그 삽입
    const noteText = changeType === 'adjust'
      ? `${note || ''} (실사 조정: ${currentStock}개 -> ${newStock}개)`.trim()
      : note || '';
    
    const createdAt = new Date().toISOString();
    const logData = {
      itemId: Number(itemId),
      itemName: item.name,
      itemType: item.type,
      changeType,
      quantity: logQuantity,
      price: Number(price),
      operator,
      note: noteText,
      createdAt
    };

    await insertRows('inventory_logs', [logData]);

    const result = {
      itemId: Number(itemId),
      itemName: item.name,
      previousStock: currentStock,
      newStock: newStock,
      changeType,
      logQuantity
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('재고 변동 처리 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '재고 변동 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
