"use client";

import React from "react";
import { Check } from "lucide-react";

export function ReviewWaiting() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-5 animate-fade-in">
      <div className="p-4 bg-gradient-to-tr from-[#e84e27] to-[#9b2bb4] rounded-full text-white shrink-0 shadow-xl">
        <Check className="w-8 h-8" />
      </div>
      <div className="space-y-3 px-2 text-slate-800">
        <h3 className="text-sm font-extrabold text-slate-800">AI DM 면접 종료!</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          작성해주신 훌륭한 답변들이 실시간 인재 핏 분석서로 파싱되어 사장님 결재함에 정상적으로 도달했습니다.
        </p>
        <div className="inline-block bg-[#9b2bb4]/5 border border-[#9b2bb4]/20 px-4 py-3 rounded-2xl text-[10px] text-[#9b2bb4] font-black animate-pulse leading-relaxed">
          ⏳ 사장님이 분석서를 검토하신 뒤 최종 합격 승인 및 전자 근로계약을 요청하실 때까지 그대로 대기해 주세요!
        </div>
      </div>
    </div>
  );
}
