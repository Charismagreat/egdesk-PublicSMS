"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";

function GoogleLogoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    setError("");
    setLocalLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
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
        <form onSubmit={handleLocalLogin} className="space-y-4 mb-6">
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

        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="absolute bg-white px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">또는 소셜 로그인</span>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-98 cursor-pointer"
          >
            <GoogleLogoIcon className="w-5 h-5 shrink-0" />
            <span>{loading ? "구글 로그인 요청 중..." : "Google 계정으로 계속하기"}</span>
          </button>
        </div>

        {/* 로컬 개발 테스트 편의를 위한 크레덴셜 정보 안내 영역 */}
        <div className="mt-6 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-center">
          <p className="text-[10px] text-blue-750 font-bold">💡 로컬 개발 테스트용 최고관리자 계정</p>
          <p className="text-[10px] text-blue-500 font-bold mt-1">아이디: <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">admin</span> / 비밀번호: <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">admin123</span></p>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-bold">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>본 서비스는 최고 수준의 데이터 암호화 표준을 준수합니다.</span>
        </div>
      </div>
    </div>
  );
}
