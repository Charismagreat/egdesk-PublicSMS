import React from "react";
import { Sparkles, Activity } from "lucide-react";

export function Header() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-8 h-8 text-indigo-500 animate-spin" style={{ animationDuration: "4s" }} />
          <span>AI 스냅태스크</span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          R&D, 마케팅, 품질관리, 영업 등 전사적 현장에서 스냅한 비정형 데이터를 바탕으로 AI가 자율적으로 ERP 및 업무 연동을 처리하는 통합 관제 대시보드입니다.
        </p>
      </div>

      {/* 퀵 링크 단추 */}
      <a 
        href="/m/snaptasks" 
        target="_blank"
        className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
      >
        <Activity className="w-4 h-4 text-cyan-300 animate-pulse" />
        현장 실무자 모바일 웹뷰 열기
      </a>
    </div>
  );
}
