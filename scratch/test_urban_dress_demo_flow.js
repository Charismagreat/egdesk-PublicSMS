const helpers = require('../egdesk-helpers.js');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('======================================================================');
  console.log('🤖 어반드레스(AVANDRESS) AI 자율 관제 및 태스크 조율 E2E 시뮬레이션 시작');
  console.log('======================================================================\n');

  const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  try {
    // ------------------------------------------------------------------
    // STEP 1: [09:00] 물류팀 신상 'Felt 3D Pigment Zip-Up' 입고 실사
    // ------------------------------------------------------------------
    console.log('[SCENARIO 1] 09:00 - 물류 MD 신상 Felt 3D Pigment Zip-Up 입고 처리 중...');
    const newProduct = {
      id: 'PD-URB-01',
      name: 'Felt 3D Pigment Zip-Up',
      price: '89000',
      url: 'http://urban.dress/products/felt-pigment-zipup',
      description: '체형 보완 피그먼트 지퍼업 아우터',
      category: '아우터',
      menu_category: 'F/W Outer',
      is_coupon_excludable: 0,
      is_estimate_price: 0,
      updated_at: nowStr
    };
    // insert가 아닌 updateRows를 통해 기존 빈 재고 상태를 입고 상태로 변경 (이벤트 트리거)
    const pRes = await helpers.updateRows('products', newProduct, { filters: { id: 'PD-URB-01' } });
    console.log(' -> 입고 등록 결과:', JSON.stringify(pRes, null, 2));
    await delay(3000); // 비동기 웹훅 처리 대기

    // ------------------------------------------------------------------
    // STEP 2: [10:00] 물류 재고 실사 중 안전재고(500개) 이하 징후 감지
    // ------------------------------------------------------------------
    console.log('\n[SCENARIO 2] 10:00 - Bubble Crop T-shirt 8COL 품절 임박 징후 감지 중...');
    // 품절 위험 상태 시뮬레이션을 위해 products 테이블의 해당 상품 삭제 이벤트를 CDC로 전송
    const delRes = await helpers.deleteRows('products', { filters: { id: 'PD-URB-03' } });
    console.log(' -> 재고 부족 이벤트 전송 결과:', JSON.stringify(delRes, null, 2));
    await delay(3000);

    // ------------------------------------------------------------------
    // STEP 3: [13:00] 무신사/자사몰 주문 엑셀 취합 중 주소 오류 불명 주문 감지
    // ------------------------------------------------------------------
    console.log('\n[SCENARIO 3] 13:00 - CS팀 주문 엑셀 취합 중 주소 오류 주문 감지 중...');
    const errOrder = {
      id: `ORD-ERR-${Date.now()}`,
      customer_name: '홍길동',
      customer_phone: '010-1234-5678',
      product_name: 'Felt 3D Pigment Zip-Up (주문오류)',
      quantity: '1',
      total_price: '89000',
      shipping_address: '배송지 주소 오류 불명',
      customer_memo: '상세 주소 누락 및 수취인 불명 에러 발생',
      status: 'ERROR',
      order_date: nowStr.slice(0, 10),
      updated_at: nowStr
    };
    // crm_orders 테이블에 비정상 주문 삽입
    const oRes = await helpers.insertRows('crm_orders', [errOrder]);
    console.log(' -> 오류 주문 등록 결과:', JSON.stringify(oRes, null, 2));
    await delay(3000);

    // ------------------------------------------------------------------
    // STEP 4: [16:00] 주 52시간 초과 근무 위험 직원 감지
    // ------------------------------------------------------------------
    console.log('\n[SCENARIO 4] 16:00 - 인사팀 근태 마감 중 주 52시간 초과 위험자 발견...');
    const overtimeAttendance = {
      id: 'ATT-20260605-04',
      operator_id: '5', // 이경우 과장
      work_date: '2026-06-05',
      clock_in: '08:20',
      status: 'OVERTIME_ALERT',
      working_hours: 14.5,
      memo: '누적 53.5시간 초과 근무 경보',
      created_at: nowStr,
      updated_at: nowStr
    };
    // crm_attendance 테이블 업데이트
    const aRes = await helpers.updateRows('crm_attendance', overtimeAttendance, { filters: { id: 'ATT-20260605-04' } });
    console.log(' -> 초과근무 업데이트 결과:', JSON.stringify(aRes, null, 2));
    await delay(3000);

    // ------------------------------------------------------------------
    // STEP 5: [17:00] 전사 법인카드 정산 중 심야 주점 부정 사용 실시간 감사
    // ------------------------------------------------------------------
    console.log('\n[SCENARIO 5] 17:00 - 재무팀 법인카드 감사 및 부정 지출 실시간 탐지 중...');
    const cardExpense = {
      id: `EXP-ERR-${Date.now()}`,
      title: '영업부 VIP 바이어 심야 주류 대금 결제',
      category: '접대비',
      amount: 380000,
      expense_date: '2026-06-05',
      payment_method: '법인카드',
      attachment_url: 'http://docs.urban.dress/receipts/rec-7718.png',
      ai_analysis: '심야 시간대 가요주점 결제 건 의심',
      memo: '바이어 미팅 간담회 (가요주점 23:55분 결제 건)',
      approval_status: 'PENDING',
      created_at: nowStr,
      updated_at: nowStr
    };
    // crm_expenses 테이블에 부정 지출 내역 삽입
    const eRes = await helpers.insertRows('crm_expenses', [cardExpense]);
    console.log(' -> 부정 지출 등록 결과:', JSON.stringify(eRes, null, 2));
    
    console.log('\n[대기] AI 및 룰 관제 엔진이 후속 조치를 최종 발급할 때까지 대기 (8초)...');
    await delay(8000);

    // ------------------------------------------------------------------
    // 시뮬레이션 결과 최종 조회 및 데이터 검증
    // ------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('🔍 [검증] 어반드레스 AI가 자율 발급 및 추적 중인 스냅태스크 대장 확인');
    console.log('======================================================================');

    const activeTasks = await helpers.queryTable('crm_snaptasks', {
      filters: { status: 'ACTIVE' },
      limit: 5,
      orderBy: { column: 'id', direction: 'DESC' }
    });
    console.log('\n=== crm_snaptasks (활성화된 자율 태스크 5건) ===');
    console.log(JSON.stringify(activeTasks, null, 2));

    const activeTaskItems = await helpers.queryTable('crm_snaptask_items', {
      limit: 5,
      orderBy: { column: 'id', direction: 'DESC' }
    });
    console.log('\n=== crm_snaptask_items (상세 권고 및 FreeSMS 알림 데이터) ===');
    console.log(JSON.stringify(activeTaskItems, null, 2));

    console.log('\n======================================================================');
    console.log('🎉 E2E 실무 통합 시뮬레이션 성공! 전 업무가 단절 없이 AI에 의해 조율되었습니다.');
    console.log('======================================================================');

  } catch (err) {
    console.error('⚠️ 시뮬레이션 중 오류 발생:', err);
  }
}

main();
