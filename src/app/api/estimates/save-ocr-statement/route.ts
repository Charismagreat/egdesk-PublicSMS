export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { insertRows, queryTable } from '../../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { recordOcrCorrection } from '@/lib/ocr-fewshot-service';

async function resolveTenantId(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return 'default';
  try {
    const payload = decodeJwt(token);
    return (payload.tenant_id as string) || 'default';
  } catch {
    return 'default';
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await resolveTenantId();
    const body = await req.json();

    const {
      partner_name,
      partner_phone = '',
      partner_manager = '',
      business_number = '',
      representative = '',
      address = '',
      document_number = '',
      document_date = '',
      document_memo = '',
      total_amount = 0,
      items = [],
      file_url = '',
      raw_ocr_data = null
    } = body;

    if (!partner_name) {
      return NextResponse.json({ success: false, error: '공급사 상호명이 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const statementId = `STM-${Date.now()}`;
    const uuid = `STM-UUID-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 1. 거래명세서 마스터 등록 (crm_estimates 활용 INBOUND/STATEMENT)
    await insertRows('crm_estimates', [{
      id: statementId,
      uuid,
      type: 'INBOUND',
      direction_status: 'STATEMENT_RECEIVED',
      partner_name,
      partner_phone,
      partner_manager,
      total_amount: Number(total_amount) || items.reduce((acc: number, cur: any) => acc + (Number(cur.quantity || 1) * Number(cur.unit_price || 0)), 0),
      file_url: file_url || '',
      ai_parsed: 1,
      created_at: nowStr,
      tenant_id: tenantId,
      _version: 1
    }]);

    // 2. 거래명세서 상세 품목 등록
    if (items.length > 0) {
      const detailRows = items.map((item: any, idx: number) => ({
        id: `STM-ITEM-${Date.now()}-${idx}`,
        estimate_id: statementId,
        product_name: item.product_name || item.itemName || '품목',
        item_code: item.item_code || item.itemCode || '',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        amount: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
        delivery_date: item.delivery_date || '',
        spec: item.spec || '',
        tenant_id: tenantId,
        created_at: nowStr
      }));

      await insertRows('crm_estimate_items', detailRows);
    }

    // 3. 🤖 Few-shot 자율 교정 피드백 적재
    if (raw_ocr_data) {
      try {
        await recordOcrCorrection({
          tenantId,
          documentType: 'statement',
          partnerName: partner_name,
          businessNumber: business_number,
          rawData: raw_ocr_data,
          correctedData: {
            partner_name,
            partner_phone,
            partner_manager,
            business_number,
            representative,
            address,
            document_number,
            document_date,
            document_memo,
            items
          },
          operatorName: '운영자'
        });
      } catch (fdbErr: any) {
        console.warn('Few-shot 피드백 저장 실패(무시됨):', fdbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: '거래명세서가 대장에 성공적으로 등록되었습니다.',
      statementId
    });
  } catch (error: any) {
    console.error('save-ocr-statement API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
