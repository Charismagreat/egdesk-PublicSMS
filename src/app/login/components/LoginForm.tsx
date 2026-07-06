"use client";

import React from "react";
import { LogIn, Lock, User } from "lucide-react";
import { UseLoginResult } from "../types";

type LoginFormProps = UseLoginResult;

// 로그인 폼 및 유효성 피드백을 담당하는 프레젠테이션 컴포넌트
export function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  error,
  isLoading,
  handleLogin,
}: LoginFormProps) {
  return (
    <div className="p-8">
      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {/* 아이디 입력 영역 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white transition-all placeholder:text-slate-600"
            />
          </div>

          {/* 비밀번호 입력 영역 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* 로그인 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5 mr-2" />
              로그인
            </>
          )}
        </button>
      </form>
    </div>
  );
}
