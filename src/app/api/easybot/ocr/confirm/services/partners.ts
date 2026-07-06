import { insertRows, updateRows } from '../../../../../../../egdesk-helpers';

export async function handleBusinessLicense(reqBody: any, nowStr: string) {
  const { status, data, existingId } = reqBody;
  
  if (!data || !data.companyName) {
    throw new Error('등록 및 갱신할 상호명(companyName)이 누락되었습니다.');
  }

  const cleanBizNo = (data.businessNumber || '').replace(/\D/g, '');

  if (status === 'NEW_PARTNER') {
    const generatedId = `P_${Date.now()}`;
    
    await insertRows('crm_partners', [{
      id: generatedId,
      type: 'BUYER',
      company_name: data.companyName,
      business_number: cleanBizNo,
      representative: data.representative || '',
      phone: data.phone || '',
      fax: data.fax || '',
      manager_name: data.managerName || '',
      address: data.address || '',
      vip_level: 'NORMAL',
      credit_limit: 0,
      memo: data.memo || '이지봇 AI 사업자등록증 신규 가입 완료',
      created_at: nowStr
    }]);

    return {
      action: 'inserted',
      companyName: data.companyName,
      message: `이지봇 AI 비서가 신규 바이어 [${data.companyName}] 님의 정보와 국세청 가동 정보를 대조 및 등록 완수했습니다! 🚀`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 신규 사업자등록증 정보를 분석하여 신규 거래처 [${data.companyName}] 등록을 대행하였습니다.`
    };
  }

  if (status === 'UPDATE_PARTNER') {
    if (!existingId) {
      throw new Error('정보를 업데이트할 기존 거래처 고유 ID(existingId)가 누락되었습니다.');
    }

    await updateRows('crm_partners', {
      company_name: data.companyName,
      representative: data.representative || '',
      address: data.address || '',
      phone: data.phone || '',
      fax: data.fax || '',
      manager_name: data.managerName || '',
      memo: data.memo || ''
    }, { filters: { id: existingId } });

    return {
      action: 'updated',
      companyName: data.companyName,
      existingId,
      message: `이지봇 AI 비서가 기존 바이어 [${data.companyName}] 님의 변동된 주소/전화번호 등을 대조 및 갱신 완료했습니다! 🔄`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 사업자등록증 정보를 분석하여 기존 거래처 [${data.companyName}] 정보 갱신을 대행하였습니다.`
    };
  }

  throw new Error('알 수 없는 판독 상태입니다.');
}
