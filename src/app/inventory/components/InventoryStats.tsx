import React from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface InventoryStatsProps {
  totalMaterialStock: number;
  totalMaterialValue: number;
  totalProductStock: number;
  totalProductValue: number;
  outOfStockCount: number;
  monthlyTxCount: number;
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({
  totalMaterialStock,
  totalMaterialValue,
  totalProductStock,
  totalProductValue,
  outOfStockCount,
  monthlyTxCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      
      {/* 카드 1: 총 자재 현황 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="space-y-1 z-10">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">총 보유 원부자재</span>
          <h3 className="text-2xl font-bold text-slate-800">{totalMaterialStock.toLocaleString()} 개</h3>
          <p className="text-xs text-indigo-650 font-bold bg-indigo-50/50 px-2 py-0.5 rounded-md inline-block">
            자산가치: ₩ {totalMaterialValue.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
          <Package className="w-6 h-6" />
        </div>
      </div>

      {/* 카드 2: 총 제품 현황 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="space-y-1 z-10">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">총 보유 완제품</span>
          <h3 className="text-2xl font-bold text-slate-800">{totalProductStock.toLocaleString()} 개</h3>
          <p className="text-xs text-indigo-650 font-bold bg-indigo-50/50 px-2 py-0.5 rounded-md inline-block">
            자산가치: ₩ {totalProductValue.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>

      {/* 카드 3: 안전재고 부족 알림 */}
      <div className={`rounded-2xl p-6 shadow-sm border transition-all flex items-center justify-between relative overflow-hidden group hover:shadow-md ${
        outOfStockCount > 0 
          ? 'bg-rose-50/70 border-rose-100 text-rose-900' 
          : 'bg-white border-slate-100 text-slate-800'
      }`}>
        <div className="space-y-1 z-10">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">안전재고 부족</span>
          <div className="flex items-center space-x-2">
            <h3 className="text-2xl font-bold">{outOfStockCount} 건</h3>
            {outOfStockCount > 0 && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">즉각 발주 및 입고 보충 권장</p>
        </div>
        <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${
          outOfStockCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
        }`}>
          <AlertTriangle className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      {/* 카드 4: 당월 입출고 건수 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="space-y-1 z-10">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">당월 입출고 활동</span>
          <h3 className="text-2xl font-bold text-slate-800">{monthlyTxCount} 건</h3>
          <p className="text-xs text-slate-400">입고, 출고, 실사조정 총계</p>
        </div>
        <div className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl group-hover:scale-110 transition-transform">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

    </div>
  );
};
