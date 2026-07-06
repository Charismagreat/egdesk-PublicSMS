import { queryTable, insertRows } from '../../../../../../../egdesk-helpers';

export async function handleCompetitorPriceCapture(reqBody: any, nowStr: string) {
  const { matchedItemId, data } = reqBody;
  const { competitorName, itemName, capturedPrice, captureUrl } = data || {};

  if (!matchedItemId) {
    throw new Error('매핑할 자사 품목(matchedItemId)을 선택해 주세요.');
  }

  if (!capturedPrice) {
    throw new Error('등록할 수집 가격(capturedPrice) 정보가 누락되었습니다.');
  }

  // 1) 감시 대상 URL 쿼리 및 필요시 생성
  const urlsRes = await queryTable('target_urls', {
    filters: { item_id: String(matchedItemId), site_name: competitorName }
  });
  let urlId = urlsRes.rows && urlsRes.rows.length > 0 ? urlsRes.rows[0].url_id : null;

  if (!urlId) {
    const allUrls = await queryTable('target_urls', {});
    const maxUrlId = allUrls.rows && allUrls.rows.length > 0 ? Math.max(...allUrls.rows.map((u: any) => Number(u.url_id) || 0)) : 0;
    urlId = maxUrlId + 1;

    await insertRows('target_urls', [{
      url_id: urlId,
      item_id: Number(matchedItemId),
      site_name: competitorName || '외부 사이트',
      target_url: captureUrl || 'http://localhost:4000/price-tracker',
      css_selector: 'body',
      cron_interval: '0 9 * * *',
      is_active: 1,
      created_at: nowStr
    }]);
  }

  // 2) price_histories 에 이력 기록
  const historiesRes = await queryTable('price_histories', {});
  const maxHistoryId = historiesRes.rows && historiesRes.rows.length > 0 ? Math.max(...historiesRes.rows.map((h: any) => Number(h.history_id) || 0)) : 0;
  const newHistoryId = maxHistoryId + 1;

  await insertRows('price_histories', [{
    history_id: newHistoryId,
    url_id: urlId,
    captured_price: Number(capturedPrice),
    captured_at: nowStr,
    status: 'SUCCESS',
    error_message: null
  }]);

  // 3) 마진 실시간 연산 및 경보 트리거 감시
  const itemRes = await queryTable('tracked_items', { filters: { item_id: String(matchedItemId) } });
  const currentItem = itemRes.rows && itemRes.rows.length > 0 ? itemRes.rows[0] : null;
  
  let marginReport = '마진 분석 생략';
  let isMarginCollapsed = false;

  if (currentItem) {
    const basePrice = Number(currentItem.base_price || 0);
    const targetMarginRate = Number(currentItem.target_margin_rate || 10.0);
    
    const currentMarginRate = capturedPrice > 0 ? ((capturedPrice - basePrice) / capturedPrice) * 100 : 0;
    
    isMarginCollapsed = currentMarginRate < targetMarginRate;
    marginReport = `자사 매입원가 ${basePrice.toLocaleString()}원 대비 경쟁가 ${capturedPrice.toLocaleString()}원의 현재 마진율은 ${currentMarginRate.toFixed(1)}% 입니다. (목표 마진율: ${targetMarginRate}%)`;

    if (isMarginCollapsed) {
      const recentLogs = await queryTable('alert_logs', { orderBy: 'sent_at', orderDirection: 'DESC' });
      const lastLog = (recentLogs.rows || []).find((l: any) => {
        const timeDiff = Date.now() - new Date(l.sent_at).getTime();
        return l.sent_message.includes(currentItem.item_name) && timeDiff < 3 * 60 * 60 * 1000;
      });

      if (!lastLog) {
        const logsAll = await queryTable('alert_logs', {});
        const maxLogId = logsAll.rows && logsAll.rows.length > 0 ? Math.max(...logsAll.rows.map((l: any) => Number(l.log_id) || 0)) : 0;
        const newLogId = maxLogId + 1;

        const smsMsg = `[🚨마진비상] 품목 '${currentItem.item_name}'의 마진율이 ${currentMarginRate.toFixed(1)}%로 목표치(${targetMarginRate}%) 아래로 붕괴되었습니다! (경쟁가: ${capturedPrice.toLocaleString()}원, 원가: ${basePrice.toLocaleString()}원)`;
        
        await insertRows('alert_logs', [{
          log_id: newLogId,
          rule_id: 999,
          sent_price: Number(capturedPrice),
          sent_message: smsMsg,
          sent_at: nowStr,
          api_response: 'SUCCESS'
        }]);
      }
    }
  }

  return {
    action: 'competitor_price_completed',
    competitorName,
    itemName,
    capturedPrice,
    marginReport,
    isMarginCollapsed,
    message: `경쟁사 [${competitorName}]의 제품 [${itemName}] 시세(${capturedPrice.toLocaleString()}원) 매핑 등록이 정상 완료되었습니다. ${isMarginCollapsed ? '⚠️ 마진 붕괴 위험 감지!' : '🟢 마진 양호'}`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 경쟁사 [${competitorName}]의 제품 [${itemName}] 시세(${capturedPrice.toLocaleString()}원) 매핑 등록을 대행하였습니다.`
  };
}
