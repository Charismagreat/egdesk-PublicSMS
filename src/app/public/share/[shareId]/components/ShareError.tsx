import React from "react";
import { AlertTriangle } from "lucide-react";

interface ShareErrorProps {
  error: string;
}

export function ShareError({ error }: ShareErrorProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-950/30 border border-rose-900/50 flex items-center justify-center text-rose-500">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-sm font-black text-rose-500">웹 게시 대시보드 로드 실패</h2>
        <p className="text-[10px] text-slate-400">
          {error || "존재하지 않거나 비활성화된 공유 대시보드입니다. 링크 소유자에게 문의해 주세요."}
        </p>
      </div>
    </div>
  );
}
