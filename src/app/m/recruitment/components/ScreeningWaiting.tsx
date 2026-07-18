"use client";

import React from "react";
import { User } from "lucide-react";

interface ScreeningWaitingProps {
  name: string;
}

export function ScreeningWaiting({ name }: ScreeningWaitingProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-5 animate-fade-in">
      <div className="p-4 bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] rounded-full text-white shrink-0 shadow-xl animate-pulse">
        <User className="w-8 h-8" />
      </div>
      <div className="space-y-3 px-2 text-slate-800">
        <h3 className="text-sm font-extrabold text-slate-800">구직 프로필 피딩 완료!</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          사장님 스마트 채용 대시보드에 **'{name}'** 님의 프로필이 0.1초 만에 배달 완료되었습니다.
        </p>
        <div className="inline-block bg-[#f91f7f]/5 border border-[#f91f7f]/20 px-4 py-3 rounded-2xl text-[10px] text-[#f91f7f] font-black animate-pulse leading-relaxed">
          ⚡️ 사장님이 실시간 지원서를 확인하고 AI 1:1 DM 면접방을 개방할 때까지 잠시만 이 창을 켜둔 채 대기해 주세요.
        </div>
      </div>
    </div>
  );
}
