const { queryTable, deleteRows } = require('../egdesk-helpers');

async function main() {
  try {
    console.log('--- 가상 시뮬레이션 환율 이력 데이터 제거 작업 시작 ---');
    
    // 1. 모든 환율 이력 데이터 조회
    const res = await queryTable('exchange_rate_histories', { limit: 2000 });
    const rows = res.rows || [];
    
    // 2. 가상 시뮬레이션 데이터 필터링 (history_id가 2026000000 미만인 것)
    const simRows = rows.filter(r => r.history_id < 2026000000);
    console.log(`발견된 가상 시뮬레이션 데이터: ${simRows.length}건`);
    
    if (simRows.length === 0) {
      console.log('제거할 가상 데이터가 없습니다.');
      return;
    }
    
    const simIds = simRows.map(r => r.id);
    console.log('제거할 데이터 ID 목록:', simIds);
    
    // 3. deleteRows를 사용해 ID 기반 삭제 수행
    // egdesk-helpers의 deleteRows 인터페이스: deleteRows(tableName, { ids: [ ... ] })
    console.log('데이터 삭제 수행 중...');
    const deleteResult = await deleteRows('exchange_rate_histories', { ids: simIds });
    console.log('삭제 처리 완료:', deleteResult);
    
    // 4. 삭제 결과 확인
    const checkRes = await queryTable('exchange_rate_histories', { limit: 2000 });
    const remainingRows = checkRes.rows || [];
    const remainingSimCount = remainingRows.filter(r => r.history_id < 2026000000).length;
    console.log(`남아있는 가상 시뮬레이션 데이터 개수: ${remainingSimCount}건`);
    console.log(`현재 총 데이터 개수: ${remainingRows.length}건`);
    
  } catch (error) {
    console.error('에러 발생:', error);
  }
}

main();
