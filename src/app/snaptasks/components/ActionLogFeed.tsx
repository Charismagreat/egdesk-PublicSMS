import React from "react";
import { Sparkles } from "lucide-react";
import { ActionLog } from "../types";

interface ActionLogFeedProps {
  detailLoading: boolean;
  actions: ActionLog[];
}

export function ActionLogFeed({ detailLoading, actions }: ActionLogFeedProps) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col overflow-hidden flex-1 max-h-[55%]">
      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block mb-3 flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" style={{ animationDuration: "3s" }} />
        AI 자율 ERP 실행 감사록
      </h4>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {detailLoading ? (
          <p className="text-center py-10 text-xs text-slate-400">자율 액션 마이닝 중...</p>
        ) : actions.length === 0 ? (
          <p className="text-center py-10 text-xs text-slate-450 font-bold leading-relaxed">
            아직 AI 자율 실행 내역이 존재하지 않습니다.
            <br />
            현장 모바일 웹에서 미팅록, 명함, 서명을 스냅하여 연동해 주세요.
          </p>
        ) : (
          actions.map((act) => (
            <div
              key={act.id}
              className="p-3 bg-white border border-indigo-500/10 rounded-xl flex flex-col space-y-1 font-semibold text-xs animate-scale-up shadow-sm"
            >
              <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded w-max">
                {act.action_type}
              </span>
              <p className="text-slate-800 leading-normal pl-0.5">{act.description}</p>
              <span className="text-[8px] text-slate-400 font-mono block pl-0.5">{act.created_at}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
