export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable } from '@/../egdesk-helpers';

// GET /api/customers/history?phone=...
// 특정 고객의 종합 이력(주문, 거래, 배송 내역)을 한 번에 조회합니다.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ success: false, error: '연락처(phone)는 필수 파라미터입니다.' }, { status: 400 });
    }

    console.log(`[API] 고객 이력 통합 조회 시작 - 연락처: ${phone}`);

    // 병렬로 주문 내역, 거래 내역, 배송 내역을 조회합니다.
    const [ordersRes, transactionsRes, deliveriesRes] = await Promise.all([
      queryTable('crm_orders', {
        filters: { customer_phone: phone },
        orderBy: 'order_date',
        orderDirection: 'DESC'
      }).catch(err => {
        console.error('주문 내역 조회 에러:', err);
        return { rows: [] };
      }),
      queryTable('crm_transactions', {
        filters: { customer_phone: phone },
        orderBy: 'order_date',
        orderDirection: 'DESC'
      }).catch(err => {
        console.error('거래 내역 조회 에러:', err);
        return { rows: [] };
      }),
      queryTable('crm_deliveries', {
        filters: { customer_phone: phone },
        orderBy: 'id',
        orderDirection: 'DESC'
      }).catch(err => {
        console.error('배송 내역 조회 에러:', err);
        return { rows: [] };
      })
    ]);

    const orders = ordersRes.rows || [];
    const transactions = transactionsRes.rows || [];
    const deliveries = deliveriesRes.rows || [];

    // 주문 요약 통계 계산
    const stats = {
      totalOrders: orders.length,
      // 주문 목록 중에서 status가 '주문취소'나 '취소완료', '취소'인 건 필터링
      cancelledOrders: orders.filter((o: any) => 
        o.status === '주문취소' || o.status === '취소완료' || o.status === '취소'
      ).length,
      // 반품 건 필터링
      returnedOrders: orders.filter((o: any) => 
        o.status === '반품신청' || o.status === '반품완료' || o.status === '반품'
      ).length,
      // 누적 총 거래액 (total_price 파싱 후 합산)
      totalAmount: transactions
        .filter((t: any) => t.status === '결제완료' || t.status === '배송완료')
        .reduce((sum: number, t: any) => {
          const val = Number(String(t.amount || '0').replace(/[^0-9]/g, ''));
          return sum + (isNaN(val) ? 0 : val);
        }, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        orders,
        transactions,
        deliveries,
        stats
      }
    });
  } catch (error: any) {
    console.error('고객 통합 이력 조회 중 서버 에러 발생:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
