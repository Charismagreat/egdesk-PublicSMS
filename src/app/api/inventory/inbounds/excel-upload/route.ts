export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable } from '../../../../../../egdesk-helpers';
import { handleInventoryInbound } from '../../../easybot/ocr/confirm/services/inventory';

function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function verifyUserSession(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      const allOps = await queryTable('crm_operators', { filters: { role: 'SUPER_ADMIN' } });
      if (allOps.rows && allOps.rows.length > 0) {
        return allOps.rows[0].name || allOps.rows[0].username || '최고관리자';
      }
      return '최고관리자';
    }

    const payload = decodeJwt(token);
    return (payload.name || payload.username || '최고관리자') as string;
  } catch (err) {
    return '최고관리자';
  }
}

/**
 * POST: 파싱 가공된 엑셀 입고 데이터를 받아 자율 입고 및 재고 반영 실행
 */
export async function POST(req: Request) {
  try {
    const operator = await verifyUserSession();
    const body = await req.json();
    const { partner_name, inbound_date, items = [], file_url } = body;

    if (!inbound_date) {
      return NextResponse.json({ success: false, error: '입고 일자(inbound_date) 정보가 누락되었습니다.' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: '입고할 품목 목록(items)이 비어있습니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();

    // 1. 기존 재고 목록을 가져와서 엑셀 항목들과 지능형 품목 매칭 (바코드 ➡️ 품목코드 ➡️ 품명 순서로 고도화 대조)
    const existingItemsRes = await queryTable('inventory_items', {});
    const existingItems = existingItemsRes.rows || [];

    const mappedItems = items.map((item: any) => {
      const itemName = String(item.item_name || "").trim();
      const itemCode = String(item.item_code || "").trim();
      const barcode = String(item.barcode || "").trim();
      const spec = String(item.spec || "").trim();
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const unitType = String(item.unit_type || "개").trim();
      const boxContains = Number(item.box_contains) || 1;
      const itemType = String(item.item_type || "자재").trim();
      const category = String(item.category || "기타").trim();
      const location = String(item.location || "자율입고창고").trim();
      const note = String(item.note || "").trim();

      // 지능형 품목 매칭 3단계 가동
      let matched = null;
      if (barcode) {
        matched = existingItems.find((ei: any) => String(ei.barcode || "").trim() === barcode);
      }
      if (!matched && itemCode) {
        matched = existingItems.find((ei: any) => String(ei.barcode || "").trim() === itemCode);
      }
      if (!matched && itemName) {
        matched = existingItems.find((ei: any) => String(ei.name || "").trim() === itemName);
      }

      // 최종적으로 적용할 바코드 및 품명 매칭 결과 조합
      const finalBarcode = barcode || itemCode || (matched ? matched.barcode : "");

      return {
        barcode: finalBarcode,
        itemName: matched ? matched.name : itemName,
        spec: spec || (matched ? matched.spec : ""),
        quantity,
        price,
        unitType,
        boxContains,
        itemType,
        category,
        location,
        matchedItemId: matched ? String(matched.id) : "NEW",
        note: note // 비고 데이터도 파이프라인으로 전달
      };
    });

    // 2. 이지봇 OCR 승인용 공용 서비스를 호출하여 자율 입고 최종 반영
    const inboundResult = await handleInventoryInbound({
      partnerName: partner_name,
      inboundDate: inbound_date,
      pdfFilePath: file_url,
      items: mappedItems,
      operator: operator
    }, timestamp);

    return NextResponse.json({
      success: true,
      message: inboundResult.message || '엑셀 자율 입고 처리가 성공적으로 완료되었습니다.',
      inboundId: inboundResult.inboundId
    });

  } catch (error: any) {
    console.error("POST /api/inventory/inbounds/excel-upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
