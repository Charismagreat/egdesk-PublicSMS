import { Url, ExchangeRateHistory } from "../types";

/**
 * 특정 품목의 최근 가격 변동 이력에 대한 SVG 차트 경로 데이터와 점 좌표를 연산합니다.
 */
export function getSvgPathData(urls: Url[]) {
  if (urls.length === 0 || !urls[0].history || urls[0].history.length === 0) {
    return { path: "", points: [] as { x: number; y: number; price: number; date: string }[], width: 600 };
  }
  
  const history = urls[0].history;
  const maxVal = Math.max(...history.map((h) => Number(h.captured_price))) * 1.03;
  const minVal = Math.min(...history.map((h) => Number(h.captured_price))) * 0.97;
  const valRange = maxVal - minVal || 1;

  const width = Math.max(600, history.length * 32 + 80);
  const height = 180;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 20;
  const paddingBottom = 20;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = history.map((h, idx) => {
    const x = history.length > 1 
      ? paddingLeft + (idx / (history.length - 1)) * plotWidth
      : paddingLeft + plotWidth / 2;
    const y = paddingTop + plotHeight - ((h.captured_price - minVal) / valRange) * plotHeight;
    return { x, y, price: h.captured_price, date: h.captured_at.slice(5, 10) };
  });

  const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  return { path, points, width };
}

/**
 * 특정 통화(USD, EUR 등)의 과거 환율 추이에 대한 SVG 차트 경로 데이터와 점 좌표를 연산합니다.
 */
export function getRateSvgPathData(exchangeRateHistories: ExchangeRateHistory[], activeRateTab: string) {
  const rateHistory = exchangeRateHistories.filter(x => x.currency_code === activeRateTab);
  if (rateHistory.length === 0) {
    return { 
      path: "", 
      points: [] as { x: number; y: number; val: number; date: string }[], 
      fillPath: "", 
      width: 600 
    };
  }

  const maxVal = Math.max(...rateHistory.map((h) => Number(h.rate_value))) * 1.01;
  const minVal = Math.min(...rateHistory.map((h) => Number(h.rate_value))) * 0.99;
  const valRange = maxVal - minVal || 1;

  const width = Math.max(600, rateHistory.length * 32 + 80);
  const height = 150;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 15;
  const paddingBottom = 20;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = rateHistory.map((h, idx) => {
    const x = rateHistory.length > 1 
      ? paddingLeft + (idx / (rateHistory.length - 1)) * plotWidth
      : paddingLeft + plotWidth / 2;
    const y = paddingTop + plotHeight - ((h.rate_value - minVal) / valRange) * plotHeight;
    return { x, y, val: h.rate_value, date: h.captured_date.slice(5, 10) };
  });

  const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  
  let fillPath = "";
  if (points.length > 0) {
    fillPath = `${path} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`;
  }

  return { path, points, fillPath, width };
}
