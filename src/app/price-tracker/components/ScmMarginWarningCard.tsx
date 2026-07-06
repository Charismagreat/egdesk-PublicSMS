import React from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Item } from "../types";

interface ScmMarginWarningCardProps {
  items: Item[];
  marginWarningCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

export default function ScmMarginWarningCard({
  items,
  marginWarningCount,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter
}: ScmMarginWarningCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="flex items-center gap-3.5 w-auto">
        <div className={`p-3.5 rounded-2xl border ${
          marginWarningCount > 0 
            ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse" 
            : "bg-emerald-50 border-emerald-100 text-emerald-600"
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold block">SCM 마진 위험 관제</span>
          <h3 className="text-lg font-black text-slate-800">
            추적 {items.length}개 품목 중 <span className={marginWarningCount > 0 ? "text-rose-500" : "text-emerald-600"}>{marginWarningCount}개 위험 등급</span> 감지
          </h3>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto md:justify-end">
        <div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="품목명, 코드 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs font-semibold focus:border-pink-500 outline-none text-slate-700 placeholder-slate-400"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-pink-500 cursor-pointer"
        >
          <option value="ALL">전체 카테고리</option>
          <option value="RAW_MATERIAL">원자재/부자재</option>
          <option value="COMPETITOR_PRODUCT">경쟁사 완제품</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-pink-500 cursor-pointer"
        >
          <option value="ALL">전체 마진 상태</option>
          <option value="WARNING">🚨 마진 붕괴 경보</option>
          <option value="SAFE">✓ 안정 마진</option>
        </select>
      </div>
    </div>
  );
}
