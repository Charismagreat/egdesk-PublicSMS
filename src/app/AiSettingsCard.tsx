"use client";
import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Bot, Save, Check, KeyRound, Cpu, Sparkles, AlertCircle, RefreshCw, Server } from "lucide-react";

export default function AiSettingsCard() {
  const [aiModel, setAiModel] = useState("gemini-3.5-flash");
  const [omnichannelEnabled, setOmnichannelEnabled] = useState(true);
  const [copilotWidgetEnabled, setCopilotWidgetEnabled] = useState(true);
  
  // 하이브리드 AI 설정을 위한 신규 상태 선언
  const [aiProvider, setAiProvider] = useState("gemini"); // 'gemini' | 'local_llm' | 'smart_hybrid'
  const [localLlmUrl, setLocalLlmUrl] = useState("http://localhost:11434");
  const [localLlmModel, setLocalLlmModel] = useState("gemma2");
  
  // Ollama 서버에 기설치된 모델 목록 관리 상태
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // 연결 테스트를 위한 상태
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "failed">("idle");
  const [testError, setTestError] = useState("");
  
  const [isSaved, setIsSaved] = useState(false);

  // 로컬 Ollama 모델 목록을 비동기 조회하는 헬퍼 함수
  const fetchLlmModels = async (url: string) => {
    if (!url) return;
    setIsLoadingModels(true);
    try {
      const res = await apiFetch('/api/settings/local-llm-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ local_llm_url: url })
      });
      const data = await res.json();
      if (data.success && data.models) {
        setAvailableModels(data.models);
      } else {
        setAvailableModels([]);
      }
    } catch (err) {
      console.error("로컬 모델 목록 로드 실패:", err);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    // 1. 기존 Gemini AI 모델명 불러오기
    apiFetch('/api/settings?key=google_ai_model')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) setAiModel(data.value);
      })
      .catch(e => console.error(e));

    // 3. 옴니채널 AI 활성화 여부 불러오기
    apiFetch('/api/settings?key=omnichannel_ai_enabled')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value !== null) {
          setOmnichannelEnabled(data.value !== 'false');
        }
      })
      .catch(e => console.error(e));

    // 4. 자율 마케팅 파트너 활성화 여부 불러오기
    apiFetch('/api/settings?key=copilot_widget_enabled')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value !== null) {
          setCopilotWidgetEnabled(data.value !== 'false');
        }
      })
      .catch(e => console.error(e));

    // 5. 하이브리드 AI 공급자 불러오기
    apiFetch('/api/settings?key=ai_provider')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) setAiProvider(data.value);
      })
      .catch(e => console.error(e));

    // 6. 로컬 LLM URL 불러오기
    apiFetch('/api/settings?key=local_llm_url')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) {
          setLocalLlmUrl(data.value);
          fetchLlmModels(data.value);
        }
      })
      .catch(e => console.error(e));

    // 7. 로컬 LLM 모델명 불러오기
    apiFetch('/api/settings?key=local_llm_model')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) setLocalLlmModel(data.value);
      })
      .catch(e => console.error(e));
  }, []);

  // 로컬 LLM 연결성 테스트 수행 함수
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus("idle");
    setTestError("");
    try {
      const res = await apiFetch("/api/settings/test-local-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local_llm_url: localLlmUrl,
          local_llm_model: localLlmModel
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("success");
        fetchLlmModels(localLlmUrl); // 연결 성공 시 모델 목록 페칭
      } else {
        setTestStatus("failed");
        setTestError(data.error || "연결 테스트 실패");
      }
    } catch (err: any) {
      setTestStatus("failed");
      setTestError("네트워크 에러: " + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      // 모든 키값들을 순차적 혹은 병렬로 저장 처리
      const saveTasks = [
        apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'google_ai_model', value: aiModel })
        }),
        apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'omnichannel_ai_enabled', value: omnichannelEnabled ? 'true' : 'false' })
        }),
        apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'copilot_widget_enabled', value: copilotWidgetEnabled ? 'true' : 'false' })
        }),
        apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'ai_provider', value: aiProvider })
        }),
        apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'local_llm_url', value: localLlmUrl })
        }),
        apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'local_llm_model', value: localLlmModel })
        })
      ];

      const results = await Promise.all(saveTasks);
      const dataJsonList = await Promise.all(results.map(r => r.json()));
      const failedTask = dataJsonList.find(d => !d.success);

      if (!failedTask) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        alert("일부 설정 저장 실패: " + (failedTask.error || "알 수 없는 에러"));
      }
    } catch (e: any) {
      alert("서버 연결 오류: " + e.message);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50/80 p-6 md:p-8 rounded-2xl shadow-sm border border-indigo-100 mt-6 relative overflow-hidden">
      <div className="relative z-10 flex flex-col gap-6">
        {/* 1단: 헤더 영역 */}
        <div className="border-b border-indigo-100/60 pb-4">
          <h2 className="text-lg font-extrabold text-indigo-950 flex items-center gap-2">
            <Bot className="w-5.5 h-5.5 text-indigo-600 animate-pulse" /> 
            AI 비서 및 하이브리드 라우팅 설정
          </h2>
          <p className="text-xs text-indigo-750/90 mt-1.5 leading-relaxed">
            구글 Gemini 클라우드 API와 로컬 컴퓨터에 기동된 로컬 LLM(Ollama) 중 상황에 최적화된 엔진을 지능적으로 분기하여 처리할 수 있습니다.
          </p>
        </div>
        
        {/* 2단: 설정 입력 폼 영역 */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* AI 작동 방식 (공급자 모드) 선택 */}
          <div className="w-full">
            <label className="block text-[11px] font-bold text-indigo-800 mb-1.5 tracking-wider uppercase">
              AI 작동 방식 (Provider Mode)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAiProvider("gemini")}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  aiProvider === "gemini"
                    ? "border-indigo-600 bg-white shadow-sm ring-2 ring-indigo-500/20"
                    : "border-indigo-100 bg-white/50 hover:bg-white hover:border-indigo-200"
                }`}
              >
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  클라우드 Gemini 전용
                </span>
                <span className="text-[10px] text-indigo-700/80 leading-normal">
                  구글 클라우드 AI를 무조건 사용합니다. 높은 분석 정확도와 넓은 지식을 보장하며, 소량의 API 비용이 청구됩니다.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("local_llm")}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  aiProvider === "local_llm"
                    ? "border-indigo-600 bg-white shadow-sm ring-2 ring-indigo-500/20"
                    : "border-indigo-100 bg-white/50 hover:bg-white hover:border-indigo-200"
                }`}
              >
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-600" />
                  로컬 LLM (Ollama) 전용
                </span>
                <span className="text-[10px] text-indigo-700/80 leading-normal">
                  이지데스크 서버 PC에 설치된 Ollama 로컬 모델을 사용합니다. 외부망 호출 없이 무료로 동작하며 데이터 오프라인 처리가 보장됩니다.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("smart_hybrid")}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  aiProvider === "smart_hybrid"
                    ? "border-indigo-600 bg-white shadow-sm ring-2 ring-indigo-500/20"
                    : "border-indigo-100 bg-white/50 hover:bg-white hover:border-indigo-200"
                }`}
              >
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-bounce" />
                  지능형 스마트 하이브리드
                </span>
                <span className="text-[10px] text-indigo-700/80 leading-normal">
                  민감정보(PII) 감지 시 자동으로 로컬에서 처리하며, 단순 작업은 로컬, 고난도 추론(OCR/분석)은 Gemini로 교체 선택합니다.
                </span>
              </button>
            </div>
          </div>

          {/* Row 1: Gemini Cloud Settings (Provider가 gemini 또는 smart_hybrid 일때 노출) */}
          {(aiProvider === "gemini" || aiProvider === "smart_hybrid") && (
            <div className="flex flex-col md:flex-row items-end gap-4 w-full p-4 rounded-xl border border-indigo-100 bg-white/40">
              {/* 모델 선택 select */}
              <div className="w-full">
                <label className="block text-[11px] font-bold text-indigo-800 mb-1.5 tracking-wider uppercase whitespace-nowrap">Active Gemini Model</label>
                <div className="flex items-center border border-indigo-200 rounded-xl bg-white/90 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-sm transition-all w-full">
                  <div className="pl-4 pr-3 flex items-center justify-center shrink-0 pointer-events-none">
                    <Cpu className="h-4 w-4 text-indigo-400" />
                  </div>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="flex-1 w-full py-2.5 outline-none text-xs font-bold text-indigo-950 cursor-pointer appearance-none bg-transparent text-ellipsis"
                    title="Gemini AI 모델 선택"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  </select>
                  <div className="pr-4 pl-3 flex items-center justify-center shrink-0 pointer-events-none">
                    <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Local LLM Settings (Provider가 local_llm 또는 smart_hybrid 일때 노출) */}
          {(aiProvider === "local_llm" || aiProvider === "smart_hybrid") && (
            <div className="flex flex-col gap-4 p-4 rounded-xl border border-indigo-100 bg-white/40 w-full">
              <div className="flex flex-col md:flex-row items-end gap-4 w-full">
                {/* 로컬 LLM URL 입력 */}
                <div className="flex-[5] min-w-0 w-full">
                  <label className="block text-[11px] font-bold text-indigo-800 mb-1.5 tracking-wider uppercase whitespace-nowrap">
                    Local LLM API URL (Ollama 기본값 권장)
                  </label>
                  <div className="flex items-center border border-indigo-200 rounded-xl bg-white/90 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-sm transition-all w-full">
                    <div className="pl-4 pr-3 flex items-center justify-center shrink-0">
                      <Server className="h-4 w-4 text-indigo-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={localLlmUrl}
                      onChange={(e) => setLocalLlmUrl(e.target.value)}
                      className="w-full py-2.5 outline-none text-xs font-bold placeholder-indigo-300 bg-transparent text-indigo-950"
                      title="Local LLM URL"
                    />
                  </div>
                </div>

                {/* 로컬 모델명 입력 */}
                <div className="flex-[4] min-w-0 w-full">
                  <label className="block text-[11px] font-bold text-indigo-800 mb-1.5 tracking-wider uppercase whitespace-nowrap">
                    로컬 LLM 모델명 (Ollama Model Name)
                  </label>
                  <div className="flex items-center border border-indigo-200 rounded-xl bg-white/90 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-sm transition-all w-full">
                    <div className="pl-4 pr-3 flex items-center justify-center shrink-0">
                      <Cpu className="h-4 w-4 text-indigo-400" />
                    </div>
                    {isLoadingModels ? (
                      <div className="w-full py-2.5 px-1 text-xs font-bold text-slate-400 bg-transparent animate-pulse">
                        설치된 모델 목록을 조회 중...
                      </div>
                    ) : availableModels.length > 0 ? (
                      <select
                        value={localLlmModel}
                        onChange={(e) => setLocalLlmModel(e.target.value)}
                        className="w-full py-2.5 outline-none text-xs font-bold bg-transparent text-indigo-950 px-1 border-none cursor-pointer"
                        title="Local Model Name"
                      >
                        {availableModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="연결 테스트를 클릭해 모델을 로드하세요"
                        value={localLlmModel}
                        onChange={(e) => setLocalLlmModel(e.target.value)}
                        className="w-full py-2.5 outline-none text-xs font-bold placeholder-indigo-300 bg-transparent text-indigo-950"
                        title="Local Model Name"
                      />
                    )}
                  </div>
                </div>

                {/* 연결 테스트 버튼 */}
                <div className="shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 hover:text-indigo-900 rounded-xl text-xs font-bold transition-all w-full shadow-sm hover:shadow active:scale-95 duration-150 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                    연결 테스트
                  </button>
                </div>
              </div>

              {/* 연결 테스트 결과 메시지 */}
              {testStatus !== "idle" && (
                <div className={`text-xs p-3 rounded-lg border flex items-start gap-2 ${
                  testStatus === "success"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  {testStatus === "success" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold">연결 성공!</span> 지정하신 로컬 LLM 서버 및 모델이 정상적으로 활성화 상태입니다.
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold">연결 실패:</span> {testError}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Row 3: AI Toggles & Save Button */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 w-full border-t border-indigo-100/60 pt-5 mt-1">
            {/* 토글 스위치 영역 */}
            <div className="flex flex-col gap-4">
              {/* 토글 1: 옴니채널 AI 원고 생성 */}
              <div className="flex items-center gap-3.5">
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={omnichannelEnabled}
                    onChange={(e) => setOmnichannelEnabled(e.target.checked)}
                    className="sr-only peer"
                    id="omnichannel-toggle"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <div className="flex flex-col">
                  <label htmlFor="omnichannel-toggle" className="text-xs font-extrabold text-indigo-950 cursor-pointer select-none">
                    옴니채널 AI 광고 원고 생성 기능 활성화
                  </label>
                  <p className="text-[10px] text-indigo-700/80 mt-0.5 leading-normal">
                    비활성화(중지) 시 구글 AI API 호출을 완전히 차단하고 비용이 소모되지 않는 로컬 폴백 템플릿만 사용합니다.
                  </p>
                </div>
              </div>

              {/* 토글 2: AI 자율 마케팅 파트너 대시보드 위젯 */}
              <div className="flex items-center gap-3.5">
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={copilotWidgetEnabled}
                    onChange={(e) => setCopilotWidgetEnabled(e.target.checked)}
                    className="sr-only peer"
                    id="copilot-toggle"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <div className="flex flex-col">
                  <label htmlFor="copilot-toggle" className="text-xs font-extrabold text-indigo-950 cursor-pointer select-none">
                    대시보드 AI 자율 마케팅 파트너(어시스턴트) 위젯 활성화
                  </label>
                  <p className="text-[10px] text-indigo-700/80 mt-0.5 leading-normal">
                    비활성화 시 대시보드 최상단의 AI 자율 마케팅 카드(날씨 시뮬레이션, 성장 플랜 등)를 완전히 감춥니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="shrink-0 w-full lg:w-auto flex items-end lg:self-center">
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all w-full shadow-md hover:shadow-lg active:scale-95 duration-150 transform whitespace-nowrap"
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaved ? "저장완료" : "설정 저장하기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
