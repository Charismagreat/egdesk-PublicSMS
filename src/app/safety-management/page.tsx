"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Users, 
  QrCode, 
  MessageSquare, 
  Send, 
  Plus, 
  Trash2, 
  Info,
  Calendar,
  CloudSun,
  User,
  MapPin,
  ClipboardList,
  AlertOctagon,
  FileCheck,
  ChevronRight,
  ExternalLink
} from "lucide-react";

export default function SafetyManagementPage() {
  // --- 🔑 권한 및 사용자 세션 상태 ---
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [userName, setUserName] = useState<string>("홍길동");
  const [userDept, setUserDept] = useState<string>("SCM팀");

  // --- 🛎️ 토스트 알림 상태 ---
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warn" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warn" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const hasAdminAccess = useMemo(() => {
    const role = userRole.toUpperCase();
    return role === "SUPER_ADMIN" || role === "PRESIDENT";
  }, [userRole]);

  // --- 📂 데이터 로딩 상태 ---
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [policies, setPolicies] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [tbmLogs, setTbmLogs] = useState<any[]>([]);
  const [nearMisses, setNearMisses] = useState<any[]>([]);
  
  // 안전관리자 번호 설정
  const [safetyManagerPhone, setSafetyManagerPhone] = useState<string>("010-1234-5678");
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);

  // --- 🗂️ 탭 제어 ---
  const [activeTab, setActiveTab] = useState<"policy" | "risk" | "tbm" | "nearMiss">("policy");

  // --- ✍️ 안전보건방침 입력 폼 상태 ---
  const [newPolicy, setNewPolicy] = useState({
    year: new Date().getFullYear().toString(),
    policy_title: "",
    targets: ["", "", ""]
  });

  // --- 🧠 AI 위험성평가 입력 폼 상태 ---
  const [newRisk, setNewRisk] = useState({
    work_name: "",
    work_date: new Date().toISOString().slice(0, 10),
    generate_ai: true
  });
  const [isRiskSubmitting, setIsRiskSubmitting] = useState<boolean>(false);

  // --- 📢 TBM 입력 폼 상태 ---
  const [newTbm, setNewTbm] = useState({
    tbm_date: new Date().toISOString().slice(0, 10),
    work_leader: "",
    weather_info: "맑음",
    work_name: "",
    generate_script: true,
    tbm_script: ""
  });
  const [isTbmSubmitting, setIsTbmSubmitting] = useState<boolean>(false);
  const [selectedTbmForQr, setSelectedTbmForQr] = useState<any | null>(null);

  // --- 🚨 아차사고 입력 폼 상태 ---
  const [newNearMiss, setNewNearMiss] = useState({
    reporter_name: "",
    hazard_location: "",
    description: "",
    photo_url: ""
  });
  const [isNearMissSubmitting, setIsNearMissSubmitting] = useState<boolean>(false);
  const [selectedNearMissForAction, setSelectedNearMissForAction] = useState<any | null>(null);
  const [actionDescription, setActionDescription] = useState<string>("");

  // --- 🤖 AI 비상 챗봇 상태 ---
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; content: string; isReport?: boolean }>>([
    { 
      role: "ai", 
      content: "안녕하세요. 중대재해 AI 비상 대응 센터입니다. \n\n산업재해(추락, 감전, 끼임 등) 발생 시 즉시 알려주시면 법적 골든타임 행동 요령과 정부 제출용 [재해조사표] 초안 기안을 즉석에서 지원해 드립니다. \n\n어떤 비상 상황이 발생했나요?" 
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // --- 📡 데이터 페칭 ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. 사용자 정보
      const meRes = await apiFetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.success) {
        setUserRole(meData.role || "SUB_OPERATOR");
        setUserName(meData.name || "홍길동");
        // default leader name
        setNewTbm(prev => ({ ...prev, work_leader: meData.name || "홍길동" }));
        setNewNearMiss(prev => ({ ...prev, reporter_name: meData.name || "홍길동" }));
      }

      // 2. 안전보건방침
      const policyRes = await apiFetch("/api/safety/policies");
      const policyData = await policyRes.json();
      if (policyData.success) setPolicies(policyData.policies);

      // 3. 위험성평가
      const riskRes = await apiFetch("/api/safety/risk-assessment");
      const riskData = await riskRes.json();
      if (riskData.success) setAssessments(riskData.assessments);

      // 4. TBM 로그
      const tbmRes = await apiFetch("/api/safety/tbm");
      const tbmData = await tbmRes.json();
      if (tbmData.success) setTbmLogs(tbmData.tbmLogs);

      // 5. 아차사고
      const missRes = await apiFetch("/api/safety/near-miss");
      const missData = await missRes.json();
      if (missData.success) setNearMisses(missData.nearMisses);

      // 6. 안전관리자 연락처 조회
      const settingsRes = await apiFetch("/api/settings");
      // 만약 /api/settings가 없다면 system_settings 개별 쿼리
      const phoneRes = await apiFetch("/api/settings?key=safety_manager_phone");
      const phoneData = await phoneRes.json();
      if (phoneData.success && phoneData.value) {
        setSafetyManagerPhone(phoneData.value);
      }
    } catch (e) {
      console.error("Failed to load safety management data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 🛠️ 폼 핸들러 ---
  
  // 안전관리자 전화번호 업데이트
  const updateManagerPhone = async () => {
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "safety_manager_phone", value: safetyManagerPhone })
      });
      const data = await res.json();
      if (data.success) {
        showToast("안전관리인 비상 연락처가 저장되었습니다.", "success");
        setIsEditingPhone(false);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(`저장 실패: ${err.message}`, "error");
    }
  };

  // 1. 안전보건방침 등록
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const filteredTargets = newPolicy.targets.filter(t => t.trim() !== "");
      if (filteredTargets.length === 0) {
        showToast("안전보건 세부 목표를 최소 1개 이상 입력해 주세요.", "warn");
        return;
      }

      const res = await apiFetch("/api/safety/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newPolicy.year,
          policy_title: newPolicy.policy_title,
          targets_json: JSON.stringify(filteredTargets),
          established_by: userName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("안전보건방침 및 목표가 성공적으로 공표되었습니다.", "success");
        setNewPolicy({ year: new Date().getFullYear().toString(), policy_title: "", targets: ["", "", ""] });
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(`방침 저장 실패: ${err.message}`, "error");
    }
  };

  // 2. AI 위험성평가 생성
  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRiskSubmitting(true);
    try {
      const res = await apiFetch("/api/safety/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_name: newRisk.work_name,
          work_date: newRisk.work_date,
          evaluated_by: userName,
          generate_ai: newRisk.generate_ai
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`위험성평가서가 ${newRisk.generate_ai ? 'AI 자동 분석을 거쳐 ' : ''}등록되었습니다.`, "success");
        setNewRisk(prev => ({ ...prev, work_name: "" }));
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(`위험성평가 실패: ${err.message}`, "error");
    } finally {
      setIsRiskSubmitting(false);
    }
  };

  // 위험성평가 최고관리자 승인 처리
  const handleApproveRisk = async (id: string) => {
    try {
      const res = await apiFetch("/api/safety/risk-assessment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "APPROVED",
          approved_by: userName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("위험성평가서가 공식 승인(결재완료) 되었습니다.", "success");
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(`승인 실패: ${err.message}`, "error");
    }
  };

  // 3. TBM 생성
  const handleCreateTbm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTbmSubmitting(true);
    try {
      const res = await apiFetch("/api/safety/tbm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tbm_date: newTbm.tbm_date,
          work_leader: newTbm.work_leader,
          weather_info: newTbm.weather_info,
          work_name: newTbm.work_name,
          generate_script: newTbm.generate_script,
          tbm_script: newTbm.tbm_script
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`오늘의 TBM 대장이 ${newTbm.generate_script ? 'AI 맞춤 연설안과 함께 ' : ''}개설되었습니다.`, "success");
        setNewTbm(prev => ({ ...prev, work_name: "", tbm_script: "" }));
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(`TBM 등록 실패: ${err.message}`, "error");
    } finally {
      setIsTbmSubmitting(false);
    }
  };

  // 4. 아차사고 제보
  const handleReportNearMiss = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsNearMissSubmitting(true);
    try {
      const res = await apiFetch("/api/safety/near-miss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNearMiss)
      });
      const data = await res.json();
      if (data.success) {
        if (data.risk_grade === "CRITICAL" || data.risk_grade === "HIGH") {
          showToast(`🚨 AI 위험 판정 [${data.risk_grade}]: 즉각적인 비상 SMS 경보가 발송되었습니다.`, "warn");
        } else {
          showToast("아차사고/유해요소 제보가 접수되었으며, AI가 위험도를 분석했습니다.", "success");
        }
        setNewNearMiss({
          reporter_name: userName,
          hazard_location: "",
          description: "",
          photo_url: ""
        });
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(`제보 실패: ${err.message}`, "error");
    } finally {
      setIsNearMissSubmitting(false);
    }
  };

  // 아차사고 조치 사항 기록
  const handleCompleteNearMissAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNearMissForAction) return;

    try {
      const res = await apiFetch("/api/safety/near-miss", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedNearMissForAction.id,
          action_status: "COMPLETED",
          action_description: actionDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("해당 안전 유해요소에 대한 방호/조치 조치가 완료되었습니다.", "success");
        setSelectedNearMissForAction(null);
        setActionDescription("");
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showToast(`조치 갱신 실패: ${err.message}`, "error");
    }
  };

  // --- 🤖 AI 비상 챗봇 메시지 전송 ---
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const apiKeyRes = await apiFetch("/api/settings?key=google_ai_api_key").then(r => r.json());
      let apiKey = apiKeyRes.success ? apiKeyRes.value : null;
      if (!apiKey) apiKey = process.env.GEMINI_API_KEY || '';

      if (!apiKey) {
        setChatMessages(prev => [...prev, { 
          role: "ai", 
          content: "⚠️ 구글 AI API 키가 설정되지 않아 응답을 생성할 수 없습니다. 시스템 설정에서 google_ai_api_key를 먼저 입력하십시오." 
        }]);
        setIsChatLoading(false);
        return;
      }

      const modelRes = await apiFetch("/api/settings?key=google_ai_model").then(r => r.json());
      const selectedModel = modelRes.success && modelRes.value
        ? modelRes.value
        : 'gemini-3.5-flash';


      const systemPrompt = `
You are a premium Industrial Safety Response Chatbot complying with the Korean Serious Accident Punishment Act (SAPA).
When a user describes an accident (e.g., fall, electric shock, entrapment, fire), you must:
1. Provide immediate golden-time emergency action guidelines (1, 2, 3 steps in Korean).
2. Generate a standard government-submitting [재해조사표] (Accident Investigation Report) draft in Markdown format based on the details provided.
The report must include:
- 재해개요 (Overview)
- 발생원인 (Root Cause)
- 재발방지대책 (Preventative Measures)
Keep the tone urgent, professional, and clear.
`;

      const aiResponse = await apiFetch('/api/safety/accident-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedModel,
          chatMessages,
          userMsg
        })
      });

      if (!aiResponse.ok) {
        const errData = await aiResponse.json().catch(() => ({}));
        throw new Error(errData.error || "Gemini AI 응답 생성에 실패했습니다.");
      }

      const aiData = await aiResponse.json();
      const aiText = aiData.text || "죄송합니다. 안내를 생성하는 도중 오류가 발생했습니다.";
      
      setChatMessages(prev => [...prev, { role: "ai", content: aiText, isReport: aiText.includes("재해조사표") }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: "ai", content: `오류가 발생했습니다: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- 📊 KPI 계산 ---
  const activePolicy = useMemo(() => {
    return policies.find(p => p.year === new Date().getFullYear().toString());
  }, [policies]);

  const stats = useMemo(() => {
    const totalRisks = assessments.length;
    const approvedRisks = assessments.filter(a => a.status === 'APPROVED').length;
    const pendingRisks = totalRisks - approvedRisks;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTbm = tbmLogs.find(t => t.tbm_date === todayStr);

    const pendingMisses = nearMisses.filter(m => m.action_status === 'PENDING').length;
    const completedMisses = nearMisses.length - pendingMisses;

    return {
      hasPolicy: !!activePolicy,
      totalRisks,
      approvedRisks,
      pendingRisks,
      todayTbmStatus: todayTbm ? "실시 완료" : "대기 중",
      todayTbmSignatures: todayTbm ? todayTbm.attendees_count : 0,
      totalMisses: nearMisses.length,
      pendingMisses,
      completedMisses
    };
  }, [assessments, tbmLogs, nearMisses, activePolicy]);

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800 animate-fade-in text-left">
      
      {/* 🛎️ 알림 토스트 */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
          toast.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-250' :
          'bg-amber-50 text-amber-700 border-amber-250'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
          {toast.type === 'error' && <AlertOctagon className="w-5 h-5 text-rose-600" />}
          {toast.type === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* 헤더 및 타이틀 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Shield className="w-8 h-8 text-amber-500 mr-3 animate-pulse" />
            안전 관리 AI
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">중대재해처벌법(SAPA) 이행 및 안전 예방활동 실시간 관리 시스템</p>
        </div>

        {/* 비상 통보처 퀵 셋팅 */}
        <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-extrabold text-slate-500">🚨 비상 알림 수신인:</span>
          {isEditingPhone ? (
            <div className="flex items-center gap-1.5">
              <input 
                type="text" 
                className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 w-32"
                value={safetyManagerPhone} 
                onChange={(e) => setSafetyManagerPhone(e.target.value)} 
              />
              <button onClick={updateManagerPhone} className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg hover:bg-amber-600">저장</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800">{safetyManagerPhone}</span>
              <button onClick={() => setIsEditingPhone(true)} className="text-[10px] font-black text-amber-600 hover:underline">변경</button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="font-extrabold text-slate-500 text-sm">안전 보건 관제 대장을 불러오는 중입니다...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 📊 KPI 대시보드 카드 섹션 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: 안전보건방침 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">안전보건방침 수립</p>
                <h3 className="text-xl font-black mt-1 text-slate-900">
                  {stats.hasPolicy ? `${new Date().getFullYear()}년도 공표` : "미수립"}
                </h3>
                <span className="text-[10px] font-bold text-slate-500 mt-2 block">SAPA 제4조 핵심 의무</span>
              </div>
              <div className={`p-3.5 rounded-2xl ${stats.hasPolicy ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stats.hasPolicy ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
            </div>

            {/* KPI 2: 위험성평가 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">AI 위험성평가서</p>
                <h3 className="text-xl font-black mt-1 text-slate-900">
                  {stats.approvedRisks} <span className="text-xs text-slate-400 font-bold">/ {stats.totalRisks}건 승인</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500 mt-2 block">대기 {stats.pendingRisks}건 존재</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            {/* KPI 3: TBM */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">오늘의 TBM 상태</p>
                <h3 className="text-xl font-black mt-1 text-slate-900">
                  {stats.todayTbmStatus}
                </h3>
                <span className="text-[10px] font-bold text-slate-500 mt-2 block">{stats.todayTbmSignatures}명 QR 서명 완료</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* KPI 4: 아차사고 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">아차사고 및 유해요소</p>
                <h3 className="text-xl font-black mt-1 text-slate-900">
                  대기 {stats.pendingMisses} <span className="text-xs text-slate-400 font-bold">/ 완료 {stats.completedMisses}건</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500 mt-2 block">근로자 피드백 청취</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* 🗂️ 메인 탭바 */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab("policy")}
              className={`pb-3 px-4 font-black text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === "policy" 
                  ? "border-amber-500 text-amber-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              1. 방침 및 목표
            </button>
            <button 
              onClick={() => setActiveTab("risk")}
              className={`pb-3 px-4 font-black text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === "risk" 
                  ? "border-amber-500 text-amber-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              2. AI 위험성평가
            </button>
            <button 
              onClick={() => setActiveTab("tbm")}
              className={`pb-3 px-4 font-black text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === "tbm" 
                  ? "border-amber-500 text-amber-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              3. TBM 교육 및 QR서명
            </button>
            <button 
              onClick={() => setActiveTab("nearMiss")}
              className={`pb-3 px-4 font-black text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === "nearMiss" 
                  ? "border-amber-500 text-amber-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              4. 아차사고 근로자제보
            </button>
          </div>

          {/* 🗂️ 탭 콘텐츠 영역 */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs min-h-[400px]">

            {/* --- 탭 1: 안전보건방침 --- */}
            {activeTab === "policy" && (
              <div className="space-y-6">
                <div className="flex justify-between items-start gap-4 flex-col lg:flex-row">
                  {/* 방침 목록 */}
                  <div className="w-full lg:w-2/3 space-y-4">
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-500" />
                      연도별 공표된 안전보건방침 대장
                    </h4>
                    
                    {policies.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-400 font-bold border border-slate-100">
                        수립된 안전보건방침이 아직 없습니다. 최고관리자 계정으로 신규 방침을 선언해 주세요.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {policies.map((p) => {
                          const targets = JSON.parse(p.targets_json);
                          return (
                            <div key={p.id} className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-3 relative text-left">
                              <div className="flex justify-between items-center">
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                                  {p.year}년도 공표안
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  공표일: {p.established_at} | 기안자: {p.established_by}
                                </span>
                              </div>
                              <h5 className="font-extrabold text-slate-800 text-base">
                                슬로건: "{p.policy_title}"
                              </h5>
                              <div className="border-t border-slate-200 pt-3">
                                <p className="text-xs font-black text-slate-500 mb-2">핵심 안전 보건 목표:</p>
                                <ol className="list-decimal list-inside text-xs font-bold text-slate-700 space-y-1.5">
                                  {targets.map((t: string, idx: number) => (
                                    <li key={idx}>{t}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 방침 작성 폼 (최고관리자 권한 전용) */}
                  <div className="w-full lg:w-1/3 bg-slate-50 rounded-2xl border border-slate-150 p-5">
                    <h4 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      신규 방침 선언 (경영책임자 의무)
                    </h4>
                    
                    {!hasAdminAccess ? (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-amber-700 text-xs font-bold space-y-1">
                        <p>⚠️ 권한 경고</p>
                        <p>안전보건방침 선언은 중대재해처벌법상 '경영책임자(SUPER_ADMIN 또는 PRESIDENT)' 권한을 가진 사용자만 작성할 수 있습니다.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSavePolicy} className="space-y-4">
                        <div>
                          <label className="text-xs font-black text-slate-500 block mb-1">대상 연도</label>
                          <input 
                            type="text" 
                            className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                            value={newPolicy.year}
                            onChange={(e) => setNewPolicy(prev => ({ ...prev, year: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 block mb-1">전사 안전보건방침 슬로건</label>
                          <textarea 
                            rows={3}
                            className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                            placeholder="예: 안전을 타협하지 않는 무재해 일터 조성"
                            value={newPolicy.policy_title}
                            onChange={(e) => setNewPolicy(prev => ({ ...prev, policy_title: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 block">세부 실천 안전 목표</label>
                          {newPolicy.targets.map((val, idx) => (
                            <input 
                              key={idx}
                              type="text" 
                              className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                              placeholder={`목표 ${idx + 1}: 예) 위험성평가 전사 이행`}
                              value={val}
                              onChange={(e) => {
                                const copy = [...newPolicy.targets];
                                copy[idx] = e.target.value;
                                setNewPolicy(prev => ({ ...prev, targets: copy }));
                              }}
                            />
                          ))}
                        </div>
                        <button 
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl w-full flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          공식 방침 공표 및 DB 저장
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- 탭 2: AI 위험성평가 --- */}
            {activeTab === "risk" && (
              <div className="space-y-6">
                <div className="flex justify-between items-start gap-4 flex-col lg:flex-row">
                  {/* 평가서 대장 */}
                  <div className="w-full lg:w-2/3 space-y-4">
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-amber-500" />
                      위험성평가 대장 및 조치 현황
                    </h4>

                    {assessments.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-400 font-bold border border-slate-100">
                        수립된 위험성평가서가 없습니다. 우측 양식에 작업명을 입력하고 AI 위험요인 도출을 수행해 보세요.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {assessments.map((a) => (
                          <div key={a.id} className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-3 relative text-left">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                                  ID: {a.id}
                                </span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  a.risk_level === '상' ? 'bg-rose-100 text-rose-800' :
                                  a.risk_level === '중' ? 'bg-amber-100 text-amber-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  위험도: {a.risk_level}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                평가일: {a.work_date} | 기안: {a.evaluated_by}
                              </span>
                            </div>

                            <h5 className="font-extrabold text-slate-800 text-base">
                              작업명: {a.work_name}
                            </h5>

                            {/* 유해요소 상세 테이블 */}
                            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                              <table className="min-w-full text-xs font-bold text-slate-700 divide-y divide-slate-200">
                                <thead className="bg-slate-100 text-[10px] font-extrabold text-slate-500">
                                  <tr>
                                    <th className="px-4 py-2 text-left">유해위험요인</th>
                                    <th className="px-4 py-2 text-left w-24">재해형태</th>
                                    <th className="px-4 py-2 text-left">감소대책</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {a.hazards && a.hazards.map((h: any, idx: number) => (
                                    <tr key={idx}>
                                      <td className="px-4 py-2 text-slate-900">{h.hazard}</td>
                                      <td className="px-4 py-2"><span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{h.type}</span></td>
                                      <td className="px-4 py-2 text-slate-600">{h.measure}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* 결재 및 상태 컨트롤 */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200 flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-extrabold text-slate-500">결재 상태:</span>
                                <span className={`font-black ${a.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {a.status === 'APPROVED' ? '✅ 공식 결재 완료' : '⏳ 미승인 임시안'}
                                </span>
                                {a.approved_at && <span className="text-[10px] text-slate-400">({a.approved_at})</span>}
                              </div>

                              {a.status !== 'APPROVED' && (
                                <button 
                                  onClick={() => handleApproveRisk(a.id)}
                                  disabled={!hasAdminAccess}
                                  className={`text-[10px] font-black py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-2xs transition-colors ${
                                    hasAdminAccess 
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  경영책임자 공식 서명/승인
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 신규 평가서 작성 및 AI 도출 폼 */}
                  <div className="w-full lg:w-1/3 bg-slate-50 rounded-2xl border border-slate-150 p-5">
                    <h4 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      위험성평가 수립 및 AI 요인 추출
                    </h4>

                    <form onSubmit={handleCreateRisk} className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-500 block mb-1">평가 예정 작업명</label>
                        <input 
                          type="text" 
                          className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                          placeholder="예: 배터리 조립라인 정비 작업, 외부 지붕 보수"
                          value={newRisk.work_name}
                          onChange={(e) => setNewRisk(prev => ({ ...prev, work_name: e.target.value }))}
                          required
                          data-easybot-hint="평가 예정 작업명: 위험성평가를 실시할 대상 작업의 구체적인 명칭을 입력하십시오. 예: 고소 청소 작업, 외부 지붕 보수 작업 등"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-500 block mb-1">작업 예정 날짜</label>
                        <input 
                          type="date" 
                          className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                          value={newRisk.work_date}
                          onChange={(e) => setNewRisk(prev => ({ ...prev, work_date: e.target.value }))}
                          required
                          data-easybot-hint="작업 예정 날짜: 위험성평가 대상 작업이 실제로 현장에서 수행될 예정 날짜를 선택하십시오."
                        />
                      </div>
                      <div className="flex items-center gap-2 py-1 bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <input 
                          type="checkbox" 
                          id="generate_ai" 
                          className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                          checked={newRisk.generate_ai}
                          onChange={(e) => setNewRisk(prev => ({ ...prev, generate_ai: e.target.checked }))}
                        />
                        <label htmlFor="generate_ai" className="text-xs font-black text-slate-700 cursor-pointer">
                          Gemini Safety AI 위험도 & 대책 자동도출
                        </label>
                      </div>

                      <button 
                        type="submit"
                        disabled={isRiskSubmitting}
                        className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl w-full flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        {isRiskSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            AI 유해요소 분석 중...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            위험성평가 신규 등록
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* --- 탭 3: TBM 및 QR 서명 --- */}
            {activeTab === "tbm" && (
              <div className="space-y-6">
                <div className="flex justify-between items-start gap-4 flex-col lg:flex-row">
                  {/* TBM 로그 목록 */}
                  <div className="w-full lg:w-2/3 space-y-4">
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-500" />
                      작업 전 TBM(Tool Box Meeting) 일지 대장
                    </h4>

                    {tbmLogs.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-400 font-bold border border-slate-100">
                        개설된 TBM 일지가 없습니다. 우측 양식을 통해 오늘의 작업을 선언하고 TBM을 시작하세요.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tbmLogs.map((t) => (
                          <div key={t.id} className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-3 relative text-left">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                                TBM 날짜: {t.tbm_date}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                리더: {t.work_leader} | 날씨: {t.weather_info}
                              </span>
                            </div>

                            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 text-xs text-slate-750 whitespace-pre-wrap font-bold">
                              <p className="font-extrabold text-amber-800 border-b border-amber-200/50 pb-1.5 mb-1.5 flex items-center gap-1">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                TBM 안전 브리핑 멘트:
                              </p>
                              {t.tbm_script}
                            </div>

                            {/* QR 서명 팝업 트리거 및 서명 현황 */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200 flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-extrabold text-slate-500">서명 근로자:</span>
                                <span className="font-black text-amber-600">{t.attendees_count}명 완료</span>
                                {t.attendee_signatures && t.attendee_signatures.length > 0 && (
                                  <span className="text-[10px] text-slate-500">
                                    ({t.attendee_signatures.map((s: any) => s.worker_name).join(', ')})
                                  </span>
                                )}
                              </div>

                              <button 
                                onClick={() => setSelectedTbmForQr(t)}
                                className="bg-white hover:bg-slate-50 border border-slate-350 text-slate-700 font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-2xs transition-colors"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                현장 모바일 서명용 QR 띄우기
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TBM 작성 폼 */}
                  <div className="w-full lg:w-1/3 bg-slate-50 rounded-2xl border border-slate-150 p-5">
                    <h4 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      신규 TBM 개설 및 연설 스크립트 작성
                    </h4>

                    <form onSubmit={handleCreateTbm} className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-500 block mb-1">일지 날짜</label>
                        <input 
                          type="date" 
                          className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                          value={newTbm.tbm_date}
                          onChange={(e) => setNewTbm(prev => ({ ...prev, tbm_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-500 block mb-1">TBM 작업 주임(리더)</label>
                        <input 
                          type="text" 
                          className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                          value={newTbm.work_leader}
                          onChange={(e) => setNewTbm(prev => ({ ...prev, work_leader: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-black text-slate-500 block mb-1">오늘 날씨</label>
                          <input 
                            type="text" 
                            className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                            placeholder="예: 폭염, 강우, 맑음"
                            value={newTbm.weather_info}
                            onChange={(e) => setNewTbm(prev => ({ ...prev, weather_info: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 block mb-1">대상 작업명</label>
                          <input 
                            type="text" 
                            className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                            placeholder="예: 고소 청소 작업"
                            value={newTbm.work_name}
                            onChange={(e) => setNewTbm(prev => ({ ...prev, work_name: e.target.value }))}
                            required={newTbm.generate_script}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 py-1 bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <input 
                          type="checkbox" 
                          id="generate_script" 
                          className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                          checked={newTbm.generate_script}
                          onChange={(e) => setNewTbm(prev => ({ ...prev, generate_script: e.target.checked }))}
                        />
                        <label htmlFor="generate_script" className="text-xs font-black text-slate-700 cursor-pointer">
                          Gemini Safety AI TBM 연설문 자동생성
                        </label>
                      </div>

                      {!newTbm.generate_script && (
                        <div>
                          <label className="text-xs font-black text-slate-500 block mb-1">직접 작성 연설 스크립트</label>
                          <textarea 
                            rows={3}
                            className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                            value={newTbm.tbm_script}
                            onChange={(e) => setNewTbm(prev => ({ ...prev, tbm_script: e.target.value }))}
                            required
                          />
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={isTbmSubmitting}
                        className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl w-full flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        {isTbmSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            AI TBM 멘트 구상 중...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            TBM 개설 및 일지 등록
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* --- 📟 QR 서명 모달 팝업 --- */}
                {selectedTbmForQr && (
                  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center relative">
                      <h4 className="text-lg font-black text-slate-900 flex items-center justify-center gap-1.5">
                        <QrCode className="w-5 h-5 text-amber-500" />
                        현장 모바일 QR 서명부
                      </h4>
                      <p className="text-xs text-slate-500 font-bold">
                        작업 전 안전 미팅에 참석한 근로자들은 아래 QR을 스마트폰 카메라로 스캔하여 안전 서명을 진행해 주세요.
                      </p>
                      
                      {/* goqr.me API를 활용한 동적 QR 렌더링 */}
                      <div className="bg-slate-100 p-4 rounded-2xl flex justify-center border border-slate-200">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            `${window.location.origin}/m/safety/tbm?id=${selectedTbmForQr.id}`
                          )}`} 
                          alt="TBM QR Code"
                          className="w-44 h-44 shadow-xs"
                        />
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-1">
                        <p className="text-[10px] font-black text-slate-400">QR 접속 링크:</p>
                        <a 
                          href={`/m/safety/tbm?id=${selectedTbmForQr.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs font-black text-amber-600 hover:underline flex items-center gap-1"
                        >
                          /m/safety/tbm?id={String(selectedTbmForQr.id || '').slice(0, 10)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            fetchData();
                            showToast("서명 현황이 수동 갱신되었습니다.", "success");
                          }} 
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black py-2.5 rounded-xl flex-1 transition-colors"
                        >
                          실시간 현황 새로고침
                        </button>
                        <button 
                          onClick={() => setSelectedTbmForQr(null)} 
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black py-2.5 rounded-xl flex-1 transition-colors"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- 탭 4: 아차사고 근로자 제보 --- */}
            {activeTab === "nearMiss" && (
              <div className="space-y-6">
                <div className="flex justify-between items-start gap-4 flex-col lg:flex-row">
                  {/* 제보 리스트 칸반 모드 */}
                  <div className="w-full lg:w-2/3 space-y-4">
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      제보된 아차사고 / 유해위험요인 칸반
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. 조치 대기중 (PENDING) */}
                      <div className="space-y-3">
                        <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                          조치 대기 중 ({nearMisses.filter(m => m.action_status === 'PENDING').length})
                        </p>
                        
                        {nearMisses.filter(m => m.action_status === 'PENDING').length === 0 ? (
                          <div className="bg-slate-50 border border-dashed border-slate-300 text-center py-8 text-xs text-slate-400 font-bold rounded-2xl">
                            대기 중인 조치 건이 없습니다.
                          </div>
                        ) : (
                          nearMisses.filter(m => m.action_status === 'PENDING').map(m => (
                            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs space-y-3 relative text-left">
                              <div className="flex justify-between items-center">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                  m.risk_grade === 'CRITICAL' ? 'bg-rose-100 text-rose-800 animate-bounce' :
                                  m.risk_grade === 'HIGH' ? 'bg-orange-100 text-orange-850' :
                                  m.risk_grade === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  위험등급: {m.risk_grade}
                                </span>
                                <span className="text-[9px] font-extrabold text-slate-400">{m.created_at}</span>
                              </div>

                              <div className="space-y-1">
                                <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {m.hazard_location}
                                </p>
                                <p className="text-xs text-slate-600 font-bold whitespace-pre-wrap">{m.description}</p>
                              </div>

                              {m.risk_grade === "CRITICAL" && (
                                <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-[10px] text-rose-850 font-bold">
                                  🚨 위험도 임계 돌파: 안전관리자 FreeSMS 긴급 통보가 연동 발송되었습니다.
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400">제보자: {m.reporter_name}</span>
                                <button 
                                  onClick={() => {
                                    setSelectedNearMissForAction(m);
                                    setActionDescription("");
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black py-1.5 px-3 rounded-lg shadow-3xs transition-colors"
                                >
                                  조치 결과 등록
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* 2. 조치 완료 (COMPLETED) */}
                      <div className="space-y-3">
                        <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          조치 완료 ({nearMisses.filter(m => m.action_status === 'COMPLETED').length})
                        </p>

                        {nearMisses.filter(m => m.action_status === 'COMPLETED').length === 0 ? (
                          <div className="bg-slate-50 border border-dashed border-slate-300 text-center py-8 text-xs text-slate-400 font-bold rounded-2xl">
                            완료된 조치 건이 아직 없습니다.
                          </div>
                        ) : (
                          nearMisses.filter(m => m.action_status === 'COMPLETED').map(m => (
                            <div key={m.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-3xs space-y-3 relative text-left">
                              <div className="flex justify-between items-center">
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full">
                                  조치 완료
                                </span>
                                <span className="text-[9px] font-extrabold text-slate-400">조치일: {m.action_completed_at}</span>
                              </div>

                              <div className="space-y-1 opacity-70">
                                <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  위치: {m.hazard_location}
                                </p>
                                <p className="text-xs text-slate-600 font-bold">{m.description}</p>
                              </div>

                              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 font-bold space-y-1">
                                <p className="font-extrabold">✅ 방호 조치 내용:</p>
                                <p>{m.action_description}</p>
                              </div>

                              <div className="text-[10px] font-bold text-slate-400 pt-1.5 border-t border-slate-200">
                                제보자: {m.reporter_name}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 모의 제보 등록 폼 */}
                  <div className="w-full lg:w-1/3 bg-slate-50 rounded-2xl border border-slate-150 p-5">
                    <h4 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      근로자 아차사고 및 유해요소 제보하기
                    </h4>

                    <form onSubmit={handleReportNearMiss} className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-500 block mb-1">제보자 이름</label>
                        <input 
                          type="text" 
                          className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                          value={newNearMiss.reporter_name}
                          onChange={(e) => setNewNearMiss(prev => ({ ...prev, reporter_name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-500 block mb-1">위해요소 위치 / 설비명</label>
                        <input 
                          type="text" 
                          className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                          placeholder="예: 3공장 물류적재대 옆 통로"
                          value={newNearMiss.hazard_location}
                          onChange={(e) => setNewNearMiss(prev => ({ ...prev, hazard_location: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-500 block mb-1">위해요소 내용 및 아차사고 정황</label>
                        <textarea 
                          rows={3}
                          className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                          placeholder="예: 적재대 2단 지지대 균열 감지. 지붕 물받이에서 빗물이 새어 바닥이 미끄러움."
                          value={newNearMiss.description}
                          onChange={(e) => setNewNearMiss(prev => ({ ...prev, description: e.target.value }))}
                          required
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isNearMissSubmitting}
                        className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl w-full flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        {isNearMissSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            AI가 위험 분석 중...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            위해요소 제보 접수
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* --- 📝 조치 완료 결과 등록 모달 --- */}
                {selectedNearMissForAction && (
                  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-left relative">
                      <h4 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        안전 방호 조치 결과 등록
                      </h4>
                      <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-bold">
                        <p className="text-slate-500">제보 위치: {selectedNearMissForAction.hazard_location}</p>
                        <p className="text-slate-700">내용: {selectedNearMissForAction.description}</p>
                      </div>

                      <form onSubmit={handleCompleteNearMissAction} className="space-y-4">
                        <div>
                          <label className="text-xs font-black text-slate-500 block mb-1">방호 조치 내용</label>
                          <textarea 
                            rows={3}
                            className="text-xs font-bold w-full border border-slate-300 rounded-xl px-3 py-2 bg-white" 
                            placeholder="예: 바닥 물기 제거 및 '미끄럼주의' 입간판 설치 완료."
                            value={actionDescription}
                            onChange={(e) => setActionDescription(e.target.value)}
                            required
                          />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setSelectedNearMissForAction(null)} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black py-2.5 rounded-xl flex-1 transition-colors"
                          >
                            취소
                          </button>
                          <button 
                            type="submit"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-2.5 rounded-xl flex-1 transition-colors"
                          >
                            조치완료 저장
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* --- 🤖 플로팅 AI 비상 대응 센터 버튼 --- */}
          <button 
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-24 z-40 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-sm py-3 px-5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
          >
            <AlertOctagon className="w-5 h-5 animate-bounce" />
            🚨 AI 비상 대응 센터
          </button>

          {/* --- 🤖 AI 비상 챗봇 모달 --- */}
          {isChatOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[600px] text-left">
                {/* 챗봇 헤더 */}
                <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                    <div>
                      <h4 className="text-base font-black">AI 비상 골든타임 가이드 & 재해조사표 기안</h4>
                      <p className="text-[10px] text-amber-100 font-bold">중대재해 비상대응 매뉴얼 연동 가이드</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="text-white hover:text-amber-100 font-black text-xl px-2"
                  >
                    ✕
                  </button>
                </div>

                {/* 메시지 영역 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className={`p-3.5 rounded-2xl text-xs font-bold whitespace-pre-wrap leading-relaxed shadow-3xs ${
                        msg.role === 'user' 
                          ? 'bg-amber-500 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                      }`}>
                        {msg.content}
                        
                        {/* 재해조사표 클립보드 복사 유틸 */}
                        {msg.isReport && (
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              showToast("재해조사표 초안이 클립보드에 복사되었습니다.", "success");
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-lg mt-3 flex items-center gap-1 transition-colors"
                          >
                            재해조사표 초안 복사하기
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isChatLoading && (
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="bg-white text-slate-500 border border-slate-200 p-3 rounded-2xl rounded-tl-none text-xs font-extrabold flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                        AI가 안전 조치 요령과 재해조사표를 기안 중입니다...
                      </div>
                    </div>
                  )}
                </div>

                {/* 입력 폼 */}
                <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-200 bg-white flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 border border-slate-350 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50"
                    placeholder="상황을 입력하세요. (예: 2공장에서 근로자가 사다리 작업 중 2m 높이에서 추락했습니다.)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    required
                  />
                  <button 
                    type="submit" 
                    className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    전송
                  </button>
                </form>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
