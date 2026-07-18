import React from "react";
import { Search, X } from "lucide-react";

interface TaskSearchBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export function TaskSearchBar({ searchTerm, setSearchTerm }: TaskSearchBarProps) {
  return (
    <div className="px-4 py-2.5 bg-slate-900/10 border-b border-slate-900/60 z-10 shrink-0">
      <div className="relative flex items-center bg-slate-950 border border-slate-850 rounded-2xl px-3.5 py-2 flex-row focus-within:border-indigo-500/80 transition-all">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-2" />
        <input 
          type="text"
          placeholder="태스크 제목 또는 거래처명 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none text-xs font-semibold text-slate-200 placeholder-slate-650 border-0 p-0 focus:ring-0"
        />
        {searchTerm && (
          <button 
            type="button"
            onClick={() => setSearchTerm("")}
            className="p-1 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 shrink-0 transition-colors ml-1 border-0 cursor-pointer"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
