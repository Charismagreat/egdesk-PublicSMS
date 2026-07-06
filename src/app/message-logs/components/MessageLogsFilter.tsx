import React from "react";
import { Search, Calendar } from "lucide-react";

interface MessageLogsFilterProps {
  filteredCount: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isMounted: boolean;
  activePreset: "all" | "today" | "7d" | "30d" | "custom";
  setPreset: (preset: "all" | "today" | "7d" | "30d") => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  setActivePreset: (val: any) => void;
}

export function MessageLogsFilter({
  filteredCount,
  searchQuery,
  setSearchQuery,
  isMounted,
  activePreset,
  setPreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setActivePreset
}: MessageLogsFilterProps) {
  return (
    <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
      {/* 1층: 타이틀 & 검색바 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <h2 className="font-extrabold text-slate-800 text-base whitespace-nowrap shrink-0">
          발송 목록 ({filteredCount}건)
        </h2>
        <div className="relative w-full sm:w-72 md:w-80 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="수신번호, 발송내용 검색"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-purple-500 outline-none text-xs bg-white font-semibold transition-all shadow-sm text-slate-800"
          />
        </div>
      </div>

      {/* 2층: 조회 기간 상세 필터링 영역 */}
      {isMounted && (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 pt-3.5 border-t border-slate-100/70 w-full">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">조회 기간</span>
          <div className="flex flex-wrap items-center gap-3">
            {/* 프리셋 버튼 */}
            <div className="flex items-center bg-slate-200/50 rounded-xl p-0.5 border border-slate-200/70 shrink-0">
              <button 
                type="button"
                onClick={() => setPreset("all")} 
                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-0 cursor-pointer ${
                  activePreset === "all" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent"
                }`}
              >
                전체
              </button>
              <button 
                type="button"
                onClick={() => setPreset("today")} 
                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-0 cursor-pointer ${
                  activePreset === "today" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent"
                }`}
              >
                오늘
              </button>
              <button 
                type="button"
                onClick={() => setPreset("7d")} 
                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-0 cursor-pointer ${
                  activePreset === "7d" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent"
                }`}
              >
                7일
              </button>
              <button 
                type="button"
                onClick={() => setPreset("30d")} 
                className={`px-3 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-0 cursor-pointer ${
                  activePreset === "30d" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent"
                }`}
              >
                30일
              </button>
            </div>

            {/* 달력 입력 바 */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => {
                  setStartDate(e.target.value);
                  setActivePreset("custom");
                }} 
                className="outline-none border-none text-slate-750 text-xs bg-transparent cursor-pointer font-bold w-[115px] p-0"
              />
              <span className="text-slate-300 font-bold">~</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => {
                  setEndDate(e.target.value);
                  setActivePreset("custom");
                }} 
                className="outline-none border-none text-slate-750 text-xs bg-transparent cursor-pointer font-bold w-[115px] p-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
