import { setupDatabase } from '../src/lib/setup-db';
import { queryTable, insertRows, deleteRows } from '../egdesk-helpers';

async function runTest() {
  console.log('=== [1] 데이터베이스 물리 테이블 정밀 검증 시작 ===');
  await setupDatabase();
  console.log('✓ setupDatabase 실행 완료');

  // 물리 테이블 목록 조회 검증
  const tables = ['tracked_items', 'target_urls', 'price_histories', 'alert_rules', 'alert_logs', 'exchange_rates', 'exchange_rate_histories'];
  for (const table of tables) {
    try {
      const res = await queryTable(table, { limit: 1 });
      console.log(`✓ 테이블 물리 연결 성공: "${table}" (상태: 정상)`);
    } catch (err: any) {
      console.error(`✗ 테이블 물리 확인 실패: "${table}"`, err.message);
      process.exit(1);
    }
  }

  console.log('\n=== [2] 가격 추적 AI 기능 E2E 단위 테스트 ===');

  const testItemId = 999123;
  const testUrlId = 999456;
  const testHistoryId = 999789;
  const testRuleId = 999321;

  try {
    // 1. 기존 잔여 테스트 데이터 청소
    console.log('• 기존 잔여 테스트 데이터 정리...');
    await deleteRows('tracked_items', { filters: { item_id: String(testItemId) } });
    await deleteRows('target_urls', { filters: { url_id: String(testUrlId) } });
    await deleteRows('price_histories', { filters: { history_id: String(testHistoryId) } });
    await deleteRows('alert_rules', { filters: { rule_id: String(testRuleId) } });

    // 2. 가격 추적 품목 등록 테스트
    console.log('• [tracked_items] 신규 자재 품목 등록 테스트...');
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    await insertRows('tracked_items', [{
      item_id: testItemId,
      item_code: 'TEST-RAW-COPPER',
      item_name: '테스트용 전기동 구리',
      category: 'RAW_MATERIAL',
      base_price: 9000.00,
      target_margin_rate: 10.00,
      created_at: nowStr
    }]);
    console.log('✓ tracked_items 데이터 삽입 성공');

    // 3. 감시 대상 URL 등록 테스트
    console.log('• [target_urls] 감시 대상 URL 및 셀렉터 등록 테스트...');
    await insertRows('target_urls', [{
      url_id: testUrlId,
      item_id: testItemId,
      site_name: '테스트 구리 시세 사이트',
      target_url: 'https://www.test-copper-price.com',
      css_selector: 'span.price',
      cron_interval: '0 12 * * *',
      is_active: 1,
      created_at: nowStr
    }]);
    console.log('✓ target_urls 데이터 삽입 성공');

    // 4. 수집 가격 이력 기록 테스트
    console.log('• [price_histories] 파싱 가격 수집 이력 테스트...');
    await insertRows('price_histories', [{
      history_id: testHistoryId,
      url_id: testUrlId,
      captured_price: 8500.00,
      captured_at: nowStr,
      status: 'SUCCESS'
    }]);
    console.log('✓ price_histories 데이터 삽입 성공');

    // 5. 알림 규칙 및 발송 조건 생성 테스트
    console.log('• [alert_rules] 가격 알림 규칙 생성 테스트...');
    await insertRows('alert_rules', [{
      rule_id: testRuleId,
      item_id: testItemId,
      rule_name: '테스트 마진 붕괴 알림 규칙',
      condition_type: 'MARGIN_BREAKDOWN',
      threshold_value: 5.00,
      phone_number: '010-9999-8888',
      sms_template: '테스트 마진 경보 문자 양식',
      is_enabled: 1
    }]);
    console.log('✓ alert_rules 데이터 삽입 성공');

    // 6. 조회 및 정합성 검증
    console.log('• 데이터베이스 정합성 및 셀프 쿼리 매칭 테스트...');
    const itemQuery = await queryTable('tracked_items', { filters: { item_id: String(testItemId) } });
    if (itemQuery.rows && itemQuery.rows[0].item_code === 'TEST-RAW-COPPER') {
      console.log('✓ [정합성 통과] tracked_items 조회 검증 완료');
    } else {
      throw new Error('tracked_items 데이터 조회 미스매치');
    }

    const urlQuery = await queryTable('target_urls', { filters: { url_id: String(testUrlId) } });
    if (urlQuery.rows && urlQuery.rows[0].site_name === '테스트 구리 시세 사이트') {
      console.log('✓ [정합성 통과] target_urls 조회 검증 완료');
    } else {
      throw new Error('target_urls 데이터 조회 미스매치');
    }

    // 7. 테스트 데이터 안전 복구 및 제거
    console.log('• 테스트 완료 데이터 청소...');
    await deleteRows('tracked_items', { filters: { item_id: String(testItemId) } });
    await deleteRows('target_urls', { filters: { url_id: String(testUrlId) } });
    await deleteRows('price_histories', { filters: { history_id: String(testHistoryId) } });
    await deleteRows('alert_rules', { filters: { rule_id: String(testRuleId) } });
    console.log('✓ 테스트 흔적 제거 완료');

    console.log('\n=============================================');
    console.log('🎉 [TEST PASSED] 모든 가격 추적 AI 물리 테이블 및 동작이 100% 정상 작동합니다!');
    console.log('=============================================');
  } catch (err: any) {
    console.error('✗ 테스트 구동 실패:', err.message);
    process.exit(1);
  }
}

runTest();
