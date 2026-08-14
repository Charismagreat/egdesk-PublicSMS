import React from "react";
import { Search } from "lucide-react";

interface OrderToolbarProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export function OrderToolbar({
  tabs,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery
}: OrderToolbarProps) {
  return (
    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row justify-between items-center gap-4">
      <div className="flex flex-wrap gap-2 w-full lg:w-auto">
        {tabs.map(tab => {
          const isTableOverview = tab === '🍽️ 테이블별 현황';
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                isTableOverview
                  ? isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 font-black shadow-sm ring-2 ring-orange-300'
                    : 'bg-orange-100 text-orange-700 border-orange-200 font-bold hover:bg-orange-200'
                  : isActive 
                    ? 'bg-blue-100 text-blue-700 border-blue-200 font-extrabold' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
      <div className="relative w-full lg:w-64">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="고객명, 연락처, 상품 검색"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-xs bg-white font-semibold text-slate-800"
        />
      </div>
    </div>
  );
}
