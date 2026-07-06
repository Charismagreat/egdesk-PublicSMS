"use client";

import React, { useState, useEffect } from "react";

// 커스텀 인스타그램 아이콘 SVG 컴포넌트
export function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/**
 * 인스타그램 마케팅 AI 대시보드 헤더 및 실시간 Ticker 컴포넌트
 */
export default function InstagramHeader() {
  const [systemTime, setSystemTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ko-KR", { 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: true 
      });
      setSystemTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 mb-8 relative z-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
          <InstagramIcon className="w-8 h-8 text-pink-600 mr-3" />
          인스타그램 마케팅 AI
        </h1>
      </div>

      {/* 시스템 시간 표시 */}
      <div className="mt-4 md:mt-0 flex items-center gap-3">
        <span className="text-xs text-slate-500 font-semibold bg-slate-100/80 border border-slate-200/50 px-2.5 py-1 rounded-lg">
          현재 시스템 시간: {systemTime || "12:00 PM"}
        </span>
      </div>
    </div>
  );
}
