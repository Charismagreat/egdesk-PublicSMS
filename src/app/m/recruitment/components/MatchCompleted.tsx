"use client";

import React from "react";
import { ShieldCheck, Award } from "lucide-react";

interface MatchCompletedProps {
  name: string;
}

export function MatchCompleted({ name }: MatchCompletedProps) {
  return (
    <div className="flex-grow flex flex-col items-center justify-center py-16 text-center space-y-5 animate-fade-in text-slate-800">
      {/* 스토리 축하 배지 */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] text-white flex items-center justify-center shadow-2xl animate-bounce">
        <ShieldCheck className="w-9 h-9" />
      </div>
      
      <div className="space-y-3 px-2">
        <h3 className="text-sm font-black text-transparent bg-gradient-to-r from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] bg-clip-text">
          E-Contract Signed Match!
        </h3>
        <p className="text-xs text-slate-800 leading-relaxed font-bold">
          축하합니다! **'{name}'** 크루님과 **'EGDESK 매장'**의 모바일 근로계약 매칭이 최종 체결 완료되었습니다! 🎉
        </p>
        
        {/* 인스타 스토리 캡션 스타일 가이드보드 */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5 text-left text-[10px] text-slate-600 leading-relaxed font-bold shadow-sm">
          <div className="flex items-center gap-1.5 text-[#f91f7f] font-black border-b border-slate-100 pb-1.5">
            <Award className="w-3.5 h-3.5" /> 첫 출근 준비 서류 목록
          </div>
          <p>1. **신분증 & 급여 통장 사본** 1부</p>
          <p>2. **보건증** (식음 F&B 업장의 경우 필수 구비)</p>
          <p>3. **프로 정신**: 밝고 신뢰받는 크루원으로서의 마인드셋!</p>
        </div>
        
        <p className="text-[9px] text-slate-500 font-semibold">본 브라우저 창은 닫으셔도 좋으며, 사장님 관리 대시보드에 모든 데이터가 안전하게 보존되었습니다.</p>
      </div>
    </div>
  );
}
