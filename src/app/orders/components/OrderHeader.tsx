import React from "react";
import { ClipboardList, Utensils, ListFilter } from "lucide-react";

interface OrderHeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export function OrderHeader({ activeTab, setActiveTab }: OrderHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <h1 className="text-3xl font-black text-slate-800 flex items-center tracking-tight">
        <ClipboardList className="w-8 h-8 mr-3 text-blue-600" /> 주문 관리 AI
      </h1>

      {/* 최상단 강조 뷰 스위치 탭 */}
      {setActiveTab && (
        <div className="flex items-center bg-slate-200/80 p-1.5 rounded-2xl gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('전체')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-0 cursor-pointer ${
              activeTab !== '🍽️ 테이블별 현황'
                ? 'bg-white text-blue-700 shadow-md font-extrabold'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>📋 일반 주문 목록 대장</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('🍽️ 테이블별 현황')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border-0 cursor-pointer ${
              activeTab === '🍽️ 테이블별 현황'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-400'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            <Utensils className="w-4 h-4 animate-bounce" />
            <span>🍽️ 테이블별 실시간 현황 (대장)</span>
          </button>
        </div>
      )}
    </div>
  );
}
