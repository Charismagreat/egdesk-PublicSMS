"use client";

import React from "react";
import { UtensilsCrossed } from "lucide-react";

// 테이블 오더 진입 페이지의 상단 헤더 컴포넌트
export function TableOrderEntryHeader() {
  return (
    <>
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <UtensilsCrossed className="w-10 h-10 text-orange-600" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-800 mb-2">테이블 오더</h1>
      <p className="text-slate-500 mb-8 font-medium">현재 앉아계신 테이블 번호를 입력해주세요.</p>
    </>
  );
}
