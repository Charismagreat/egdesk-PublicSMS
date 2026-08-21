import { NextResponse } from 'next/server';
import { insertRows, queryTable } from '../../../../../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { items = [] } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '등록할 품목 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const rowsToInsert = items.map((it: any) => ({
      name: it.item_name || '',
      item_code: it.item_code || '',
      barcode: it.barcode || it.item_code || '',
      category: it.category || '일반품목',
      spec: it.spec || '',
      unit: it.unit || 'EA',
      box_quantity: Number(it.box_quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      type: it.type || '원자재',
      current_stock: 0,
      safety_stock: 10,
      created_at: now,
      updated_at: now,
      deleted_at: null
    }));

    const result = await insertRows('inventory_items', rowsToInsert);

    return NextResponse.json({
      success: true,
      insertedCount: rowsToInsert.length,
      result
    });
  } catch (error: any) {
    console.error('Inventory items bulk insert error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '품목 일괄 등록 중 오류 발생' },
      { status: 500 }
    );
  }
}
