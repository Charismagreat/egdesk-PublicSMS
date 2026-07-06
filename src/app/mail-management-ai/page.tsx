"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useCallback } from "react";
import { 
  Mail, Activity, Clock, Sparkles, AlertTriangle, 
  CheckCircle2, RefreshCw, Sliders, ChevronRight,
  TrendingUp, Bell, ShieldAlert, BarChart3, Inbox, FileText, Wrench
} from "lucide-react";

interface MailLog {
  id: string;
  sender: string;
  subject: string;
  received_at: string;
  ai_summary: string;
  intent: 'ORDER_REQUEST' | 'ESTIMATE_REQUEST' | 'COMPLAINT' | 'REPORT' | 'SPAM';
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  action_type: 'CREATE_TASK' | 'CREATE_ESTIMATE' | 'NONE';
  action_result: string;
  created_at: string;
}

interface StatPurpose {
  purpose: string;
  calls: number;
  tokens: number;
}

export default function MailManagementAIPage() {
  const [logs, setLogs] = useState<MailLog[]>([]);
  const [stats, setStats] = useState<any>({ api_calls: 0, high_risk: 0, medium_risk: 0, low_risk: 0 });
  const [purposes, setPurposes] = useState<StatPurpose[]>([]);
  
  const [interval, setIntervalVal] = useState<string>("5");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 1. 관제 로그 및 설정 조회 (GET)
  const fetchMailData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/mail-management");
      const data = await res.json();
      if (data.success) {
        setLogs(data.recentLogs || []);
        setStats(data.summary || { api_calls: 0, high_risk: 0, medium_risk: 0, low_risk: 0 });
        setPurposes(data.purposes || []);
        if (data.settings) {
          setIntervalVal(data.settings.interval);
          setEnabled(data.settings.enabled);
        }
      } else {
        showToast(data.error || "관제 데이터를 불러오는 데 실패했습니다.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "서버 통신 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchMailData();
  }, [fetchMailData]);

  // 2. 설정 저장 (POST)
  const handleSaveSettings = async (newInterval: string, newEnabled: boolean) => {
    try {
      const res = await apiFetch("/api/mail-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          interval: newInterval,
          enabled: newEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "관제 설정이 저장되었습니다.", "success");
      } else {
        showToast(data.error || "설정 저장 실패", "error");
      }
    } catch (e: any) {
      showToast(e.message || "통신 오류", "error");
    }
  };

  // 3. 자율 수집 및 AI 관제 수동 트리거 (POST)
  const handleTriggerCollection = async () => {
    if (isTriggering) return;
    setIsTriggering(true);
    try {
      const res = await apiFetch("/api/mail-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_collection" })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        await fetchMailData();
      } else {
        showToast(data.error || "실시간 관제 구동 실패", "error");
      }
    } catch (e: any) {
      showToast(e.message || "통신 오류", "error");
    } finally {
      setIsTriggering(false);
    }
  };

  // 의도 분류별 한국어 뱃지 및 디자인 맵핑
  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case 'ORDER_REQUEST':
        return { text: "자재 발주 요청", style: "bg-blue-500/15 text-blue-400 border border-blue-500/20" };
      case 'ESTIMATE_REQUEST':
        return { text: "견적 확인 요청", style: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" };
      case 'COMPLAINT':
        return { text: "품질 클레임", style: "bg-rose-500/15 text-rose-400 border border-rose-500/20" };
      case 'REPORT':
        return { text: "일반 업무 보고", style: "bg-slate-500/15 text-slate-400 border border-slate-500/20" };
      case 'SPAM':
        return { text: "스팸 필터링", style: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" };
      default:
        return { text: "미분류", style: "bg-slate-500/10 text-slate-300 border border-slate-500/20" };
    }
  };

  // 리스크 레벨 뱃지 맵핑
  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return { text: "위험 HIGH", style: "bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black animate-pulse" };
      case 'MEDIUM':
        return { text: "주의 MEDIUM", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold" };
      default:
        return { text: "안전 LOW", style: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
    }
  };

  // 수동 주기를 변경할 때
  const onIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setIntervalVal(val);
    handleSaveSettings(val, enabled);
  };

  // 실시간 관제 스위치 변경할 때
  const toggleEnabled = () => {
    const nextVal = !enabled;
    setEnabled(nextVal);
    handleSaveSettings(interval, nextVal);
  };

  // 전사 AI 일일 요약문 생성 (간단히 최신 중요 내역 조합)
  const getDailyBriefing = () => {
    if (logs.length === 0) {
      return "현재 관제 데이터베이스가 비어 있습니다. 우측 상단의 '실시간 관제 돌리기' 버튼을 클릭해 관제 시나리오 이메일을 수집하고 자율 업무 연동을 수행해 보세요!";
    }
    
    const highRisk = logs.filter(l => l.risk_level === 'HIGH');
    const orders = logs.filter(l => l.intent === 'ORDER_REQUEST');
    
    let summaryText = `오늘 수신된 총 ${logs.length}건의 전사 비즈니스 메일 중, AI 에이전트가 집중 관제한 분석 결과입니다. `;
    if (highRisk.length > 0) {
      summaryText += `🚨긴급 조치가 필요한 High 리스크 메일이 ${highRisk.length}건 포착되었습니다. `;
    }
    if (orders.length > 0) {
      summaryText += `📝자재/제품 발주 요청 메일이 ${orders.length}건 감지되어 이지데스크 견적/발주서 관리 대장에 자율 등록 완료되었습니다. `;
    }
    summaryText += "관련 상세 내역과 시스템 연동 결과는 하단 관제 타임라인을 참고하시기 바랍니다.";
    
    return summaryText;
  };

  return (
    <div className="w-full space-y-6 pb-20 min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="메일 관리 AI: 하이웍스 등 전사 이메일을 실시간 수집 및 관제하며 리스크를 분석해 자동 협업 액션을 연동합니다.">
      
      {/* 토스트 메시지 */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl transition-all duration-350 border ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-xs font-bold font-sans">{toast.message}</span>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center tracking-tight">
            <Mail className="w-8 h-8 text-cyan-500 mr-3" />
            메일 관리 AI
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            하이웍스 수신 메일을 지능형 에이전트가 실시간 관제하여 내용 요약, 리스크 측정, 내부 업무를 자율 처리합니다.
          </p>
        </div>

        {/* 제어 패널 */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-black text-slate-500">수집 주기:</span>
            </div>
            <select 
              value={interval} 
              onChange={onIntervalChange}
              disabled={isLoading}
              className="bg-transparent text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="1">1분 단위</option>
              <option value="5">5분 단위</option>
              <option value="10">10분 단위</option>
              <option value="30">30분 단위</option>
              <option value="60">1시간 단위</option>
            </select>
          </div>

          <button
            onClick={toggleEnabled}
            disabled={isLoading}
            className={`px-4 py-2.5 rounded-2xl text-[10px] font-black border transition-all flex items-center gap-1.5 ${
              enabled 
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-600"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${enabled ? "animate-pulse" : ""}`} />
            {enabled ? "실시간 관제 중" : "관제 정지됨"}
          </button>

          <button
            onClick={handleTriggerCollection}
            disabled={isTriggering || isLoading}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black shadow-md transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? "animate-spin" : ""}`} />
            {isTriggering ? "관제 동기화 중..." : "실시간 관제 돌리기"}
          </button>
        </div>
      </div>

      {/* 실시간 요약 카드리뷰 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* 브리핑 통계 4종 */}
        <div className="bg-white border rounded-3xl p-4 flex items-center gap-4 text-left shadow-xs">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
            <Activity className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 block">오늘 총 관제 메일</span>
            <span className="text-xl font-black font-mono">{stats.api_calls} <span className="text-xs font-bold">건</span></span>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-4 flex items-center gap-4 text-left shadow-xs">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 block">High 리스크 건수</span>
            <span className="text-xl font-black font-mono text-rose-600">{stats.high_risk} <span className="text-xs font-bold text-slate-450">건</span></span>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-4 flex items-center gap-4 text-left shadow-xs">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 block">Medium 리스크 건수</span>
            <span className="text-xl font-black font-mono text-amber-600">{stats.medium_risk} <span className="text-xs font-bold text-slate-450">건</span></span>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-4 flex items-center gap-4 text-left shadow-xs">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 block">Low 리스크 건수</span>
            <span className="text-xl font-black font-mono text-emerald-600">{stats.low_risk} <span className="text-xs font-bold text-slate-450">건</span></span>
          </div>
        </div>

      </div>

      {/* AI 브리핑 요약 뷰 */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 text-left space-y-3 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
          <Sparkles className="w-40 h-40 text-cyan-300" />
        </div>
        
        <div className="flex items-center gap-2 z-10 relative">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xs font-black text-white tracking-wide uppercase">AI 실시간 전사 메일 브리핑 요약</h2>
          <span className="text-[8px] font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 rounded-md">실시간 연동</span>
        </div>
        
        <p className="text-[11px] leading-relaxed font-bold text-slate-300 z-10 relative font-sans whitespace-pre-line">
          {getDailyBriefing()}
        </p>
      </div>

      {/* 메인 관제 콘텐츠 레이아웃 (그리드 2단) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측 2단: 실시간 관제 타임라인 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Inbox className="w-4.5 h-4.5 text-slate-500" />
              실시간 AI 관제 수신 타임라인
            </span>
            <span className="text-[10px] font-bold text-slate-400">최근 30건 기준</span>
          </div>

          {isLoading ? (
            <div className="bg-white border rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
              <p className="text-xs font-bold text-slate-450">메일 실시간 관제 로그를 로딩하고 있습니다...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white border rounded-3xl p-14 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
              <div className="p-4 bg-slate-50 rounded-full text-slate-400 border border-slate-100">
                <Mail className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-700">기록된 메일 관제 이력이 없습니다.</h4>
                <p className="text-[10px] text-slate-400 font-bold max-w-sm">우측 상단의 "실시간 관제 돌리기" 버튼을 눌러 데모 시나리오 메일을 자율 수집 및 AI 의도 분류를 기동해 보세요!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const intentInfo = getIntentBadge(log.intent);
                const riskInfo = getRiskBadge(log.risk_level);
                
                return (
                  <div 
                    key={log.id} 
                    className={`bg-white border rounded-3xl p-5 text-left space-y-4 transition-all shadow-xs hover:shadow-md ${
                      log.risk_level === 'HIGH' ? "border-rose-100 hover:border-rose-200" : "border-slate-200"
                    }`}
                  >
                    
                    {/* 상단 뱃지라인 및 수신 시간 */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${intentInfo.style}`}>
                          {intentInfo.text}
                        </span>
                        <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${riskInfo.style}`}>
                          {riskInfo.text}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        수신: {log.received_at}
                      </span>
                    </div>

                    {/* 메일 기본 내용 */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-black text-slate-800 tracking-tight leading-snug">
                        {log.subject}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400">
                        발신: <span className="text-slate-600">{log.sender}</span>
                      </p>
                    </div>

                    {/* AI 요약 */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] leading-relaxed font-bold text-slate-600">
                      <span className="text-[8.5px] text-cyan-600 font-black block mb-1">💡 AI 실시간 요약</span>
                      {log.ai_summary}
                    </div>

                    {/* 비즈니스 연동 액션 결과 */}
                    {log.action_type !== 'NONE' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-cyan-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                          <span>AI 자율 조치: {log.action_result}</span>
                        </div>
                        
                        {/* 연동 대상 바로가기 버튼 */}
                        {log.action_type === 'CREATE_ESTIMATE' ? (
                          <a 
                            href="/estimates" 
                            className="flex items-center justify-center gap-0.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[8.5px] font-black rounded-xl self-end sm:self-center transition-all"
                          >
                            <FileText className="w-3 h-3 text-white" />
                            발주 대장 확인
                            <ChevronRight className="w-3 h-3 text-white" />
                          </a>
                        ) : log.action_type === 'CREATE_TASK' ? (
                          <a 
                            href="/snaptasks" 
                            className="flex items-center justify-center gap-0.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[8.5px] font-black rounded-xl self-end sm:self-center transition-all"
                          >
                            <Wrench className="w-3 h-3 text-white" />
                            스냅태스크 확인
                            <ChevronRight className="w-3 h-3 text-white" />
                          </a>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 우측 1단: 통계 및 관제 설정 */}
        <div className="space-y-6">
          
          {/* 분류 통계 카드 */}
          <div className="bg-white border rounded-3xl p-5 text-left space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <BarChart3 className="w-4.5 h-4.5 text-slate-500" />
              <h3 className="text-xs font-black text-slate-800">관제 메일 목적별 분류 비율</h3>
            </div>

            {purposes.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold text-center py-5">기록된 실시간 분석이 없습니다.</p>
            ) : (
              <div className="space-y-3 pt-1">
                {purposes.map((p) => {
                  const intentDetail = getIntentBadge(p.purpose);
                  const totalCalls = purposes.reduce((acc, curr) => acc + curr.calls, 0);
                  const percent = totalCalls > 0 ? Math.round((p.calls / totalCalls) * 100) : 0;
                  
                  return (
                    <div key={p.purpose} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-700">{intentDetail.text}</span>
                        <span className="text-slate-450 font-mono">{p.calls}건 ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 메일 수집 관제 설정 카드 */}
          <div className="bg-white border rounded-3xl p-5 text-left space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sliders className="w-4.5 h-4.5 text-slate-500" />
              <h3 className="text-xs font-black text-slate-800">이메일 연동 보안 설정</h3>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-slate-500 block">수집 연동 메일 서비스</span>
                <span className="text-[10px] font-black text-slate-800 block bg-slate-100 px-3 py-2 rounded-xl">
                  하이웍스(Hiworks) SaaS 메일 연동
                </span>
              </div>

              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-bold text-slate-500 block">관제 대상 공용 이메일</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-[9.5px]">
                    <span className="font-bold text-slate-650">sales@j-jintl.com (공용)</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">활성화</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-[9.5px]">
                    <span className="font-bold text-slate-650">contact@j-jintl.com (공용)</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">활성화</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-[9.5px] opacity-50">
                    <span className="font-bold text-slate-650">personal@j-jintl.com (개인)</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded">제외됨</span>
                  </div>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/15 rounded-2xl p-4 text-[9.5px] leading-relaxed font-bold text-cyan-700 flex gap-2">
                <Bell className="w-5 h-5 text-cyan-600 shrink-0" />
                <span>스케줄러 주기가 완료되면 AI가 수신 받은 편지함을 크롤링하여 관제 타임라인에 즉각적으로 누적하고 비즈니스 액션을 트리거합니다.</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
