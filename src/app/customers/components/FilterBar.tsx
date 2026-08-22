import React from "react";
import { Search, Filter, X } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function FilterBar({ searchQuery, setSearchQuery }: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
      {/* 검색창 */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="고객명, 연락처, 주소, 태그 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold text-xs text-slate-800 shadow-2xs placeholder:text-slate-400 placeholder:font-medium transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 필터 도구 */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {}} 
          className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100/80 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer bg-white shadow-2xs active:scale-95"
        >
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>상세 필터</span>
        </button>
      </div>
    </div>
  );
}
