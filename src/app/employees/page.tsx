"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import EmployeeManagementTabContent from "@/app/settings/components/EmployeeManagementTabContent";

// 독립 페이지용 직원 관리 대장 랩퍼
export default function EmployeeManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans w-full px-4 md:px-8 py-8 relative">
      
      {/* 🏢 웅장한 대장 헤더 영역 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 mb-8 text-left">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/settings"
              className="p-2 hover:bg-slate-200/60 rounded-full transition-colors inline-flex items-center justify-center border-none text-slate-500 hover:text-slate-800 cursor-pointer mr-1"
              title="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 bg-indigo-50 rounded-2xl border border-indigo-100">
              <Users className="w-7 h-7 text-indigo-655" />
            </div>
            <h1 className="text-3xl font-black text-slate-850 tracking-tight">직원 관리 대장</h1>
          </div>
          <p className="text-slate-500 mt-2 text-sm pl-13">
            매장에 소속된 피고용인 직원 계정을 등록하고 권한 및 기본 정보를 안전하게 관리합니다.
          </p>
        </div>
      </div>

      {/* 탭용 핵심 컴포넌트를 수입해서 그대로 렌더링 */}
      <EmployeeManagementTabContent />

    </div>
  );
}
