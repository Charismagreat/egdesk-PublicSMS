import { queryTable, insertRows, updateRows } from '../../../../../../../egdesk-helpers';

export async function handleBusinessCard(reqBody: any, nowStr: string) {
  const { 
    name, 
    position, 
    phone, 
    email, 
    partnerId, 
    partnerName, 
    existingContactId, 
    cardImageUrl 
  } = reqBody;

  if (!name) {
    throw new Error('등록할 담당자 성명(name) 정보가 누락되었습니다.');
  }

  let finalPartnerId = partnerId;

  if (!finalPartnerId && partnerName) {
    try {
      // id 컬럼은 SQLite Auto-increment를 위해 비우고 insertRows를 호출합니다.
      // crm_partners 테이블의 상호명 컬럼명은 company_name입니다.
      await insertRows('crm_partners', [
        {
          type: 'BUYER', // 기본 바이어로 세팅
          company_name: partnerName,
          created_at: nowStr
        }
      ]);
      
      const createdRes = await queryTable('crm_partners', { filters: { company_name: partnerName } });
      const createdPartner = createdRes.rows?.[0];
      if (createdPartner) {
        finalPartnerId = String(createdPartner.id);
      } else {
        finalPartnerId = '개인_기타';
      }
    } catch (partnerInsertErr: any) {
      console.warn('임시 거래처 생성 실패, 기본 그룹으로 우회합니다:', partnerInsertErr.message);
      finalPartnerId = '개인_기타';
    }
  } else if (!finalPartnerId) {
    finalPartnerId = '개인_기타';
  }

  const { actionType } = reqBody;

  if (actionType === 'update_info') {
    if (!existingContactId) {
      throw new Error('정보를 업데이트할 기존 담당자 식별자(existingContactId)가 누락되었습니다.');
    }

    await updateRows('crm_partner_contacts',
      { 
        position, 
        phone, 
        email, 
        card_image_url: cardImageUrl || '',
        is_active: 1
      },
      { filters: { id: existingContactId } }
    );

    return {
      action: 'updated',
      name,
      message: `기존 등록된 '${name}' 담당자의 연락망 및 부서/직책 최신 정보 갱신을 성공적으로 완료하였습니다.`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 담당자 '${name}' 님의 명함 정보를 분석하여 기존 연락망의 최신 정보 업데이트를 대행하였습니다.`
    };
  }

  if (actionType === 'career_transition') {
    if (!existingContactId) {
      throw new Error('이직 처리를 수행할 기존 담당자 식별자(existingContactId)가 누락되었습니다.');
    }

    await updateRows('crm_partner_contacts',
      { is_active: 0 },
      { filters: { id: existingContactId } }
    );

    const contactsRes = await queryTable('crm_partner_contacts');
    const contacts = contactsRes.rows || [];
    const nextId = contacts.length > 0 ? Math.max(...contacts.map((c: any) => parseInt(c.id) || 0)) + 1 : 1;

    await insertRows('crm_partner_contacts', [
      {
        id: nextId,
        partner_id: finalPartnerId,
        name,
        position,
        phone,
        email,
        card_image_url: cardImageUrl || '',
        is_primary: 0,
        is_active: 1,
        created_at: nowStr
      }
    ]);

    return {
      action: 'transitioned',
      name,
      message: `'${name}' 담당자의 기존 회사 재직 정보를 '이직(비활성)' 보존 처리하고, 신규 파트너사의 대표 연락망으로 이적 등록을 정상 완료하였습니다.`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 담당자 '${name}' 님의 명함 정보를 분석하여 이직(비활성) 처리 및 신규 파트너사 연락망 이적 등록을 대행하였습니다.`
    };
  }

  const contactsRes = await queryTable('crm_partner_contacts');
  const contacts = contactsRes.rows || [];
  const nextId = contacts.length > 0 ? Math.max(...contacts.map((c: any) => parseInt(c.id) || 0)) + 1 : 1;

  await insertRows('crm_partner_contacts', [
    {
      id: nextId,
      partner_id: finalPartnerId,
      name,
      position,
      phone,
      email,
      card_image_url: cardImageUrl || '',
      is_primary: contacts.filter((c: any) => c.partner_id === finalPartnerId).length === 0 ? 1 : 0,
      is_active: 1,
      created_at: nowStr
    }
  ]);

  return {
    action: 'inserted',
    name,
    message: `신규 담당자 '${name}' 님의 명함 정보 등록을 명함첩에 최종 완료하였습니다.`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 담당자 '${name}' 님의 명함 정보를 분석하여 연락망 신규 등록을 대행하였습니다.`
  };
}
