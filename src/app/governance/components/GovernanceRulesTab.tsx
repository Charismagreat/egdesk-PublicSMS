"use client";

import React, { useState } from "react";
import { 
  Bot, Plus, ToggleLeft, ToggleRight, Trash2, Cpu, Sparkles, CheckCircle2, Zap, AlertTriangle, ShieldCheck, SearchCheck, Loader2
} from "lucide-react";

interface GovernanceRulesTabProps {
  autoRules: any[];
  showRuleModal: boolean;
  setShowRuleModal: (val: boolean) => void;
  newRuleName: string;
  setNewRuleName: (val: string) => void;
  newRuleExpr: string;
  setNewRuleExpr: (val: string) => void;
  handleCreateRule: () => void;
  handleToggleRule: (id: string, currentActive: boolean) => void;
  handleDeleteRule: (id: string) => void;
}

export default function GovernanceRulesTab({
  autoRules,
  showRuleModal,
  setShowRuleModal,
  newRuleName,
  setNewRuleName,
  newRuleExpr,
  setNewRuleExpr,
  handleCreateRule,
  handleToggleRule,
  handleDeleteRule,
}: GovernanceRulesTabProps) {
  const modalAutoRulesCount = autoRules.filter((r) => r.rule_name?.includes("[자율 대행]") || r.rule_name?.includes("자동")).length;

  // 🔍 AI 자율 규칙 상호 충돌 및 모순 진단 상태
  const [conflictReport, setConflictReport] = useState<{
    hasConflict: boolean;
    conflicts: {
      ruleA: any;
      ruleB: any;
      type: string;
      reason: string;
    }[];
    scannedCount: number;
  } | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleRunConflictAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const activeRules = autoRules.filter((r) => r.is_active !== false);
      const conflicts: any[] = [];

      for (let i = 0; i < activeRules.length; i++) {
        for (let j = i + 1; j < activeRules.length; j++) {
          const a = activeRules[i];
          const b = activeRules[j];

          const textA = (a.rule_name + " " + a.rule_expression).toLowerCase();
          const textB = (b.rule_name + " " + b.rule_expression).toLowerCase();

          const types = [
            { key: "rag_hold", label: "RAG 결재 보류 / 모바일 상신" },
            { key: "mobile_request", label: "모바일 현장 상신" },
            { key: "store_order", label: "온라인 스토어 주문" },
            { key: "leave_approval_request", label: "휴가/연차 결재" }
          ];

          for (const t of types) {
            if (textA.includes(t.key) && textB.includes(t.key)) {
              if ((textA.includes("승인") && textB.includes("기각")) || (textA.includes("승인") && textB.includes("반려"))) {
                conflicts.push({
                  ruleA: a,
                  ruleB: b,
                  type: "실행 결과 모순 (승인 vs 기각)",
                  reason: `'${a.rule_name}' 규칙은 자율 승인하며, '${b.rule_name}' 규칙은 기각/반려를 지정하여 충돌합니다.`
                });
              } else {
                conflicts.push({
                  ruleA: a,
                  ruleB: b,
                  type: `동일 업무 대상 중복 지정 (${t.label})`,
                  reason: `두 규칙 모두 [${t.label}] 업무를 타깃으로 자동 승인 조건을 중복 수록하여 적용 순서 모호성이 존재합니다.`
                });
              }
            }
          }
        }
      }

      setConflictReport({
        hasConflict: conflicts.length > 0,
        conflicts,
        scannedCount: activeRules.length
      });
      setIsAuditing(false);
    }, 400);
  };

  const handleApplyTemplate = (title: string, expr: string) => {
    setNewRuleName(title);
    setNewRuleExpr(expr);
  };

  return (
    <div className="space-y-4 text-left">
      {/* 서브 헤더 컨트롤바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Bot className="w-4.5 h-4.5 text-indigo-600" />
              <span>최고관리자 정의 AI 자율 통제 및 자동 승인 규칙 대장</span>
            </h3>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
              총 {autoRules.length}건 수록 중 (모달 연동 {modalAutoRulesCount}건)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            AI 관제 원장 모달에서 스위치로 생성된 업무 자율 규칙 및 수동 정의 조건들이 통합 관리됩니다. 스위치를 켜면 수동 승인 없이 AI가 즉시 자동 처리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRunConflictAudit}
            disabled={isAuditing || autoRules.length === 0}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 font-bold px-3.5 py-2.5 rounded-2xl text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs"
            title="등록된 AI 자율 규칙 간 조건 오버랩 및 결과 모순 자율 진단"
          >
            {isAuditing ? (
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
            ) : (
              <SearchCheck className="w-4 h-4 text-amber-600" />
            )}
            <span>AI 규칙 상호 충돌 자율 진단 🔍</span>
          </button>

          <button
            onClick={() => setShowRuleModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>신규 자율 규칙 자연어 정의</span>
          </button>
        </div>
      </div>

      {/* 자연어 규칙 등록 팝업 모달 */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>AI 자율 결재 / 자동 승인 규칙 정의</span>
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs">
              {/* ⚡ 대표 자율 대행 템플릿 퀵 선택 */}
              <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-2xl space-y-1.5">
                <span className="text-[10px] font-black text-indigo-900 block">⚡ 대표 자율 대행 패턴 템플릿 (클릭 시 자동 작성)</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("[자율 대행] 모바일 현장 상신 요청 자동 승인", "이벤트 유형 'RAG_HOLD' 및 doc_type이 'mobile_request'인 경우 수동 검토 없이 AI가 자율 승인 처리함.")}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-bold border border-indigo-200 cursor-pointer transition-all"
                  >
                    📱 모바일 현장 상신 자동 승인
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("[자율 대행] 온라인 스토어 주문 자동 결재", "이벤트 유형 'STORE_ORDER' 발생 시 결재 금액 1,000,000원 이하 건은 AI 자율 자동 승인함.")}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-bold border border-indigo-200 cursor-pointer transition-all"
                  >
                    🛒 스토어 주문 자동 결재
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("[자율 대행] 연차/휴가 결재 신청 자동 승인", "이벤트 유형 'LEAVE_APPROVAL_REQUEST' 발생 시 소요 일수 1일 이하 건은 자율 승인 처리함.")}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-bold border border-indigo-200 cursor-pointer transition-all"
                  >
                    🌴 휴가/연차 자동 승인
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">규칙 이름</label>
                <input
                  type="text"
                  placeholder="예: [자율 대행] 소액 발주서 자동 승인 규칙"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">자율 대행 조건 (자연어 지침)</label>
                <textarea
                  rows={4}
                  placeholder="예: total_amount <= 500000 이고 doc_type이 purchase_order인 경우 수동 결재 없이 자율 대행 승인 처리함."
                  value={newRuleExpr}
                  onChange={(e) => setNewRuleExpr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium leading-relaxed text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowRuleModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs border-none cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleCreateRule}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs border-none cursor-pointer shadow-xs"
              >
                규칙 수록 및 자율 승인 활성화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 규칙 리스트 */}
      {autoRules.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2 shadow-sm">
          <Cpu className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-600">등록된 AI 자율 통제 규칙이 없습니다.</h3>
          <p className="text-xs text-slate-400">관제 원장 모달에서 스위치를 켜거나 상단 버튼을 눌러 자율 승인 규칙을 수록해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {autoRules.map((rule) => {
            const isModalRule = rule.rule_name?.includes("[자율 대행]") || rule.rule_name?.includes("원장");
            return (
              <div key={rule.id} className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 text-left hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isModalRule && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-black flex items-center gap-1">
                            <Zap className="w-3 h-3 text-indigo-600" />
                            <span>원장 모달 승인 연동</span>
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${rule.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                          {rule.is_active ? '🟢 자율 승인 가동 중' : '⚪ 중지됨'}
                        </span>
                      </div>
                      <span className="font-black text-slate-850 text-sm block leading-snug pt-0.5">{rule.rule_name}</span>
                    </div>
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      className="border-none bg-transparent cursor-pointer shrink-0"
                      title={rule.is_active ? "자율 승인 중지" : "자율 승인 가동"}
                    >
                      {rule.is_active ? (
                        <ToggleRight className="w-8 h-8 text-indigo-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold mt-2.5 bg-slate-50/90 p-3 rounded-2xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                    {rule.rule_expression}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                  <span className="font-medium">등록자: {rule.created_by || '최고관리자'}</span>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-rose-500 hover:text-rose-700 font-bold border-none bg-transparent cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>규칙 삭제</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* 🔍 AI 자율 규칙 충돌 & 모순 진단 결과 모달 */}
      {conflictReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {conflictReport.hasConflict ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <h3 className="text-base font-black text-slate-850">
                  {conflictReport.hasConflict ? "⚠️ AI 자율 규칙 상호 충돌 감지 리포트" : "🟢 AI 자율 규칙 정상 진단 완료"}
                </h3>
              </div>
              <button
                onClick={() => setConflictReport(null)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-slate-600 font-medium">
                <span>진단 대상 활성 자율 규칙:</span>
                <strong className="text-indigo-700 font-black">{conflictReport.scannedCount}건 검체 스캔</strong>
              </div>

              {conflictReport.hasConflict ? (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  <span className="text-[11px] font-black text-rose-700 block">
                    🚨 상호 조건 오버랩 및 모순이 발견된 규칙 ({conflictReport.conflicts.length}건)
                  </span>
                  {conflictReport.conflicts.map((c, idx) => (
                    <div key={idx} className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px]">
                          {c.type}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-rose-950 leading-relaxed">
                        {c.reason}
                      </p>
                      <div className="bg-white p-2.5 rounded-xl border border-rose-200/60 space-y-1 text-[11px] text-slate-700">
                        <div>
                          <strong className="text-slate-500">규칙 A:</strong> {c.ruleA.rule_name}
                        </div>
                        <div>
                          <strong className="text-slate-500">규칙 B:</strong> {c.ruleB.rule_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-extrabold text-emerald-950 text-xs">규칙 간 상호 충돌이나 모순이 존재하지 않습니다!</h4>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    현재 등록된 모든 AI 자율 승인 규칙이 명확한 조건 분개로 안심하고 가동할 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConflictReport(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                진단 확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
