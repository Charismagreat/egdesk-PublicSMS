"use client";

import React, { useState, useEffect } from "react";
import { Copy, ArrowRight, CheckCircle2, FileSpreadsheet, ExternalLink, RefreshCw, Sparkles, ShieldCheck, Info, Edit3, Check } from "lucide-react";

interface SheetCloneStepProps {
  sheetUrl: string;
  setSheetUrl: (url: string) => void;
  clonedSheetInfo: any | null;
  onCloneSheet: (customTitle?: string) => void;
  loading: boolean;
  onProceedToPrompt: () => void;
}

export default function SheetCloneStep({
  sheetUrl,
  setSheetUrl,
  clonedSheetInfo,
  onCloneSheet,
  loading,
  onProceedToPrompt,
}: SheetCloneStepProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState("");

  useEffect(() => {
    if (clonedSheetInfo?.sheetTitle) {
      setEditableTitle(clonedSheetInfo.sheetTitle);
    }
  }, [clonedSheetInfo?.sheetTitle]);

  const handleCopyLink = () => {
    if (!clonedSheetInfo?.clonedSheetUrl) return;
    navigator.clipboard.writeText(clonedSheetInfo.clonedSheetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTitle = () => {
    if (clonedSheetInfo && editableTitle.trim()) {
      clonedSheetInfo.sheetTitle = editableTitle.trim();
    }
    setIsEditingTitle(false);
  };

  const originalEditUrl = clonedSheetInfo?.originalSheetId
    ? `https://docs.google.com/spreadsheets/d/${clonedSheetInfo.originalSheetId}/edit`
    : sheetUrl;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>Step 1. 내 구글 시트 URL 입력 및 사본 연동</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                원본 100% 무손실 보호
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              자동화를 주입하고자 하는 구글 시트 주소를 입력하면, 이지데스크가 안전한 제어용 사본을 연동하여 준비합니다.
            </p>
          </div>
        </div>
      </div>

      {/* URL 입력 폼 영역 */}
      <div className="space-y-3">
        <label className="block text-xs font-extrabold text-slate-700">
          구글 스프레드시트 공유 링크 또는 ID
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/1A2b3C4d.../edit"
            className="flex-1 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
            disabled={loading}
          />
          <button
            onClick={() => onCloneSheet(editableTitle)}
            disabled={loading || !sheetUrl.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs border-none shrink-0 active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>시트 분석 및 연동 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>시트 연동 및 사본 준비</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 클론 생성 완료 카드 */}
      {clonedSheetInfo && (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>구글 시트 연동이 성공적으로 확인되었습니다!</span>
            </div>
            <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
              연동 확인 완료
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-100 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium shrink-0">원본 시트 파일명:</span>
              
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    className="flex-1 bg-slate-50 border border-indigo-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:bg-white"
                    autoFocus
                    placeholder="시트 파일명 입력 (예: 대한전선 발주서)"
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border-none"
                  >
                    <Check className="w-3 h-3" />
                    <span>저장</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-indigo-900 text-sm truncate">
                    {editableTitle || clonedSheetInfo.sheetTitle || "대한전선 발주서"}
                  </span>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-all cursor-pointer border-none bg-transparent"
                    title="시트 파일명 수정"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {clonedSheetInfo.clonedSheetId && clonedSheetInfo.clonedSheetId !== clonedSheetInfo.originalSheetId ? (
              <>
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span>생성된 자동화 사본 ID:</span>
                  <span className="font-mono text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {clonedSheetInfo.clonedSheetId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>원본 시트 ID:</span>
                  <span className="font-mono text-slate-500">{clonedSheetInfo.originalSheetId}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>스프레드시트 ID:</span>
                <span className="font-mono text-slate-700 font-bold">{clonedSheetInfo.originalSheetId || clonedSheetInfo.clonedSheetId}</span>
              </div>
            )}

            <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {clonedSheetInfo.clonedSheetId && clonedSheetInfo.clonedSheetId !== clonedSheetInfo.originalSheetId ? (
                  <span>이지데스크 서버 계정으로 <strong>새로운 사본 구글 시트가 100% 성공적으로 복제</strong>되었습니다! 우측 <strong>[다음: AI 자동화 요구사항 작성]</strong>을 눌러 자동화 기능을 설계해 보세요.</span>
                ) : (
                  <span>시트 메타데이터가 정상 확인되었습니다. 우측 <strong>[다음: AI 자동화 요구사항 작성]</strong> 버튼을 눌러 시트에 탑재할 기능(메뉴, 자동 계산, 알림 등)을 자연어로 입력해 주세요.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={originalEditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 font-bold text-xs rounded-xl transition-all shadow-3xs text-decoration-none"
                title="입력하신 구글 시트 원본 새 탭에서 확인"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>🌐 입력한 시트 확인</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{copied ? "링크 복사됨!" : "시트 URL 복사"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onProceedToPrompt}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-xs border-none active:scale-95"
            >
              <span>다음: AI 자동화 요구사항 작성</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
