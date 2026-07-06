export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, updateRows } from '@/../egdesk-helpers';

async function getRoleFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'SUB_OPERATOR';
    const payload = decodeJwt(token);
    return payload.role as string || 'SUB_OPERATOR';
  } catch (e) {
    return 'SUB_OPERATOR';
  }
}

export async function POST(request: Request) {
  try {
    // 1. 보안 권한 가드
    const role = await getRoleFromToken();
    if (role !== 'PRESIDENT' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: '⚠️ 권한 차단: 지출 결재 승인/반려/보류는 대표자(PRESIDENT) 및 최고관리자(SUPER_ADMIN) 권한으로만 가능합니다.' },
        { status: 403 }
      );
    }

    // 2. 바디 데이터 추출
    const { id, status, memo } = await request.json();
    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: '필수 인자(id, status)가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 3. 기존 지출 정보 조회 (비즈니스 룰 강제 적용 목적)
    const expenseRes = await queryTable('crm_expenses', { filters: { id: id } });
    const expense = expenseRes.rows?.[0];
    if (!expense) {
      return NextResponse.json({ success: false, error: '존재하지 않는 지출 내역입니다.' }, { status: 404 });
    }

    const isTransferOrCash = ['계좌송금', '계좌이체', '현금'].includes(expense.payment_method);
    
    let actualExpenseDate = expense.actual_expense_date;
    let deductionAmount = Number(expense.deduction_amount) || 0;
    let transferFee = Number(expense.transfer_fee) || 0;

    // 결재 일시 KST 연산 및 비즈니스 룰 분기 강제 적용
    let approvedAt = null;
    if (status === 'APPROVED') {
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      approvedAt = kstNow.toISOString().replace('T', ' ').slice(0, 19);

      if (isTransferOrCash) {
        // 계좌송금, 현금 수단인 경우 승인 시 실제 지출일이 비어있으면 오늘 날짜로 자동 기입 보정
        if (!actualExpenseDate) {
          actualExpenseDate = kstNow.toISOString().slice(0, 10);
        }
      } else {
        // 그외 수단인 경우 지출일은 품의일, 공제액 0, 수수료 0 으로 강제
        actualExpenseDate = expense.expense_date;
        deductionAmount = 0;
        transferFee = 0;
      }
    } else {
      // 반려/보류 처리 시에는 리셋 강제
      actualExpenseDate = null;
      deductionAmount = 0;
      transferFee = 0;
    }

    // 4. DB 업데이트
    await updateRows('crm_expenses', {
      approval_status: status,
      approval_memo: memo || '',
      approved_at: approvedAt,
      actual_expense_date: actualExpenseDate,
      deduction_amount: deductionAmount,
      transfer_fee: transferFee
    }, {
      filters: { id: id }
    });

    console.log(`[결재 승인 API] 지출 ID: ${id} ➡ 상태: ${status} 업데이트 성공! (처리일자: ${approvedAt})`);

    return NextResponse.json({
      success: true,
      message: '결재 정보가 정상적으로 처리되었습니다.',
      updated: { id, approval_status: status, approved_at: approvedAt }
    });

  } catch (err: any) {
    console.error('API expenses approve error:', err);
    return NextResponse.json(
      { success: false, error: err.message || '결재 서버 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
