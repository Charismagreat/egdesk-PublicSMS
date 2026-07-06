export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../egdesk-helpers';
import { triggerAutomation } from '@/lib/automation-trigger';

export async function GET() {
  try {
    const result = await queryTable('crm_deliveries', {
      orderBy: 'id',
      orderDirection: 'DESC'
    });
    // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제 (deleted_at이 있는 배송 정보는 반환 안 함)
    const activeDeliveries = (result.rows || []).filter((delivery: any) => !delivery.deleted_at);
    return NextResponse.json({ success: true, deliveries: activeDeliveries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const id = data.id || Date.now().toString();
    await insertRows('crm_deliveries', [{
      id,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      address: data.address,
      courier: data.courier || '대한통운',
      tracking_number: data.trackingNumber || '',
      status: data.status || '상품준비중'
    }]);

    // Trigger automation in the background
    triggerAutomation('delivery_started', { 
      id, 
      name: data.customerName, 
      phone: data.customerPhone,
      배송지: data.address,
      택배사: data.courier || '대한통운',
      송장번호: data.trackingNumber || ''
    });

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
    await deleteRows('crm_deliveries', { filters: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
