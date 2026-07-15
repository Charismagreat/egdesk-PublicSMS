const { executeSQL, deleteRows } = require('../egdesk-helpers');

async function run() {
  console.log('=== [B2B 거래처 데이터베이스 전체 청소 시작] ===');
  
  try {
    // 1. crm_partner_contacts 전체 ID 조회 (소프트 삭제 찌꺼기 포함)
    console.log('• crm_partner_contacts 전체 ID 조회 중...');
    const resContacts = await executeSQL('SELECT id FROM crm_partner_contacts');
    const contactRows = resContacts.rows || resContacts || [];
    const contactIds = contactRows.map(c => String(c.id));
    
    if (contactIds.length > 0) {
      console.log(`• crm_partner_contacts ${contactIds.length}건 물리 삭제 진행...`);
      const chunkSize = 50;
      for (let i = 0; i < contactIds.length; i += chunkSize) {
        const chunk = contactIds.slice(i, i + chunkSize);
        await deleteRows('crm_partner_contacts', { ids: chunk });
      }
      console.log('✓ crm_partner_contacts 청소 완료.');
    } else {
      console.log('✓ crm_partner_contacts가 이미 깨끗합니다.');
    }

    // 2. crm_partners 전체 ID 조회 (소프트 삭제 찌꺼기 포함)
    console.log('• crm_partners 전체 ID 조회 중...');
    const resPartners = await executeSQL('SELECT id FROM crm_partners');
    const partnerRows = resPartners.rows || resPartners || [];
    const partnerIds = partnerRows.map(p => String(p.id));
    
    if (partnerIds.length > 0) {
      console.log(`• crm_partners ${partnerIds.length}건 물리 삭제 진행...`);
      const chunkSize = 50;
      for (let i = 0; i < partnerIds.length; i += chunkSize) {
        const chunk = partnerIds.slice(i, i + chunkSize);
        await deleteRows('crm_partners', { ids: chunk });
      }
      console.log('✓ crm_partners 청소 완료.');
    } else {
      console.log('✓ crm_partners가 이미 깨끗합니다.');
    }

    console.log('✨ [성공] 모든 거래처 및 담당자 데이터가 물리적으로 완전히 초기화되었습니다.');
  } catch (err) {
    console.error('❌ 초기화 오류 발생:', err.message);
  }
}

run();
