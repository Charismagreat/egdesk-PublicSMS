"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

export default function HelpHeader() {
  return (
    <div className="w-full bg-white border border-slate-100 p-6 md:p-8 rounded-3xl shadow-sm block">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
            <HelpCircle className="w-6 h-6 shrink-0" />
          </div>
          <span className="text-[10px] md:text-[11px] font-black tracking-wider bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase">
            Help Center
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight block">
          Q&A 헬프센터
        </h1>

        <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed max-w-3xl block">
          이지데스크의 AI 자율 마케터(Autonomous Copilot), 무료 문자 발송, 단골 포인트 적립 등 핵심 20대 기능의 명쾌한 사용 요령을 한눈에 알아보세요.
        </p>
      </div>
    </div>
  );
}
