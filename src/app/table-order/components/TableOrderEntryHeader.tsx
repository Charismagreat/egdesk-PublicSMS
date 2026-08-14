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
      <p className="text-slate-500 mb-6 font-medium">현재 앉아계신 테이블 번호를 입력해주세요.</p>

      {/* 관리자 QR 생성 숏컷 안내 단추 */}
      <div className="mb-8">
        <a
          href="/products"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold transition-all border border-indigo-200/80 no-underline"
          title="상품 관리 AI 페이지로 이동하여 테이블 QR 코드 생성"
        >
          <span>📱 상품 관리 AI에서 테이블 QR 생성/인쇄하기</span>
        </a>
      </div>
    </>
  );
}
