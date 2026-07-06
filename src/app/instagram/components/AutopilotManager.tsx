"use client";

import React, { useState } from "react";
import { Settings, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle, BookOpen } from "lucide-react";
import { AutopilotSettings } from "../types";

interface AutopilotManagerProps {
  /**
   * 오토파일럿 설정
   */
  settings: AutopilotSettings;
  /**
   * 계정 연동 성공 상태
   */
  isSessionConnected: boolean;
  /**
   * 설정 저장 콜백
   */
  onSaveSettings: (updates: Partial<AutopilotSettings>) => Promise<void>;
  /**
   * 오토파일럿 수동 강제 구동 콜백
   */
  onTriggerAutopilot: () => Promise<void>;
  /**
   * 계정 세션 로그인 연동 콜백
   */
  onConnectSession: (loginName: string, pass: string) => Promise<void>;
  /**
   * 계정 연동 해제 콜백
   */
  onDisconnectSession: () => Promise<void>;
}

/**
 * 인스타그램 오토파일럿 마케팅 주기 설정 및 계정 바인딩 관리 컴포넌트
 */
export default function AutopilotManager({
  settings,
  isSessionConnected,
  onSaveSettings,
  onTriggerAutopilot,
  onConnectSession,
  onDisconnectSession,
}: AutopilotManagerProps) {
  const [sessionLoginName, setSessionLoginName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [connectionMode, setConnectionMode] = useState<"session" | "graph">("session");

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionLoginName.trim()) return;
    onConnectSession(sessionLoginName.trim(), sessionPassword.trim());
    setSessionLoginName("");
    setSessionPassword("");
  };

  return (
    <div className="p-6 lg:p-8 rounded-3xl border border-slate-100 bg-white shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-pink-600" />
          <h2 className="text-xl font-bold text-slate-800">인스타그램 오토파일럿 및 계정 바인딩</h2>
        </div>
        {settings.is_autopilot === 1 && (
          <button
            onClick={onTriggerAutopilot}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-pink-200 bg-pink-50 text-pink-700 font-semibold hover:bg-pink-100 hover:shadow-sm transition duration-200 cursor-pointer text-xs self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-pink-600" />
            오토파일럿 AI 즉시 가동
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 왼쪽 칼럼: 오토파일럿 주기 및 톤앤매너 */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-800">수동 / 오토 선택</label>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-all ${
                      settings.is_autopilot === 1
                        ? "bg-pink-50 text-pink-700 border-pink-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {settings.is_autopilot === 1 ? "● 오토 모드 작동 중" : "○ 수동 검토 모드"}
                  </span>
                </div>
                <span className="text-xs text-slate-500 block">
                  {settings.is_autopilot === 1
                    ? "100% 무인 오토파일럿이 주기적으로 피드를 올립니다."
                    : "AI가 초안을 만들고 어드민 큐에 대기(수동 승인 필요)"}
                </span>
              </div>
              <button
                onClick={() => onSaveSettings({ is_autopilot: settings.is_autopilot === 1 ? 0 : 1 })}
                className="focus:outline-none cursor-pointer border-0 bg-transparent"
              >
                {settings.is_autopilot === 1 ? (
                  <ToggleRight className="w-14 h-8 text-pink-600" />
                ) : (
                  <ToggleLeft className="w-14 h-8 text-slate-300" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">자동 마케팅 주기</label>
              <select
                value={settings.autopilot_interval}
                onChange={(e) => onSaveSettings({ autopilot_interval: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-pink-500 focus:bg-white transition"
              >
                <option value="DAILY">매일 (Daily)</option>
                <option value="WEEKLY">매주 월/목 (Weekly)</option>
                <option value="BIWEEKLY">격주 (Bi-weekly)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">발행 시간대</label>
              <input
                type="time"
                value={settings.autopilot_time}
                onChange={(e) => onSaveSettings({ autopilot_time: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-pink-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2">기본 선호 카피라이팅 톤</label>
            <div className="grid grid-cols-4 gap-2">
              {["인플루언서형", "세련된형", "전문가형", "유머형"].map((tone) => (
                <button
                  key={tone}
                  onClick={() => onSaveSettings({ tone_style: tone })}
                  className={`text-xs font-semibold py-2 px-1 rounded-lg border transition cursor-pointer ${
                    settings.tone_style === tone
                      ? "border-pink-300 bg-pink-50 text-pink-700 font-extrabold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽 칼럼: 계정 세션 연동 및 가이드 */}
        <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 space-y-6">
          <div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setConnectionMode("session")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                  connectionMode === "session"
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                개인 계정 세션 바인딩
              </button>
              <button
                onClick={() => setConnectionMode("graph")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                  connectionMode === "graph"
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                비즈니스 Graph API 연동
              </button>
            </div>

            {connectionMode === "session" ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-pink-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  임시 세션 연동 인터페이스
                </div>

                {isSessionConnected ? (
                  <div className="pt-2 text-left">
                    <p className="text-sm font-bold text-slate-800">@ {settings.instagram_username}</p>
                    <span className="text-xs text-emerald-600 mt-1 block font-medium">
                      ● 실시간 개인 계정 세션 연동 활성화
                    </span>
                    <button
                      onClick={onDisconnectSession}
                      className="mt-3 w-full bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 py-2 rounded-xl border border-slate-200 shadow-sm transition cursor-pointer"
                    >
                      인스타 계정 연동 해제
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSessionSubmit} className="space-y-3 pt-2">
                    <input
                      type="text"
                      placeholder="인스타그램 사용자명 (예: instagram_user)"
                      value={sessionLoginName}
                      onChange={(e) => setSessionLoginName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-pink-500 transition"
                    />
                    <input
                      type="password"
                      placeholder="인스타그램 비밀번호 (보안 암호화)"
                      value={sessionPassword}
                      onChange={(e) => setSessionPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-pink-500 transition"
                    />
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-xs font-bold text-white py-2 rounded-xl shadow-sm transition cursor-pointer border-0"
                    >
                      개인 계정 세션 로그인 바인딩
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600">
                  <BookOpen className="w-3.5 h-3.5" />
                  안전한 Graph API 비즈니스 연동 가이드
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  개인 계정 세션 연동은 임시 조치이며, 인스타 차단 위험을 원천 방지하기 위해 **무료 프로페셔널(비즈니스) 전환**을 강력히 권장합니다.
                </p>
                <div className="text-xs space-y-1.5 text-slate-600 font-bold">
                  <p>1. 인스타 앱 설정 ➔ '프로페셔널 계정으로 전환'</p>
                  <p>2. 관리자 페이스북 페이지와 인스타 계정 연결</p>
                  <p>3. 페이스북 개발자 포털에서 Graph API 연동 토큰 발급</p>
                </div>
                <input
                  type="text"
                  placeholder="Graph Access Token 입력"
                  value={
                    settings.access_token && !settings.access_token.startsWith("session") ? settings.access_token : ""
                  }
                  onChange={(e) => onSaveSettings({ access_token: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-pink-500 transition"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
