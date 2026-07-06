export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable } from '../../../../../egdesk-helpers';

// GET /api/orders/detail?id=...
// 주문번호 또는 예약 ID로 상세 내역 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID 파라미터가 필요합니다.' }, { status: 400 });
    }

    // 1. 먼저 주문 테이블 (crm_orders) 에서 조회 시도
    const orderRes = await queryTable('crm_orders', {
      filters: { id: id }
    });

    if (orderRes.rows && orderRes.rows.length > 0) {
      const order = orderRes.rows[0];
      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          type: 'order',
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          productName: order.product_name,
          quantity: order.quantity || '1',
          totalPrice: order.total_price || '0',
          deliveryMethod: order.delivery_method || '택배배송',
          shippingAddress: order.shipping_address || '',
          trackingNumber: order.tracking_number || '',
          customerMemo: order.customer_memo || '',
          orderDate: order.order_date,
          status: order.status
        }
      });
    }

    // 2. 주문 테이블에 없으면 예약 테이블 (crm_reservations) 에서 조회 시도
    const reservationRes = await queryTable('crm_reservations', {
      filters: { id: id }
    });

    if (reservationRes.rows && reservationRes.rows.length > 0) {
      const resv = reservationRes.rows[0];
      return NextResponse.json({
        success: true,
        order: {
          id: resv.id,
          type: 'reservation',
          customerName: resv.customer_name,
          customerPhone: resv.customer_phone,
          productName: resv.service_name,
          quantity: '1',
          totalPrice: '(예약 접수됨)',
          deliveryMethod: '온라인예약',
          shippingAddress: `예약 일시: ${resv.reservation_date} ${resv.reservation_time}`,
          trackingNumber: '',
          customerMemo: '예약 현황 관리',
          orderDate: resv.reservation_date,
          status: resv.status
        }
      });
    }

    // 3. 둘 다 없는 경우
    return NextResponse.json({ success: false, error: '해당 ID의 주문 또는 예약 내역을 찾을 수 없습니다.' }, { status: 444 });

  } catch (error: any) {
    console.error('주문 상세 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
