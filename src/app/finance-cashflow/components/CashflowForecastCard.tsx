import React from "react";
import { CashflowPoint } from "../types";
import { AlertOctagon, TrendingUp, Info } from "lucide-react";

interface CashflowForecastCardProps {
  forecast: CashflowPoint[];
  currentBalance: number;
}

/**
 * 90일 자금 흐름 시계열 예측 및 고갈 경보 차트 컴포넌트
 */
export default function CashflowForecastCard({ forecast, currentBalance }: CashflowForecastCardProps) {
  if (!forecast || forecast.length === 0) return null;

  // SVG 크기 정의
  const width = 800;
  const height = 300;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 40;

  // 값 스케일 범위 구하기
  // 최소값은 0으로 고정하여 마이너스 흐름 체크
  let maxVal = currentBalance;
  forecast.forEach((pt) => {
    maxVal = Math.max(maxVal, pt.balanceNormal, pt.balanceOptimistic, pt.balancePessimistic);
  });
  // 약간의 상단 버퍼 추가
  maxVal = maxVal * 1.1;

  // 좌표 변환 헬퍼
  const getX = (index: number) => {
    const step = (width - paddingLeft - paddingRight) / (forecast.length - 1);
    return paddingLeft + index * step;
  };

  const getY = (val: number) => {
    const activeHeight = height - paddingTop - paddingBottom;
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    return height - paddingBottom - ratio * activeHeight;
  };

  // 1. 시계열 경로 그리기 (Normal, Optimistic, Pessimistic)
  let normalPath = "";
  let optimisticPath = "";
  let pessimisticPath = "";
  
  // 낙관-비관 밴드 영역 면적 그리기용 데이터
  let bandPoints = "";

  forecast.forEach((pt, idx) => {
    const x = getX(idx);
    const yNormal = getY(pt.balanceNormal);
    const yOptimistic = getY(pt.balanceOptimistic);
    const yPessimistic = getY(pt.balancePessimistic);

    if (idx === 0) {
      normalPath = `M ${x} ${yNormal}`;
      optimisticPath = `M ${x} ${yOptimistic}`;
      pessimisticPath = `M ${x} ${yPessimistic}`;
    } else {
      normalPath += ` L ${x} ${yNormal}`;
      optimisticPath += ` L ${x} ${yOptimistic}`;
      pessimisticPath += ` L ${x} ${yPessimistic}`;
    }
  });

  // 낙관 라인을 순방향으로 가고, 비관 라인을 역방향으로 엮어 밴드 영역 만듦
  for (let i = 0; i < forecast.length; i++) {
    bandPoints += `${getX(i)},${getY(forecast[i].balanceOptimistic)} `;
  }
  for (let i = forecast.length - 1; i >= 0; i--) {
    bandPoints += `${getX(i)},${getY(forecast[i].balancePessimistic)} `;
  }

  // 2. 자금 고갈 D-Day 탐지 (비관 시나리오 또는 기준 시나리오에서 잔액이 15,000,000원 이하로 하락하는 시점)
  const LIMIT_CASH_WARNING = 15000000;
  let criticalDDayIndex = -1;
  let criticalDate = "";
  let criticalAmount = 0;

  for (let i = 0; i < forecast.length; i++) {
    // 비관 시나리오에서 1500만원 선 이하 하향 돌파하는 최초의 시점 감지
    if (forecast[i].balancePessimistic <= LIMIT_CASH_WARNING) {
      criticalDDayIndex = i;
      criticalDate = forecast[i].date;
      criticalAmount = forecast[i].balancePessimistic;
      break;
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs text-left grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* 좌측: 자금 예측 요약 및 위기 경보판 */}
      <div className="space-y-4 xl:col-span-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">90일 현금 흐름 AI 전망</h4>
              <p className="text-[9px] text-slate-400 font-bold">인건비/자재비 시뮬레이션 결과 연동</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mt-2">
            <span className="text-[9px] font-black text-slate-400">현재 총 가용 현금 계고액</span>
            <h3 className="text-xl font-black text-slate-800 mt-1">{currentBalance.toLocaleString()}원</h3>
            <span className="text-[8.5px] font-black text-emerald-600 block mt-1">🟢 4개 계좌 동기화 상태</span>
          </div>
        </div>

        {/* 자금 경보 인디케이터 */}
        {criticalDDayIndex !== -1 ? (
          <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-rose-700">
              <AlertOctagon className="w-4.5 h-4.5 text-rose-600 shrink-0 animate-bounce" />
              <span className="text-xs font-black">자금 경색 D-Day 감지!</span>
            </div>
            <p className="text-[9.5px] font-bold text-slate-700 leading-relaxed">
              비관 시나리오 진행 시, 자재 결제와 인건비 지출이 겹치는 **{criticalDate.slice(5)}**에 가용 자금이 **{criticalAmount.toLocaleString()}원**으로 하락해 임계치 이하 자금 경색이 발생할 수 있습니다.
            </p>
            <div className="bg-white border border-rose-200 rounded-xl py-1 px-2.5 text-center">
              <span className="text-[10px] font-black text-rose-600">
                🚨 위기 예상일 D-{criticalDDayIndex}일
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-550/10 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black">자금 안전 지대 유지</span>
            </div>
            <p className="text-[9.5px] font-bold text-slate-700 leading-normal">
              향후 90일 내에 가용 현금이 위험 하한선(1,500만 원) 이하로 이탈할 리스크가 관측되지 않고 안전합니다.
            </p>
          </div>
        )}
      </div>

      {/* 우측: 예측 차트 렌더링 영역 */}
      <div className="xl:col-span-3 space-y-3">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-indigo-500 inline-block" />
              <span>기준 예측선 (Normal)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 bg-slate-200 inline-block" />
              <span>시나리오 예측 폭 (Optimistic - Pessimistic)</span>
            </div>
          </div>
          <span>가로축: 오늘부터 90일간</span>
        </div>

        {/* 차트 SVG */}
        <div className="bg-slate-50 border border-slate-150 rounded-3xl p-3 relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* 그리드 가로선 및 라벨 */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
              const val = maxVal * r;
              const y = getY(val);
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="4,4" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="bold">
                    {val >= 100000000 ? `${(val / 100000000).toFixed(1)}억` : `${(val / 10000).toLocaleString()}만`}
                  </text>
                </g>
              );
            })}

            {/* 날짜 가이드 세로선 (15일 간격) */}
            {forecast.filter((_, i) => i % 15 === 0).map((pt, idx) => {
              const originalIndex = forecast.findIndex(p => p.date === pt.date);
              const x = getX(originalIndex);
              return (
                <g key={idx}>
                  <line x1={x} y1={paddingTop} x2={x} y2={height - paddingBottom} stroke="#e2e8f0" strokeWidth="0.8" />
                  <text x={x} y={height - paddingBottom + 12} textAnchor="middle" fontSize="7.5" fill="#94a3b8" fontWeight="bold">
                    {pt.date.slice(5)}
                  </text>
                </g>
              );
            })}

            {/* 1500만원 위험 하한선 실선 */}
            <line x1={paddingLeft} y1={getY(LIMIT_CASH_WARNING)} x2={width - paddingRight} y2={getY(LIMIT_CASH_WARNING)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" />
            <text x={width - paddingRight - 5} y={getY(LIMIT_CASH_WARNING) - 4} textAnchor="end" fontSize="7.5" fill="#ef4444" fontWeight="black">
              경고한계선 (1,500만 원)
            </text>

            {/* 시나리오 변동 범위 밴드 면적 채우기 */}
            <polygon points={bandPoints} fill="#818cf8" fillOpacity="0.12" />

            {/* 예측선 렌더링 */}
            <path d={optimisticPath} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
            <path d={pessimisticPath} fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
            <path d={normalPath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />

            {/* 임계점 수직 위험선 표시 */}
            {criticalDDayIndex !== -1 && (
              <g>
                <line x1={getX(criticalDDayIndex)} y1={paddingTop} x2={getX(criticalDDayIndex)} y2={height - paddingBottom} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" />
                <circle cx={getX(criticalDDayIndex)} cy={getY(criticalAmount)} r="5" fill="#ef4444" stroke="white" strokeWidth="1.5" />
                <text x={getX(criticalDDayIndex)} y={paddingTop + 12} fontSize="8" fill="#ef4444" fontWeight="black" textAnchor="middle" className="bg-white px-1">
                  🚨 위기 예상일 ({criticalDate.slice(5)})
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="flex gap-1.5 text-[8.5px] font-bold text-slate-400 bg-slate-50 border border-slate-150 rounded-xl p-2.5">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-left">
            자금 흐름은 당월 급여일(15일)과 자재 대금 지급일(10일, 20일 등)의 지출 집중 및 미수금 입금 일정에 따라 수천만 원 단위의 등락이 반복됩니다. 좌측의 AI 위기 예측 가이드에 따라 마이너스 잔고 위험을 사전에 방비해 주세요.
          </p>
        </div>
      </div>

    </div>
  );
}
