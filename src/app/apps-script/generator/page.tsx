"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Code2, Sparkles, ArrowLeft, Layers, History, HelpCircle, CheckCircle2, ShieldCheck } from "lucide-react";

import SheetCloneStep from "./components/SheetCloneStep";
import NaturalLanguagePromptStep from "./components/NaturalLanguagePromptStep";
import CodePreviewAndInjectStep from "./components/CodePreviewAndInjectStep";
import GoogleAuthGuideModal from "./components/GoogleAuthGuideModal";
import InjectionHistoryCard from "./components/InjectionHistoryCard";

export default function AppsScriptGeneratorPage() {
  const router = useRouter();

  // 1. 상태 관리 (usePersistedState 적용)
  const [currentStep, setCurrentStep, isStepRestored] = usePersistedState<1 | 2 | 3>(
    "gas_gen_current_step",
    1
  );
  const [sheetUrl, setSheetUrl] = usePersistedState<string>("gas_gen_sheet_url", "");
  const [prompt, setPrompt] = usePersistedState<string>("gas_gen_prompt", "");
  
  const [clonedSheetInfo, setClonedSheetInfo] = useState<any | null>(null);
  const [scriptData, setScriptData] = useState<any | null>(null);
  const [injectionResult, setInjectionResult] = useState<any | null>(null);
  const [injections, setInjections] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isAuthGuideOpen, setIsAuthGuideOpen] = useState(false);

  // 2. 주입 이력 목록 조회
  const fetchInjections = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject?action=list_injections");
      const data = await res.json();
      if (data.success && Array.isArray(data.injections)) {
        setInjections(data.injections);
      }
    } catch (err) {
      console.warn("Failed to fetch injections:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInjections();
  }, [fetchInjections]);

  // 3. Step 1: 구글 시트 복제 핸들러
  const handleCloneSheet = async (customTitle?: string) => {
    if (!sheetUrl.trim()) {
      alert("구글 시트 URL 또는 ID를 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone_sheet",
          sheetUrl: sheetUrl.trim(),
          customTitle: customTitle || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setClonedSheetInfo(data);
      } else {
        alert(data.error || "구글 시트 복제에 실패했습니다.");
      }
    } catch (e: any) {
      alert("시트 복제 통신 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Step 2: 자연어 기반 Apps Script 코드 생성 핸들러
  const handleGenerateScript = async () => {
    if (!prompt.trim()) {
      alert("주입하고자 하는 자동화 로직을 작성해 주세요.");
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
          sheetUrl: clonedSheetInfo?.clonedSheetUrl || sheetUrl,
          sheetTitle: clonedSheetInfo?.sheetTitle || "업무 대장",
          headers: clonedSheetInfo?.headers || [],
          allTabs: clonedSheetInfo?.allTabs || []
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
            fetchInjections();
          }
        } catch (injectErr: any) {
          console.warn("Auto-inject background note:", injectErr.message);
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

  // 5. Step 3: 구글 시트에 Apps Script 수동 주입 및 배포 (필요 시)
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
        fetchInjections();
      } else {
        alert(data.error || "스크립트 주입에 실패했습니다.");
      }
    } catch (e: any) {
      alert("스크립트 주입 통신 오류: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. 개별 사본 주입 내역 삭제
  const handleDeleteInjection = async (id: string) => {
    if (!confirm("이 사본 주입 내역을 대장에서 삭제하시겠습니까?")) return;
    setInjections((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_injection", id })
      });
      const data = await res.json();
      if (data.success) {
        fetchInjections();
      } else {
        alert(data.error || "삭제 실패");
        fetchInjections();
      }
    } catch (e: any) {
      alert("삭제 중 오류: " + e.message);
      fetchInjections();
    }
  };

  // 7. 전체 사본 주입 내역 일괄 정리
  const handleClearAllInjections = async () => {
    if (!confirm("기존에 생성된 모든 사본 및 주입 내역을 대장에서 완전히 정리하시겠습니까?")) return;
    setInjections([]);
    try {
      const res = await apiFetch("/api/apps-script/clone-and-inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all_injections" })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "기존 사본 기록이 모두 정리되었습니다.");
        fetchInjections();
      } else {
        alert(data.error || "정리 실패");
        fetchInjections();
      }
    } catch (e: any) {
      alert("정리 중 오류: " + e.message);
      fetchInjections();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 select-none font-sans">
      <main className="w-full px-4 md:px-8 pt-6 space-y-6">
        
        {/* 상단 헤더 타이틀 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-200/60 rounded-2xl text-slate-500 transition-all border-none bg-transparent cursor-pointer"
                title="뒤로 가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                <Code2 className="w-8 h-8 text-indigo-600" />
                <span>Google Apps Script 자동 주입 AI (SheetBot)</span>
              </h1>
            </div>
            <p className="text-slate-500 mt-2 text-sm pl-13">
              내 구글 시트 주소만 넣으면 이지데스크가 제어용 사본을 생성하고, 자연어 요청을 완벽한 Apps Script 자동화로 주입해 드립니다.
            </p>
          </div>

          <div className="flex items-center gap-2 pl-13 md:pl-0">
            <button
              type="button"
              onClick={() => setIsAuthGuideOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>최초 1회 권한 승인 안내</span>
            </button>
          </div>
        </div>

        {/* 3단계 진행 상태 스텝 바 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`py-2 rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                currentStep === 1
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>1. 시트 연동 & 사본 생성</span>
            </button>

            <button
              type="button"
              onClick={() => clonedSheetInfo && setCurrentStep(2)}
              disabled={!clonedSheetInfo}
              className={`py-2 rounded-xl transition-all border-none flex items-center justify-center gap-2 ${
                currentStep === 2
                  ? "bg-indigo-600 text-white shadow-xs"
                  : clonedSheetInfo
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  : "bg-slate-50 text-slate-400 cursor-not-allowed"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>2. 자연어 자동화 설계</span>
            </button>

            <button
              type="button"
              onClick={() => scriptData && setCurrentStep(3)}
              disabled={!scriptData}
              className={`py-2 rounded-xl transition-all border-none flex items-center justify-center gap-2 ${
                currentStep === 3
                  ? "bg-indigo-600 text-white shadow-xs"
                  : scriptData
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  : "bg-slate-50 text-slate-400 cursor-not-allowed"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
              <span>3. 코드 검토 & 시트 주입</span>
            </button>
          </div>
        </div>

        {/* 단계별 메인 작업 영역 */}
        {currentStep === 1 && (
          <SheetCloneStep
            sheetUrl={sheetUrl}
            setSheetUrl={setSheetUrl}
            clonedSheetInfo={clonedSheetInfo}
            onCloneSheet={handleCloneSheet}
            loading={loading}
            onProceedToPrompt={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <NaturalLanguagePromptStep
            prompt={prompt}
            setPrompt={setPrompt}
            clonedSheetInfo={clonedSheetInfo}
            onGenerateScript={handleGenerateScript}
            loading={loading}
            onBackToClone={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <CodePreviewAndInjectStep
            scriptData={scriptData}
            clonedSheetInfo={clonedSheetInfo}
            onInjectAndDeploy={handleInjectAndDeploy}
            loading={loading}
            injectionResult={injectionResult}
            onOpenAuthGuide={() => setIsAuthGuideOpen(true)}
            onBackToPrompt={() => setCurrentStep(2)}
          />
        )}

        {/* 최근 주입 완료 대장 */}
        <InjectionHistoryCard
          injections={injections}
          loading={historyLoading}
          onRefresh={fetchInjections}
          onDeleteInjection={handleDeleteInjection}
          onClearAllInjections={handleClearAllInjections}
        />

      </main>

      {/* 최초 1회 Google 권한 승인 안내 가이드 모달 */}
      <GoogleAuthGuideModal
        isOpen={isAuthGuideOpen}
        onClose={() => setIsAuthGuideOpen(false)}
      />
    </div>
  );
}
