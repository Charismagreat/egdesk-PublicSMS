export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../egdesk-helpers';
import { triggerAutomation } from '@/lib/automation-trigger';
import { PointService } from '@/lib/point-service';

export async function GET() {
  try {
    const result = await queryTable('crm_payments', {
      orderBy: 'payment_date',
      orderDirection: 'DESC'
    });
    // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제 (deleted_at이 있는 결제는 반환 안 함)
    const activePayments = (result.rows || []).filter((payment: any) => !payment.deleted_at);
    return NextResponse.json({ success: true, payments: activePayments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const id = data.id || Date.now().toString();
    await insertRows('crm_payments', [{
      id,
      customer_name: data.customerName,
      payment_method: data.paymentMethod || '카드결제',
      amount: data.amount,
      payment_date: data.paymentDate || new Date().toISOString().split('T')[0],
      status: data.status || '결제완료',
      order_id: data.orderId || ''
    }]);
    
    // Trigger automation in the background
    triggerAutomation('payment_completed', { 
      id, 
      name: data.customerName, 
      phone: data.customerPhone, // Assuming frontend passes phone
      결제수단: data.paymentMethod || '카드결제',
      결제금액: data.amount,
      결제일시: data.paymentDate || new Date().toISOString().split('T')[0]
    });

    // 포인트 자동 적립 연동 (설정된 적립률 적용)
    if (data.customerPhone && data.amount) {
      try {
        const amt = Number(data.amount);
        
        // system_settings에서 point_earning_rate 조회
        const rateRes = await queryTable('system_settings', { filters: { key: 'point_earning_rate' } });
        let rate = 1; // 기본값 1%
        if (rateRes.rows && rateRes.rows.length > 0) {
          const val = Number(rateRes.rows[0].value);
          if (!isNaN(val)) rate = val;
        }

        const earnedPoints = Math.floor(amt * (rate / 100));
        if (earnedPoints > 0) {
          await PointService.earnPoints(
            data.customerPhone, 
            earnedPoints, 
            data.orderId || id, 
            '결제 완료 자동 적립'
          );
        }
      } catch (pointErr: any) {
        console.error('결제 포인트 적립 처리 실패:', pointErr.message);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    await deleteRows('crm_payments', { filters: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
