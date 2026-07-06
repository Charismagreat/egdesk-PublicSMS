const { queryTable, deleteRows } = require('../egdesk-helpers');

async function main() {
  try {
    console.log('🧹 [Cleanup] exchange_rate_histories 테이블의 모든 환율 데이터를 완전히 지우고 초기화합니다...');
    
    // 1. 모든 환율 이력 데이터 조회
    const res = await queryTable('exchange_rate_histories', { limit: 2000 });
    const rows = res.rows || [];
    console.log(`현재 존재하는 전체 환율 데이터 개수: ${rows.length}건`);
    
    if (rows.length === 0) {
      console.log('지울 환율 데이터가 이미 존재하지 않습니다.');
      return;
    }
    
    const ids = rows.map(r => r.id);
    
    // 2. 일괄 삭제 수행
    console.log('데이터 전체 삭제 수행 중...');
    const deleteResult = await deleteRows('exchange_rate_histories', { ids });
    console.log('삭제 처리 완료:', deleteResult);
    
    // 3. 재확인
    const checkRes = await queryTable('exchange_rate_histories', { limit: 2000 });
    const remainingRows = checkRes.rows || [];
    console.log(`🧹 삭제 완료 후 남아있는 레코드 개수: ${remainingRows.length}건`);
    
  } catch (error) {
    console.error('에러 발생:', error);
  }
}

main();
