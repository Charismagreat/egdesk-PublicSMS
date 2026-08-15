"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { getEgdeskBasePath } from "@/lib/api";

// Turbopack / Next.js 16 개발 모드에서 발생하는 performance.measure 음수 타임스탬프 에러 방어 가드
if (typeof window !== "undefined" && window.performance && typeof window.performance.measure === "function") {
  const origMeasure = window.performance.measure.bind(window.performance);
  window.performance.measure = function (...args: any[]) {
    try {
      return (origMeasure as any)(...args);
    } catch {
      return undefined as any;
    }
  };
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const basePath = `${getEgdeskBasePath()}/api/auth`;
  return <SessionProvider basePath={basePath}>{children}</SessionProvider>;
}

