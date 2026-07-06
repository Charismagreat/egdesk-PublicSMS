import React from "react";
import { Compass, UserCheck } from "lucide-react";

interface HeaderProps {
  currentUser: string;
  setCurrentUser: (val: string) => void;
  currentRole: "SUPER_ADMIN" | "PRESIDENT" | "SUB_OPERATOR";
  setCurrentRole: (val: "SUPER_ADMIN" | "PRESIDENT" | "SUB_OPERATOR") => void;
  currentDept: string;
  setCurrentDept: (val: string) => void;
}

export function Header({
  currentUser,
  currentRole,
  setCurrentUser,
  setCurrentRole,
  currentDept,
  setCurrentDept,
}: HeaderProps) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center tracking-tight">
          <Compass className="w-8 h-8 text-slate-500 mr-3 animate-spin-slow" />
          지식 관리 AI
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          비정형 문서의 결재 이력 감사 및 Zero-Trust 사내 지식 RAG 분석을 관제합니다.
        </p>
      </div>

      {/* 실제 로그인 세션 정보 표시 패널 */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs shadow-sm self-start">
        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-slate-600" /> 현재 권한:
        </span>
        <span className={`px-2.5 py-1 rounded-lg font-bold ${
          currentRole === "SUPER_ADMIN" 
            ? "bg-rose-100 text-rose-700 border border-rose-200" 
            : currentDept === "SALES" 
              ? "bg-blue-100 text-blue-700 border border-blue-200" 
              : "bg-cyan-100 text-cyan-700 border border-cyan-200"
        }`}>
          {currentRole === "SUPER_ADMIN" ? "최고관리자 (대표)" : 
           currentDept === "SALES" ? "영업부서장" : "일반사원"}
        </span>
        <span className="text-slate-300 font-light">|</span>
        <span className="text-slate-600 font-medium flex items-center gap-1">
          계정명: <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-semibold">{currentUser}</code>
        </span>
      </div>
    </div>
  );
}
