import React from "react";

interface SummaryCardsProps {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  archivedCount: number;
}

export function SummaryCards({ totalCount, activeCount, completedCount, archivedCount }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase block">관리 중인 총 협업 태스크</span>
        <span className="text-2xl font-black text-slate-800 block">{totalCount}개</span>
        <span className="text-[10px] text-indigo-500 block mt-1">
          활성 진행: {activeCount} / 완료: {completedCount}
        </span>
      </div>

      <div className="bg-gradient-to-br from-indigo-50/40 to-indigo-100/10 border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-indigo-500 uppercase block">AI 자율주행 진행 건수</span>
        <span className="text-2xl font-black text-indigo-600 block">{activeCount}건</span>
        <span className="text-[10px] text-indigo-400 block mt-1">현장 비정형 실시간 수집 및 추론 중</span>
      </div>

      <div className="bg-gradient-to-br from-emerald-50/40 to-emerald-100/10 border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-emerald-600 uppercase block">최종 목표 달성 / 태스크 완료</span>
        <span className="text-2xl font-black text-emerald-600 block">{completedCount}건</span>
        <span className="text-[10px] text-emerald-400 block mt-1">업무 목표 달성 및 최종 완료 처리 완수</span>
      </div>

      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase block">아카이브 완료 보관 이력</span>
        <span className="text-2xl font-black text-slate-700 block">{archivedCount}건</span>
        <span className="text-[10px] text-slate-400 block mt-1">감사 완료된 과거 태스크 대장</span>
      </div>
    </div>
  );
}
