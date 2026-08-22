"use client";

import React from "react";
import { ArrowRightLeft, FileText, ShoppingCart, Receipt, Send, PackageCheck, FileCheck2 } from "lucide-react";

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

const TABS: { id: EstimateTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "inbound_est", label: "받은 견적서 등록", icon: FileText },
  { id: "inbound_po", label: "발주서 작성 및 발송", icon: ShoppingCart },
  { id: "inbound_statement", label: "거래 명세서 등록", icon: Receipt },
  { id: "outbound_est", label: "견적서 작성 및 발송", icon: Send },
  { id: "outbound_so", label: "수주 등록", icon: PackageCheck },
  { id: "outbound_statement", label: "거래 명세서 작성 및 발송", icon: FileCheck2 },
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
            견적서 요청 분석부터 발주 전환, 실물 입고 검수 및 실시간 재고 반영까지 단 하나의 보드에서 오토파일럿 제어합니다.
          </p>
        </div>
      </div>

      {/* 6개 통합 탭 네비게이션 바 */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

