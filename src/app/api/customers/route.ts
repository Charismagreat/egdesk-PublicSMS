export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/../egdesk-helpers';
import { triggerAutomation } from '@/lib/automation-trigger';
import { getTenantId } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 1000;

    // 테넌트 격리
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const response = await queryTable('crm_customers', {
      filters: { tenant_id: tenantId },
      limit,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제 (deleted_at이 있는 고객은 반환 안 함)
    const activeCustomers = (response.rows || []).filter((customer: any) => !customer.deleted_at);
    return NextResponse.json({ success: true, data: { ...response, rows: activeCustomers } });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 테넌트 격리
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 1. 다중 고객 일괄 등록(배치) 처리
    const customersArray = Array.isArray(body) ? body : (Array.isArray(body.customers) ? body.customers : null);
    if (customersArray && customersArray.length > 0) {
      const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      const rowsToInsert = customersArray
        .filter((c: any) => c.name && c.phone)
        .map((c: any) => ({
          id: Math.floor(Math.random() * 10000000) + Date.now() % 100000,
          name: c.name,
          phone: c.phone,
          email: c.email || '',
          tags: c.tags || '',
          memo: c.memo || '',
          address: c.address || '',
          shipping_address: c.shipping_address || '',
          recipient_name: c.recipient_name || '',
          recipient_phone: c.recipient_phone || '',
          point_balance: Number(c.points) || 0,
          created_at: now,
          tenant_id: tenantId
        }));

      if (rowsToInsert.length === 0) {
        return NextResponse.json({ success: false, error: '유효한 고객 데이터(고객명, 연락처)가 없습니다.' }, { status: 400 });
      }

      await insertRows('crm_customers', rowsToInsert);
      return NextResponse.json({ success: true, addedCount: rowsToInsert.length });
    }

    // 2. 단일 고객 등록 처리
    const { name, phone, email, tags, memo, address, shipping_address, recipient_name, recipient_phone, points } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone are required' }, { status: 400 });
    }

    const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const id = Math.floor(Math.random() * 1000000);

    await insertRows('crm_customers', [
      {
        id, name, phone, email: email || '', tags: tags || '', memo: memo || '', address: address || '',
        shipping_address: shipping_address || '',
        recipient_name: recipient_name || '',
        recipient_phone: recipient_phone || '',
        point_balance: Number(points) || 0,
        created_at: now,
        tenant_id: tenantId
      }
    ]);

    // Trigger automation in the background
    triggerAutomation('customer_registered', { id, name, phone });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error adding customer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
