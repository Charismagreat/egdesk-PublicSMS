import { NextResponse } from 'next/server';
import { insertRows } from '@/../egdesk-helpers';
import { triggerAutomation } from '@/lib/automation-trigger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { reservations } = await request.json();

    if (!reservations || !Array.isArray(reservations)) {
      return NextResponse.json(
        { success: false, error: '유효한 예약 데이터 배열이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    let insertedCount = 0;
    const now = new Date().toISOString().split('T')[0];

    for (const r of reservations) {
      const customerName = r.customerName?.trim();
      const customerPhone = r.customerPhone?.trim();
      const serviceName = r.serviceName?.trim();

      // 필수값 부재 시 패스
      if (!customerName || !customerPhone || !serviceName) continue;

      const id = r.id || `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const reservationDate = r.reservationDate?.trim() || now;
      const reservationTime = r.reservationTime?.trim() || '12:00';
      const status = r.status?.trim() || '예약확정';
      const amount = r.amount ? String(r.amount).trim() : '';

      const reservationRow = {
        id,
        customer_name: customerName,
        customer_phone: customerPhone,
        service_name: serviceName,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        status
      };

      try {
        // 1. 예약 내역 생성
        await insertRows('crm_reservations', [reservationRow]);

        // 2. 거래 내역 연동 자동 생성
        await insertRows('crm_transactions', [{
          id: 'TX_' + id + '_' + Math.random().toString().slice(2, 6),
          customer_name: customerName,
          customer_phone: customerPhone,
          product_name: `[예약] ${serviceName}`,
          amount: amount,
          order_date: reservationDate,
          status: '결제대기',
          order_id: id
        }]);

        insertedCount++;

        // 3. 자동화 알림 발송 트리거
        triggerAutomation('reservation_created', {
          id,
          name: customerName,
          phone: customerPhone,
          서비스명: serviceName,
          예약일시: `${reservationDate} ${reservationTime}`
        });
      } catch (insertErr) {
        console.error(`예약 [${customerName}] 일괄 등록 에러:`, insertErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      totalReceived: reservations.length
    });

  } catch (error: any) {
    console.error('예약 엑셀 일괄 등록 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message || '예약을 일괄 등록하는 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
