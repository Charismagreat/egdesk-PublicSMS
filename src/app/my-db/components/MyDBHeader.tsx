"use client";

import React from "react";
import { Database, RotateCcw, RefreshCw } from "lucide-react";

interface MyDBHeaderProps {
  isLoading: boolean;
  handleResetAllPlayground: () => void;
  handleSyncAll: () => Promise<void>;
}

export default function MyDBHeader({
  isLoading,
  handleResetAllPlayground,
  handleSyncAll
}: MyDBHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 select-none">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center">
        <Database className="w-8 h-8 mr-3 text-blue-500 shrink-0" />
        MY DB
      </h1>
      <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
        <button
          onClick={handleResetAllPlayground}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-650 hover:text-rose-700 rounded-xl text-xs font-black shadow-3xs border border-rose-200 cursor-pointer transition-all active:scale-95 shrink-0"
          title="대화형 SQL 플레이그라운드, 결과 및 차트 등 모든 작업 상태를 최초 대기 상태로 초기화"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
          전체 작업 초기화
        </button>

        <button
          onClick={handleSyncAll}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-655 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-3xs border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
          title="서버 데이터베이스 테이블 개수 및 레코드 실시간 동기화"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white ${isLoading ? 'animate-spin' : ''}`} />
          전체 데이터 동기화
        </button>
      </div>
    </div>
  );
}
