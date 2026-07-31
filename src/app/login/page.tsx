"use client";

import { apiFetch } from '@/lib/api';
import React, { useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";

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
        <div className="text-center mb-6">
          {/* 로고 영역 */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            PublicSMS 서비스 로그인
          </h2>
          <p className="text-slate-500 mt-2 text-xs font-semibold">
            개인 및 소상공인을 위한 AI 기반 자율 마케팅 & 문자 관리 플랫폼
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
