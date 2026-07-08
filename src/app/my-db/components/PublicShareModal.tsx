"use client";

import React from "react";
import { Database, X, CheckCircle, RefreshCw } from "lucide-react";

export interface PublicShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedShareUrl: string;
  setGeneratedShareUrl: (url: string) => void;
  shareTitle: string;
  setShareTitle: (title: string) => void;
  shareInterval: "NONE" | "HOURLY" | "DAILY" | "WEEKLY";
  setShareInterval: (interval: "NONE" | "HOURLY" | "DAILY" | "WEEKLY") => void;
  isSharing: boolean;
  handleCreateShare: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "warn") => void;
}

export default function PublicShareModal({
  isOpen,
  onClose,
  generatedShareUrl,
  setGeneratedShareUrl,
  shareTitle,
  setShareTitle,
  shareInterval,
  setShareInterval,
  isSharing,
  handleCreateShare,
  showToast,
}: PublicShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in text-left">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 text-left">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <Database className="w-4.5 h-4.5 text-indigo-500" />
            🌐 AI 분석 결과 퍼블릭 웹 게시 & 자동 갱신 구성
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-full border-none bg-transparent cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-slate-700 bg-white text-left">
          {generatedShareUrl ? (
            <div className="space-y-4.5 animate-zoom-in text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-green-600 shadow-3xs">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-800">공개 대시보드가 성공적으로 개설되었습니다!</h4>
                <p className="text-[10px] text-slate-400">외부 손님용 링크를 복사하여 바이어, 의사결정자에게 전달할 수 있습니다.</p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl select-all font-mono text-[11px] text-slate-650 justify-between">
                <span className="truncate pr-4 select-all">{generatedShareUrl}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedShareUrl);
                    showToast("게시판 공유 링크가 클립보드에 무사히 복사되었습니다!", "success");
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black shrink-0 border-none cursor-pointer hover:bg-blue-500 shadow-3xs"
                >
                  복사
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-extrabold border border-slate-800 cursor-pointer shadow-3xs"
                >
                  설정 닫기
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                  공개 게시글 제목 (의사결정자용 대시보드 한글 제목)
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="예: 월별 지출 현황 및 AI 자금 브리핑"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs text-slate-700 transition-all placeholder:text-slate-400 shadow-3xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                  실시간 최신 데이터 자동 갱신 주기
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    onClick={() => setShareInterval("NONE")}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all border-solid ${
                      shareInterval === "NONE"
                        ? "bg-blue-50/70 border-blue-200 text-blue-700"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-650"
                    }`}
                  >
                    🔄 자동 갱신 안 함
                  </button>
                  <button
                    onClick={() => setShareInterval("HOURLY")}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all border-solid ${
                      shareInterval === "HOURLY"
                        ? "bg-blue-50/70 border-blue-200 text-blue-700"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-650"
                    }`}
                  >
                    ⏰ 매시간 갱신
                  </button>
                  <button
                    onClick={() => setShareInterval("DAILY")}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all border-solid ${
                      shareInterval === "DAILY"
                        ? "bg-blue-50/70 border-blue-200 text-blue-700"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-655"
                    }`}
                  >
                    📅 매일 갱신 (권장)
                  </button>
                  <button
                    onClick={() => setShareInterval("WEEKLY")}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all border-solid ${
                      shareInterval === "WEEKLY"
                        ? "bg-blue-50/70 border-blue-200 text-blue-700"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-655"
                    }`}
                  >
                    📆 매주 갱신
                  </button>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl text-[10px] text-indigo-750 font-medium leading-relaxed">
                💡 **자동 갱신 파이프라인 작동 메커니즘**:
                매시간/매일/매주 주기에 도래하면 시스템은 백그라운드에서 원본 SQL을 다시 구동하여 최신 레코드를 읽고, **4단계 로컬 보안 비식별화 가드레일**을 정밀 통과시킨 최신 요약 데이터로 차트와 AI 브리핑 내용을 신선하게 자동 갱신합니다.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateShare}
                  disabled={isSharing}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSharing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-0.5 text-white" />
                      발행 등록 중...
                    </>
                  ) : (
                    <>
                      🌐 퍼블릭 대시보드 게시글 발행
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
