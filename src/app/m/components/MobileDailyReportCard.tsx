"use client";

import React from "react";
import { FileText, Send, Sparkles, X, Check } from "lucide-react";

interface MobileDailyReportCardProps {
  isDailyReportModalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  reportContent: string;
  setReportContent: (content: string) => void;
  isSubmitting: boolean;
  isAiSummarizing: boolean;
  onAiSummarize: () => void;
  onSubmitReport: (e: React.FormEvent) => void;
}

export const MobileDailyReportCard: React.FC<MobileDailyReportCardProps> = ({
  isDailyReportModalOpen,
  onOpenModal,
  onCloseModal,
  reportContent,
  setReportContent,
  isSubmitting,
  isAiSummarizing,
  onAiSummarize,
  onSubmitReport,
}) => {
  return (
    <>
      {/* 📁 메인 화면 일일 업무 보고서 카드 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 mb-4 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">일일 업무 보고서</h3>
            </div>
          </div>
          <button
            onClick={onOpenModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-xs transition-all active:scale-95 border-none cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>작성 / 상신</span>
          </button>
        </div>
      </div>

      {/* 📁 일일 업무 보고서 작성 모달 */}
      {isDailyReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-left animate-scale-in">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">일일 업무 보고서 상신</h3>
                  <p className="text-[10px] text-slate-400 font-bold">오늘 진행 업무 정리 및 제출</p>
                </div>
              </div>
              <button
                onClick={onCloseModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmitReport} className="space-y-3.5">
              {/* AI 자동 요약 버튼 바 */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-xs font-extrabold text-slate-600">오늘 할 일 기반 AI 요약</span>
                <button
                  type="button"
                  onClick={onAiSummarize}
                  disabled={isAiSummarizing}
                  className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs border-none cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isAiSummarizing ? "요약 생성 중..." : "AI 요약 생성"}</span>
                </button>
              </div>

              {/* 본문 텍스트 영역 */}
              <div>
                <textarea
                  required
                  rows={6}
                  placeholder="오늘 수행한 업무 내용, 성과 및 특이사항을 작성해 주세요."
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-none leading-relaxed"
                />
              </div>

              {/* 하단 버튼 */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "상신 중..." : "보고서 상신"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
