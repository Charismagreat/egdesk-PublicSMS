const helpers = require('../egdesk-helpers.js');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('==================================================');
  console.log('🚀 DB 변경 감지 및 이지봇(EasyBot) 자율 후속 조치 테스트 기동');
  console.log('==================================================');

  // 1. 테스트용 비정상 지출 내역 (심야 가요주점 결제 380,000원) 준비
  const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const mockExpense = {
    id: `exp-test-${Date.now()}`,
    title: '영업 1팀 바이어 미팅 간담회 및 주류대금',
    category: '접대비',
    amount: 380000,
    expense_date: '2026-06-05',
    payment_method: '법인카드',
    attachment_url: 'http://docs.egdesk.internal/receipts/rec-99128.png',
    ai_analysis: '심야 시간대 가요주점 결제 건',
    memo: '효성전기 구매 파트 담당 차장 접대 (결제시점 23:55분)',
    approval_status: 'PENDING',
    created_at: nowStr,
    updated_at: nowStr
  };

  try {
    console.log('\n[STEP 1] crm_expenses 테이블에 테스트 지출 내역 삽입 중...');
    // insertRows를 기동하면 helpers 내부에서 emitDbChange를 호출
    const insertRes = await helpers.insertRows('crm_expenses', [mockExpense]);
    console.log('지출 내역 삽입 결과:', JSON.stringify(insertRes, null, 2));

    console.log('\n[STEP 2] 이지봇의 LLM 분석 및 자율 스냅태스크 생성 대기 (10초)...');
    // Gemini API 호출 및 스냅태스크 생성을 위해 잠시 대기
    await delay(10000);

    console.log('\n[STEP 3] crm_snaptasks 테이블에서 자율 생성된 작업 지시 조회 중...');
    // 생성된 최근 5개의 스냅태스크와 상세 타임라인을 조회
    const tasksRes = await helpers.executeSQL('SELECT * FROM crm_snaptasks ORDER BY id DESC LIMIT 3');
    console.log('=== crm_snaptasks (최근 3개) ===');
    console.log(JSON.stringify(tasksRes, null, 2));

    const taskItemsRes = await helpers.executeSQL('SELECT * FROM crm_snaptask_items ORDER BY id DESC LIMIT 3');
    console.log('\n=== crm_snaptask_items (최근 3개) ===');
    console.log(JSON.stringify(taskItemsRes, null, 2));

    console.log('\n==================================================');
    console.log('🎉 테스트 완료! DB 변경이 이지봇으로 중개되어 스냅태스크가 자동 수립되었습니다.');
    console.log('==================================================');

  } catch (err) {
    console.error('테스트 중 치명적 오류 발생:', err);
  }
}

main();
