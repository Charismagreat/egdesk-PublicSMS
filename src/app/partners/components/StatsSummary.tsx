import React from "react";
import { ShieldAlert } from "lucide-react";

interface StatsSummaryProps {
  partnersCount: number;
  totalVendors: number;
  totalBuyers: number;
  totalAffiliates: number;
  totalPurchases: number;
  totalSales: number;
  pendingAlertCount: number;
}

export function StatsSummary({
  partnersCount,
  totalVendors,
  totalBuyers,
  totalAffiliates,
  totalPurchases,
  totalSales,
  pendingAlertCount
}: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase block">등록된 총 거래처</span>
        <span className="text-2xl font-black text-slate-800 block">{partnersCount}개사</span>
        <span className="text-[10px] text-slate-400 block mt-1">공급사 {totalVendors} / 바이어 {totalBuyers} / 관계사 {totalAffiliates}</span>
      </div>

      <div className="bg-gradient-to-br from-indigo-50/40 to-indigo-100/10 border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-indigo-500 uppercase block">누적 자재 매입액 (발주)</span>
        <span className="text-2xl font-black text-indigo-600 block">{totalPurchases.toLocaleString()}원</span>
        <span className="text-[10px] text-indigo-400 block mt-1">총 공급처 수: {totalVendors}개사</span>
      </div>

      <div className="bg-gradient-to-br from-emerald-50/40 to-emerald-100/10 border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-emerald-600 uppercase block">누적 영업 매출액 (수주)</span>
        <span className="text-2xl font-black text-emerald-600 block">{totalSales.toLocaleString()}원</span>
        <span className="text-[10px] text-emerald-400 block mt-1">총 B2B 바이어 수: {totalBuyers}개사</span>
      </div>

      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-rose-500 uppercase block flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> 미결 외상 거래 통제
        </span>
        <span className="text-2xl font-black text-slate-800 block">
          {pendingAlertCount}건 경보
        </span>
        <span className="text-[10px] text-slate-400 block mt-1">외상 미결제 한도 실시간 모니터링 중</span>
      </div>

    </div>
  );
}
