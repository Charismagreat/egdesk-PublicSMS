import React from "react";
import { Search, Filter } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function FilterBar({ searchQuery, setSearchQuery }: FilterBarProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="relative w-96">
        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="이름, 연락처, 태그로 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-xs text-slate-800 bg-slate-50/50"
        />
      </div>
      <div>
        <button className="px-4 py-2 border border-slate-200 rounded-xl text-slate-655 hover:bg-slate-50 transition-colors flex items-center text-xs font-bold cursor-pointer bg-white">
          <Filter className="w-4 h-4 mr-2 text-slate-400" />
          필터
        </button>
      </div>
    </div>
  );
}
