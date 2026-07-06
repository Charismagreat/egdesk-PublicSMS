'use client';

import React from 'react';
import { Sparkles, TrendingDown } from 'lucide-react';
import { StatsRange } from '../types';

interface MobileStatsBoardProps {
  statsRange: StatsRange;
  setStatsRange: (range: StatsRange) => void;
  statsCategory: string;
  setStatsCategory: (category: string) => void;
  statsTag: string;
  setStatsTag: (tag: string) => void;
  totalStatsAmount: number;
  filteredCount: number;
  allUniqueTags: string[];
}

export default function MobileStatsBoard({
  statsRange,
  setStatsRange,
  statsCategory,
  setStatsCategory,
  statsTag,
  setStatsTag,
  totalStatsAmount,
  filteredCount,
  allUniqueTags
}: MobileStatsBoardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-5 rounded-2xl shadow-md relative overflow-hidden border border-slate-800">
      <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
        <TrendingDown className="w-20 h-20 text-white" />
      </div>
      
      <div className="flex items-center space-x-1.5 mb-3">
        <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
        <h2 className="text-[11px] font-black text-rose-300 tracking-tight uppercase">📊 실시간 지출 분석 전광판</h2>
      </div>
      
      {/* 다차원 집계 필터 컨트롤 영역 */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {/* 기간 필터 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          <span className="block text-[8px] text-slate-400 font-extrabold pl-1 mb-0.5">조회 기간</span>
          <select 
            id="stats-range-select"
            value={statsRange} 
            onChange={e => setStatsRange(e.target.value as StatsRange)}
            className="w-full bg-transparent text-[10px] font-black text-white border-none outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-900">전체 기간</option>
            <option value="today" className="bg-slate-900">오늘</option>
            <option value="week" className="bg-slate-900">1주일</option>
            <option value="month" className="bg-slate-900">1개월</option>
            <option value="3month" className="bg-slate-900">3개월</option>
          </select>
        </div>
        
        {/* 계정 과목 필터 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          <span className="block text-[8px] text-slate-400 font-extrabold pl-1 mb-0.5">계정 대분류</span>
          <select 
            id="stats-category-select"
            value={statsCategory} 
            onChange={e => setStatsCategory(e.target.value)}
            className="w-full bg-transparent text-[10px] font-black text-white border-none outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900">전체 비목</option>
            <option value="판매비와관리비" className="bg-slate-900">판관비</option>
            <option value="제조/물류원가" className="bg-slate-900">제조/물류</option>
            <option value="영업외비용" className="bg-slate-900">영업외비</option>
            <option value="기타" className="bg-slate-900">기타</option>
          </select>
        </div>

        {/* 태그 필터 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          <span className="block text-[8px] text-slate-400 font-extrabold pl-1 mb-0.5">태그 검색</span>
          <select 
            id="stats-tag-select"
            value={statsTag} 
            onChange={e => setStatsTag(e.target.value)}
            className="w-full bg-transparent text-[10px] font-black text-white border-none outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900">전체 태그</option>
            {allUniqueTags.map(tag => (
              <option key={tag} value={tag} className="bg-slate-900">#{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 집계 총합 표시 */}
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400 font-bold leading-none">선택 조건 내 누적 지출액</span>
        <div className="flex items-baseline space-x-1 mt-1">
          <span className="text-xl font-extrabold text-white tracking-tight leading-none font-mono">
            {totalStatsAmount.toLocaleString()}
          </span>
          <span className="text-xs font-black text-slate-300">원</span>
        </div>
        <span className="text-[8px] text-rose-350 font-bold mt-1.5 pl-0.5 block">
          💡 실시간 필터 조합 결과 ({filteredCount}건 집계됨)
        </span>
      </div>
    </div>
  );
}
