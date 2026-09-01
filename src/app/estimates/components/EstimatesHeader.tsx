"use client";

import React from "react";
import { ArrowRightLeft, FileText, ShoppingCart, Receipt, Send, PackageCheck, ShoppingBag, TrendingUp } from "lucide-react";

export type EstimateTabType = 
  | "inbound_est" 
  | "inbound_po" 
  | "inbound_statement" 
  | "outbound_est" 
  | "outbound_so" 
  | "outbound_statement";

interface EstimatesHeaderProps {
  activeTab: EstimateTabType;
  setActiveTab: (tab: EstimateTabType) => void;
}

// 🔵 구매 / 매입 (Inbound SCM) 3대 탭
const INBOUND_TABS: { id: EstimateTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "inbound_est", label: "받은 견적서 등록", icon: FileText },
  { id: "inbound_po", label: "발주서 작성 및 발송", icon: ShoppingCart },
  { id: "inbound_statement", label: "거래 명세서 등록", icon: Receipt },
];

// 🟣 판매 / 매출 (Outbound CRM) 2대 탭
const OUTBOUND_TABS: { id: EstimateTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "outbound_est", label: "견적서 작성 및 발송", icon: Send },
  { id: "outbound_so", label: "수주 등록", icon: PackageCheck },
];

export default function EstimatesHeader({
  activeTab,
  setActiveTab,
}: EstimatesHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <ArrowRightLeft className="w-8 h-8 text-indigo-600" />
            <span>견적/발주/수주 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            공급사 구매(매입) 관리부터 바이어 판매(매출) 및 실물 출고까지 단 하나의 보드에서 오토파일럿 제어합니다.
          </p>
        </div>
      </div>

      {/* 2대 그룹 분리형 탭 네비게이션 바 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 🔵 구매 · 매입 (Inbound SCM) 그룹 */}
        <div className="flex items-center gap-1.5 p-1.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl shadow-xs overflow-x-auto">
          <div className="px-2.5 py-1 flex items-center gap-1 text-[11px] font-black text-blue-800 bg-blue-100/90 rounded-xl shrink-0 border border-blue-200 select-none">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            <span>구매 · 매입 (SCM)</span>
          </div>

          <div className="flex items-center gap-1">
            {INBOUND_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-white text-blue-700 shadow-sm border border-blue-200 scale-[1.02]"
                      : "text-slate-600 hover:text-blue-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🟣 판매 · 매출 (Outbound CRM) 그룹 */}
        <div className="flex items-center gap-1.5 p-1.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl shadow-xs overflow-x-auto">
          <div className="px-2.5 py-1 flex items-center gap-1 text-[11px] font-black text-indigo-800 bg-indigo-100/90 rounded-xl shrink-0 border border-indigo-200 select-none">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>판매 · 매출 (CRM)</span>
          </div>

          <div className="flex items-center gap-1">
            {OUTBOUND_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-white text-indigo-700 shadow-sm border border-indigo-200 scale-[1.02]"
                      : "text-slate-600 hover:text-indigo-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

