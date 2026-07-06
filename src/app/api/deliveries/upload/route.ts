import { NextResponse } from 'next/server';
import { insertRows } from '@/../egdesk-helpers';
import { triggerAutomation } from '@/lib/automation-trigger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { deliveries } = await request.json();

    if (!deliveries || !Array.isArray(deliveries)) {
      return NextResponse.json(
        { success: false, error: '유효한 배송 데이터 배열이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    let insertedCount = 0;
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    for (const d of deliveries) {
      const customerName = d.customerName?.trim();
      const customerPhone = d.customerPhone?.trim();
      const address = d.address?.trim();

      // 필수값 부재 시 패스
      if (!customerName || !customerPhone || !address) continue;

      const id = d.id || `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const courier = d.courier?.trim() || '대한통운';
      const trackingNumber = d.trackingNumber?.trim() || '';
      const status = d.status?.trim() || '상품준비중';

      const deliveryRow = {
        id,
        customer_name: customerName,
        customer_phone: customerPhone,
        address,
        courier,
        tracking_number: trackingNumber,
        status,
        created_at: now
      };

      try {
        await insertRows('crm_deliveries', [deliveryRow]);
        insertedCount++;

        // 백그라운드 자동화 트리거 작동
        triggerAutomation('delivery_started', {
          id,
          name: customerName,
          phone: customerPhone,
          배송지: address,
          택배사: courier,
          송장번호: trackingNumber
        });
      } catch (insertErr) {
        console.error(`배송 데이터 [${customerName}] 등록 에러:`, insertErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      totalReceived: deliveries.length
    });

  } catch (error: any) {
    console.error('배송 엑셀 일괄 등록 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message || '배송 데이터를 등록하는 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
