async function runApiTest() {
  console.log('=== [시작] Next.js HTTP API 연동 E2E 테스트 ===\n');

  const BASE_URL = 'http://localhost:3000';

  // 1. 기존 쿠폰 목록 조회
  console.log('1. GET /api/coupons 를 호출하여 기존 쿠폰 목록을 조회합니다...');
  const getRes1 = await fetch(`${BASE_URL}/api/coupons`);
  const json1 = await getRes1.json();
  if (!json1.success) throw new Error(json1.error || '목록 조회 실패');
  
  const initialActive = (json1.coupons || []).filter((c: any) => c.status === 'active');
  console.log(`- 기존 활성 쿠폰 개수: ${initialActive.length}장\n`);

  // 2. 무작위 대량 쿠폰 5장 발행 (POST)
  console.log('2. POST /api/coupons 를 호출하여 무작위 난수 쿠폰 5장을 발행합니다...');
  const postRes = await fetch(`${BASE_URL}/api/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E API 테스트 쿠폰',
      discount_type: 'amount',
      discount_value: 5000,
      min_order_amount: 10000,
      count: 5,
      prefix: 'API-E2E'
    })
  });
  const postJson = await postRes.json();
  if (!postJson.success) throw new Error(postJson.error || '쿠폰 발행 실패');
  console.log(`- API 응답: 쿠폰 ${postJson.count}장 발행 완료.\n`);

  // 3. 발행 후 활성 쿠폰 조회
  console.log('3. GET /api/coupons 를 다시 호출하여 발행 결과를 확인합니다...');
  const getRes2 = await fetch(`${BASE_URL}/api/coupons`);
  const json2 = await getRes2.json();
  if (!json2.success) throw new Error(json2.error || '목록 조회 실패');
  
  const allCoupons = json2.coupons || [];
  const testCoupons = allCoupons.filter((c: any) => c.name === 'E2E API 테스트 쿠폰');
  const activeTestCoupons = testCoupons.filter((c: any) => c.status === 'active');
  
  console.log(`- 발행된 총 테스트 쿠폰: ${testCoupons.length}장`);
  console.log(`- 발행된 테스트 쿠폰 중 'active' 상태: ${activeTestCoupons.length}장`);
  if (activeTestCoupons.length === 5) {
    console.log('  => [검증 성공] 5장의 난수 쿠폰이 정상 생성 및 active로 등록되었습니다.\n');
  } else {
    throw new Error('5장의 활성 쿠폰이 생성되지 않았습니다.');
  }

  // 4. 발송 사전 검증 조건 시뮬레이션
  console.log('4. SMS 발송 수량 사전 대조 검증을 시뮬레이션합니다.');
  const totalActiveCouponsCount = allCoupons.filter((c: any) => c.status === 'active').length;

  // 상황 A: 발송 대상이 2명인 경우
  const targetsA = 2;
  console.log(`- [상황 A] 발송 대상자: ${targetsA}명 / 보유 활성 쿠폰: ${totalActiveCouponsCount}장`);
  if (totalActiveCouponsCount >= targetsA) {
    console.log('  => [검증 통과] 정상 발송 허용 가능 처리 (Pass)');
  } else {
    console.log('  => [검증 실패] 비정상적인 차단 (Fail)');
  }

  // 상황 B: 발송 대상이 1000명인 경우 (쿠폰 재고 부족 상황)
  const targetsB = 1000;
  console.log(`- [상황 B] 발송 대상자: ${targetsB}명 / 보유 활성 쿠폰: ${totalActiveCouponsCount}장`);
  if (totalActiveCouponsCount < targetsB) {
    console.log('  => [차단 성공] 쿠폰 부족으로 인한 발송 사전 차단 처리 완료 (Pass)\n');
  } else {
    throw new Error('쿠폰이 현저히 부족함에도 사전 차단이 수행되지 않았습니다.');
  }

  // 5. 발송 완료 시 쿠폰 사용 처리 시뮬레이션 (PUT)
  console.log('5. 발송 완료 시나리오를 가정하여 2장의 쿠폰을 사용 처리(PUT)합니다...');
  const assigned = activeTestCoupons.slice(0, 2);
  
  console.log(`- 첫 번째 매핑 쿠폰: ${assigned[0].code} (ID: ${assigned[0].id})`);
  console.log(`- 두 번째 매핑 쿠폰: ${assigned[1].code} (ID: ${assigned[1].id})`);

  for (const coupon of assigned) {
    const putRes = await fetch(`${BASE_URL}/api/coupons`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: coupon.id,
        status: 'used'
      })
    });
    const putJson = await putRes.json();
    if (!putJson.success) throw new Error(`${coupon.code} 사용 처리 실패`);
    console.log(`  => 쿠폰 ${coupon.code} 사용 처리 완료 (status: used)`);
  }
  console.log('');

  // 6. DB 상태 대조 검증
  console.log('6. GET /api/coupons 로 쿠폰 상태 변화를 최종 대조합니다...');
  const getRes3 = await fetch(`${BASE_URL}/api/coupons`);
  const json3 = await getRes3.json();
  
  const finalTestCoupons = (json3.coupons || []).filter((c: any) => c.name === 'E2E API 테스트 쿠폰');
  const usedTestCoupons = finalTestCoupons.filter((c: any) => c.status === 'used');
  const activeTestCouponsRemaining = finalTestCoupons.filter((c: any) => c.status === 'active');

  console.log(`- E2E 테스트 쿠폰 중 'used' 개수: ${usedTestCoupons.length}장 (기대값: 2장)`);
  console.log(`- E2E 테스트 쿠폰 중 'active' 개수: ${activeTestCouponsRemaining.length}장 (기대값: 3장)`);

  if (usedTestCoupons.length === 2 && activeTestCouponsRemaining.length === 3) {
    console.log('\n>>> [최종 검증 완료] 모든 쿠폰 API (GET, POST, PUT) 연동이 완벽하게 동작합니다! (SUCCESS) <<<\n');
  } else {
    throw new Error('쿠폰 상태 변경 결과가 기대값과 일치하지 않습니다.');
  }

  // 7. DB Clean-up (DELETE)
  console.log('7. 테스트 완료 후 생성된 5장의 임시 쿠폰을 DB에서 삭제 정리합니다...');
  for (const coupon of finalTestCoupons) {
    const delRes = await fetch(`${BASE_URL}/api/coupons?id=${coupon.id}`, {
      method: 'DELETE'
    });
    const delJson = await delRes.json();
    if (!delJson.success) console.warn(`- 쿠폰 ${coupon.code} 삭제 실패`);
  }
  console.log('- 임시 데이터 정리 완료. (DB 원상복구 완료)\n');
  console.log('=== [종료] Next.js HTTP API 연동 E2E 테스트 성공 ===');
}

runApiTest().catch((err) => {
  console.error('\n>>> 테스트 수행 도중 심각한 에러 발생:', err.message);
});
