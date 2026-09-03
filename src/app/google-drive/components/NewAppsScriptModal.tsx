"use client";

import React, { useState } from "react";
import { 
  X, Sparkles, FileSpreadsheet, ArrowRight, ArrowLeft, 
  CheckCircle2, RefreshCw, Code2, Layers, Check, ExternalLink, AlertCircle, Copy, ShieldCheck
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface NewAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAppsScriptModal({ isOpen, onClose, onSuccess }: NewAppsScriptModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [sheetUrl, setSheetUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  
  const [clonedSheetInfo, setClonedSheetInfo] = useState<any | null>(null);
  const [lastClonedOriginalUrl, setLastClonedOriginalUrl] = useState<string>("");
  const [scriptData, setScriptData] = useState<any | null>(null);
  const [injectionResult, setInjectionResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 1. Step 1: 구글 시트 복제 핸들러 (스마트 사본 재사용 가드 적용)
  const handleProceedStep1 = async (forceReclone = false) => {
    const trimmedUrl = sheetUrl.trim();
    if (!trimmedUrl) {
      alert("구글 시트 URL 또는 ID를 입력해 주세요.");
      return;
    }

    // 💡 스마트 가드: 이미 복제된 사본이 있고, URL이 변경되지 않았으며 강제 재복제가 아니면 즉시 Step 2로 이동!
    if (clonedSheetInfo && lastClonedOriginalUrl === trimmedUrl && !forceReclone) {
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone_sheet",
          sheetUrl: trimmedUrl,
          customTitle: customTitle.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setClonedSheetInfo(data);
        setLastClonedOriginalUrl(trimmedUrl);
        setCurrentStep(2);
      } else {
        alert(data.error || "구글 시트 복제에 실패했습니다.");
      }
    } catch (e: any) {
      alert("시트 복제 통신 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Step 2: 자연어 기반 Apps Script 코드 생성 핸들러
  const handleGenerateScript = async () => {
    if (!prompt.trim()) {
      alert("주입하고자 하는 자동화 요구사항을 작성해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_script",
          prompt: prompt.trim(),
          sheetId: clonedSheetInfo?.clonedSheetId || clonedSheetInfo?.originalSheetId,
          gasProjectId: clonedSheetInfo?.gasProjectId,
          sheetUrl: clonedSheetInfo?.clonedSheetUrl || sheetUrl,
          sheetTitle: clonedSheetInfo?.sheetTitle || "업무 대장",
          headers: clonedSheetInfo?.headers || [],
          allTabs: clonedSheetInfo?.allTabs || [],
          currentScriptCode: scriptData?.scriptCode || ""
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const generatedScript = json.data;
        setScriptData(generatedScript);
        setCurrentStep(3);

        // 생성 즉시 구글 클라우드에 100% 자동 주입 및 배포 실행 (원스톱 처리)
        try {
          const injectRes = await apiFetch("/api/apps-script/clone-and-inject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "inject_and_deploy",
              sheetId: clonedSheetInfo?.clonedSheetId || "sheet_default",
              sheetUrl: clonedSheetInfo?.clonedSheetUrl || sheetUrl,
              sheetTitle: clonedSheetInfo?.sheetTitle || "자동화 구글 시트",
              gasProjectId: clonedSheetInfo?.gasProjectId,
              scriptTitle: generatedScript.summary || "이지데스크 자동화 스크립트",
              scriptCode: generatedScript.scriptCode,
              manifest: generatedScript.manifest,
              summary: generatedScript.summary,
              features: generatedScript.features,
              triggers: generatedScript.triggers,
              prompt: prompt
            })
          });
          const injectData = await injectRes.json();
          if (injectData.success) {
            setInjectionResult(injectData);
          }
        } catch (injectErr: any) {
          console.warn("Auto-inject note:", injectErr.message);
        }
      } else {
        alert(json.error || "Apps Script 코드 생성에 실패했습니다.");
      }
    } catch (e: any) {
      alert("코드 생성 통신 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Step 3: 수동 재배포 (필요 시)
  const handleInjectAndDeploy = async () => {
    if (!scriptData?.scriptCode) {
      alert("주입할 스크립트 코드가 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inject_and_deploy",
          sheetId: clonedSheetInfo?.clonedSheetId || "sheet_default",
          sheetUrl: clonedSheetInfo?.clonedSheetUrl || sheetUrl,
          sheetTitle: clonedSheetInfo?.sheetTitle || "자동화 구글 시트",
          gasProjectId: clonedSheetInfo?.gasProjectId,
          scriptTitle: scriptData.summary || "이지데스크 자동화 스크립트",
          scriptCode: scriptData.scriptCode,
          manifest: scriptData.manifest,
          summary: scriptData.summary,
          features: scriptData.features,
          triggers: scriptData.triggers,
          prompt: prompt
        })
      });
      const data = await res.json();
      if (data.success) {
        setInjectionResult(data);
      } else {
        alert(data.error || "스크립트 주입에 실패했습니다.");
      }
    } catch (e: any) {
      alert("스크립트 주입 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!clonedSheetInfo?.clonedSheetUrl) return;
    navigator.clipboard.writeText(clonedSheetInfo.clonedSheetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-8 p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-150 text-left">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                새 Apps Script 자동화 프로젝트 추가
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                구글 시트에 자연어 AI 요구사항을 바탕으로 Apps Script를 원클릭 주입합니다.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3단계 스텝 인디케이터 */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-3 rounded-2xl border text-center transition-all ${
            currentStep === 1 
              ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-black shadow-xs" 
              : currentStep > 1 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" 
                : "bg-slate-50 border-slate-200 text-slate-400 font-medium"
          }`}>
            <div className="text-[10px] uppercase tracking-wider mb-0.5">Step 1</div>
            <div className="text-xs truncate">시트 URL 등록</div>
          </div>

          <div className={`p-3 rounded-2xl border text-center transition-all ${
            currentStep === 2 
              ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-black shadow-xs" 
              : currentStep > 2 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" 
                : "bg-slate-50 border-slate-200 text-slate-400 font-medium"
          }`}>
            <div className="text-[10px] uppercase tracking-wider mb-0.5">Step 2</div>
            <div className="text-xs truncate">AI 코드 생성</div>
          </div>

          <div className={`p-3 rounded-2xl border text-center transition-all ${
            currentStep === 3 
              ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-black shadow-xs" 
              : "bg-slate-50 border-slate-200 text-slate-400 font-medium"
          }`}>
            <div className="text-[10px] uppercase tracking-wider mb-0.5">Step 3</div>
            <div className="text-xs truncate">원클릭 주입 완료</div>
          </div>
        </div>

        {/* ========================================== */}
        {/* Step 1: 구글 시트 URL 입력 및 사본 연동 */}
        {/* ========================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                연동할 구글 스프레드시트 URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1vVmz56s.../edit"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800 font-mono"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 구글 드라이브에 있는 스프레드시트의 주소창 URL을 그대로 복사해 붙여넣으세요.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                사본 시트 이름 (선택 사항)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="예: [이지데스크 자동화] 발주서 접수대장"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                비워두실 경우 기존 원본 시트 이름 앞에 <span className="font-bold">[이지데스크 자동화]</span>가 붙어 복제됩니다.
              </p>
            </div>

            {/* 이미 복제된 사본이 존재하는 경우 상태 카드 */}
            {clonedSheetInfo && lastClonedOriginalUrl === sheetUrl.trim() && (
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5 truncate">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>이미 복제된 안전 사본이 준비되어 있습니다</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 truncate pl-5">
                    {clonedSheetInfo.sheetTitle}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleProceedStep1(true)}
                  disabled={loading}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200 shrink-0 transition-all cursor-pointer"
                  title="기존 사본 대신 새로운 사본을 다시 복제합니다."
                >
                  새 사본으로 다시 복제 🔄
                </button>
              </div>
            )}

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>원본 시트 100% 무손실 보호</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                원본 시트의 손상을 방지하기 위해 구글 드라이브 복사(`drive_copy`)를 통해 모든 서식과 수식을 복제한 안전 사본에 스크립트를 주입합니다.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => handleProceedStep1(false)}
                disabled={loading || !sheetUrl.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>시트 사본 복제 중...</span>
                  </>
                ) : clonedSheetInfo && lastClonedOriginalUrl === sheetUrl.trim() ? (
                  <>
                    <span>기존 사본으로 계속 진행</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>시트 복제 및 다음</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* Step 2: 자연어 요구사항 입력 및 AI 코드 생성 */}
        {/* ========================================== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {clonedSheetInfo && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-extrabold text-emerald-900 truncate">{clonedSheetInfo.sheetTitle}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "복사됨!" : "사본 주소 복사"}</span>
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                주입할 자동화 로직 및 기능 요구사항 (자연어로 작성) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예: 구글 시트 사이드바를 통해 발주서 PDF 파일을 업로드하면 드라이브에 저장하고, 2번째 행에 발주 정보를 실시간으로 자동 기입하는 사이드바 기능을 만들어줘."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800 leading-relaxed"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPrompt("구글 시트 사이드바를 통해 PDF/이미지 파일과 발주 정보를 입력받아 구글 드라이브에 저장하고, '발주서 접수대장' 시트 최상단(2행)에 자동으로 기록하는 사이드바 및 파일 업로드 시스템을 구성해줘.")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg cursor-pointer"
                >
                  💡 추천: 발주서 사이드바 업로드 양식
                </button>
                <button
                  type="button"
                  onClick={() => setPrompt("시트가 수정될 때마다 변경 이력을 '로그' 시트에 자동으로 남기고, 특정 셀 값이 변경되면 이지데스크 웹훅으로 실시간 알림을 발송하는 트리거를 작성해줘.")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg cursor-pointer"
                >
                  💡 추천: 변경 감지 & 웹훅 알림
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>이전 단계</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateScript}
                disabled={loading || !prompt.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI 코드 생성 및 주입 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>AI 코드 생성 & 원터치 주입</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* Step 3: 주입 완료 및 결과 확인 */}
        {/* ========================================== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-sm text-emerald-950">
                  🎉 Google Apps Script 주입 및 배포 완료!
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                생성된 스크립트와 사이드바 UI가 복제된 구글 시트에 즉시 주입 및 배포되었습니다.
              </p>
            </div>

            {scriptData && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span>생성 요약: {scriptData.summary}</span>
                </div>
                {Array.isArray(scriptData.features) && scriptData.features.length > 0 && (
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    {scriptData.features.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {clonedSheetInfo?.clonedSheetUrl && (
              <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between gap-3 text-xs">
                <div className="truncate">
                  <span className="font-bold text-indigo-950 block text-[11px]">배포된 구글 시트:</span>
                  <span className="text-[10px] text-slate-500 font-mono truncate block">{clonedSheetInfo.clonedSheetUrl}</span>
                </div>
                <a
                  href={clonedSheetInfo.clonedSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <span>구글 시트 열기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleInjectAndDeploy}
                disabled={loading}
                className="px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>코드 재주입 실행</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>완료 및 목록으로 돌아가기</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
