import { handleBusinessCard } from '../src/app/api/easybot/ocr/confirm/services/card';
import { handleBusinessLicense } from '../src/app/api/easybot/ocr/confirm/services/partners';
import { handleFinancialStatement } from '../src/app/api/easybot/ocr/confirm/services/financials';
import { queryTable, deleteRows } from '../egdesk-helpers';

async function runTest() {
  console.log('=== [유닛 테스트] 리팩토링된 OCR 확정 서비스 기능 검증 ===\n');
  const nowStr = '2026-06-14 13:30:00';
  
  // 1. 명함 확정 테스트 (handleBusinessCard)
  try {
    console.log('[테스트 1] 명함 신규 등록 (handleBusinessCard)...');
    const cardRes = await handleBusinessCard({
      name: '김테스트',
      position: '팀장',
      phone: '010-1234-5678',
      email: 'test@example.com',
      partnerName: '테스트코리아',
      actionType: 'insert'
    }, nowStr);
    
    console.log(' - 결과:', JSON.stringify(cardRes));
    if (cardRes.action === 'inserted' && cardRes.auditPrompt.includes('김테스트')) {
      console.log(' -> 성공!');
    } else {
      throw new Error('명함 등록 실패');
    }
  } catch (err: any) {
    console.error(' -> 에러:', err.message);
  }

  // 2. 사업자등록증 확정 테스트 (handleBusinessLicense)
  try {
    console.log('\n[테스트 2] 사업자등록증 신규 등록 (handleBusinessLicense)...');
    const bizRes = await handleBusinessLicense({
      status: 'NEW_PARTNER',
      data: {
        companyName: '테스트컴퍼니',
        businessNumber: '123-45-67890',
        representative: '홍길동',
        address: '서울시 강남구'
      }
    }, nowStr);
    
    console.log(' - 결과:', JSON.stringify(bizRes));
    if (bizRes.action === 'inserted' && bizRes.auditPrompt.includes('테스트컴퍼니')) {
      console.log(' -> 성공!');
    } else {
      throw new Error('사업자등록증 등록 실패');
    }
  } catch (err: any) {
    console.error(' -> 에러:', err.message);
  }

  // 3. 재무제표 확정 테스트 (handleFinancialStatement)
  try {
    console.log('\n[테스트 3] 재무제표 신규 등록 (handleFinancialStatement)...');
    const finRes = await handleFinancialStatement({
      partnerId: 'P_TEST_123',
      companyType: 'CORPORATION',
      data: {
        fiscalYear: 2025,
        totalAssets: 100000000,
        totalLiabilities: 50000000,
        totalEquity: 50000000,
        revenue: 200000000,
        operatingIncome: 20000000,
        netIncome: 15000000
      }
    }, nowStr);
    
    console.log(' - 결과:', JSON.stringify(finRes));
    if (finRes.action === 'inserted' && finRes.auditPrompt.includes('2025년')) {
      console.log(' -> 성공!');
    } else {
      throw new Error('재무제표 등록 실패');
    }
  } catch (err: any) {
    console.error(' -> 에러:', err.message);
  }
  
  // Clean up
  console.log('\n[Clean-up] 테스트 임시 데이터 제거 중...');
  try {
    await deleteRows('crm_partner_contacts', { filters: { name: '김테스트' } });
    await deleteRows('crm_partners', { filters: { company_name: '테스트컴퍼니' } });
    await deleteRows('crm_financial_statements', { filters: { company_id: 'P_TEST_123' } });
    console.log(' -> 완료!');
  } catch (cleanErr: any) {
    console.error(' -> 클린업 에러:', cleanErr.message);
  }
}

runTest();
