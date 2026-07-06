"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { Bot, Save, Sparkles, AlertCircle, CheckCircle, Edit, Trash2, Plus, Play, History, Calendar, User, Info, FileText } from "lucide-react";

interface EasyBotInstructionCardProps {
  currentRole: string;
}

interface EasyBotRule {
  id?: string;
  title: string;
  target_table: string;
  conditions_sql: string;
  assignee_id: string;
  task_priority: string;
  task_title_template: string;
  task_content_template: string;
  is_active: number;
}

interface EasyBotHistory {
  id: string;
  rule_id: string;
  action_type: string;
  previous_value_json: string | null;
  new_value_json: string | null;
  change_reason: string;
  operator_id: string;
  operator_name?: string;
  created_at: string;
}

export function EasyBotInstructionCard({ currentRole }: EasyBotInstructionCardProps) {
  // 🏢 회사 소개 단일 상태
  const [companyContext, setCompanyContext] = useState("");
  const [isSavingContext, setIsSavingContext] = useState(false);

  // ⚡ 규칙 목록 및 이력 상태
  const [rules, setRules] = useState<EasyBotRule[]>([]);
  const [historyList, setHistoryList] = useState<EasyBotHistory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 📝 모달 및 폼 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [formReason, setFormReason] = useState("");
  const [editingRule, setEditingRule] = useState<EasyBotRule | null>(null);
  
  // 🔍 영향 범위 시뮬레이션 상태
  const [simulationResult, setSimulationResult] = useState<{ count: number; samples: any[] } | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // 🤖 자연어 지침 자동 작성 상태
  const [naturalLanguagePrompt, setNaturalLanguagePrompt] = useState("");
  const [isGeneratingRule, setIsGeneratingRule] = useState(false);

  // 📝 템플릿 추천 상태
  const [isSuggestingTemplate, setIsSuggestingTemplate] = useState(false);

  // 🛎️ 알림 토스트 상태
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 권한 제어
  const hasAccess = currentRole === "SUPER_ADMIN" || currentRole === "PRESIDENT";

  const targetTables = [
    { value: "crm_expenses", label: "지출 내역 대장 (crm_expenses)" },
    { value: "crm_orders", label: "주문 내역 대장 (crm_orders)" },
    { value: "crm_deliveries", label: "배송 정보 대장 (crm_deliveries)" },
    { value: "products", label: "제품 및 자재 재고 (products)" },
    { value: "crm_snaptasks", label: "업무 지시 대장 (crm_snaptasks)" }
  ];

  const assignees = [
    { value: "1", label: "최고운영자/대표이사 (ID: 1)" },
    { value: "2", label: "자사몰 영업 마케터 (ID: 2)" },
    { value: "3", label: "생산공장/물류 MD (ID: 3)" },
    { value: "4", label: "재무감사 회계관제 대리 (ID: 4)" }
  ];

  const priorities = [
    { value: "low", label: "낮음 (Low)" },
    { value: "medium", label: "보통 (Medium)" },
    { value: "high", label: "높음 (High)" },
    { value: "critical", label: "긴급 (Critical)" }
  ];

  useEffect(() => {
    if (!hasAccess) return;
    loadAllData();
  }, [hasAccess]);

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      // 1. 회사 컨텍스트 로드
      const resCtx = await apiFetch("/api/settings?key=easybot_company_context");
      const dataCtx = await resCtx.json();
      if (dataCtx.success && dataCtx.value) {
        setCompanyContext(dataCtx.value);
      }

      // 2. 규칙 목록 및 이력 로드
      const resRules = await apiFetch("/api/knowledge-ai/easybot-rules");
      const dataRules = await resRules.json();
      if (dataRules.success) {
        setRules(dataRules.rules || []);
        setHistoryList(dataRules.history || []);
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ================= 1. 회사 소개글 저장 =================
  const handleSaveContext = async () => {
    setIsSavingContext(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "easybot_company_context", value: companyContext }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("회사 비즈니스 맥락 설정이 저장되었습니다. 🏢");
      } else {
        showToast("저장 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("서버 연결 실패: " + err.message, "error");
    } finally {
      setIsSavingContext(false);
    }
  };

  // ================= 2. 지식 데이터 기반 지침 생성 =================
  const handleGenerateFromKnowledge = async () => {
    setIsLoadingData(true);
    try {
      const res = await apiFetch("/api/knowledge-ai/easybot-setup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCompanyContext(data.companyContext);
        showToast("지식 문서 분석을 마쳐 회사 소개 초안을 반영했습니다! ✨");
      } else {
        showToast(data.error || "지식 RAG 생성에 실패했습니다.", "error");
      }
    } catch (err: any) {
      showToast("서버 연결 실패: " + err.message, "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  // ================= 3. 영향 범위 시뮬레이션 =================
  const handleSimulateImpact = async (table: string, conditionsSql: string) => {
    if (!table) return;
    setIsSimulating(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      const res = await apiFetch("/api/knowledge-ai/easybot-rules/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_table: table, conditions_sql: conditionsSql })
      });
      const data = await res.json();

      if (data.success) {
        setSimulationResult({
          count: data.count,
          samples: data.samples || []
        });
      } else {
        setSimulationError(data.error || "구문 검사 실패");
      }
    } catch (err: any) {
      setSimulationError("서버 전송 실패: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // ================= 4. 규칙 저장 (생성/수정) =================
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (!formReason.trim()) {
      alert("규칙 변경 사유를 입력해 주십시오. (히스토리 기록용 필수 사항)");
      return;
    }

    setIsSavingContext(true);
    try {
      const res = await apiFetch("/api/knowledge-ai/easybot-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingRule,
          change_reason: formReason
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(editingRule.id ? "규칙이 변경되었고 이력이 기록되었습니다. 💾" : "새로운 규칙이 신설되었습니다.");
        setIsModalOpen(false);
        setEditingRule(null);
        setFormReason("");
        setSimulationResult(null);
        setSimulationError(null);
        loadAllData();
      } else {
        showToast("규칙 저장 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("서버 연결 실패: " + err.message, "error");
    } finally {
      setIsSavingContext(false);
    }
  };

  // ================= 5. 규칙 삭제 (소프트 삭제) =================
  const handleDeleteRule = async (id: string) => {
    const reason = prompt("규칙 삭제 사유를 입력해 주십시오 (히스토리 기록용 필수 사항):");
    if (reason === null) return; // 취소
    if (!reason.trim()) {
      alert("삭제 사유가 기입되지 않아 취소되었습니다.");
      return;
    }

    try {
      const res = await apiFetch(`/api/knowledge-ai/easybot-rules?id=${id}&change_reason=${encodeURIComponent(reason)}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (data.success) {
        showToast("규칙이 비활성화 및 삭제 처리되었습니다.");
        loadAllData();
      } else {
        showToast("규칙 삭제 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("서버 연결 실패: " + err.message, "error");
    }
  };

  const handleGenerateRuleFromPrompt = async () => {
    if (!naturalLanguagePrompt.trim() || !editingRule) return;
    setIsGeneratingRule(true);
    try {
      const res = await apiFetch("/api/knowledge-ai/easybot-rules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: naturalLanguagePrompt })
      });
      const data = await res.json();
      if (data.success && data.rule) {
        setEditingRule({
          ...editingRule,
          title: data.rule.title || "",
          target_table: data.rule.target_table || "crm_expenses",
          conditions_sql: data.rule.conditions_sql || "",
          assignee_id: String(data.rule.assignee_id || "1"),
          task_priority: data.rule.task_priority || "medium",
          task_title_template: data.rule.task_title_template || "",
          task_content_template: data.rule.task_content_template || ""
        });
        showToast("자연어 지침을 해석하여 폼에 자동 반영했습니다! ✨");
      } else {
        showToast(data.error || "자연어 해석에 실패했습니다.", "error");
      }
    } catch (err: any) {
      showToast("서버 통신 실패: " + err.message, "error");
    } finally {
      setIsGeneratingRule(false);
    }
  };

  const handleSuggestTaskTemplate = async () => {
    if (!editingRule) return;
    if (!editingRule.title.trim()) {
      alert("AI 추천을 받기 위해 먼저 '규칙 명칭'을 입력해 주세요.");
      return;
    }
    setIsSuggestingTemplate(true);
    try {
      const res = await apiFetch("/api/knowledge-ai/easybot-rules/suggest-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingRule.title,
          target_table: editingRule.target_table,
          conditions_sql: editingRule.conditions_sql
        })
      });
      const data = await res.json();
      if (data.success && data.suggested_template) {
        setEditingRule({
          ...editingRule,
          task_content_template: data.suggested_template
        });
        showToast("업무 지시 상세 내용 템플릿 추천안을 반영했습니다! ✨");
      } else {
        showToast(data.error || "추천 생성에 실패했습니다.", "error");
      }
    } catch (err: any) {
      showToast("서버 통신 실패: " + err.message, "error");
    } finally {
      setIsSuggestingTemplate(false);
    }
  };

  const openAddModal = () => {
    setEditingRule({
      title: "",
      target_table: "crm_expenses",
      conditions_sql: "",
      assignee_id: "1",
      task_priority: "medium",
      task_title_template: "",
      task_content_template: "",
      is_active: 1
    });
    setFormReason("신규 관제 규칙 등록");
    setNaturalLanguagePrompt("");
    setSimulationResult(null);
    setSimulationError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: EasyBotRule) => {
    setEditingRule({ ...rule });
    setFormReason("");
    setNaturalLanguagePrompt("");
    setSimulationResult(null);
    setSimulationError(null);
    setIsModalOpen(true);
  };

  if (!hasAccess) return null;

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* 상단 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-start gap-2.5">
            <Bot className="w-5.5 h-5.5 text-indigo-400 animate-pulse mt-0.5" />
            <div className="text-left">
              <h3 className="text-sm font-black text-indigo-200 tracking-wider">
                이지봇(EasyBot) 자율 관제 규칙 및 영향도 분석
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                테이블 변경에 따른 자율 스냅태스크 지시 지침을 회사 맞춤형 규칙(Rule) 리스트로 구축하고 제어합니다.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateFromKnowledge}
              className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              지식 분석 요약
            </button>
            <button
              onClick={openAddModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-none text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              자율 규칙 추가
            </button>
          </div>
        </div>

        {/* 1. 회사 정보 개요 (단일 설정) */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex justify-between items-center text-left">
            <label className="text-[10.5px] font-extrabold text-slate-350 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              회사 비즈니스 맥락 및 기밀 요약 (Company Context)
            </label>
            <button
              onClick={handleSaveContext}
              disabled={isSavingContext}
              className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[9.5px] font-bold rounded cursor-pointer transition-all disabled:opacity-40"
            >
              저장하기
            </button>
          </div>
          <textarea
            rows={3}
            value={companyContext}
            onChange={(e) => setCompanyContext(e.target.value)}
            placeholder="예: (주)원컨덕터는 다품종 소량 생산 형태로 일진전기 및 효성중공업 등의 전력 대기업에 송배전 도체를 납품하는 정밀 유통 제조업체입니다..."
            className="w-full p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-[10.5px] font-bold text-slate-200 outline-none placeholder-slate-700 leading-normal"
          />
        </div>

        {/* 2. 규칙 테이블 목록 */}
        <div className="space-y-2 text-left">
          <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">활성화된 자율 규칙 목록</h4>
          <div className="overflow-x-auto bg-slate-950 border border-slate-850 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-400 text-[9.5px] font-bold bg-slate-900/60 uppercase">
                  <th className="p-3">규칙명</th>
                  <th className="p-3">감시 대상 테이블</th>
                  <th className="p-3">조건식 (SQL)</th>
                  <th className="p-3">배정 담당자</th>
                  <th className="p-3">우선순위</th>
                  <th className="p-3 text-center">동작</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-[10px] font-medium text-slate-300">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                      등록된 자율 감시 규칙이 없습니다. [자율 규칙 추가]를 눌러 규칙을 작성해 주세요.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-900/40">
                      <td className="p-3 font-extrabold text-indigo-300">{rule.title}</td>
                      <td className="p-3 font-mono text-slate-400">{rule.target_table}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold max-w-[180px] truncate" title={rule.conditions_sql}>
                        {rule.conditions_sql}
                      </td>
                      <td className="p-3 font-bold text-slate-350">
                        {assignees.find((a) => a.value === rule.assignee_id)?.label.split(" (")[0] || rule.assignee_id}
                      </td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded font-black text-[9px] ${
                          rule.task_priority === "critical" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                          rule.task_priority === "high" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          rule.task_priority === "medium" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" :
                          "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}>
                          {rule.task_priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(rule)}
                            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 border-none bg-transparent cursor-pointer rounded"
                            title="수정"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id!)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-800 border-none bg-transparent cursor-pointer rounded"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. 변경 이력 아코디언 */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full p-4 flex justify-between items-center bg-slate-950/60 border-none text-white font-bold text-xs cursor-pointer hover:bg-slate-900/60 transition-all"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              자율 규칙 변경 조작 히스토리 ({historyList.length}건)
            </span>
            <span className="text-[10px] text-slate-450">{isHistoryOpen ? "▲ 닫기" : "▼ 열기"}</span>
          </button>
          {isHistoryOpen && (
            <div className="p-4 border-t border-slate-800 max-h-[260px] overflow-y-auto space-y-3 text-left">
              {historyList.length === 0 ? (
                <div className="text-center text-slate-500 font-bold py-4 text-[10px]">변경 이력 기록이 아직 존재하지 않습니다.</div>
              ) : (
                historyList.map((hist) => (
                  <div key={hist.id} className="relative pl-4 border-l-2 border-slate-800 py-1 space-y-1">
                    {/* 타임라인 원형 점 */}
                    <div className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-900" />
                    
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-bold">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {hist.created_at}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="flex items-center gap-0.5 font-bold text-slate-350">
                        <User className="w-3 h-3 text-slate-500" />
                        {hist.operator_name || `관리자(ID:${hist.operator_id})`}
                      </span>
                      <span className={`px-1 rounded-[3px] text-[8px] font-black ${
                        hist.action_type === 'CREATE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                        hist.action_type === 'UPDATE' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                      }`}>
                        {hist.action_type}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-bold text-slate-200 leading-normal">
                      사유: <span className="text-indigo-200">{hist.change_reason}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= 4. 규칙 관리 모달 (추가 / 편집) ================= */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* 모달 헤더 */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-left">
              <h3 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                <Bot className="w-4.5 h-4.5" />
                {editingRule.id ? "이지봇 자율 감시 규칙 수정" : "새로운 자율 감시 규칙 신설"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white border-none bg-transparent cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 */}
            <form onSubmit={handleSaveRule} className="p-5 overflow-y-auto space-y-4 text-left flex-1">
              {/* 🤖 AI 자연어 지침 자동 작성 카드 */}
              <div className="p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-3">
                <span className="text-[10px] font-black text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  AI 자연어 규칙 빌더 (추천)
                </span>
                <p className="text-[9.5px] text-slate-400 leading-relaxed">
                  만들고 싶은 규칙을 자연어로 편하게 입력해 보세요. AI가 테이블, SQL 서브쿼리 조건식, 담당자, 태스크 내용까지 자동으로 구성해 줍니다.
                </p>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="예: 계약직 사원이 10만원 이상의 고액 지출을 기록하면 재무감사 대리에게 우선순위 높음으로 지출 경고를 내려줘."
                    value={naturalLanguagePrompt}
                    onChange={(e) => setNaturalLanguagePrompt(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-slate-200 outline-none resize-y min-h-[60px] placeholder-slate-600 leading-normal font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRuleFromPrompt}
                    disabled={isGeneratingRule || !naturalLanguagePrompt.trim()}
                    className="px-4 py-2 bg-gradient-to-br from-indigo-600 to-violet-650 hover:from-indigo-700 hover:to-violet-750 disabled:opacity-40 disabled:from-slate-800 disabled:to-slate-800 text-white font-extrabold text-[11px] rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer border-none transition-all shadow-md shrink-0 w-28"
                  >
                    {isGeneratingRule ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>해석 중...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-indigo-200" />
                        <span>규칙 자동 구성</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 규칙명 */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block">규칙 명칭 (Label)</label>
                  <input
                    type="text"
                    value={editingRule.title}
                    onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                    placeholder="예: 심야 고액 법인카드 지출 감시"
                    className="w-full p-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-200 outline-none"
                    required
                  />
                </div>

                {/* 감시 대상 테이블 */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block">감시 대상 테이블</label>
                  <select
                    value={editingRule.target_table}
                    onChange={(e) => setEditingRule({ ...editingRule, target_table: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-200 outline-none cursor-pointer"
                  >
                    {targetTables.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 조건식 (SQL WHERE) */}
              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block">감시 조건식 (conditions_sql)</label>
                  <button
                    type="button"
                    onClick={() => handleSimulateImpact(editingRule.target_table, editingRule.conditions_sql)}
                    disabled={isSimulating || !editingRule.conditions_sql.trim()}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white border-none text-[8.5px] font-bold rounded flex items-center gap-0.5 cursor-pointer transition-all shadow"
                  >
                    <Play className="w-2.5 h-2.5" />
                    영향 범위 분석
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={editingRule.conditions_sql}
                  onChange={(e) => setEditingRule({ ...editingRule, conditions_sql: e.target.value })}
                  placeholder="예: amount >= 300000 AND (memo LIKE '%심야%' OR memo LIKE '%밤%')"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-mono font-bold text-emerald-400 placeholder-slate-700 outline-none leading-normal"
                  required
                />
              </div>

              {/* 🔍 시뮬레이션 영향도 분석 결과 박스 */}
              {isSimulating && (
                <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl text-center text-slate-400 text-[10px] font-bold animate-pulse">
                  기존 데이터베이스와 대조하여 영향 범위(매칭 건수)를 검출하고 있습니다...
                </div>
              )}
              {simulationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-[10px] font-bold text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{simulationError}</span>
                </div>
              )}
              {simulationResult && (
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-350 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      영향 범위 시뮬레이션 완료
                    </span>
                    <span className="text-[10px] font-black text-slate-200">
                      매칭 데이터: <strong className="text-emerald-400 text-xs">{simulationResult.count}건</strong> 감지
                    </span>
                  </div>
                  {simulationResult.samples.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-[8.5px] font-bold text-slate-500 uppercase block">매칭 대표 샘플 (최신 3건)</span>
                      <div className="bg-slate-950 border border-slate-850 rounded-lg divide-y divide-slate-850 overflow-hidden">
                        {simulationResult.samples.map((s, idx) => (
                          <div key={idx} className="p-2 font-mono text-[9px] text-slate-400 flex justify-between gap-4">
                            <span className="truncate max-w-[250px] font-bold">
                              {s.title || s.name || s.content_text || `ID: ${s.id}`}
                            </span>
                            <span className="text-slate-550 text-[8.5px]">
                              {s.created_at || s.expense_date || '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-bold block">
                      ※ 조건식에 부합하는 기존 데이터 행이 존재하지 않습니다. 향후 발생하는 새로운 이벤트부터 트리거됩니다.
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 배정 담당자 */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block">후속 업무 배정자 (Assignee)</label>
                  <select
                    value={editingRule.assignee_id}
                    onChange={(e) => setEditingRule({ ...editingRule, assignee_id: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-200 outline-none cursor-pointer"
                  >
                    {assignees.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>

                {/* 태스크 우선순위 */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block">생성 태스크 우선순위</label>
                  <select
                    value={editingRule.task_priority}
                    onChange={(e) => setEditingRule({ ...editingRule, task_priority: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-200 outline-none cursor-pointer"
                  >
                    {priorities.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 태스크 제목 템플릿 */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-450 uppercase block">업무 지시 제목 템플릿</label>
                <input
                  type="text"
                  value={editingRule.task_title_template}
                  onChange={(e) => setEditingRule({ ...editingRule, task_title_template: e.target.value })}
                  placeholder="예: [지출 경고] 심야 고액 결제 건 소명 요청"
                  className="w-full p-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-200 outline-none"
                  required
                />
              </div>

              {/* 태스크 본문 템플릿 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase block">업무 지시 상세 내용 템플릿</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] text-slate-500 font-bold">치환 템플릿 가이드: {`{amount}`}, {`{title}`}, {`{name}`} 사용 가능</span>
                    <button
                      type="button"
                      onClick={handleSuggestTaskTemplate}
                      disabled={isSuggestingTemplate || !editingRule.title}
                      className="px-2 py-0.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white border-none text-[8.5px] font-bold rounded flex items-center gap-0.5 cursor-pointer transition-all shadow animate-pulse"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {isSuggestingTemplate ? "추천 중..." : "AI 작성 추천 ✨"}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editingRule.task_content_template}
                  onChange={(e) => setEditingRule({ ...editingRule, task_content_template: e.target.value })}
                  placeholder="예: 금액: {amount}원&#13;가게명: {title}&#13;사용일자: {expense_date}&#13;&#13;해당 심야 가요주점 결제 지출 품의 승인을 보류하고 소명 양식을 요청하십시오."
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-200 outline-none resize-y min-h-[80px] placeholder-slate-700 leading-relaxed"
                  required
                />
              </div>

              {/* ⚠️ 변경 사유 입력 필드 (필수) */}
              <div className="space-y-1 border-t border-slate-800 pt-3">
                <label className="text-[9.5px] font-bold text-rose-400 uppercase block">규칙 변경 사유 (히스토리 로깅 필수)</label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="예: 정기 재무 리스크 정책 강화 반영"
                  className="w-full p-2 bg-slate-950 border border-rose-900/30 focus:border-rose-500/70 rounded-lg text-xs font-bold text-slate-200 placeholder-slate-750 outline-none"
                  required
                />
              </div>
            </form>

            {/* 모달 푸터 */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                disabled={isSavingContext}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-none text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow"
              >
                <Save className="w-4 h-4" />
                {editingRule.id ? "규칙 수정 적용" : "규칙 신설 등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 피드백 알림 */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border transition-all text-xs font-bold ${
          toast.type === "success" 
            ? "bg-slate-900 border-indigo-550 text-indigo-400" 
            : "bg-rose-950 border-rose-500/40 text-rose-400"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
