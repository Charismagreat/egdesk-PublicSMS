import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { insertRows, queryTable } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function POST(req: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await req.json().catch(() => ({}));
    const { transactions = [], cardCompanyId = 'shinhan-card', accountId = 'CARD-IMPORT' } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: '등록할 신용카드 승인 내역 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 기존 트랜잭션 조회하여 중복 방지
    const existingTxRes = await queryTable('excel_card_transactions', { filters: { tenant_id: tenantId } });
    const existingTxIds = new Set((existingTxRes?.rows || []).map((t: any) => t.id));

    const rowsToInsert: any[] = [];

    for (const tx of transactions) {
      const approvalDate = tx.approval_date || tx.date || now.split(' ')[0];
      const approvalTime = tx.approval_time || tx.time || '00:00:00';
      const cardNumber = tx.card_number || '0000';
      const cardholderName = tx.cardholder_name || '';
      const usageType = tx.usage_type || '일시불';
      const salesType = tx.sales_type || '일반매출';
      const approvalNumber = tx.approval_number || `AP-${Math.floor(100000 + Math.random() * 900000)}`;
      const merchantName = tx.merchant_name || tx.merchant || '가맹점';
      const amount = Number(tx.amount) || 0;
      const status = tx.status || '승인';
      const memo = tx.memo || '';
      const category = tx.category || '';

      const hashSeed = `${cardNumber}_${approvalDate}_${approvalTime}_${approvalNumber}_${amount}_${merchantName}`;
      const uniqueId = crypto.createHash('md5').update(hashSeed).digest('hex');

      if (!existingTxIds.has(uniqueId)) {
        rowsToInsert.push({
          id: uniqueId,
          account_id: accountId,
          card_company_id: cardCompanyId,
          card_number: cardNumber,
          cardholder_name: cardholderName,
          usage_type: usageType,
          sales_type: salesType,
          approval_date: approvalDate,
          time: approvalTime,
          approval_number: approvalNumber,
          merchant_name: merchantName,
          amount: amount,
          status: status,
          memo: memo,
          category: category,
          tenant_id: tenantId,
          created_at: now,
          updated_at: now,
          deleted_at: null
        });
        existingTxIds.add(uniqueId);
      }
    }

    if (rowsToInsert.length > 0) {
      await insertRows('excel_card_transactions', rowsToInsert);
    }

    return NextResponse.json({
      success: true,
      insertedCount: rowsToInsert.length,
      totalParsed: transactions.length
    });
  } catch (error: any) {
    console.error('Card sheets bulk insert error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '신용카드 승인 내역 일괄 등록 중 오류 발생' },
      { status: 500 }
    );
  }
}
