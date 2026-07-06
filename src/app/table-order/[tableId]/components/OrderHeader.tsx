"use client";

import React from "react";
import { ChevronLeft, Search, X } from "lucide-react";

interface OrderHeaderProps {
  tableId: string | string[] | undefined;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (val: string) => void;
  onBack: () => void;
}

export function OrderHeader({
  tableId,
  searchTerm,
  setSearchTerm,
  categories,
  activeCategory,
  setActiveCategory,
  onBack
}: OrderHeaderProps) {
  return (
    <header className="bg-white sticky top-0 z-40 shadow-sm border-b border-slate-200 w-full">
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 border-0 bg-transparent cursor-pointer">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black text-slate-800">테이블 {tableId}번</h1>
        <div className="w-10"></div>
      </div>
      
      {/* 실시간 메뉴 검색창 */}
      <div className="px-4 pb-3">
        <div className="relative flex items-center bg-slate-100 border border-slate-200/60 rounded-xl px-3 py-2 flex-row focus-within:border-orange-500/60 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input 
            type="text"
            placeholder="메뉴 이름 또는 설명 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400 border-0 p-0"
          />
          {searchTerm && (
            <button 
              type="button"
              onClick={() => setSearchTerm("")}
              className="p-0.5 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500 shrink-0 ml-1 transition-colors border-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 동적 카테고리 가로 스크롤 탭 */}
      <div className="flex overflow-x-auto px-4 pb-3 space-x-2 scrollbar-hide">
        {categories.map((cat: string) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors border-0 cursor-pointer ${
              activeCategory === cat 
                ? 'bg-orange-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </header>
  );
}
