"use client";

import React from "react";
import { 
  Bot, Plus, ToggleLeft, ToggleRight, Trash2, Cpu 
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
  return (
    <div className="space-y-4">
      {/* 서브 헤더 컨트롤바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>최고관리자 정의 AI 자율 통제 규칙 대장</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            특정 수치나 조건 충족 시 수동 결재 없이 AI가 자율적으로 승인 및 후속 처리를 대행할 조건을 정의합니다.
          </p>
        </div>
        <button
          onClick={() => setShowRuleModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>신규 자율 규칙 자연어 정의</span>
        </button>
      </div>

      {/* 자연어 규칙 등록 팝업 모달 */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-left animate-scale-in">
            <h3 className="text-base font-black text-slate-800">🤖 AI 자율 결재/대행 규칙 정의</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">규칙 이름</label>
                <input
                  type="text"
                  placeholder="예: 50만원 이하 소액 발주서 자동 승인"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">자율 대행 조건 (자연어 지침)</label>
                <textarea
                  rows={4}
                  placeholder="예: total_amount <= 500000 이고 doc_type이 purchase_order인 경우 수동 결재 없이 자율 대행 승인 처리함."
                  value={newRuleExpr}
                  onChange={(e) => setNewRuleExpr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-medium leading-relaxed"
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs border-none cursor-pointer"
              >
                규칙 수록 및 활성화
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
          <p className="text-xs text-slate-400">상단 버튼을 눌러 소액 결재 자동 승인 등 자율 대행 지침을 등록해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {autoRules.map((rule) => (
            <div key={rule.id} className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 text-left">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 text-sm">{rule.rule_name}</span>
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    className="border-none bg-transparent cursor-pointer"
                  >
                    {rule.is_active ? (
                      <ToggleRight className="w-7 h-7 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-300" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                  {rule.rule_expression}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                <span>등록자: {rule.created_by || '최고관리자'}</span>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-rose-500 hover:text-rose-700 font-bold border-none bg-transparent cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>규칙 삭제</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
