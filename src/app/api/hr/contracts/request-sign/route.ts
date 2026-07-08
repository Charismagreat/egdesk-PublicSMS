export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../../egdesk-helpers';

/**
 * POST: 특정 직원에 대해 근로 계약 기안(PENDING) 및 모바일 서명 SMS 발송 예약
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '근로 계약 서명 요청 권한이 없습니다.' }, { status: 403 });
    }

    const {
      operator_id,
      hourly_wage,
      weekly_hours,
      allow_weekly_holiday_paid,
      work_days,
      contract_memo,
      start_date,
      end_date,
      work_place,
      job_description,
      contract_type,
      paper_contract_file
    } = await req.json();

    if (!operator_id) {
      return NextResponse.json({ success: false, error: '직원 ID가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 해당 사원의 연락처 조회
    const opRes = await queryTable('crm_operators', { filters: { id: String(operator_id) } });
    if (!opRes.rows || opRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 직원입니다.' }, { status: 404 });
    }
    const targetOperator = opRes.rows[0];
    const phone = targetOperator.phone ? String(targetOperator.phone).trim() : '';

    if (!phone) {
      return NextResponse.json({ 
        success: false, 
        error: '해당 직원의 연락처(휴대폰 번호)가 등록되어 있지 않아 서명 요청 문자를 보낼 수 없습니다. 직원 정보 수정에서 연락처를 먼저 추가해주세요.' 
      }, { status: 400 });
    }

    const nowStr = new Date().toISOString();
    
    // 2. 근로계약 상태를 PENDING으로 세팅하여 적재 (또는 갱신)
    const contractData = {
      operator_id: String(operator_id),
      hourly_wage: parseFloat(hourly_wage || 10000),
      weekly_hours: parseFloat(weekly_hours || 40),
      allow_weekly_holiday_paid: parseInt(allow_weekly_holiday_paid !== undefined ? allow_weekly_holiday_paid : 1),
      work_days: work_days || '',
      contract_memo: contract_memo || '',
      start_date: start_date || '',
      end_date: end_date || '',
      work_place: work_place || '',
      job_description: job_description || '',
      contract_type: contract_type || 'STANDARD_LIMITED',
      paper_contract_file: paper_contract_file || null,
      status: 'PENDING',
      signature_image: null,
      signed_at: null,
      updated_at: nowStr,
      updated_by: 'SUPER_ADMIN'
    };

    await insertRows('crm_operator_contract_settings', [contractData]);

    // 3. SMS 발송 대기열 예약 적재
    const signUrl = `http://localhost:4000/m/contract-sign?id=${operator_id}`;
    const smsContent = `[EGDesk] ${targetOperator.name}님, 근로계약서 작성이 기안되었습니다. 아래 링크에 접속하여 계약 조항을 확인하신 후 모바일 서명을 마쳐주세요.\n▶ 서명 링크: ${signUrl}`;
    
    await insertRows('message_logs', [{
      id: `MSG-SIGN-${Date.now()}`,
      sender: '02-1234-5678',
      receiver: phone,
      content: smsContent,
      status: 'PENDING',
      created_at: nowStr
    }]);

    return NextResponse.json({
      success: true,
      message: '근로계약서 기안이 완료되었으며, 서명 요청 문자가 정상 예약되었습니다.',
      contract: contractData
    });

  } catch (error: any) {
    console.error('Contracts Request Sign API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
