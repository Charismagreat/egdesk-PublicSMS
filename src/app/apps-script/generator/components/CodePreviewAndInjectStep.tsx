"use client";

import React, { useState } from "react";
import { Code, CheckCircle2, Copy, Zap, ArrowLeft, RefreshCw, ExternalLink, ShieldCheck, Clock, FileCode, Check, HelpCircle, Layers, FilePlus2, Lightbulb } from "lucide-react";

interface CodePreviewAndInjectStepProps {
  scriptData: any | null;
  clonedSheetInfo: any | null;
  onInjectAndDeploy: () => void;
  loading: boolean;
  injectionResult: any | null;
  onOpenAuthGuide: () => void;
  onBackToPrompt: () => void;
}

export default function CodePreviewAndInjectStep({
  scriptData,
  clonedSheetInfo,
  onInjectAndDeploy,
  loading,
  injectionResult,
  onOpenAuthGuide,
  onBackToPrompt,
}: CodePreviewAndInjectStepProps) {
  const [copied, setCopied] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"code" | "manifest">("code");

  if (!scriptData) return null;

  const handleCopyCode = () => {
    const textToCopy = activeCodeTab === "code" ? scriptData.scriptCode : scriptData.manifest;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 주입 완료된 완성본 구글 시트 URL (새로 생성된 사본 시트의 /edit 주소)
  const readySheetId = injectionResult?.sheetId || clonedSheetInfo?.clonedSheetId || clonedSheetInfo?.originalSheetId;
  const readySheetUrl = injectionResult?.sheetUrl 
    ? (injectionResult.sheetUrl.includes('/copy') ? injectionResult.sheetUrl.replace('/copy', '/edit') : injectionResult.sheetUrl)
    : (clonedSheetInfo?.clonedSheetUrl?.includes('/copy') 
        ? clonedSheetInfo.clonedSheetUrl.replace('/copy', '/edit') 
        : (readySheetId ? `https://docs.google.com/spreadsheets/d/${readySheetId}/edit` : ''));

  const copyTemplateUrl = readySheetId
    ? `https://docs.google.com/spreadsheets/d/${readySheetId}/copy`
    : readySheetUrl;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>Step 3. 생성된 Google Apps Script 검토 및 구글 시트 주입</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                V8 AST 검증 완료
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              AI가 작성한 자동화 로직과 메뉴/트리거를 확인하고, 내 구글 시트에 원클릭으로 주입하여 배포합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAuthGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>최초 1회 권한 승인 가이드</span>
        </button>
      </div>

      {/* 1. 기능 요약 및 생성된 특징 뱃지 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-2">
          <span className="text-xs font-extrabold text-slate-700 block">
            📋 AI 자동화 기능 요약
          </span>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">
            {scriptData.summary || "자연어 기반 맞춤형 Google Apps Script 자동화 기능"}
          </p>
          {scriptData.features && scriptData.features.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 space-y-1">
              {scriptData.features.map((feat: string, idx: number) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-2">
          <span className="text-xs font-extrabold text-slate-700 block">
            ⚡ 자동 등록되는 트리거 및 메뉴
          </span>
          {scriptData.triggers && scriptData.triggers.length > 0 ? (
            <div className="space-y-1.5">
              {scriptData.triggers.map((trig: any, idx: number) => (
                <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="font-bold text-slate-800">{trig.type || "TRIGGER"}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{trig.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs text-slate-500">
              상단 커스텀 메뉴 [⚡ 이지데스크 자동화]가 자동 등록됩니다.
            </div>
          )}
        </div>
      </div>

      {/* 2. 코드 뷰어 (탭 전환: Code.gs / appsscript.json) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveCodeTab("code")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                activeCodeTab === "code"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 bg-transparent hover:text-slate-800"
              }`}
            >
              Code.gs (메인 스크립트)
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab("manifest")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                activeCodeTab === "manifest"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-500 bg-transparent hover:text-slate-800"
              }`}
            >
              appsscript.json (매니페스트)
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "전체 코드 복사 완료!" : "전체 코드 복사하기"}</span>
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner">
          <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-[11px] text-slate-400 font-mono">
            <span>{activeCodeTab === "code" ? "Code.gs (Google Apps Script V8)" : "appsscript.json"}</span>
            <span className="text-slate-500">UTF-8 / JavaScript</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[350px] leading-relaxed select-text">
            <code>
              {activeCodeTab === "code" ? scriptData.scriptCode : scriptData.manifest}
            </code>
          </pre>
        </div>
      </div>

      {/* 💡 서버 자동 주입 완료 안내 카드 */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 space-y-2 text-xs text-indigo-950">
        <div className="flex items-center gap-2 font-bold text-indigo-900">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>서버 자동 코드 주입 및 클라우드 배포 시스템</span>
        </div>
        <p className="pl-6 text-[11px] leading-relaxed text-indigo-800">
          이지데스크 서버가 구글 워크스페이스 API를 통해 대상 구글 시트에 <strong>Apps Script 코드(`Code.gs`), 매니페스트 및 커스텀 메뉴를 100% 자동 주입</strong>합니다. 아래 <strong>[구글 시트에 즉시 주입 및 배포하기]</strong>를 누르시면 모든 주입 작업이 서버에서 자동으로 완료됩니다.
        </p>
      </div>

      {/* 3. 주입 완료 성공 알림 배너 */}
      {injectionResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Google Apps Script 자동 주입 및 클라우드 배포가 100% 완료되었습니다!</span>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-md">
              배포 완료
            </span>
          </div>
          <p className="text-xs text-emerald-700 pl-7 leading-relaxed">
            코드가 완벽하게 주입되었습니다. 아래 <strong>[🚀 완성된 구글 시트 바로 열기]</strong>를 누르시면 상단 메뉴와 자동화 로직이 탑재된 구글 시트로 즉시 연결됩니다.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 pl-7">
            <a
              href={readySheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-xs text-decoration-none"
              title="구글 시트 편집 화면으로 바로 이동"
            >
              <span>🚀 완성된 구글 시트 바로 열기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={copyTemplateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs text-decoration-none"
              title="구글 공식 사본 만들기 화면으로 열기"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>📋 사본 복제 모드로 열기</span>
            </a>

            <button
              type="button"
              onClick={onOpenAuthGuide}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>최초 1회 실행 승인 방법</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. 액션 버튼 바 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onBackToPrompt}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer border-none"
        >
          <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
          <span>프롬프트 수정하기</span>
        </button>

        {!injectionResult && (
          <button
            type="button"
            onClick={onInjectAndDeploy}
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-xs border-none active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>시트에 스크립트 주입 및 배포 중...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>구글 시트에 즉시 주입 및 배포하기</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
