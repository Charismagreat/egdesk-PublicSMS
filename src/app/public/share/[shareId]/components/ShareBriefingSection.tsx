import React from "react";
import { FileText, Activity } from "lucide-react";

interface ShareBriefingSectionProps {
  briefingMarkdown: string | null;
}

export function ShareBriefingSection({
  briefingMarkdown
}: ShareBriefingSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
        <FileText className="w-4 h-4 text-emerald-400" />
        <h2 className="text-xs font-black text-slate-350 tracking-wider">2. AI 데이터 비즈니스 통찰 및 브리핑 요약</h2>
      </div>
      
      {briefingMarkdown ? (
        <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-2xl p-6 shadow-inner animate-fade-in">
          <div className="text-xs md:text-sm font-semibold leading-relaxed text-slate-300 whitespace-pre-line font-sans">
            {briefingMarkdown}
          </div>
        </div>
      ) : (
        <div className="p-8 bg-slate-950/30 border border-slate-900 border-dashed rounded-2xl flex flex-col items-center justify-center text-center text-slate-500">
          <Activity className="w-6 h-6 text-slate-650 mb-1.5" />
          <p className="text-xs font-bold">비즈니스 브리핑 리포트를 불러오지 못했습니다.</p>
        </div>
      )}
    </div>
  );
}
