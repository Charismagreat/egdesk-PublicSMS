export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { insertRows, queryTable } from '../../../../../../egdesk-helpers';

// 서비스 모듈 임포트
import { handleFinancialStatement } from './services/financials';
import { handleBusinessLicense } from './services/partners';
import { handleInventoryInbound } from './services/inventory';
import { handleResume } from './services/resume';
import { handleMedicalCertificate } from './services/medical';
import { handlePurchaseInvoice } from './services/purchase';
import { handleCompetitorPriceCapture } from './services/price';
import { handleFacilityPlate, handleFacilityChecklist } from './services/facility';
import { handleLegalDocument } from './services/legal';
import { handleInboundEstimate } from './services/estimate';
import { handleBusinessCard } from './services/card';

/**
 * 사용자 세션 검증 및 사용자명 추출 공통 헬퍼 (최고관리자 및 직원 모두 허용)
 */
async function verifyUserSession(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    // 데모 환경 지원을 위해 첫 번째 직원의 계정명을 반환하여 시연 편의성 제공
    const allOps = await queryTable('crm_operators', { limit: 1 });
    if (allOps.rows && allOps.rows.length > 0) {
      return allOps.rows[0].username;
    }
    return 'admin@egdesk.com';
  }

  try {
    const payload = decodeJwt(token);
    return (payload.username || payload.name || 'admin@egdesk.com') as string;
  } catch (err) {
    return 'admin@egdesk.com';
  }
}

// 자율 액션 감사 로그 적재 함수 (OCR용)
async function logActionAudit({
  prompt,
  actionName,
  args,
  status,
  result,
  errorMessage,
  operator
}: {
  prompt: string;
  actionName: string;
  args: any;
  status: 'SUCCESS' | 'FAILED';
  result?: any;
  errorMessage?: string;
  operator: string;
}) {
  try {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const logId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const uuid = `uuid-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    await insertRows('easybot_action_audit_logs', [{
      id: logId,
      operator_username: operator,
      original_prompt: prompt,
      action_name: actionName,
      arguments_json: JSON.stringify(args || {}),
      status: status,
      execution_result: result ? JSON.stringify(result) : null,
      error_message: errorMessage || null,
      created_at: nowStr,
      uuid: uuid,
      updated_at: nowStr,
      updated_by: operator
    }]);

    console.log(`[감사 로그(OCR) 기록 완료] Action: ${actionName}, Status: ${status}`);
  } catch (err) {
    console.error('감사 로그 DB 기록 실패(OCR):', err);
  }
}

/**
 * 현재 타임스탬프 반환 (YYYY-MM-DD HH:MM:SS)
 */
function getNowTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export async function POST(req: Request) {
  try {
    // 1. 사용자 세션 검증 및 작업자명 획득
    const operator = await verifyUserSession();

    // 1.5. AI 컨트롤타워 이미지 OCR 자율 대행 활성화 여부 검증
    const toggleRes = await queryTable('system_settings', { filters: { key: 'easybot_action_ocr_confirm_enabled' } });
    const toggleVal = toggleRes.rows && toggleRes.rows.length > 0 ? toggleRes.rows[0].value : '1';
    const isEnabled = toggleVal !== '0' && toggleVal !== 'false' && toggleVal !== false;

    if (!isEnabled) {
      return NextResponse.json({
        success: false,
        error: '이미지 OCR 자율 대행(등록 확정) 기능이 AI 컨트롤타워 설정에 의해 비활성화되어 있습니다. 관리자에게 문의하세요.'
      }, { status: 403 });
    }

    const reqBody = await req.json();
    const fileType = reqBody.fileType || (reqBody.actionName === 'ocr_confirm_inventory_inbound' ? 'INVENTORY_INBOUND' : '');
    const nowStr = getNowTimestamp();
    reqBody.operator = operator;

    let serviceResult: any = null;
    let actionName = '';

    // fileType 분기에 따라 해당 서비스 모듈 호출
    if (fileType === 'FINANCIAL_STATEMENT') {
      serviceResult = await handleFinancialStatement(reqBody, nowStr);
      actionName = 'ocr_confirm_financial_statement';
    } else if (fileType === 'BUSINESS_LICENSE') {
      serviceResult = await handleBusinessLicense(reqBody, nowStr);
      actionName = 'ocr_confirm_business_license';
    } else if (fileType === 'INVENTORY_INBOUND') {
      serviceResult = await handleInventoryInbound(reqBody, nowStr);
      actionName = 'ocr_confirm_inventory_inbound';
    } else if (fileType === 'RESUME') {
      serviceResult = await handleResume(reqBody, nowStr);
      actionName = 'ocr_confirm_resume';
    } else if (fileType === 'MEDICAL_CERTIFICATE') {
      serviceResult = await handleMedicalCertificate(reqBody, nowStr);
      actionName = 'ocr_confirm_medical_certificate';
    } else if (fileType === 'PURCHASE_INVOICE') {
      serviceResult = await handlePurchaseInvoice(reqBody, nowStr);
      actionName = 'ocr_confirm_purchase_invoice';
    } else if (fileType === 'COMPETITOR_PRICE_CAPTURE') {
      serviceResult = await handleCompetitorPriceCapture(reqBody, nowStr);
      actionName = 'ocr_confirm_competitor_price';
    } else if (fileType === 'FACILITY_PLATE') {
      serviceResult = await handleFacilityPlate(reqBody, nowStr);
      actionName = 'ocr_confirm_facility_plate';
    } else if (fileType === 'FACILITY_CHECKLIST') {
      serviceResult = await handleFacilityChecklist(reqBody, nowStr);
      actionName = 'ocr_confirm_facility_checklist';
    } else if (fileType === 'LEGAL_DOCUMENT') {
      serviceResult = await handleLegalDocument(reqBody, nowStr);
      actionName = 'ocr_confirm_legal_document';
    } else if (fileType === 'INBOUND_ESTIMATE') {
      serviceResult = await handleInboundEstimate(reqBody, nowStr);
      actionName = 'ocr_confirm_inbound_estimate';
    } else {
      // 기본 분기: 명함 (BUSINESS_CARD)
      serviceResult = await handleBusinessCard(reqBody, nowStr);
      actionName = 'ocr_confirm_business_card';
    }

    // 감사 로그 적재
    const { auditPrompt, message, ...restResult } = serviceResult;
    await logActionAudit({
      prompt: auditPrompt,
      actionName,
      args: reqBody,
      status: 'SUCCESS',
      result: restResult,
      operator
    });

    return NextResponse.json({
      success: true,
      message,
      ...restResult
    });

  } catch (error: any) {
    console.error('이지봇 확정 반영 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '최종 정보를 데이터베이스에 반영하는 중 내부 예외가 발생했습니다.'
    }, { status: 500 });
  }
}
