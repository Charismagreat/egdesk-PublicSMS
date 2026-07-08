"use client";

import React from "react";
import { Search } from "lucide-react";
import { CATEGORIES } from "../constants";

interface HelpSearchFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export default function HelpSearchFilter({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
}: HelpSearchFilterProps) {
  return (
    <div className="w-full bg-white border border-slate-100 p-6 rounded-3xl shadow-sm block space-y-6">
      {/* 실시간 통합 검색창 */}
      <div className="w-full space-y-2 block">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
          실시간 통합 지식 검색
        </label>
        <div className="relative w-full shadow-sm rounded-2xl overflow-hidden border border-slate-200 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all block">
          <Search className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="궁금하신 기능이나 키워드를 검색창에 적어보세요..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-white border-0 outline-none text-sm md:text-base text-slate-700 font-semibold"
            id="help-search-input"
          />
        </div>
      </div>

      {/* 수평 칩 구조의 카테고리 필터 */}
      <div className="w-full space-y-3 block">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
          주제별 카테고리 필터
        </span>
        <div className="flex flex-wrap gap-2.5 w-full">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => {
                  setActiveCategory(cat.id);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-xs md:text-sm font-extrabold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 scale-[1.02] border-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isSelected ? "text-amber-400" : cat.color
                  }`}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
