"use client";

import React, { useState, useEffect } from "react";
import { Plus, Sparkles, Trash2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useDashboardCards, CustomDashboardCard } from "@/hooks/useDashboardCards";
import { useDashboardCardOrder } from "@/hooks/useDashboardCardOrder";
import { useHoverAutoScroll } from "@/hooks/useHoverAutoScroll";
import DashboardCardGenModal from "@/components/DashboardCardGenModal";

interface DashboardCardSectionsProps {
  // 섹션 1 원시 데이터
  availableFunds: number;
  totalAccountCount: number;
  orderStats: { today: number; month: number; year: number };
  purchaseStats: { today: number; month: number; year: number };
  salesStats: { today: number; month: number; year: number };
  costStats: { today: number; month: number; year: number };
  productionStats: { today: number; month: number; year: number; complianceRate: number };
  
  // 섹션 2 원시 데이터
  attendanceStats: { total: number; present: number; late: number; early: number; absent: number; rate: number };
  inventoryStats: { totalValue: number; materialValue: number; subMaterialValue: number };
  financeStats: { ar: number; ap: number; suspense: number };
  cashflowStats: { today: number; week: number; month: number; q3: number; q6: number; year: number };
}

export default function DashboardCardSections({
  availableFunds,
  totalAccountCount,
  orderStats,
  purchaseStats,
  salesStats,
  costStats,
  productionStats,
  attendanceStats,
  inventoryStats,
  financeStats,
  cashflowStats,
}: DashboardCardSectionsProps) {
  const { getCardsBySection, addCard, removeCard } = useDashboardCards();
  const { getOrder, moveCard, registerCardId, resetOrder } = useDashboardCardOrder();

  const section1Ref = useHoverAutoScroll<HTMLDivElement>();
  const section2Ref = useHoverAutoScroll<HTMLDivElement>();

  const [modalOpen, setModalOpen] = useState(false);
  const [targetSection, setTargetSection] = useState<"section1" | "section2">("section1");

  const openGenModal = (section: "section1" | "section2") => {
    setTargetSection(section);
    setModalOpen(true);
  };

  const handleApproveCard = (card: CustomDashboardCard) => {
    addCard(card);
    registerCardId(card.section, card.id);
  };

  const section1CustomCards = getCardsBySection("section1");
  const section2CustomCards = getCardsBySection("section2");

  // 미등록된 커스텀 카드가 있으면 자동 순서 등록
  useEffect(() => {
    section1CustomCards.forEach((c) => registerCardId("section1", c.id));
    section2CustomCards.forEach((c) => registerCardId("section2", c.id));
  }, [section1CustomCards, section2CustomCards]);

  // 섹션 1 카드 맵핑 객체
  const renderSection1Card = (id: string) => {
    // 1. ➕ 새 카드 추가 버튼
    if (id === "add_button") {
      return (
        <button
          key="add_button"
          onClick={() => openGenModal("section1")}
          className="min-w-[200px] max-w-[200px] shrink-0 border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-3xl p-5 flex flex-col items-center justify-center text-center group transition-all cursor-pointer shadow-xs"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 shadow-sm transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
            새 카드 추가
          </span>
          <span className="text-[10px] text-indigo-600 font-bold mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI 카드 생성
          </span>
        </button>
      );
    }

    // 2. 승인된 AI 커스텀 카드인 경우
    const customCard = section1CustomCards.find((c) => c.id === id);
    if (customCard) {
      return (
        <div
          key={customCard.id}
          className="min-w-[280px] max-w-[320px] shrink-0 bg-white border border-indigo-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between"
        >
          {/* 순서 이동 및 삭제 컨트롤 단추 */}
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button
              onClick={() => moveCard("section1", customCard.id, "left")}
              className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none"
              title="왼쪽으로 이동"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => moveCard("section1", customCard.id, "right")}
              className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none"
              title="오른쪽으로 이동"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => removeCard(customCard.id)}
              className="p-1 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border-none ml-1"
              title="카드 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 pr-14">
              <h4 className="font-bold text-slate-800 text-sm truncate">{customCard.title}</h4>
              {customCard.badge && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border shrink-0 ${customCard.badgeColor}`}>
                  {customCard.badge}
                </span>
              )}
            </div>
            <div className="mb-3">
              <span className={`text-2xl font-black ${customCard.mainValueColor || "text-slate-800"}`}>
                {customCard.mainValue}
              </span>
            </div>
          </div>

          {customCard.details.length > 0 && (
            <div className="space-y-1 pt-3 border-t border-slate-100 text-xs">
              {customCard.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">{d.label}</span>
                  <span className={`font-bold text-[11px] ${d.color || "text-slate-700"}`}>{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 3. 기존 기본 카드들
    if (id === "cash") {
      return (
        <div key="cash" className="min-w-[280px] max-w-[320px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section1", "cash", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section1", "cash", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-sm">가용자금</h4>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">🏦</span>
          </div>
          <div className="my-2 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 text-center">
            <span className="text-[10px] text-emerald-700 font-bold block mb-0.5">최종 잔액 합계</span>
            <span className="text-2xl font-black text-emerald-600">₩ {availableFunds.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>등록 은행 계좌</span>
            <span className="font-bold text-slate-700">{totalAccountCount}개 계좌</span>
          </div>
        </div>
      );
    }

    if (id === "orders") {
      return (
        <div key="orders" className="min-w-[280px] max-w-[320px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section1", "orders", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section1", "orders", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-sm">총 수주액</h4>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-2xl">📈</span>
          </div>
          <div className="space-y-1.5 my-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-slate-500">금일 수주</span><span className="font-bold text-slate-800">₩ {orderStats.today.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">금월 누적</span><span className="font-bold text-slate-800">₩ {orderStats.month.toLocaleString()}</span></div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-blue-600">금년도 합계</span>
            <span className="font-black text-blue-600">₩ {orderStats.year.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    if (id === "purchases") {
      return (
        <div key="purchases" className="min-w-[280px] max-w-[320px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section1", "purchases", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section1", "purchases", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-sm">총 발주액</h4>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-2xl">📦</span>
          </div>
          <div className="space-y-1.5 my-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-slate-500">금일 발주</span><span className="font-bold text-slate-800">₩ {purchaseStats.today.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">금월 누적</span><span className="font-bold text-slate-800">₩ {purchaseStats.month.toLocaleString()}</span></div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-rose-600">금년도 합계</span>
            <span className="font-black text-rose-600">₩ {purchaseStats.year.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    if (id === "sales") {
      return (
        <div key="sales" className="min-w-[280px] max-w-[320px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section1", "sales", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section1", "sales", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-sm">총 매출액</h4>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">💲</span>
          </div>
          <div className="space-y-1.5 my-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-slate-500">금일 매출</span><span className="font-bold text-slate-800">₩ {salesStats.today.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">금월 누적</span><span className="font-bold text-slate-800">₩ {salesStats.month.toLocaleString()}</span></div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-emerald-600">금년도 합계</span>
            <span className="font-black text-emerald-600">₩ {salesStats.year.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    if (id === "costs") {
      return (
        <div key="costs" className="min-w-[280px] max-w-[320px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section1", "costs", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section1", "costs", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-sm">총 매입액</h4>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-2xl">📄</span>
          </div>
          <div className="space-y-1.5 my-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-slate-500">금일 매입</span><span className="font-bold text-slate-800">₩ {costStats.today.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">금월 누적</span><span className="font-bold text-slate-800">₩ {costStats.month.toLocaleString()}</span></div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-amber-600">금년도 합계</span>
            <span className="font-black text-amber-600">₩ {costStats.year.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    if (id === "production") {
      return (
        <div key="production" className="min-w-[280px] max-w-[320px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section1", "production", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section1", "production", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-sm">생산현황</h4>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-2xl">🏭</span>
          </div>
          <div className="space-y-1.5 my-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-slate-500">금일 생산</span><span className="font-bold text-slate-800">{productionStats.today}개</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">금월 누적</span><span className="font-bold text-slate-800">{productionStats.month}개</span></div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-purple-600">준수율</span>
            <span className="font-black text-purple-600">{productionStats.complianceRate}%</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // 섹션 2 카드 맵핑 객체
  const renderSection2Card = (id: string) => {
    // 1. ➕ 새 카드 추가 버튼
    if (id === "add_button") {
      return (
        <button
          key="add_button"
          onClick={() => openGenModal("section2")}
          className="min-w-[200px] max-w-[200px] shrink-0 border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-3xl p-5 flex flex-col items-center justify-center text-center group transition-all cursor-pointer shadow-xs"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 shadow-sm transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
            새 카드 추가
          </span>
          <span className="text-[10px] text-indigo-600 font-bold mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI 카드 생성
          </span>
        </button>
      );
    }

    // 2. 승인된 AI 커스텀 카드인 경우
    const customCard = section2CustomCards.find((c) => c.id === id);
    if (customCard) {
      return (
        <div
          key={customCard.id}
          className="min-w-[340px] max-w-[400px] shrink-0 bg-white border border-indigo-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between"
        >
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section2", customCard.id, "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section2", customCard.id, "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
            <button onClick={() => removeCard(customCard.id)} className="p-1 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border-none ml-1" title="카드 삭제"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 pr-14">
              <h4 className="font-bold text-slate-800 text-sm truncate">{customCard.title}</h4>
              {customCard.badge && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border shrink-0 ${customCard.badgeColor}`}>
                  {customCard.badge}
                </span>
              )}
            </div>
            <div className="mb-3">
              <span className={`text-2xl font-black ${customCard.mainValueColor || "text-slate-800"}`}>
                {customCard.mainValue}
              </span>
            </div>
          </div>

          {customCard.details.length > 0 && (
            <div className="space-y-1 pt-3 border-t border-slate-100 text-xs">
              {customCard.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">{d.label}</span>
                  <span className={`font-bold text-[11px] ${d.color || "text-slate-700"}`}>{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 3. 기존 기본 카드들
    if (id === "attendance") {
      return (
        <div key="attendance" className="min-w-[340px] max-w-[400px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section2", "attendance", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section2", "attendance", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><span>🏃 출근 현황</span></h4>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">실시간 {attendanceStats.rate}%</span>
          </div>
          <div className="grid grid-cols-2 gap-3 my-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl"><span className="text-[10px] text-slate-500 block">정상 출근</span><span className="text-base font-bold text-emerald-600">{attendanceStats.present}명</span></div>
            <div className="p-3 bg-slate-50 rounded-2xl"><span className="text-[10px] text-slate-500 block">지각 / 조퇴</span><span className="text-base font-bold text-amber-600">{attendanceStats.late + attendanceStats.early}명</span></div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>총 대상 인원</span><span className="font-bold text-slate-700">{attendanceStats.total}명</span>
          </div>
        </div>
      );
    }

    if (id === "inventory") {
      return (
        <div key="inventory" className="min-w-[340px] max-w-[400px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section2", "inventory", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section2", "inventory", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><span>📦 재고 현황</span></h4>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">선입선출법 (FIFO)</span>
          </div>
          <div className="my-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-100/60 text-center">
            <span className="text-[10px] text-blue-700 font-bold block mb-0.5">총 자산 가치</span>
            <span className="text-xl font-black text-blue-600">₩ {inventoryStats.totalValue.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
            <div><span className="text-slate-500 block">원자재 자산액</span><span className="font-bold text-slate-700">₩ {inventoryStats.materialValue.toLocaleString()}</span></div>
            <div><span className="text-slate-500 block">부자재 자산액</span><span className="font-bold text-slate-700">₩ {inventoryStats.subMaterialValue.toLocaleString()}</span></div>
          </div>
        </div>
      );
    }

    if (id === "finance") {
      return (
        <div key="finance" className="min-w-[340px] max-w-[400px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section2", "finance", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section2", "finance", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><span>⚖️ 미수·미지급·가지급금 현황</span></h4>
          </div>
          <div className="space-y-2 my-1 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-xl"><span className="text-amber-800 font-bold text-[11px]">미수금 (받을 돈)</span><span className="font-black text-amber-700">₩ {financeStats.ar.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-2.5 bg-rose-50/60 rounded-xl"><span className="text-rose-800 font-bold text-[11px]">미지급금 (줄 돈)</span><span className="font-black text-rose-700">₩ {financeStats.ap.toLocaleString()}</span></div>
            <div className="flex items-center justify-between p-2.5 bg-purple-50/60 rounded-xl"><span className="text-purple-800 font-bold text-[11px]">가지급금 (정산 대상)</span><span className="font-black text-purple-700">₩ {financeStats.suspense.toLocaleString()}</span></div>
          </div>
        </div>
      );
    }

    if (id === "cashflow") {
      return (
        <div key="cashflow" className="min-w-[340px] max-w-[400px] shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button onClick={() => moveCard("section2", "cashflow", "left")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="왼쪽으로 이동"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => moveCard("section2", "cashflow", "right")} className="p-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-none" title="오른쪽으로 이동"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><span>📉 자금 소요 예상</span></h4>
          </div>
          <div className="grid grid-cols-3 gap-2 my-2 text-center text-xs">
            <div className="p-2.5 bg-rose-50/50 rounded-xl"><span className="text-[10px] text-slate-500 block mb-0.5">금일 소요</span><span className="font-bold text-rose-600 text-[11px]">₩ {cashflowStats.today.toLocaleString()}</span></div>
            <div className="p-2.5 bg-rose-50/50 rounded-xl"><span className="text-[10px] text-slate-500 block mb-0.5">금주 소요</span><span className="font-bold text-rose-600 text-[11px]">₩ {cashflowStats.week.toLocaleString()}</span></div>
            <div className="p-2.5 bg-rose-50/50 rounded-xl"><span className="text-[10px] text-slate-500 block mb-0.5">금월 소요</span><span className="font-bold text-rose-600 text-[11px]">₩ {cashflowStats.month.toLocaleString()}</span></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>3개월 예상 소요</span><span className="font-bold text-slate-700">₩ {cashflowStats.q3.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  const section1Order = getOrder("section1");
  const section2Order = getOrder("section2");

  return (
    <div className="space-y-6">
      
      {/* 🔴 [섹션 1] 상단 핵심 실적 KPI 영역 (가로 스크롤 & 순서 편집 지원) */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              핵심 실적 KPI 영역
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetOrder("section1")}
              className="text-[10px] text-slate-400 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer border-none bg-transparent"
              title="기본 순서로 리셋"
            >
              <RotateCcw className="w-3 h-3" /> 순서 초기화
            </button>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/80">
              카드 좌우 스크롤 ↔️ (카드 상단 ◀ ▶ 단추로 순서 편집)
            </span>
          </div>
        </div>

        <div ref={section1Ref} className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin select-none">
          {section1Order.map((id) => renderSection1Card(id))}
        </div>
      </div>

      {/* 🔴 [섹션 2] 하단 종합 운용 현황 영역 (가로 스크롤 & 순서 편집 지원) */}
      <div className="w-full pt-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              종합 운용 현황 영역
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetOrder("section2")}
              className="text-[10px] text-slate-400 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer border-none bg-transparent"
              title="기본 순서로 리셋"
            >
              <RotateCcw className="w-3 h-3" /> 순서 초기화
            </button>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/80">
              카드 좌우 스크롤 ↔️ (카드 상단 ◀ ▶ 단추로 순서 편집)
            </span>
          </div>
        </div>

        <div ref={section2Ref} className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin select-none">
          {section2Order.map((id) => renderSection2Card(id))}
        </div>
      </div>

      {/* AI 커스텀 카드 생성 스튜디오 모달 */}
      <DashboardCardGenModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetSection={targetSection}
        onApproveCard={handleApproveCard}
      />

    </div>
  );
}
