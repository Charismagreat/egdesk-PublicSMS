import React from "react";
import { RefreshCw } from "lucide-react";

export function ShareLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center animate-pulse">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-black text-slate-350">공개 지능형 대시보드 불러오는 중</h2>
        <p className="text-[10px] text-slate-500">실시간 데이터 동기화 및 보안 채널 확인 완료 중...</p>
      </div>
    </div>
  );
}
