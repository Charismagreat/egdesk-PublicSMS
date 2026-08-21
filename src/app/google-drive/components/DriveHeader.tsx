"use client";

import React, { useState } from "react";
import { HardDrive, RefreshCw, LogIn, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Power } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DriveHeaderProps {
  authStatus: any;
  driveStatus: any;
  isSyncing: boolean;
  onRefresh: () => void;
  onSyncNow: () => void;
}

export default function DriveHeader({
  authStatus,
  driveStatus,
  isSyncing,
  onRefresh,
  onSyncNow
}: DriveHeaderProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTogglingLoop, setIsTogglingLoop] = useState(false);

  const isConnected = authStatus?.status === "connected" || authStatus?.connected === true || authStatus?.email;
  const isLoopActive = driveStatus?.pollingLoopActive === true || driveStatus?.pollLoopActive === true;

  const handleOAuthLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await apiFetch("/api/google-drive/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceConsent: true })
      });
      const data = await res.json();
      if (data.success && data.data?.authUrl) {
        window.open(data.data.authUrl, "_blank", "width=600,height=700");
      }
    } catch (err) {
      console.error("Drive OAuth error:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTogglePollLoop = async () => {
    setIsTogglingLoop(true);
    try {
      await apiFetch("/api/google-drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isLoopActive ? "stop_loop" : "start_loop",
          intervalSeconds: 60,
          download: true
        })
      });
      onRefresh();
    } catch (err) {
      console.error("Toggle poll loop error:", err);
    } finally {
      setIsTogglingLoop(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/80 shadow-xs">
            <HardDrive className="w-7 h-7" />
          </div>
          구글 드라이브 관리 AI
        </h1>
        <p className="text-slate-500 mt-2 text-sm pl-12 font-medium">
          이지데스크에 연결된 구글 드라이브를 실시간 관제하고, 감시 폴더의 파일 변경 이벤트를 자동 감지 및 지식 자산으로 동기화합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* 계정 인증 상태 뱃지 및 로그인 버튼 */}
        {isConnected ? (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{authStatus?.email || "Google 계정 연동됨"}</span>
            <button
              onClick={handleOAuthLogin}
              disabled={isLoggingIn}
              className="text-[11px] underline text-emerald-700 hover:text-emerald-900 ml-1 cursor-pointer"
            >
              계정 변경
            </button>
          </div>
        ) : (
          <button
            onClick={handleOAuthLogin}
            disabled={isLoggingIn}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-rose-600" />
            <span>{isLoggingIn ? "인증 창 여는 중..." : "Google 계정 연동하기"}</span>
          </button>
        )}

        {/* 백그라운드 자동 폴링 루프 토글 */}
        <button
          onClick={handleTogglePollLoop}
          disabled={isTogglingLoop}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer shadow-xs ${
            isLoopActive
              ? "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
          }`}
          title="백그라운드에서 60초 주기로 드라이브 변경 사항을 자동 감지합니다."
        >
          <Power className={`w-3.5 h-3.5 ${isLoopActive ? "text-indigo-600 animate-pulse" : "text-slate-400"}`} />
          <span>자동 감지 {isLoopActive ? "ON (60초)" : "OFF"}</span>
        </button>

        {/* 즉시 동기화 버튼 */}
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "동기화 중..." : "즉시 동기화 (Sync)"}</span>
        </button>
      </div>
    </div>
  );
}
