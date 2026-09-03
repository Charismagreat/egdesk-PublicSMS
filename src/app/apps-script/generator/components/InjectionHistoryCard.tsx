"use client";

import React from "react";
import { History, FileSpreadsheet, ExternalLink, RefreshCw, Layers, CheckCircle2, Clock, Trash2 } from "lucide-react";

interface InjectionHistoryCardProps {
  injections: any[];
  loading: boolean;
  onRefresh: () => void;
  onSelectInjection?: (inj: any) => void;
  onDeleteInjection?: (id: string) => void;
  onClearAllInjections?: () => void;
}

export default function InjectionHistoryCard({
  injections,
  loading,
  onRefresh,
  onSelectInjection,
  onDeleteInjection,
  onClearAllInjections,
}: InjectionHistoryCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-xs">
            이지데스크 AI 자동화 주입 완료 대장 ({injections.length}개 시트)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {injections.length > 0 && onClearAllInjections && (
            <button
              onClick={onClearAllInjections}
              disabled={loading}
              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="대장 전체 기록 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 사본 기록 삭제</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-none bg-transparent"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {injections.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-1">
          <FileSpreadsheet className="w-7 h-7 mx-auto mb-1 text-slate-300" />
          <p className="text-xs font-medium">기존 사본 및 주입 내역이 정리되었습니다.</p>
          <p className="text-[11px] text-slate-400">
            상단에서 구글 시트 URL을 입력하고 새로운 자동화 스크립트를 주입해 보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {injections.map((inj) => {
            const historyList: any[] = Array.isArray(inj.history) && inj.history.length > 0
              ? inj.history
              : [{ prompt: inj.prompt || inj.summary, created_at: inj.updated_at || inj.created_at, version: inj.version || 1 }];

            return (
              <div
                key={inj.id || inj.sheet_id}
                className="bg-slate-50/80 hover:bg-indigo-50/20 border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-4.5 transition-all space-y-3 text-xs shadow-3xs"
              >
                {/* 상단: 시트 타이틀 & 메인 액션 버튼 */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200/70 shrink-0 shadow-3xs">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-800 truncate text-sm">
                          {inj.sheet_title || "자동화 구글 시트"}
                        </h4>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>배포됨 (v{inj.version || historyList.length})</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        ID: {inj.gas_project_id || inj.sheet_id || inj.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectInjection && (
                      <button
                        onClick={() => onSelectInjection(inj)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md flex items-center gap-1 text-xs"
                        title="이 시트의 최신 자동화 코드로 수정 및 3단계 진입"
                      >
                        <span>⚡ 이어서 수정하기</span>
                      </button>
                    )}

                    {inj.sheet_url && (
                      <a
                        href={inj.sheet_url.includes('/copy') ? inj.sheet_url.replace('/copy', '/edit') : inj.sheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 rounded-xl transition-all shadow-3xs"
                        title="구글 시트 바로 열기"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {onDeleteInjection && (
                      <button
                        onClick={() => onDeleteInjection(inj.id || inj.sheet_id)}
                        className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-3xs"
                        title="이 시트의 전체 자동화 기록 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 본문: 사용된 프롬프트 및 시간 작업 이력 타임라인 */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                    <History className="w-3.5 h-3.5 text-indigo-500" />
                    <span>작업 프롬프트 이력 ({historyList.length}건)</span>
                  </div>

                  <div className="space-y-2">
                    {historyList.map((h: any, idx: number) => {
                      const isLatest = idx === 0;
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl p-3 border transition-all text-xs space-y-1.5 ${
                            isLatest
                              ? "bg-white border-indigo-200 shadow-3xs"
                              : "bg-slate-100/60 border-slate-200/60 opacity-90"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                  isLatest
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {isLatest ? `v${h.version || historyList.length - idx} (최신)` : `v${h.version || historyList.length - idx}`}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {isLatest ? "최신 반영 프롬프트" : "이전 작업 프롬프트"}
                              </span>
                            </div>

                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(h.created_at)}</span>
                            </span>
                          </div>

                          <p className="text-[11.5px] text-slate-700 font-normal leading-relaxed whitespace-pre-line bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                            {h.prompt || h.summary || "자연어 기반 스크립트 주입"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
