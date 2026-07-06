import React from "react";
import { Search, X } from "lucide-react";

interface BookingSearchProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  showSearch: boolean;
}

export function BookingSearch({ searchTerm, setSearchTerm, showSearch }: BookingSearchProps) {
  if (!showSearch) return null;

  return (
    <div className="relative w-full max-w-md mx-auto mb-12 flex items-center bg-white border border-gray-200 rounded-3xl px-4 py-3 shadow-sm focus-within:border-slate-800 transition-colors">
      <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
      <input 
        type="text"
        placeholder="예약 서비스/코스 이름 또는 설명 검색..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
      />
      {searchTerm && (
        <button 
          type="button"
          onClick={() => setSearchTerm("")}
          className="p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 shrink-0 ml-1 transition-colors border-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
