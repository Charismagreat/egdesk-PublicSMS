"use client";

import React, { useState } from "react";
import { apiFetch } from "@/lib/api";
import { 
  Zap, Sparkles, Loader2, CheckCircle2, User, Calendar, 
  ArrowRight, Bot, Cpu, ChevronDown, ChevronUp, AlertCircle 
} from "lucide-react";

interface SubTaskPlan {
  task_title: string;
  task_description: string;
  executor_type: 'AI' | 'STAFF';
  assignee_id?: string | null;
  due_date?: string;
}

interface TopDownCommandCenterProps {
  operators: any[];
  onCommandExecuted?: () => void;
}

export default function TopDownCommandCenter({ operators, onCommandExecuted }: TopDownCommandCenterProps) {
  const [commandText, setCommandText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<SubTaskPlan[] | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 자연어 지시 AI 분석 및 계획 수립
  const handleParseCommand = async () => {
    if (!commandText || !commandText.trim()) {
      alert("AI에 하향식(Top-down) 자율 집행을 요청할 대표자 지시사항을 입력해 주세요.");
      return;
    }

    setIsParsing(true);
    setParsedTasks(null);
    setStatusMessage(null);

    try {
      const res = await apiFetch("/api/governance?action=parse_command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command_text: commandText })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subtasks)) {
        setParsedTasks(data.subtasks);
      } else {
        alert("❌ 지시 분석 실패: " + (data.error || "분석을 완료하지 못했습니다."));
      }
    } catch (e: any) {
      console.error("handleParseCommand error:", e);
      alert("❌ 지시 분석 중 서버 통신 오류가 발생했습니다.");
    } finally {
      setIsParsing(false);
    }
  };

  // 수립된 자율 계획 최종 실행 기동
  const handleExecuteCommand = async () => {
    if (!parsedTasks || parsedTasks.length === 0) return;

    setIsExecuting(true);
    try {
      const res = await apiFetch("/api/governance?action=execute_command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_command: commandText,
          subtasks: parsedTasks
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage("✅ " + (data.message || "대표자 지시사항이 성공적으로 자율 실행되어 담당자에게 업무가 배정되었습니다."));
        setParsedTasks(null);
        setCommandText("");
        if (onCommandExecuted) onCommandExecuted();
      } else {
        alert("❌ 실행 기동 실패: " + data.error);
      }
    } catch (e: any) {
      console.error("handleExecuteCommand error:", e);
      alert("❌ 실행 기동 중 통신 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-indigo-500/30 space-y-4 text-left relative overflow-hidden">
      {/* 백그라운드 오로라 그래디언트 효과 */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* 헤더 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-xs">
            <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>대표자 AI 자율 명령 센터 (Top-down Command)</span>
              <span className="text-[9px] bg-indigo-500/30 text-indigo-200 font-extrabold px-2 py-0.5 rounded-full border border-indigo-400/30 uppercase">
                Zero-Touch Autopilot
              </span>
            </h2>
            <p className="text-xs text-indigo-200/80 font-medium">
              대표자가 러프하게 업무를 자연어로 지시하면 AI가 자율 분해 및 세부 조치 배정을 자동 실행합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-white/10 rounded-xl text-indigo-300 transition-colors border-none bg-transparent cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1">
          {/* 지시어 입력 양식 */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <input
                type="text"
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isParsing && !isExecuting) handleParseCommand();
                }}
                placeholder='예: "SCM 자재 현황을 분석하여 부족 품목 발주 기안을 AI가 작성하고, 이과장에게 다음주 화요일까지 납품 일정을 확인 및 조율하게 시켜줘."'
                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-indigo-200/50 border border-indigo-400/30 rounded-2xl px-4 py-3.5 text-xs font-semibold outline-none focus:border-indigo-400 transition-all shadow-inner"
              />
            </div>
            <button
              type="button"
              onClick={handleParseCommand}
              disabled={isParsing || !commandText.trim()}
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-indigo-500/30 whitespace-nowrap active:scale-95 flex items-center justify-center gap-2 border border-indigo-400/30"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 분석 및 실행 계획 수립 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse text-yellow-300" />
                  <span>AI 분석 및 계획 수립</span>
                </>
              )}
            </button>
          </div>

          {/* 성공 처리 메시지 */}
          {statusMessage && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* 수립된 AI 자율 실행 계획 프리뷰 뷰 */}
          {parsedTasks && parsedTasks.length > 0 && (
            <div className="bg-slate-950/80 border border-indigo-400/40 rounded-2xl p-5 space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>AI 분해 수립 계획안 (총 {parsedTasks.length}개 Subtask)</span>
                </div>
                <span className="text-[10px] text-purple-300 bg-purple-900/60 font-bold px-2 py-0.5 rounded-md border border-purple-400/30">
                  실행 전 항목 검토 가능
                </span>
              </div>

              <div className="space-y-3">
                {parsedTasks.map((st, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white">{st.task_title}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        st.executor_type === 'AI' 
                          ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40' 
                          : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                      }`}>
                        {st.executor_type === 'AI' ? '🤖 AI 자율 대행' : '👤 담당자 실무'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed bg-black/20 p-2.5 rounded-lg">
                      {st.task_description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-indigo-200/70 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-indigo-400" />
                        <span>배정자: {st.assignee_id ? (operators.find(o => String(o.id) === String(st.assignee_id))?.name || st.assignee_id) : 'AI 자율 대행'}</span>
                      </span>
                      {st.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span>마감일: {st.due_date}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setParsedTasks(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCommand}
                  disabled={isExecuting}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/30 border-none flex items-center gap-1.5"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>자율 실행 기동 중...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>대표자 지시 자율 실행 기동 ⚡</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
