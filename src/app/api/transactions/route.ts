export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

// GET /api/transactions : 거래 내역 목록 조회
export async function GET(req: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    
    // 전화번호 파라미터가 있으면 해당 고객의 최근 거래내역 1건만 조회 (2번 방식용)
    if (phone) {
      const result = await queryTable('crm_transactions', {
        filters: { tenant_id: tenantId, customer_phone: phone },
        orderBy: 'order_date',
        orderDirection: 'DESC',
        limit: 1
      });
      // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제
      const activeRows = (result.rows || []).filter((r: any) => !r.deleted_at);
      const transaction = activeRows[0] ? {
        id: activeRows[0].id,
        customerName: activeRows[0].customer_name,
        customerPhone: activeRows[0].customer_phone,
        productName: activeRows[0].product_name,
        amount: activeRows[0].amount,
        orderDate: activeRows[0].order_date,
        status: activeRows[0].status,
        orderId: activeRows[0].order_id
      } : null;
      return NextResponse.json({ success: true, transaction });
    }

    // 기본 전체 리스트 조회 (3번 방식용)
    const result = await queryTable('crm_transactions', {
      filters: { tenant_id: tenantId },
      orderBy: 'order_date',
      orderDirection: 'DESC'
    });
    
    // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제 (deleted_at이 있는 거래는 반환 안 함)
    const activeTransactions = (result.rows || []).filter((r: any) => !r.deleted_at);
    
    const transactions = activeTransactions.map((r: any) => ({
      id: r.id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      productName: r.product_name,
      amount: r.amount,
      orderDate: r.order_date,
      status: r.status,
      orderId: r.order_id
    }));

    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/transactions : 새 거래 내역 등록
export async function POST(req: Request) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id, customerName, customerPhone, productName, amount, orderDate, status } = await req.json();

    if (!customerName || !customerPhone || !productName) {
      return NextResponse.json({ success: false, error: 'Name, phone, and product name are required' }, { status: 400 });
    }

    const newId = id || Date.now().toString();

    await insertRows('crm_transactions', [{
      id: newId,
      tenant_id: tenantId,
      customer_name: customerName,
      customer_phone: customerPhone,
      product_name: productName,
      amount: amount || '',
      order_date: orderDate || new Date().toISOString().split('T')[0],
      status: status || '결제완료'
    }]);

    return NextResponse.json({ success: true, id: newId });
  } catch (error: any) {
    console.error('Failed to create transaction:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/transactions : 거래 내역 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await deleteRows('crm_transactions', { filters: { id: id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
