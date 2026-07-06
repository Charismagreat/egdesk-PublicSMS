import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { UsageSummary, PurposeStat, ModelStat, TokenLog, Pagination } from "../types";

export function useAiSettings() {
  // 1. AI 핵심 설정 관련 State
  const [aiModel, setAiModel] = useState("gemini-3.5-flash");
  const [omnichannelEnabled, setOmnichannelEnabled] = useState(true);
  const [copilotWidgetEnabled, setCopilotWidgetEnabled] = useState(true);
  const [aiProvider, setAiProvider] = useState("gemini"); // 'gemini' | 'local_llm' | 'smart_hybrid'
  const [localLlmUrl, setLocalLlmUrl] = useState("http://localhost:11434");
  const [localLlmModel, setLocalLlmModel] = useState("gemma2");

  // 로컬 Ollama에 설치된 모델 목록 관리 상태
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // 2. 로컬 LLM 연결성 테스트 관련 State
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "failed">("idle");
  const [testError, setTestError] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // 3. AI API 토큰 감사 모니터링 관련 State
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("today");
  const [summary, setSummary] = useState<UsageSummary>({
    api_calls: 0,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
  });
  const [purposes, setPurposes] = useState<PurposeStat[]>([]);
  const [models, setModels] = useState<ModelStat[]>([]);
  const [recentLogs, setRecentLogs] = useState<TokenLog[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableCollapsed, setIsTableCollapsed] = useState<boolean>(false);

  // 로컬 Ollama 모델 목록을 비동기 조회하는 헬퍼 함수
  const fetchLlmModels = async (url: string) => {
    if (!url) return;
    setIsLoadingModels(true);
    try {
      const res = await apiFetch("/api/settings/local-llm-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local_llm_url: url }),
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

  // 초기 설정 데이터 및 테이블 접힘 이력 기억 로드
  useEffect(() => {
    // 테이블 접힘 상태 불러오기
    const saved = localStorage.getItem("egdesk_ai_usage_table_collapsed");
    if (saved !== null) {
      setIsTableCollapsed(saved === "true");
    }

    // AI 설정 로드
    Promise.all([
      apiFetch("/api/settings?key=google_ai_model").then((res) => res.json()),
      apiFetch("/api/settings?key=omnichannel_ai_enabled").then((res) => res.json()),
      apiFetch("/api/settings?key=copilot_widget_enabled").then((res) => res.json()),
      apiFetch("/api/settings?key=ai_provider").then((res) => res.json()),
      apiFetch("/api/settings?key=local_llm_url").then((res) => res.json()),
      apiFetch("/api/settings?key=local_llm_model").then((res) => res.json()),
    ])
      .then(([modelData, omniData, copilotData, providerData, urlData, modelLlmData]) => {
        if (modelData.success && modelData.value) setAiModel(modelData.value);
        if (omniData.success && omniData.value !== null) setOmnichannelEnabled(omniData.value !== "false");
        if (copilotData.success && copilotData.value !== null) setCopilotWidgetEnabled(copilotData.value !== "false");
        if (providerData.success && providerData.value) setAiProvider(providerData.value);
        if (urlData.success && urlData.value) {
          setLocalLlmUrl(urlData.value);
          fetchLlmModels(urlData.value); // 초기화 시 로드된 URL 기반으로 모델 목록 조회
        }
        if (modelLlmData.success && modelLlmData.value) setLocalLlmModel(modelLlmData.value);
      })
      .catch((e) => console.error("AI 설정 로드 실패:", e));
  }, []);

  // AI 감사 데이터 리프레시 실행
  useEffect(() => {
    fetchStats();
  }, [range, page, limit]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/settings/ai-usage?range=${range}&page=${page}&limit=${limit}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.summary);
        setPurposes(json.purposes);
        setModels(json.models);
        setRecentLogs(json.recentLogs);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      } else {
        setError(json.error || "데이터 조회 실패");
      }
    } catch (err: any) {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 테이블 접기/펼치기 토글 함수
  const handleToggleTableCollapse = () => {
    setIsTableCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("egdesk_ai_usage_table_collapsed", String(next));
      return next;
    });
  };

  // 연결성 테스트 함수 (비동기 상태 전송 경합을 예방하기 위해 직접적인 인자 입력 지원)
  const handleTestConnection = async (customUrl?: string, customModel?: string) => {
    setIsTesting(true);
    setTestStatus("idle");
    setTestError("");
    
    // custom 파라미터가 들어온 경우 우선 채택, 없을 시 state 폴백
    const targetUrl = (customUrl || localLlmUrl || "").trim();
    const targetModel = (customModel || localLlmModel || "").trim();

    try {
      const res = await apiFetch("/api/settings/test-local-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local_llm_url: targetUrl,
          local_llm_model: targetModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("success");
        fetchLlmModels(targetUrl); // 연결 성공 시 실시간으로 모델 목록 새로고침
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

  // 설정 저장 함수
  const handleSave = async () => {
    try {
      const saveTasks = [
        apiFetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "google_ai_model", value: aiModel }),
        }),
        apiFetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "omnichannel_ai_enabled", value: omnichannelEnabled ? "true" : "false" }),
        }),
        apiFetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "copilot_widget_enabled", value: copilotWidgetEnabled ? "true" : "false" }),
        }),
        apiFetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ai_provider", value: aiProvider }),
        }),
        apiFetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "local_llm_url", value: localLlmUrl }),
        }),
        apiFetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "local_llm_model", value: localLlmModel }),
        }),
      ];

      const results = await Promise.all(saveTasks);
      const dataJsonList = await Promise.all(results.map((r) => r.json()));
      const failedTask = dataJsonList.find((d) => !d.success);

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

  return {
    aiModel,
    setAiModel,
    omnichannelEnabled,
    setOmnichannelEnabled,
    copilotWidgetEnabled,
    setCopilotWidgetEnabled,
    aiProvider,
    setAiProvider,
    localLlmUrl,
    setLocalLlmUrl,
    localLlmModel,
    setLocalLlmModel,
    isTesting,
    testStatus,
    testError,
    isSaved,
    range,
    setRange,
    summary,
    purposes,
    models,
    recentLogs,
    page,
    setPage,
    limit,
    setLimit,
    pagination,
    loading,
    error,
    isTableCollapsed,
    availableModels,
    isLoadingModels,
    handleToggleTableCollapse,
    handleTestConnection,
    handleSave,
    fetchStats,
    fetchLlmModels,
  };
}
