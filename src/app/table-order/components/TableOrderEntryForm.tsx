"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

interface TableOrderEntryFormProps {
  tableNumber: string; // 입력된 테이블 번호
  setTableNumber: (value: string) => void; // 테이블 번호 셋 함수
  handleStart: (e: React.FormEvent) => void; // 시작 이벤트 핸들러
}

// 테이블 번호 입력을 받고 라우팅 제출을 수행하는 폼 컴포넌트
export function TableOrderEntryForm({
  tableNumber,
  setTableNumber,
  handleStart,
}: TableOrderEntryFormProps) {
  return (
    <form onSubmit={handleStart}>
      <div className="mb-6 relative">
        <input 
          type="number" 
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          className="w-full text-center text-4xl font-black py-4 border-b-2 border-slate-200 outline-none focus:border-orange-500 transition-colors"
          placeholder="0"
          min="1"
          autoFocus
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">번</span>
      </div>

      <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg py-4 rounded-2xl transition-all flex items-center justify-center group shadow-lg shadow-orange-600/30">
        메뉴 보기 
        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
      </button>
    </form>
  );
}
