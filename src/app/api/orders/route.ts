export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows, updateRows } from '../../../../egdesk-helpers';
import { triggerAutomation } from '@/lib/automation-trigger';
import { PointService } from '@/lib/point-service';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const result = await queryTable('crm_orders', {
      filters: { tenant_id: tenantId },
      orderBy: 'order_date',
      orderDirection: 'DESC'
    });
    // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제 (deleted_at이 있는 주문은 반환 안 함)
    const activeOrders = (result.rows || []).filter((order: any) => !order.deleted_at);
    return NextResponse.json({ success: true, orders: activeOrders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const data = await req.json();
    const { customerName, customerPhone, productName, quantity, totalPrice, deliveryMethod, shippingAddress, status, attachmentUrl, customerMemo } = data;
    const id = data.id || Date.now().toString();
    
    // 1. 주문 내역 (crm_orders) 생성
    await insertRows('crm_orders', [{
      id,
      tenant_id: tenantId,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: productName,
      quantity: quantity || '1',
      total_price: totalPrice || '',
      delivery_method: deliveryMethod || '택배배송',
      shipping_address: shippingAddress || '',
      tracking_number: '',
      attachment_url: attachmentUrl || '',
      customer_memo: customerMemo || '',
      order_date: data.orderDate || new Date().toISOString().split('T')[0],
      status: status || '결제대기'
    }]);

    // 2. 거래 내역 (crm_transactions) 자동 연동 생성
    await insertRows('crm_transactions', [{
      id: 'TX_' + id + '_' + Math.random().toString().slice(2, 6),
      tenant_id: tenantId,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: productName,
      amount: totalPrice || '',
      order_date: data.orderDate || new Date().toISOString().split('T')[0],
      status: status || '결제대기',
      order_id: id // 원천 주문 ID 기록
    }]);

    // 3. 배송 내역 (crm_deliveries) 자동 연동 생성 (택배배송인 경우에만 생성)
    if ((deliveryMethod || '택배배송') === '택배배송' && shippingAddress) {
      await insertRows('crm_deliveries', [{
        id: 'DL_' + id + '_' + Math.random().toString().slice(2, 6),
        customer_name: customerName,
        customer_phone: customerPhone,
        address: shippingAddress,
        courier: '대한통운',
        tracking_number: '',
        status: '상품준비중',
        order_id: id // 원천 주문 ID 기록
      }]);
    }

    // Trigger automation in the background
    triggerAutomation('order_created', { 
      id, 
      name: customerName, 
      phone: customerPhone,
      상품명: productName,
      수량: quantity || '1',
      결제금액: totalPrice || '',
      주문일시: data.orderDate || new Date().toISOString().split('T')[0]
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const { ids, updates } = data; // ids: string[], updates: { status?: string, tracking_number?: string }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '선택된 주문이 없습니다.' }, { status: 400 });
    }

    for (const id of ids) {
      const orderRes = await queryTable('crm_orders', { filters: { id } });
      const order = orderRes.rows?.[0];

      if (order) {
        await updateRows('crm_orders', updates, { filters: { id } });

        // Automation Hooks based on new status
        if (updates.status === '결제완료' && order.status !== '결제완료') {
          triggerAutomation('payment_completed', {
            id, name: order.customer_name, phone: order.customer_phone, 결제금액: order.total_price
          });
          // Also insert to crm_payments
          await insertRows('crm_payments', [{
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            customer_name: order.customer_name,
            payment_method: '카드결제',
            amount: order.total_price || '0',
            payment_date: new Date().toISOString().split('T')[0],
            status: '결제완료',
            order_id: id // 원천 주문 ID 기록
          }]);

          // 포인트 자동 적립 연동 (설정된 적립률 적용)
          if (order.customer_phone && order.total_price) {
            try {
              const amt = Number(order.total_price);
              
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
                  order.customer_phone,
                  earnedPoints,
                  id,
                  '주문 완료 자동 적립'
                );
              }
            } catch (pointErr: any) {
              console.error('주문 결제완료 포인트 적립 실패:', pointErr.message);
            }
          }
        }

        if ((updates.status === '배송중' || updates.status === '배송시작') && order.status !== updates.status) {
          triggerAutomation('delivery_started', {
            id, name: order.customer_name, phone: order.customer_phone,
            운송장번호: updates.tracking_number || order.tracking_number || ''
          });
          // Also insert to crm_deliveries
          await insertRows('crm_deliveries', [{
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            address: order.shipping_address || '',
            courier: '기본택배',
            tracking_number: updates.tracking_number || order.tracking_number || '',
            status: updates.status,
            order_id: id // 원천 주문 ID 기록
          }]);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    await deleteRows('crm_orders', { filters: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
