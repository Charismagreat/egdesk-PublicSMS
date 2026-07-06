/**
 * DB Event Hub (JavaScript Version)
 * 데이터베이스(SQLite)의 생성(Insert), 수정(Update), 삭제(Delete) 이벤트를 감지하여
 * 이지봇(EasyBot)의 지능형 이벤트 핸들러 API에 실시간으로 전송해주는 CDC(Change Data Capture) 허브 모듈입니다.
 */

/**
 * 데이터베이스 변경 이벤트를 이지봇 이벤트 핸들러 API로 전송합니다.
 * @param {object} event 데이터베이스 변경 이벤트 객체
 * @returns {Promise<boolean>} 성공 여부
 */
async function emitDbChange(event) {
  const isServer = typeof window === 'undefined';
  if (!isServer) {
    console.warn('[DB Event Hub] 브라우저 환경에서는 이벤트를 직접 발행하지 않습니다.');
    return false;
  }

  // 감지 대상 핵심 테이블 필터링
  const targetTables = ['crm_expenses', 'crm_orders', 'crm_deliveries', 'products', 'crm_snaptasks'];
  if (!targetTables.includes(event.table)) {
    return false; // 감지 대상이 아닐 시 즉시 무시
  }

  try {
    const port = process.env.PORT || '4000';
    const baseUrl = `http://localhost:${port}`;
    const targetUrl = `${baseUrl}/api/easybot/event-handler`;

    console.log(`[DB Event Hub] 변경 감지됨: 테이블 [${event.table}], 액션 [${event.action}]. 이지봇으로 이벤트 전송 중...`);

    // 로컬 API 엔드포인트를 호출하여 이지봇에 웹훅 전송
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DB Event Hub] 이지봇 전송 실패 (HTTP ${response.status}):`, errorText);
      return false;
    }

    const resData = await response.json();
    if (resData.success) {
      console.log(`[DB Event Hub] 이지봇 지능형 분석 및 조치가 성공적으로 완료되었습니다.`);
      return true;
    } else {
      console.warn(`[DB Event Hub] 이지봇 분석 처리 경고: ${resData.reason || '알 수 없는 이유'}`);
      return false;
    }
  } catch (err) {
    console.error('[DB Event Hub] 이지봇 이벤트 연동 중 예외 오류 발생:', err);
    return false;
  }
}

module.exports = {
  emitDbChange
};
