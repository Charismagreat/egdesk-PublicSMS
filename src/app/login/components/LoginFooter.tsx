"use client";

import React from "react";

// 로그인 페이지의 하단 카피라이트 푸터 컴포넌트
export function LoginFooter() {
  return (
    <div className="mt-8 text-center text-slate-500 text-xs">
      &copy; {new Date().getFullYear()} EGDesk CRM. All rights reserved.
    </div>
  );
}
