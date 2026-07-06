import React from "react";
import { ProductMargin } from "../types";
import { Settings2, RefreshCw, Landmark, ShieldAlert, Award } from "lucide-react";

interface CostSimulatorCardProps {
  margins: ProductMargin[];
  exchangeRate: number;
  onExchangeRateChange: (val: number) => void;
  materialRate: number;
  onMaterialRateChange: (val: number) => void;
  laborRate: number;
  onLaborRateChange: (val: number) => void;
  onReset: () => void;
  isSimulating: boolean;
}

/**
 * 환율, 원자재가, 인건비 변동에 따른 제품 마진 변화 AI 시뮬레이터 카드
 */
export default function CostSimulatorCard({
  margins,
  exchangeRate,
  onExchangeRateChange,
  materialRate,
  onMaterialRateChange,
  laborRate,
  onLaborRateChange,
  onReset,
  isSimulating
}: CostSimulatorCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs text-left grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. 슬라이더 설정 컨트롤 패널 */}
      <div className="space-y-5 lg:col-span-1 border-r border-slate-100 lg:pr-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Settings2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">원가 변동 팩터 슬라이더</h4>
              <p className="text-[9px] text-slate-400 font-bold">글로벌 지표 변동 실시간 대입</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="text-[9px] font-black text-rose-500 hover:underline flex items-center gap-0.5"
          >
            <RefreshCw className="w-3 h-3" />
            초기화
          </button>
        </div>

        {/* 슬라이더 3종 */}
        <div className="space-y-4 text-[10px] font-black text-slate-500">
          {/* 환율 슬라이더 */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>수입 원달러 환율 (KRW)</span>
              <span className="text-indigo-600 font-extrabold">{exchangeRate.toLocaleString()}원</span>
            </div>
            <input
              type="range"
              min="1200"
              max="1500"
              step="5"
              value={exchangeRate}
              onChange={(e) => onExchangeRateChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[8px] text-slate-400">
              <span>최소 1,200원</span>
              <span>기준 1,300원</span>
              <span>최대 1,500원</span>
            </div>
          </div>

          {/* 원자재비 변동 슬라이더 */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>수입 원자재 가격 변동폭</span>
              <span className={`font-extrabold ${materialRate > 0 ? 'text-rose-500' : 'text-slate-600'}`}>
                {materialRate > 0 ? `+${materialRate}% 인상` : `${materialRate}%`}
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="50"
              step="1"
              value={materialRate}
              onChange={(e) => onMaterialRateChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[8px] text-slate-400">
              <span>-10% 절감</span>
              <span>기준 0%</span>
              <span>+50% 폭등</span>
            </div>
          </div>

          {/* 인건비 변동 슬라이더 */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>공장 노무비(임금) 변동폭</span>
              <span className={`font-extrabold ${laborRate > 0 ? 'text-rose-500' : 'text-slate-600'}`}>
                {laborRate > 0 ? `+${laborRate}% 인상` : `${laborRate}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={laborRate}
              onChange={(e) => onLaborRateChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[8px] text-slate-400">
              <span>기준 0%</span>
              <span>+15% (주휴 수당)</span>
              <span>+30% 폭등</span>
            </div>
          </div>
        </div>

        {/* 팩터 변동 안내 */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 text-[9.5px] font-bold text-slate-600 space-y-1">
          <p>💡 **환율 인상 + 원자재 폭등** 시:</p>
          <p className="font-medium leading-relaxed pl-1 text-[9px]">
            수입 사출 수지 등 가공품 원가의 약 **45%**를 점유하는 재료비 가격이 동적 가산 계산되어 총 제조 원가를 실시간 압박하게 됩니다.
          </p>
        </div>
      </div>

      {/* 2. 시뮬레이션 결과 리스트 대장 */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h4 className="text-xs font-black text-slate-800">제품 단위별 시뮬레이션 결과 마진 분석</h4>
          {isSimulating && (
            <span className="text-[8.5px] font-black text-indigo-600 animate-pulse bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              AI 원가 재계산 처리 중...
            </span>
          )}
        </div>

        {/* 제품별 원가 분석 목록 */}
        <div className={`space-y-4 max-h-[260px] overflow-y-auto pr-1 transition-opacity duration-200 ${isSimulating ? 'opacity-50' : 'opacity-100'}`}>
          {margins.map((prod) => {
            const isDanger = prod.marginRate < 10;
            const isNormal = prod.marginRate >= 10 && prod.marginRate < 25;
            
            return (
              <div key={prod.productId} className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[10px] font-extrabold text-slate-800">
                      {prod.productName} <span className="text-slate-400 font-bold">({prod.productId})</span>
                    </h5>
                    <p className="text-[8.5px] text-slate-450 font-bold mt-0.5">
                      판매가: {prod.sellingPrice.toLocaleString()}원 | 예상 총원가: {prod.costTotal.toLocaleString()}원
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[8px] text-slate-400 font-black block">최종 순이익마진율</span>
                    <span className={`text-xs font-black ${isDanger ? 'text-rose-600' : isNormal ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {prod.marginRate.toFixed(1)}% ({prod.profit.toLocaleString()}원)
                    </span>
                  </div>
                </div>

                {/* 가로형 스택 원가 바 */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                    {/* 원자재비 비율 */}
                    <div 
                      className="bg-indigo-500 h-full" 
                      style={{ width: `${(prod.rawMaterialCost / prod.sellingPrice) * 100}%` }}
                      title={`원자재비: ${prod.rawMaterialCost.toLocaleString()}원`}
                    />
                    {/* 인건비 비율 */}
                    <div 
                      className="bg-sky-400 h-full" 
                      style={{ width: `${(prod.laborCost / prod.sellingPrice) * 100}%` }}
                      title={`노무비: ${prod.laborCost.toLocaleString()}원`}
                    />
                    {/* 경비 비율 */}
                    <div 
                      className="bg-amber-400 h-full" 
                      style={{ width: `${(prod.expenseCost / prod.sellingPrice) * 100}%` }}
                      title={`경비: ${prod.expenseCost.toLocaleString()}원`}
                    />
                    {/* 순이익 마진 비율 */}
                    <div 
                      className={`h-full ${prod.profit > 0 ? 'bg-emerald-450' : 'bg-rose-500'}`}
                      style={{ width: `${Math.max(0, (prod.profit / prod.sellingPrice) * 100)}%` }}
                      title={`순이익: ${prod.profit.toLocaleString()}원`}
                    />
                  </div>

                  {/* 스택 범례 */}
                  <div className="flex justify-between items-center text-[7.5px] font-black text-slate-400 pt-0.5">
                    <div className="flex gap-2.5">
                      <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />재료비 ({(prod.rawMaterialCost / prod.costTotal * 100).toFixed(0)}%)</span>
                      <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />노무비 ({(prod.laborCost / prod.costTotal * 100).toFixed(0)}%)</span>
                      <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />경비 ({(prod.expenseCost / prod.costTotal * 100).toFixed(0)}%)</span>
                    </div>

                    {isDanger ? (
                      <span className="text-rose-600 flex items-center gap-0.5 font-black shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        마진 부족 경고
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-0.5 font-black shrink-0">
                        <Award className="w-3.5 h-3.5" />
                        적정 마진 통과
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
