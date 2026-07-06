export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { queryTable } from '../../../../../egdesk-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inboundId = searchParams.get('inbound_id');

    if (inboundId) {
      // 1. 특정 입고 상세 항목들 조회
      const itemsRes = await queryTable('crm_inventory_inbound_items', {
        filters: { inbound_id: inboundId },
        orderBy: 'id',
        orderDirection: 'ASC'
      });
      const inboundItems = itemsRes.rows || [];

      // 2. 전체 마스터 품목 데이터 조회 (메모리 조인용)
      const masterRes = await queryTable('inventory_items', {});
      const masterItems = masterRes.rows || [];
      const masterMap = new Map<string, any>(masterItems.map((item: any) => [String(item.id), item]));

      // 3. 입고 마스터(거래처, 입고일자 등) 조회
      const inboundRes = await queryTable('crm_inventory_inbounds', { filters: { id: inboundId } });
      const inboundMaster = inboundRes.rows?.[0] || {};

      // 4. 14대 필수 필드로 결합한 풀 매핑 데이터 생성
      const enrichedData = inboundItems.map((item: any) => {
        const master = item.matched_item_id ? (masterMap.get(String(item.matched_item_id)) || {}) : {};
        return {
          id: item.id,
          inbound_id: item.inbound_id,
          // 14개 컬럼 매핑 데이터
          type: master.type || '자재',
          category: master.category || '기타',
          item_name: item.item_name,
          item_code: master.uuid || master.id || '-',
          barcode: item.barcode || master.barcode || '-',
          spec: item.spec || master.spec || '-',
          unit: master.unitType || 'EA',
          box_qty: master.boxContains || 1,
          quantity: item.quantity,
          price: item.price,
          partner_name: inboundMaster.partner_name || '-',
          inbound_date: inboundMaster.inbound_date || '-',
          location: master.location || '-',
          note: master.description || '-',
          pdf_file_path: inboundMaster.pdf_file_path || null
        };
      });

      return NextResponse.json({ success: true, data: enrichedData });
    } else {
      // 전체 자율 입고 내역 대장 조회
      const res = await queryTable('crm_inventory_inbounds', {
        orderBy: 'inbound_date',
        orderDirection: 'DESC',
        limit: 100
      });
      return NextResponse.json({ success: true, data: res.rows || [] });
    }
  } catch (error: any) {
    console.error('자율 입고 내역 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '입고 내역을 조회하지 못했습니다.' },
      { status: 500 }
    );
  }
}
