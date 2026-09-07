"use client";

import React, { useState, useEffect } from "react";
import { 
  X, Sparkles, FileSpreadsheet, ArrowRight, ArrowLeft, 
  CheckCircle2, RefreshCw, Code2, Layers, Check, ExternalLink, 
  AlertCircle, Copy, ShieldCheck, Edit3, PlusCircle, Link as LinkIcon,
  History, RotateCcw, Clock, Calendar
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface NewAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProject?: any | null;
}

export default function NewAppsScriptModal({ isOpen, onClose, onSuccess, initialProject }: NewAppsScriptModalProps) {
  const isEditMode = !!initialProject;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(isEditMode ? 2 : 1);
  
  // Step 1 시작 모드: 'auto_new' (새 시트 자동 생성) | 'clone_url' (기존 시트 복제)
  const [startMode, setStartMode] = useState<"auto_new" | "clone_url">("auto_new");
  const [sheetUrl, setSheetUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  
  const [clonedSheetInfo, setClonedSheetInfo] = useState<any | null>(null);
  const [lastClonedOriginalUrl, setLastClonedOriginalUrl] = useState<string>("");
  const [scriptData, setScriptData] = useState<any | null>(null);
  const [injectionResult, setInjectionResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 수정 이력 타임라인 상태
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // initialProject 변경 시 상태 초기화
  useEffect(() => {
    if (initialProject) {
      const sId = initialProject.spreadsheetId || initialProject.containerId || "";
      const sUrl = initialProject.spreadsheetUrl || initialProject.containerUrl || (sId ? `https://docs.google.com/spreadsheets/d/${sId}/edit` : "");
      const pId = initialProject.id || initialProject.scriptId || "";

      setSheetUrl(sUrl);
      setLastClonedOriginalUrl(sUrl);
      setCustomTitle(initialProject.name || "");
      setClonedSheetInfo({
        clonedSheetId: sId,
        clonedSheetUrl: sUrl,
        sheetTitle: initialProject.name || "연동 구글 시트",
        gasProjectId: pId,
        headers: [],
        allTabs: []
      });
      setCurrentStep(2); // 수정 모드는 곧바로 Step 2 (요구사항 입력)로 진입!
    } else {
      setCurrentStep(1);
      setStartMode("auto_new");
      setSheetUrl("");
      setLastClonedOriginalUrl("");
      setCustomTitle("");
      setClonedSheetInfo(null);
      setScriptData(null);
      setInjectionResult(null);
      setPrompt("");
    }
  }, [initialProject, isOpen]);

  // 수정 이력 불러오기
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject?action=list_injections");
      const data = await res.json();
      if (data.success && Array.isArray(data.injections)) {
        const targetSid = clonedSheetInfo?.clonedSheetId || clonedSheetInfo?.originalSheetId || initialProject?.spreadsheetId;
        const currentInj = data.injections.find((inj: any) => 
          (targetSid && (inj.sheet_id === targetSid || inj.sheet_url?.includes(targetSid))) ||
          (initialProject?.name && inj.sheet_title?.includes(initialProject.name))
        );
        if (currentInj && Array.isArray(currentInj.history)) {
          setHistoryList(currentInj.history);
        } else {
          setHistoryList(data.injections.slice(0, 10)); // 전체 최근 이력 폴백
        }
      }
    } catch (e) {
      console.warn("History fetch error:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    fetchHistory();
  };

  if (!isOpen) return null;

  // 1. [옵션 A] 새 구글 시트 즉시 자동 생성 핸들러 (시트 주소 불필요)
  const handleCreateNewSheet = async () => {
    const titleToUse = customTitle.trim() || `[이지데스크 자동화] 스마트 업무 대장`;
    setLoading(true);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_new_sheet",
          customTitle: titleToUse
        })
      });
      const data = await res.json();
      if (data.success) {
        setClonedSheetInfo(data);
        setSheetUrl(data.clonedSheetUrl);
        setLastClonedOriginalUrl(data.clonedSheetUrl);
        setCurrentStep(2);
      } else {
        alert(data.error || "새 구글 시트 생성에 실패했습니다.");
      }
    } catch (e: any) {
      alert("새 시트 생성 통신 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. [옵션 B] 기존 구글 시트 복제 핸들러
  const handleProceedClone = async (forceReclone = false) => {
    const trimmedUrl = sheetUrl.trim();
    if (!trimmedUrl) {
      alert("구글 시트 URL 또는 ID를 입력해 주세요.");
      return;
    }

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

  // 3. Step 2: 자연어 기반 Apps Script 코드 생성 핸들러
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
          sheetTitle: clonedSheetInfo?.sheetTitle || customTitle || "업무 대장",
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
              sheetTitle: clonedSheetInfo?.sheetTitle || customTitle || "자동화 구글 시트",
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

  // 4. Step 3: 수동 재배포 (필요 시)
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
          sheetTitle: clonedSheetInfo?.sheetTitle || customTitle || "자동화 구글 시트",
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
      <div className="bg-white rounded-3xl max-w-2xl w-full my-8 p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-150 text-left relative">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isEditMode ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>
              {isEditMode ? <Edit3 className="w-5 h-5 text-amber-600" /> : <Sparkles className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 tracking-tight flex items-center gap-2">
                <span>{isEditMode ? "Apps Script 프로젝트 AI 수정 / 기능 확장" : "새 Apps Script 자동화 프로젝트 추가"}</span>
                {isEditMode && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                    증분 수정 모드
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 🕒 수정 이력 버튼 */}
            <button
              onClick={handleOpenHistory}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="과거 AI 수정 및 주입 이력을 조회합니다."
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>수정 이력</span>
            </button>

            <button 
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
            <div className="text-xs truncate">{isEditMode ? "연동 시트 확인" : "시트 연동 방식"}</div>
          </div>

          <div className={`p-3 rounded-2xl border text-center transition-all ${
            currentStep === 2 
              ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-black shadow-xs" 
              : currentStep > 2 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" 
                : "bg-slate-50 border-slate-200 text-slate-400 font-medium"
          }`}>
            <div className="text-[10px] uppercase tracking-wider mb-0.5">Step 2</div>
            <div className="text-xs truncate">{isEditMode ? "AI 코드 수정/확장" : "AI 코드 생성"}</div>
          </div>

          <div className={`p-3 rounded-2xl border text-center transition-all ${
            currentStep === 3 
              ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-black shadow-xs" 
              : "bg-slate-50 border-slate-200 text-slate-400 font-medium"
          }`}>
            <div className="text-[10px] uppercase tracking-wider mb-0.5">Step 3</div>
            <div className="text-xs truncate">{isEditMode ? "원클릭 갱신 배포" : "원클릭 주입 완료"}</div>
          </div>
        </div>

        {/* ========================================== */}
        {/* Step 1: 시트 연동 방식 선택 & 시작 */}
        {/* ========================================== */}
        {currentStep === 1 && (
          <div className="space-y-5">
            {/* 2가지 시작 방식 선택 탭 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStartMode("auto_new")}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  startMode === "auto_new"
                    ? "bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-xs">
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    <span>새 구글 시트 자동 생성</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full">추천 ⭐</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-900/80">
                  URL 복사 없이 이름만 넣으면 구글 드라이브에 새 시트를 즉시 자동 생성합니다.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStartMode("clone_url")}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  startMode === "clone_url"
                    ? "bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 font-black text-xs">
                  <LinkIcon className="w-4 h-4 text-indigo-600" />
                  <span>기존 구글 시트 URL 복제</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  기존에 작성된 서식/수식이 있는 구글 시트 URL을 입력하여 안전 사본을 복제합니다.
                </p>
              </button>
            </div>

            {/* 옵션 A: 새 구글 시트 즉시 생성 입력 폼 */}
            {startMode === "auto_new" ? (
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    생성할 구글 시트 이름
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="예: [이지데스크 자동화] 발주서 접수대장"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800 font-bold"
                  />
                  <p className="text-[11px] text-slate-400">
                    💡 이름만 입력하고 아래 버튼을 누르면 구글 드라이브에 새 시트가 즉시 준비됩니다.
                  </p>
                </div>
              </div>
            ) : (
              /* 옵션 B: 기존 구글 시트 URL 복제 입력 폼 */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    연동할 기존 구글 스프레드시트 URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1vVmz56s.../edit"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800 font-mono"
                  />
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
                </div>

                {/* 스마트 사본 재사용 안내 */}
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
                      onClick={() => handleProceedClone(true)}
                      disabled={loading}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200 shrink-0 transition-all cursor-pointer"
                    >
                      새 사본으로 다시 복제 🔄
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>원본 무손실 보장</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                원본 시트를 직접 수정하지 않고, 안전 사본을 생성하여 Apps Script 코드를 자동 주입합니다.
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

              {startMode === "auto_new" ? (
                <button
                  type="button"
                  onClick={handleCreateNewSheet}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>새 구글 시트 생성 중...</span>
                    </>
                  ) : (
                    <>
                      <span>새 시트 생성 및 AI 시작</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleProceedClone(false)}
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
              )}
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
                  <span>{copied ? "복사됨!" : "시트 주소 복사"}</span>
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  {isEditMode ? "수정 또는 추가하고자 하는 기능 요구사항 (자연어)" : "주입할 자동화 로직 및 기능 요구사항 (자연어로 작성)"} <span className="text-rose-500">*</span>
                </label>
                {isEditMode && (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    ⚡ 기존 Code.gs 자동 보존 & 증분 패치
                  </span>
                )}
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isEditMode 
                  ? "예: 기존 사이드바에 파일 다운로드 버튼을 추가하고, 파일 업로드 시 2행에 기록과 함께 성공 토스트 알림을 띄우도록 수정해줘." 
                  : "예: 구글 시트 사이드바를 통해 발주서 PDF 파일을 업로드하면 드라이브에 저장하고, 2번째 행에 발주 정보를 실시간으로 자동 기입하는 사이드바 기능을 만들어줘."}
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800 leading-relaxed"
              />
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-extrabold text-slate-400 block">
                  ⚡ 실전 자동화 템플릿 추천 (클릭 시 자동 입력):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {isEditMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPrompt("기존 사이드바 메뉴에 'PDF/엑셀 일괄 다운로드' 버튼을 추가하고, 파일 업로드 성공 시 브라우저에 완료 토스트 알림이 뜨도록 UI를 보강해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        🎨 사이드바 다운로드 버튼 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("시트 데이터가 수정될 때마다 이지데스크 웹훅으로 변경 내역을 실시간 전송하는 onEdit(e) 트리거를 기존 코드에 유기적으로 추가해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        ⚡ 실시간 onEdit 웹훅 연동
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("상단 커스텀 메뉴에 '현재 선택된 행 거래처에 메일 발송' 기능을 추가하고, 템플릿 본문에 시트 셀 데이터를 채워 자동 발송하도록 코드를 확장해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        📧 거래처 이메일 원클릭 발송 메뉴
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("금액이나 사업자등록번호 입력 시 유효성 검사(10자리 정규식 및 음수 방지)를 수행하여 서식 오류 시 경고창을 띄우는 가드 로직을 추가해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        🛡️ 입력 데이터 유효성 검사 가드
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("상단 메뉴에 '시트 데이터 정렬 및 중복 행 자동 제거' 기능을 추가하여 원클릭으로 대장을 깔끔하게 정돈할 수 있게 해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        🧹 데이터 정렬 & 중복 자동 제거
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setPrompt("구글 시트 사이드바를 통해 PDF/이미지 파일과 발주 정보를 입력받아 구글 드라이브에 저장하고, '발주서 접수대장' 시트 최상단(2행)에 자동으로 기록하는 사이드바 및 파일 업로드 시스템을 구성해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        📑 발주서/영수증 사이드바 업로드 양식
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("사이드바에서 영수증이나 세금계산서 이미지를 첨부하면 사전 주입된 이지데스크 터널 클라이언트(egdeskToolsCall)를 통해 AI Vision OCR을 호출하여 공급가액, 세액, 거래처명을 자동 추출하고 시트 행에 자동 기입하는 시스템을 작성해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        👁️ AI Vision OCR 자동 판독 & 행 기입
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("상단 메뉴바에 '[⚡ 이지데스크 자동화]' 메뉴를 만들고, '🔌 이지데스크 터널 연결 점검' 메뉴를 클릭하면 사전 주입된 testEgdeskTunnel() 함수가 실행되어 백엔드 통신 상태를 토스트로 알리도록 구성해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        🔌 이지데스크 터널 점검 메뉴 등록
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("시트 데이터가 수정될 때마다 변경 이력을 '로그' 시트에 자동으로 남기고, 특정 셀 값이 '승인'으로 변경되면 이지데스크 웹훅으로 실시간 알림을 발송하는 트리거를 작성해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        🔔 변경 감지 & 웹훅 실시간 알림
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("매일 자정에 당일 입력된 대장 데이터를 '일일_마감' 시트로 자동 복사 백업하고 총 수량과 합계 금액을 자동 계산하는 시간 기반 일일 자동 마감 트리거를 구성해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        🔄 매일 자정 데이터 자동 백업 & 마감
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("선택한 행의 견적/발주 데이터를 PDF 형식으로 자동 렌더링하여 거래처 담당자 이메일로 원클릭 첨부 발송하는 상단 커스텀 메뉴를 만들어줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        📊 원클릭 PDF 생성 & 이메일 자동 발송
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt("외부 환율/원자재 공공데이터 API를 주기적으로 호출하여 시트 내 기준 단가와 환율을 실시간으로 자동 업데이트하는 연동 함수를 작성해줘.")}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-left"
                      >
                        🌐 외부 API 연동 & 환율/단가 자동 갱신
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => isEditMode ? onClose() : setCurrentStep(1)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isEditMode ? <span>취소</span> : <><ArrowLeft className="w-4 h-4" /><span>이전 단계</span></>}
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
                    <span>{isEditMode ? "AI 코드 증분 수정 및 갱신 중..." : "AI 코드 생성 및 주입 중..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isEditMode ? "AI 코드 수정 & 원터치 갱신 배포" : "AI 코드 생성 & 원터치 주입"}</span>
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
                생성된 스크립트와 사이드바 UI가 구글 시트에 즉시 주입 및 배포되었습니다.
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

        {/* 🕒 수정 이력 타임라인 팝업 모달 */}
        {isHistoryOpen && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-3xl p-6 z-20 flex flex-col justify-between space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
                <History className="w-4 h-4 text-indigo-600" />
                <span>AI 수정 및 주입 버전 히스토리</span>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyLoading ? (
                <div className="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>이력을 불러오는 중...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>기록된 수정 이력이 없습니다.</p>
                </div>
              ) : (
                historyList.map((hist: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-md">
                        v{hist.version || historyList.length - idx} {idx === 0 && "(최신)"}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {hist.created_at ? new Date(hist.created_at).toLocaleString("ko-KR") : ""}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 text-xs leading-relaxed">
                        💬 요구사항: {hist.prompt || "(미지정)"}
                      </div>
                      {hist.summary && (
                        <div className="text-[11px] text-slate-600">
                          ✨ 요약: {hist.summary}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
