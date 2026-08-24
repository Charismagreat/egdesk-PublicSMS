import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { insertRows, queryTable, updateRows, executeSQL } from '@/lib/egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function POST(req: Request) {
  try {
    const tenantId = (await getTenantId()) || 'default';
    const body = await req.json().catch(() => ({}));
    const { transactions = [], bankId = 'shinhan', accountId = '' } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: '등록할 은행 거래 내역 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 기존 계좌 확인 또는 기본 계좌 생성
    const accountsRes = await queryTable('excel_accounts', { filters: { tenant_id: tenantId } });
    const accounts = Array.isArray(accountsRes?.rows) ? accountsRes.rows : [];
    let targetAccount = accounts.find((acc: any) => acc.id === accountId);

    if (!targetAccount) {
      targetAccount = accounts.find((acc: any) => acc.bank_id === bankId) || accounts[0];
    }

    const targetAccountId = targetAccount?.id || `ACC-SHEETS-${bankId.toUpperCase()}`;
    const accountNumber = targetAccount?.account_number || `SHEETS-IMPORT-${bankId.toUpperCase()}`;

    if (!targetAccount) {
      await insertRows('excel_accounts', [{
        id: targetAccountId,
        bank_id: bankId,
        bank_name: `${bankId.toUpperCase()} 은행 (시트연동)`,
        account_number: accountNumber,
        account_name: '구글 시트 연동 계좌',
        balance: 0,
        currency: 'KRW',
        tenant_id: tenantId,
        created_at: now,
        updated_at: now,
        deleted_at: null
      }]);
    }

    // 기존 트랜잭션 조회하여 중복 방지
    const existingTxRes = await queryTable('excel_bank_transactions', {
      filters: { account_id: targetAccountId }
    });
    const existingTxIds = new Set((existingTxRes?.rows || []).map((t: any) => t.id));

    const rowsToInsert: any[] = [];

    for (const tx of transactions) {
      const txDate = tx.transaction_date || tx.date || now.split(' ')[0];
      const txTime = tx.transaction_time || tx.time || '00:00:00';
      const deposit = Number(tx.deposit) || 0;
      const withdrawal = Number(tx.withdrawal) || 0;
      const balance = Number(tx.balance) || 0;
      const description = tx.description || tx.memo || '구글시트 거래내역';
      const branch = tx.branch || '';

      const hashSeed = `${accountNumber}_${txDate}_${txTime}_${deposit}_${withdrawal}_${balance}_${description}`;
      const uniqueId = crypto.createHash('md5').update(hashSeed).digest('hex');

      if (!existingTxIds.has(uniqueId)) {
        rowsToInsert.push({
          id: uniqueId,
          account_id: targetAccountId,
          bank_id: bankId,
          transaction_date: txDate,
          transaction_time: txTime,
          account_number: accountNumber,
          deposit,
          withdrawal,
          balance,
          branch,
          description,
          memo: tx.memo || '',
          category: tx.category || '',
          tenant_id: tenantId,
          created_at: now,
          updated_at: now,
          deleted_at: null
        });
        existingTxIds.add(uniqueId);
      }
    }

    if (rowsToInsert.length > 0) {
      await insertRows('excel_bank_transactions', rowsToInsert);
    }

    // 최신 잔액 동기화
    try {
      const latestTxRes = await executeSQL(`
        SELECT balance FROM excel_bank_transactions 
        WHERE account_id = '${targetAccountId}' AND deleted_at IS NULL
        ORDER BY transaction_date DESC, transaction_time DESC, id DESC 
        LIMIT 1
      `);
      const latestTx = latestTxRes.rows?.[0];
      if (latestTx && latestTx.balance !== undefined) {
        await updateRows('excel_accounts', {
          balance: latestTx.balance,
          updated_at: now
        }, {
          filters: { id: targetAccountId }
        });
      }
    } catch (e: any) {
      console.warn('Bank balance sync warn:', e.message);
    }

    return NextResponse.json({
      success: true,
      insertedCount: rowsToInsert.length,
      totalParsed: transactions.length
    });
  } catch (error: any) {
    console.error('Bank sheets bulk insert error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '은행 거래 내역 일괄 등록 중 오류 발생' },
      { status: 500 }
    );
  }
}
