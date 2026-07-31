"use client";

import { apiFetch } from '@/lib/api';
import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
function EgdeskIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg_login" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#1d2750"/>
          <stop offset="100%" stopColor="#10162e"/>
        </linearGradient>
        <clipPath id="rounded_login">
          <rect width="200" height="200" rx="46"/>
        </clipPath>
      </defs>
      <g clipPath="url(#rounded_login)">
        <rect width="200" height="200" fill="url(#bg_login)"/>
        <rect x="58" y="48" width="22" height="92" rx="9" fill="#A6B3CE"/>
        <rect x="74" y="54" width="72" height="22" rx="8" fill="#EAEFFF"/>
        <rect x="74" y="89" width="56" height="22" rx="8" fill="#EAEFFF"/>
        <rect x="74" y="124" width="72" height="22" rx="8" fill="#EAEFFF"/>
        <circle cx="90" cy="65" r="3.6" fill="#4FE3E3"/>
        <circle cx="103" cy="65" r="3.6" fill="#4FE3E3"/>
        <circle cx="90" cy="100" r="3.6" fill="#4FE3E3"/>
        <circle cx="103" cy="100" r="3.6" fill="#4FE3E3"/>
        <circle cx="90" cy="135" r="3.6" fill="#4FE3E3"/>
        <circle cx="103" cy="135" r="3.6" fill="#4FE3E3"/>
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    setError("");
    setLocalLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.error || "로그인에 실패했습니다.");
        setLocalLoading(false);
      }
    } catch (err) {
      setError("서버 통신에 실패했습니다.");
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans p-4">
      {/* 장식용 은은한 그라데이션 백그라운드 블러 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none"></div>
 
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-xl max-w-md w-full p-8 relative z-10 transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-6 flex flex-col items-center">
          {/* 로고 영역 */}
          <div className="mb-4 shadow-xl shadow-indigo-950/20 rounded-2xl overflow-hidden hover:scale-105 transition-transform">
            <EgdeskIcon className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            EGDESK SMS 로그인
          </h2>
          <p className="text-slate-500 mt-2 text-xs font-semibold">
            중소기업을 위한 AI 기반 자율 경영 플랫폼
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-650 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        {/* 일반 계정 로그인 폼 */}
        <form onSubmit={handleLocalLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-slate-700 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-slate-700 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white/50"
            />
          </div>
          <button
            type="submit"
            disabled={localLoading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{localLoading ? "로그인 중..." : "로그인"}</span>
            {!localLoading && <ArrowRight className="w-4 h-4 text-blue-200" />}
          </button>
        </form>
      </div>
    </div>
  );
}
