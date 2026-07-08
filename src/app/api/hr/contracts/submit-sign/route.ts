export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../../egdesk-helpers';

/**
 * POST: 사원의 근로계약 모바일 서명 이미지(Base64) 등록 및 체결 완료 처리
 */
export async function POST(req: Request) {
  try {
    const { operator_id, signature_image } = await req.json();

    if (!operator_id || !signature_image) {
      return NextResponse.json({ success: false, error: '직원 ID 및 서명 이미지 데이터는 필수입니다.' }, { status: 400 });
    }

    // 1. 직원 정보 및 계약 대기열 확인
    const opRes = await queryTable('crm_operators', { filters: { id: String(operator_id) } });
    if (!opRes.rows || opRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '존재하지 않는 직원입니다.' }, { status: 404 });
    }
    const targetOperator = opRes.rows[0];

    const contractRes = await queryTable('crm_operator_contract_settings', { filters: { operator_id: String(operator_id) } });
    if (!contractRes.rows || contractRes.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '대기 중인 근로 계약이 존재하지 않습니다. 최고관리자가 계약 조건을 먼저 기안해야 합니다.' 
      }, { status: 404 });
    }

    const nowStr = new Date().toISOString();

    // 2. 근로계약 상태 SIGNED로 전환 및 서명 이미지 적재
    const contractData = {
      status: 'SIGNED',
      signature_image: signature_image,
      signed_at: nowStr,
      updated_at: nowStr
    };

    await updateRows('crm_operator_contract_settings', contractData, {
      filters: { operator_id: String(operator_id) }
    });

    // 3. 근로계약 체결 대장(crm_labor_contracts)에 체결 완료 등록
    try {
      const scanId = `LCS-SIGN-${Date.now()}`;
      await insertRows('crm_labor_contracts', [{
        id: scanId,
        operator_id: String(operator_id),
        contract_file_name: '모바일_전자서명_계약서',
        has_toxic_clauses: 0,
        findings_json: JSON.stringify([]),
        created_at: nowStr,
        updated_at: nowStr,
        updated_by: 'SYSTEM_MOBILE_SIGN'
      }]);
    } catch (dbErr: any) {
      console.error('근로계약 대장 기록 실패:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `${targetOperator.name}님의 근로계약 전자 서명 및 체결이 성공적으로 완료되었습니다.`
    });

  } catch (error: any) {
    console.error('Contracts Submit Sign API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
