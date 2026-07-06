import { insertRows } from '../../../../../../../egdesk-helpers';

export async function handleMedicalCertificate(reqBody: any, nowStr: string) {
  const { data, operatorId } = reqBody;
  if (!operatorId) {
    throw new Error('병가 신청을 상신할 직원을 선택해 주세요.');
  }
  if (!data || !data.startDate || !data.endDate) {
    throw new Error('병가 기간(시작일/종료일) 정보가 누락되었습니다.');
  }

  const generatedId = `LV-${Date.now()}`;
  await insertRows('crm_annual_leaves', [{
    id: generatedId,
    operator_id: operatorId,
    leave_type: 'SICK',
    start_date: data.startDate,
    end_date: data.endDate,
    days_spent: Number(data.daysSpent) || 0,
    status: 'PENDING',
    reason: `[병가 증빙 등록] 진단명: ${data.diagnosis || '진단서 증빙 첨부'}`,
    reject_reason: null,
    approver_id: null,
    medical_certificate_path: data.medical_certificate_path || '',
    created_at: nowStr,
    updated_at: nowStr
  }]);

  return {
    action: 'inserted',
    leaveId: generatedId,
    message: `이지봇 AI 비서가 첨부된 실물 진단서 증빙과 매칭된 직원의 병가 신청(결재 대기) 건 상신 등록을 완수했습니다! 📄`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 병가 신청을 위한 진단서 증빙 자료를 판독하여 병가 건(결재 대기) 상신 등록을 대행하였습니다.`
  };
}
