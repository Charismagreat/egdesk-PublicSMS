"use client";

import React from "react";

// 로그인 페이지의 상단 헤더 컴포넌트
export function LoginHeader() {
  return (
    <div className="p-8 text-center border-b border-slate-700">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
        EGDESK SMS
      </h1>
      <p className="text-slate-400 mt-2 text-sm">관리자 시스템에 로그인하세요</p>
    </div>
  );
}
