import React from "react";
import { CreditRiskStats, OverdueAgingDetail } from "../types";
import { ShieldAlert, TrendingDown, Users, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CreditRiskCardProps {
  stats: CreditRiskStats[];
  aging: OverdueAgingDetail | null;
  selectedPartnerId: string;
  onSelectPartner: (id: string) => void;
  onRecalculate: () => void;
  isRecalculating: boolean;
}

export default function CreditRiskCard({
  stats,
  aging,
  selectedPartnerId,
  onSelectPartner,
  onRecalculate,
  isRecalculating
}: CreditRiskCardProps) {
  
  // 에이징 데이터가 없을 시 기본 빈값 대응
  const agingCategories = aging?.categories || ["1~30일", "31~60일", "61~90일", "90일 초과"];
  const agingAmounts = aging?.amounts || [0, 0, 0, 0];
  const totalAgingAmount = agingAmounts.reduce((sum, val) => sum + val, 0);

  // SVG 차트용 비율 계산
  const colorPalette = ["#818cf8", "#f59e0b", "#ef4444", "#6b7280"]; // indigo-400, amber-500, red-500, gray-500
  const accumulatedPercent: number[] = [];
  let currentSum = 0;
  
  agingAmounts.forEach((amt) => {
    const pct = totalAgingAmount > 0 ? (amt / totalAgingAmount) * 100 : 0;
    accumulatedPercent.push(pct);
    currentSum += pct;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full text-slate-800">
      
      {/* 카드 헤더 */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 rounded-2xl">
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black tracking-tight">거래처 리스크 대장</h2>
            <p className="text-[10px] text-slate-400 font-bold">실시간 신용 점수 및 미수금 연체 분석</p>
          </div>
        </div>

        <button
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
        >
          {isRecalculating ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              진단 중...
            </>
          ) : (
            "실시간 재분석 스캔"
          )}
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        
        {/* 미수금 에이징(Aging) 현황 분석 차트 (순수 SVG 가로 누적 바 차트) */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 text-left">
          <span className="block text-[9px] text-slate-400 font-black">전체 미수채권 연체 에이징 (Aging) 분석</span>
          <span className="text-base font-black tracking-tight font-mono text-slate-800 mt-0.5 block">
            ₩ {totalAgingAmount.toLocaleString()} <span className="text-[10px] text-slate-400">원 연체 중</span>
          </span>

          {/* SVG 누적 가로 막대 그래프 */}
          <div className="mt-3 relative h-4 w-full rounded-full overflow-hidden bg-slate-200 flex">
            {agingAmounts.map((amt, idx) => {
              const pct = accumulatedPercent[idx];
              if (pct <= 0) return null;
              return (
                <div
                  key={idx}
                  style={{ width: `${pct}%`, backgroundColor: colorPalette[idx] }}
                  className="h-full transition-all duration-500"
                  title={`${agingCategories[idx]}: ₩ ${amt.toLocaleString()}원 (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* 범례 표시 */}
          <div className="grid grid-cols-4 gap-1 mt-3.5">
            {agingCategories.map((cat, idx) => (
              <div key={idx} className="flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorPalette[idx] }} />
                  <span className="text-[8px] font-bold text-slate-500">{cat}</span>
                </div>
                <span className="text-[9px] font-black font-mono text-slate-700 mt-0.5 pl-3">
                  ₩ {(agingAmounts[idx] / 10000).toLocaleString()} <span className="text-[7px] font-normal text-slate-400">만원</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 거래처 카드 리스트 */}
        <div className="space-y-3">
          <span className="block text-[9px] text-slate-400 font-black text-left">거래처별 실시간 위험 모니터링 (클릭하여 선택)</span>
          
          <div className="space-y-2">
            {stats.map((partner) => {
              const isSelected = partner.id === selectedPartnerId;
              const isCritical = partner.riskLevel === "CRITICAL";
              const isWarning = partner.riskLevel === "WARNING";

              return (
                <div
                  key={partner.id}
                  onClick={() => onSelectPartner(partner.id)}
                  className={`cursor-pointer text-left p-4 rounded-2xl border transition-all duration-200 relative ${
                    isSelected
                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10 translate-x-1"
                      : "bg-white border-slate-100 text-slate-800 hover:bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {/* 파트너 등급 & 리스크 뱃지 */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                          isCritical
                            ? "bg-rose-500 text-white"
                            : isWarning
                            ? "bg-amber-500 text-white"
                            : isSelected
                            ? "bg-white/20 text-slate-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                        }`}>
                          {partner.riskLevel}
                        </span>

                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                          isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          신용 {partner.creditRating}등급
                        </span>

                        <span className={`text-[8px] font-black ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}>
                          매출비중 {((partner.totalSales / 378000000) * 100).toFixed(1)}%
                        </span>
                      </div>

                      <h3 className="text-xs font-black mt-2 tracking-tight">
                        {partner.companyName}
                      </h3>
                      
                      <p className={`text-[9px] font-bold mt-1 ${
                        isSelected ? "text-slate-300/80" : "text-slate-400"
                      }`}>
                        담당자: {partner.managerName} ({partner.managerPhone})
                      </p>
                    </div>

                    {/* 연체금 및 부도확률 요약 */}
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-xs font-black font-mono ${
                        isSelected ? "text-white" : "text-slate-900"
                      }`}>
                        ₩ {partner.overdueAmount.toLocaleString()}원
                      </span>

                      {partner.overdueDays > 0 ? (
                        <span className="text-[9px] font-black text-rose-500 mt-0.5 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                          D+{partner.overdueDays} 연체
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-500 mt-0.5 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          연체 없음
                        </span>
                      )}

                      <div className="mt-2 text-[9px] font-bold">
                        <span className={isSelected ? "text-slate-400" : "text-slate-400"}>부도확률: </span>
                        <span className={`font-mono font-black ${
                          partner.defaultProbability >= 70
                            ? "text-rose-500"
                            : partner.defaultProbability >= 40
                            ? "text-amber-500"
                            : isSelected
                            ? "text-emerald-300"
                            : "text-emerald-600"
                        }`}>
                          {partner.defaultProbability.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 하단 최근 조치 내역 가이드라인 */}
                  <div className={`mt-3 pt-2.5 border-t text-[8px] font-bold flex items-center justify-between ${
                    isSelected ? "border-white/10 text-slate-300" : "border-slate-100 text-slate-400"
                  }`}>
                    <span>최근 조치: {partner.lastAction}</span>
                    <span className="font-mono">{partner.actionDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
