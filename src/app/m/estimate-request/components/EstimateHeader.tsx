import React from "react";
import { Sparkles } from "lucide-react";

export function EstimateHeader() {
  return (
    <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white p-8 rounded-b-[40px] shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl"></div>
      
      <div className="space-y-3 relative z-10">
        <div className="inline-flex items-center space-x-1.5 bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Fast B2B Smart Onboarding</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight leading-tight">B2B 파트너 모바일 견적 요청</h1>
        <p className="text-slate-300 text-xs font-medium leading-relaxed">
          필요하신 물품 수량을 기입하신 뒤 사업자 확인을 거쳐 주시면, AI 실시간 정산 및 등급 할인이 연동된 최적 견적 제안을 발송해 드립니다.
        </p>
      </div>
    </div>
  );
}
