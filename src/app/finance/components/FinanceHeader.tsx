"use client";

import React from "react";
import { Landmark, FileSpreadsheet, CreditCard, Receipt, RefreshCw } from "lucide-react";

interface FinanceHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
  setIsUploadModalOpen: (open: boolean) => void;
  setIsCardModalOpen: (open: boolean) => void;
  setIsHometaxModalOpen: (open: boolean) => void;
}

export default function FinanceHeader({
  refreshing,
  onRefresh,
  setIsUploadModalOpen,
  setIsCardModalOpen,
  setIsHometaxModalOpen,
}: FinanceHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Landmark className="w-8 h-8 text-blue-600" />
          금융 정보 AI
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border border-transparent rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          인터넷뱅킹 엑셀 가져오기
        </button>

        <button
          onClick={() => setIsCardModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 border border-transparent rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          신용카드 엑셀 가져오기
        </button>

        <button
          onClick={() => setIsHometaxModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 border border-transparent rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Receipt className="w-4 h-4" />
          국세청 홈택스 가져오기
        </button>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "동기화 중..." : "금융자료 실시간 동기화"}
        </button>
      </div>
    </div>
  );
}
