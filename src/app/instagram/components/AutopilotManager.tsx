"use client";

import React, { useState } from "react";
import { Settings, RefreshCw, ToggleLeft, ToggleRight, Sparkles, Plus, Trash2, CheckCircle2, UserCheck, HelpCircle, X, Shuffle, ShieldCheck, Layers } from "lucide-react";
import { AutopilotSettings, McpInstagramConnection } from "../types";

interface AutopilotManagerProps {
  settings: AutopilotSettings;
  isSessionConnected: boolean;
  mcpConnections?: McpInstagramConnection[];
  selectedConnectionId?: string | null;
  onSelectConnection?: (conn: McpInstagramConnection) => void;
  onSaveSettings: (updates: Partial<AutopilotSettings>) => Promise<void>;
  onTriggerAutopilot: () => Promise<void>;
  onConnectSession: (loginName: string, pass: string, handle?: string) => Promise<void>;
  onDisconnectSession: () => Promise<void>;
  onDeleteConnection?: (connId: string) => Promise<void>;
}

export default function AutopilotManager({
  settings,
  isSessionConnected,
  mcpConnections = [],
  selectedConnectionId,
  onSelectConnection,
  onSaveSettings,
  onTriggerAutopilot,
  onConnectSession,
  onDisconnectSession,
  onDeleteConnection,
}: AutopilotManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [sessionLoginName, setSessionLoginName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionHandle, setSessionHandle] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionLoginName.trim() || !sessionPassword.trim()) return;
    onConnectSession(sessionLoginName.trim(), sessionPassword.trim(), sessionHandle.trim());
    setSessionLoginName("");
    setSessionPassword("");
    setSessionHandle("");
    setShowAddForm(false);
  };

  return (
    <div className="p-6 lg:p-8 rounded-3xl border border-slate-100 bg-white shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">EGDesk MCP 인스타그램 연동 관제</h2>
        </div>
        {settings.is_autopilot === 1 && (
          <button
            onClick={onTriggerAutopilot}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 hover:shadow-sm transition duration-200 cursor-pointer text-xs self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
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
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="inline-flex items-center justify-center text-slate-400 hover:text-indigo-600 transition border-0 bg-transparent cursor-pointer p-0.5"
                    title="오토 모드 상품 선택 순서 매커니즘 안내"
                  >
                    <HelpCircle className="w-4 h-4 text-indigo-500 hover:scale-110 transition-transform" />
                  </button>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-all ${
                      settings.is_autopilot === 1
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
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
                  <ToggleRight className="w-14 h-8 text-indigo-600" />
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
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
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-extrabold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽 칼럼: EGDesk MCP 계정 등록/선택 콤보박스 */}
        <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1.5 rounded-xl">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                이지데스크 MCP 등록 계정 관리
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddForm ? "취소" : "새 계정 등록"}
              </button>
            </div>

            {/* 1. 이지데스크 MCP 등록 계정 드롭다운/목록 */}
            {mcpConnections.length > 0 && !showAddForm && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">
                  포스팅 수행할 MCP 계정 선택 ({mcpConnections.length}개 저장됨)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {mcpConnections.map((conn) => {
                    const isSelected = selectedConnectionId === conn.id || settings.instagram_username === conn.username;
                    return (
                      <div
                        key={conn.id}
                        onClick={() => onSelectConnection && onSelectConnection(conn)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-sm"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <UserCheck className={`w-4 h-4 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                          <div>
                            <p className="text-xs font-bold">@{conn.username || conn.name}</p>
                            {conn.handle && <p className="text-[10px] text-slate-400">@{conn.handle}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> 선택됨
                            </span>
                          )}
                          {onDeleteConnection && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`계정 @${conn.username}을(를) 삭제하시겠습니까?`)) {
                                  onDeleteConnection(conn.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. 이지데스크 MCP 계정 신규 추가 등록 폼 */}
            {showAddForm && (
              <form onSubmit={handleSessionSubmit} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-xs font-bold text-slate-700">EGDesk MCP 인스타그램 계정 신규 저장</p>
                <input
                  type="text"
                  placeholder="인스타그램 사용자명 (예: official_brand)"
                  value={sessionLoginName}
                  onChange={(e) => setSessionLoginName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                />
                <input
                  type="password"
                  placeholder="인스타그램 비밀번호 (보안 보관)"
                  value={sessionPassword}
                  onChange={(e) => setSessionPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                />
                <input
                  type="text"
                  placeholder="공개 @핸들 (선택 사항)"
                  value={sessionHandle}
                  onChange={(e) => setSessionHandle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white py-2 rounded-xl shadow-sm transition cursor-pointer border-0"
                >
                  이지데스크 MCP에 계정 저장 🔒
                </button>
              </form>
            )}

            {/* 3. 계정이 없는 기본 안내 상태 */}
            {mcpConnections.length === 0 && !showAddForm && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  등록된 이지데스크 MCP 계정이 없습니다. 계정을 추가 등록하시면 무인 자동 포스팅 및 성과 수집이 실행됩니다.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white px-4 py-2 rounded-xl transition cursor-pointer border-0"
                >
                  첫번째 계정 추가 등록하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 오토 모드 상품 선택 순서 매커니즘 팝업 모달 */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 text-left relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* 상단 닫기 단추 및 타이틀 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">오토 모드 상품 선택 순서 매커니즘</h3>
                  <p className="text-[11px] text-slate-500 font-medium">AI 오토파일럿 무인 포스팅 시 상품이 순차로 로테이션되는 방식 안내</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3가지 스마트 로테이션 규칙 카드 */}
            <div className="space-y-3.5">
              {/* 1순위 */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Shuffle className="w-3 h-3" /> 1순위
                  </span>
                  <h4 className="text-xs font-bold text-indigo-900">순차 라운드-로빈 (가장 오랫동안 홍보 안 된 상품 우선)</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium pl-1">
                  등록된 마스터 상품 리스트 중에서 <strong className="text-indigo-800">"가장 오랫동안 홍보 피드가 작성되지 않은 상품(Least Recently Posted)"</strong> 순서대로 차례차례 선택됩니다. 특정 한두 개 상품만 연속으로 피드에 도배되는 것을 방지합니다.
                </p>
              </div>

              {/* 2순위 */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> 2순위
                  </span>
                  <h4 className="text-xs font-bold text-emerald-900">비활성 / 재고 0개 상품 자동 스킵 (Self-Healing)</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium pl-1">
                  이미 품절되었거나 삭제/비활성화 처리된 상품은 AI가 자동으로 감지하여 건너뛰고(Skip), 그다음 정상 판매 중인 활성 상품을 선택합니다.
                </p>
              </div>

              {/* 3순위 */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold bg-purple-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Layers className="w-3 h-3" /> 3순위
                  </span>
                  <h4 className="text-xs font-bold text-purple-900">카테고리 밸런싱 (다양한 상품군 피드 조합)</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium pl-1">
                  이전 포스팅에서 홍보한 카테고리와 중복되지 않도록, 다양한 카테고리의 상품컷과 문구를 균형 있게 교차 선택합니다.
                </p>
              </div>
            </div>

            {/* 하단 닫기 단추 */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white rounded-xl shadow-sm transition cursor-pointer border-0"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
