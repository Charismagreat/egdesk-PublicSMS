const { queryTable } = require('../egdesk-helpers');

async function main() {
  try {
    console.log('--- exchange_rate_histories 전체 데이터 상세 통계 ---');
    const res = await queryTable('exchange_rate_histories', { limit: 2000 });
    const rows = res.rows || [];
    console.log('전체 레코드 개수:', rows.length);

    let simCount = 0;
    let actualCount = 0;
    const simDates = [];
    const actualDates = [];

    rows.forEach(r => {
      // history_id가 2026000000 이상이면 Frankfurter API를 통한 실제 소급 데이터
      if (r.history_id >= 2026000000) {
        actualCount++;
        if (actualDates.length < 5) actualDates.push(r.captured_date);
      } else {
        simCount++;
        if (simDates.length < 5) simDates.push(r.captured_date);
      }
    });

    console.log(`\n가상 시뮬레이션 데이터 개수 (history_id < 2026000000): ${simCount}건`);
    console.log('가상 시뮬레이션 날짜 샘플:', [...new Set(simDates)]);

    console.log(`\n실제 소급 환율 데이터 개수 (history_id >= 2026000000): ${actualCount}건`);
    console.log('실제 소급 환율 날짜 샘플:', [...new Set(actualDates)]);

    // 통화별 데이터 개수
    const codeCounts = {};
    rows.forEach(r => {
      const type = r.history_id >= 2026000000 ? '실제' : '시뮬레이션';
      const key = `${r.currency_code} (${type})`;
      codeCounts[key] = (codeCounts[key] || 0) + 1;
    });
    console.log('\n통화별 & 데이터타입별 분포:', codeCounts);

  } catch (error) {
    console.error('에러 발생:', error);
  }
}

main();


