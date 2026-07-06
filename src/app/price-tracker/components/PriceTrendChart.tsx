import React from "react";
import { BarChart3, Globe } from "lucide-react";
import { ExchangeRateHistory, RateHoverInfo } from "../types";
import { getRateSvgPathData } from "../utils/chartHelper";

const CURRENCIES = ["USD", "EUR", "JPY", "CNY"];
const CURRENCY_NAMES: Record<string, string> = {
  USD: "미국 달러",
  EUR: "유럽 유로",
  JPY: "일본 엔화 (100)",
  CNY: "중국 위안"
};

interface PriceTrendChartProps {
  exchangeRateHistories: ExchangeRateHistory[];
  activeRateTab: string;
  setActiveRateTab: (tab: string) => void;
  rateHoverInfo: RateHoverInfo | null;
  setRateHoverInfo: (info: RateHoverInfo | null) => void;
  rateScrollRef: React.RefObject<HTMLDivElement | null>;
}

export default function PriceTrendChart({
  exchangeRateHistories,
  activeRateTab,
  setActiveRateTab,
  rateHoverInfo,
  setRateHoverInfo,
  rateScrollRef
}: PriceTrendChartProps) {
  const { path: rateSvgPath, points: rateSvgPoints, fillPath: rateFillPath, width: rateChartWidth } =
    getRateSvgPathData(exchangeRateHistories, activeRateTab);

  const activeRates = exchangeRateHistories.filter(x => x.currency_code === activeRateTab);
  const maxRateVal = activeRates.length > 0 ? Math.max(...activeRates.map(x => x.rate_value)) : 0;
  const minRateVal = activeRates.length > 0 ? Math.min(...activeRates.map(x => x.rate_value)) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
        <div className="space-y-0.5">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-pink-650" />
            글로벌 4대 외환 시세 추이 분석 (올해 전체 누적 이력)
          </h3>
          <p className="text-[9.5px] text-slate-400 font-semibold">서버 중단 기간 동안 누락되었던 공백 시세를 자가 회복하여 연속성 보증</p>
        </div>

        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          {CURRENCIES.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveRateTab(code)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                activeRateTab === code
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-slate-450 hover:text-slate-700"
              }`}
            >
              {CURRENCY_NAMES[code].split(' ')[0]} ({code})
            </button>
          ))}
        </div>
      </div>

      {/* 환율 선형 SVG 꺾은선 차트 렌더링 */}
      {rateSvgPoints.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2">
          <Globe className="w-8 h-8 text-slate-355 animate-spin-slow" />
          환율 누적 변동 데이터가 없습니다. 상단 [실시간 환율 강제 갱신]을 눌러주세요.
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
          
          {/* 차트 영역 (가로 스크롤 컨테이너 바인딩) */}
          <div 
            ref={rateScrollRef} 
            className="lg:col-span-3 py-1 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-650 scrollbar-track-slate-100 rounded-2xl w-full min-w-0"
          >
            <svg 
              viewBox={`0 0 ${rateChartWidth} 150`} 
              className="overflow-visible"
              style={{ width: rateChartWidth, minWidth: rateChartWidth, height: 150, display: "block" }}
              onMouseLeave={() => setRateHoverInfo(null)}
            >
              <defs>
                <linearGradient id="rateAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#db2777" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#db2777" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* 가이드라인 */}
              <line x1="50" y1="15" x2={rateChartWidth - 30} y2="15" stroke="#f8fafc" strokeWidth="1" />
              <line x1="50" y1="75" x2={rateChartWidth - 30} y2="75" stroke="#f1f5f9" strokeWidth="0.8" strokeDasharray="3" />
              <line x1="50" y1="130" x2={rateChartWidth - 30} y2="130" stroke="#f1f5f9" strokeWidth="1" />

              {/* 면적 그라데이션 필 */}
              <path d={rateFillPath} fill="url(#rateAreaGradient)" />

              {/* 꺾은선 */}
              <path d={rateSvgPath} fill="none" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" />

              {/* 포인트 */}
              {rateSvgPoints.map((pt, idx) => {
                const isLast = idx === rateSvgPoints.length - 1;
                const shouldRenderPoint = rateSvgPoints.length <= 15 || isLast;
                if (!shouldRenderPoint) return null;

                return (
                  <g key={idx}>
                    <circle cx={pt.x} cy={pt.y} r={isLast ? 5.5 : 3.5} fill={isLast ? "#db2777" : "#be185d"} stroke="#ffffff" strokeWidth="1.5" />
                    {isLast && (
                      <circle cx={pt.x} cy={pt.y} r="11" fill="none" stroke="#db2777" strokeWidth="1" className="animate-ping" style={{ transformOrigin: `${pt.x}px ${pt.y}px` }} />
                    )}
                  </g>
                );
              })}

              {/* 날짜 라벨 (겹침 현상 해소 및 한글 친화 캘린더 포맷팅) */}
              {(() => {
                const labelStep = Math.max(1, Math.ceil(rateSvgPoints.length / 8));
                
                return rateSvgPoints.map((pt, idx) => {
                  const isLast = idx === rateSvgPoints.length - 1;
                  const isFirst = idx === 0;
                  
                  const shouldRenderLabel = isFirst || isLast || (idx % labelStep === 0 && idx < rateSvgPoints.length - labelStep * 0.7);
                  if (!shouldRenderLabel) return null;

                  let formattedDate = pt.date;
                  if (pt.date.includes("-")) {
                    const parts = pt.date.split("-");
                    const month = parseInt(parts[0], 10);
                    const day = parseInt(parts[1], 10);
                    formattedDate = `${month}월 ${day}일`;
                  }

                  return (
                    <text key={idx} x={pt.x} y="145" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="bold">
                      {formattedDate}
                    </text>
                  );
                });
              })()}

              {/* 럭셔리 마우스 오버 툴팁 가이드선 & 카드 박스 */}
              {rateHoverInfo && (
                <g>
                  <line
                    x1={rateHoverInfo.x}
                    y1={15}
                    x2={rateHoverInfo.x}
                    y2={130}
                    stroke="#db2777"
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                  />
                  
                  <circle
                    cx={rateHoverInfo.x}
                    cy={rateHoverInfo.y}
                    r="6.5"
                    fill="#db2777"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="shadow-md"
                  />

                  {/* 카드 박스 렌더링 */}
                  {(() => {
                    const tooltipWidth = 110;
                    const tooltipHeight = 42;
                    let tooltipX = rateHoverInfo.x - tooltipWidth / 2;
                    
                    if (tooltipX < 50) tooltipX = 50;
                    if (tooltipX + tooltipWidth > rateChartWidth - 30) {
                      tooltipX = rateChartWidth - 30 - tooltipWidth;
                    }

                    const tooltipY = Math.max(5, rateHoverInfo.y - 52);

                    return (
                      <g className="select-none pointer-events-none">
                        <rect
                          x={tooltipX}
                          y={tooltipY}
                          width={tooltipWidth}
                          height={tooltipHeight}
                          rx="8"
                          fill="#0f172a"
                          fillOpacity="0.92"
                          stroke="#db2777"
                          strokeWidth="1.5"
                          className="shadow-2xl"
                        />
                        <text
                          x={tooltipX + tooltipWidth / 2}
                          y={tooltipY + 14}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="8.5"
                          fontWeight="bold"
                        >
                          {rateHoverInfo.date}
                        </text>
                        <text
                          x={tooltipX + tooltipWidth / 2}
                          y={tooltipY + 31}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="900"
                          fontFamily="monospace"
                        >
                          {rateHoverInfo.val.toLocaleString()} 원
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 툴팁 반응용 투명 센서 오버레이 */}
              {rateSvgPoints.map((pt, idx) => {
                let formattedDate = pt.date;
                if (pt.date.includes("-")) {
                  const parts = pt.date.split("-");
                  const month = parseInt(parts[0], 10);
                  const day = parseInt(parts[1], 10);
                  formattedDate = `${month}월 ${day}일`;
                }

                const rectWidth = (rateChartWidth - 90) / rateSvgPoints.length;
                const rectX = pt.x - rectWidth / 2;

                return (
                  <rect
                    key={`rate-sensor-${idx}`}
                    x={rectX}
                    y={0}
                    width={rectWidth}
                    height={130}
                    fill="transparent"
                    className="cursor-crosshair opacity-0"
                    onMouseEnter={() => setRateHoverInfo({
                      x: pt.x,
                      y: pt.y,
                      val: pt.val,
                      date: formattedDate,
                      index: idx
                    })}
                    onMouseMove={() => setRateHoverInfo({
                      x: pt.x,
                      y: pt.y,
                      val: pt.val,
                      date: formattedDate,
                      index: idx
                    })}
                  />
                );
              })}
            </svg>
          </div>

          {/* 수치 요약 패널 */}
          <div className="lg:col-span-1 bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between min-h-[130px] w-full">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">
                {CURRENCY_NAMES[activeRateTab]}
              </span>
              <h4 className="text-xl font-black text-slate-855 font-mono">
                {rateSvgPoints[rateSvgPoints.length - 1]?.val.toLocaleString()} 원
              </h4>
            </div>

            <div className="border-t border-slate-200/80 pt-3 mt-3 space-y-1.5 text-[10.5px]">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">올해 최고가</span>
                <span className="text-slate-700 font-mono">
                  {maxRateVal.toLocaleString()} 원
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-400">올해 최저가</span>
                <span className="text-slate-700 font-mono">
                  {minRateVal.toLocaleString()} 원
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
