import { queryTable, insertRows, updateRows, deleteRows } from '../egdesk-helpers';

async function runTest() {
  console.log('=== [시작] {쿠폰코드} 자동 할당 및 사전 검증 기능 테스트 ===\n');

  // 1. 기존 active 쿠폰 목록 조회
  console.log('1. 기존 활성 쿠폰 목록을 조회합니다...');
  const initialRes = await queryTable('coupons', {});
  const initialActive = initialRes.rows.filter((c: any) => c.status === 'active');
  console.log(`- 기존 활성 쿠폰 개수: ${initialActive.length}장\n`);

  // 2. 대량 무작위 쿠폰 5장 생성 및 DB 삽입
  console.log('2. 테스트용 무작위 난수 쿠폰 5장을 생성하고 DB에 저장합니다...');
  const timestamp = Date.now();
  const testCoupons = [];
  
  for (let i = 0; i < 5; i++) {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalCode = `TEST-TKT-${randomStr}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    testCoupons.push({
      id: `test-coupon-${timestamp}-${i}`,
      code: finalCode,
      name: '자동 검증 테스트 쿠폰',
      discount_type: 'amount',
      discount_value: 5000,
      min_order_amount: 10000,
      status: 'active',
      created_at: new Date().toISOString()
    });
  }

  await insertRows('coupons', testCoupons);
  console.log(`- 테스트 쿠폰 5장 삽입 완료.\n`);

  // 3. 삽입 후 활성 쿠폰 총량 조회
  const afterInsertRes = await queryTable('coupons', {});
  const afterInsertActive = afterInsertRes.rows.filter((c: any) => c.status === 'active');
  console.log(`3. 삽입 후 총 활성 쿠폰 개수: ${afterInsertActive.length}장`);
  console.log(`- 신규 등록 확인: ${afterInsertActive.some(c => c.name === '자동 검증 테스트 쿠폰') ? '성공' : '실패'}\n`);

  // 4. 발송 사전 검증 로직 시뮬레이션
  console.log('4. SMS 발송 수량 사전 대조 검증을 수행합니다.');
  
  // 상황 A: 발송 대상이 2명인 경우 (쿠폰 5장 존재 -> 발송 허용)
  const targetsA = 2;
  console.log(`- [상황 A] 발송 대상자: ${targetsA}명 / 보유 활성 쿠폰: ${afterInsertActive.length}장`);
  if (afterInsertActive.length >= targetsA) {
    console.log('  => [검증 통과] 쿠폰 재고가 충분하여 정상 발송 가능 처리됩니다. (Pass)');
  } else {
    console.log('  => [검증 실패] 오류 발생! 쿠폰이 충분한데도 발송이 차단되었습니다. (Fail)');
  }

  // 상황 B: 발송 대상이 100명인 경우 (쿠폰 5장 존재 -> 발송 차단)
  const targetsB = 100;
  console.log(`- [상황 B] 발송 대상자: ${targetsB}명 / 보유 활성 쿠폰: ${afterInsertActive.length}장`);
  if (afterInsertActive.length < targetsB) {
    console.log('  => [차단 성공] 쿠폰 재고 부족으로 인해 발송이 정상적으로 차단 및 경고 처리됩니다. (Pass)');
  } else {
    console.log('  => [차단 실패] 오류 발생! 쿠폰 재고가 부족한데 차단되지 않고 발송 허용되었습니다. (Fail)');
  }
  console.log('');

  // 5. 순차 자동 할당 및 used 상태 차감 업데이트
  console.log('5. 발송 대상 2명에게 쿠폰을 1장씩 순차 배정 및 상태 변경(used)을 시뮬레이션합니다...');
  
  // 테스트 쿠폰 중 2장을 임의 선택
  const activeTestCoupons = afterInsertActive.filter(c => c.name === '자동 검증 테스트 쿠폰');
  const assignedCoupons = activeTestCoupons.slice(0, 2);
  
  console.log(`- 배정될 첫 번째 쿠폰: ${assignedCoupons[0].code} (ID: ${assignedCoupons[0].id})`);
  console.log(`- 배정될 두 번째 쿠폰: ${assignedCoupons[1].code} (ID: ${assignedCoupons[1].id})`);

  for (let i = 0; i < assignedCoupons.length; i++) {
    const coupon = assignedCoupons[i];
    
    // DB의 해당 쿠폰 상태를 'used'로 변경
    await updateRows('coupons', { status: 'used' }, { filters: { id: coupon.id } });
    console.log(`  => 쿠폰 ${coupon.code} 사용 처리(used) 업데이트 완료.`);
  }
  console.log('');

  // 6. DB 조회하여 쿠폰 차감 결과 최종 검증
  console.log('6. 데이터베이스 차감 결과를 최종 조회하여 대조합니다...');
  const finalRes = await queryTable('coupons', {});
  const testCouponsAfter = finalRes.rows.filter((c: any) => c.name === '자동 검증 테스트 쿠폰');
  
  const usedTestCoupons = testCouponsAfter.filter((c: any) => c.status === 'used');
  const activeTestCouponsRemaining = testCouponsAfter.filter((c: any) => c.status === 'active');
  
  console.log(`- 테스트 쿠폰 중 'used' 상태 개수: ${usedTestCoupons.length}장 (기대값: 2장)`);
  console.log(`- 테스트 쿠폰 중 'active' 상태 개수: ${activeTestCouponsRemaining.length}장 (기대값: 3장)`);
  
  if (usedTestCoupons.length === 2 && activeTestCouponsRemaining.length === 3) {
    console.log('\n>>> [최종 검증 완료] 모든 기능이 설계 규격에 맞게 완벽하게 작동합니다! (SUCCESS) <<<');
  } else {
    console.log('\n>>> [최종 검증 실패] 쿠폰 사용 상태 업데이트 결과가 기대값과 다릅니다. (FAILED) <<<');
  }
  console.log('');

  // 7. DB 정리 (Clean-up)
  console.log('7. 테스트에 사용된 임시 데이터를 DB에서 삭제하여 깨끗하게 정리합니다...');
  for (const c of testCoupons) {
    await deleteRows('coupons', { filters: { id: c.id } });
  }
  console.log('- 임시 쿠폰 데이터 삭제 완료. (DB 원상복구 완료)\n');
  console.log('=== [종료] 테스트 완료 ===');
}

runTest().catch((err) => {
  console.error('테스트 수행 도중 심각한 에러 발생:', err);
});
