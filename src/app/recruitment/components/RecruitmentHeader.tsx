"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface RecruitmentHeaderProps {
  /**
   * 실시간 동기화 상태 및 구직자 액션 이벤트 로그
   */
  liveSyncLog: string;
}

/**
 * AI 채용 관리 대시보드 상단 대헤더 및 실시간 구직자 연동 모니터 배너 컴포넌트
 */
export default function RecruitmentHeader({ liveSyncLog }: RecruitmentHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-200 relative z-10 shrink-0">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
          <Sparkles className="w-8 h-8 text-pink-600 mr-3" />
          채용 매니저 AI
        </h1>
      </div>

      {/* 라이브 동기화 로그 모니터 정보 패널 - 고대비 다크보더 카드 */}
      <div className="bg-white border-2 border-slate-350 p-3.5 rounded-2xl flex items-center gap-3 shadow-md max-w-md w-full sm:w-auto">
        <div 
          className="w-3 h-3 rounded-full animate-ping shrink-0"
          style={{ background: "linear-gradient(135deg, #f91f7f 0%, #e84e27 100%)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Live Feed Tunnel Status</p>
          <p className="text-xs font-black text-[#d91b5c] truncate">{liveSyncLog}</p>
        </div>
      </div>
    </div>
  );
}
