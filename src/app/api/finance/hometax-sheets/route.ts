import { NextResponse } from 'next/server';
import { insertRows } from '../../../../egdesk-helpers';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { invoices = [] } = body;

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: '등록할 홈택스 세금계산서 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const rowsToInsert = invoices.map((inv: any) => ({
      issue_date: inv.issue_date || '',
      approval_no: inv.approval_no || '',
      type: inv.type || 'PURCHASE', // PURCHASE (매입) | SALES (매출)
      invoice_kind: inv.invoice_kind || 'TAX_INVOICE',
      supplier_corp_num: inv.supplier_corp_num || '',
      supplier_corp_name: inv.supplier_corp_name || '',
      supplier_ceo_name: inv.supplier_ceo_name || '',
      buyer_corp_num: inv.buyer_corp_num || '',
      buyer_corp_name: inv.buyer_corp_name || '',
      buyer_ceo_name: inv.buyer_ceo_name || '',
      supply_amount: Number(inv.supply_amount) || 0,
      tax_amount: Number(inv.tax_amount) || 0,
      total_amount: Number(inv.total_amount) || 0,
      item_name: inv.item_name || '',
      remark: inv.remark || '',
      status: 'CONFIRMED',
      created_at: now,
      updated_at: now,
      deleted_at: null
    }));

    const result = await insertRows('tax_invoices', rowsToInsert);

    return NextResponse.json({
      success: true,
      insertedCount: rowsToInsert.length,
      result
    });
  } catch (error: any) {
    console.error('Hometax sheets bulk insert error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '홈택스 세금계산서 일괄 등록 중 오류 발생' },
      { status: 500 }
    );
  }
}
