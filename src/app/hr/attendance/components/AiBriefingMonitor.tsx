import React from "react";
import { Sparkles, Maximize2, RefreshCw, Check, Copy } from "lucide-react";
import { BriefingHistory } from "../types";

// AI 공백 분석 예보 모니터 Props 정의
interface AiBriefingMonitorProps {
  aiBriefing: any;
  aiLoading: boolean;
  isHighPrivilege: boolean;
  currentUser: any;
  briefingHistories: BriefingHistory[];
  selectedHistoryId: string;
  handleSelectHistory: (historyId: string) => void;
  triggerAiBriefing: () => Promise<void>;
  handleCopyBriefing: () => void;
  copied: boolean;
  setIsBriefingZoomed: (zoomed: boolean) => void;
}

export const AiBriefingMonitor: React.FC<AiBriefingMonitorProps> = ({
  aiBriefing,
  aiLoading,
  isHighPrivilege,
  currentUser,
  briefingHistories,
  selectedHistoryId,
  handleSelectHistory,
  triggerAiBriefing,
  handleCopyBriefing,
  copied,
  setIsBriefingZoomed,
}) => {
  // 관리자 권한 여부 체크
  const hasPrivilege =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'PRESIDENT' ||
    isHighPrivilege;

  return (
    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm block relative overflow-hidden">
      {/* 럭셔리 네온 데코 */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -z-10"></div>

      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-650 animate-pulse" />
          <h3 className="text-xs font-black text-slate-800">실시간 AI 전사 업무 분석 예보</h3>
        </div>
        <button
          onClick={() => setIsBriefingZoomed(true)}
          className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-indigo-100 bg-transparent"
          title="크게 확대해서 보기"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {aiLoading ? (
        <div className="py-6 text-center animate-pulse flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
          <span className="text-[10px] text-slate-400 font-bold">인공지능 RAG SCM 시뮬레이션 가동 중...</span>
        </div>
      ) : (
        <div className="pt-3 space-y-4">
          {/* 리스크 스코어 서클 */}
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center rounded-full border bg-slate-50/50 border-slate-100">
              <span
                className={`text-base font-black font-mono ${
                  aiBriefing.riskScore > 60
                    ? 'text-rose-600'
                    : aiBriefing.riskScore > 30
                    ? 'text-amber-600'
                    : 'text-emerald-650'
                }`}
              >
                {aiBriefing.riskScore}
              </span>
              <span className="absolute bottom-1 text-[6.5px] font-bold text-slate-400 uppercase tracking-widest">
                Risk %
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[11px] font-black text-slate-800 leading-tight">
                {aiBriefing.alertTitle}
              </h4>
              <p className="text-[9.5px] text-slate-400 font-semibold leading-normal mt-0.5">
                {aiBriefing.alertMessage}
              </p>
            </div>
          </div>

          {/* AI 마스터 종합 권고안 본문 */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 text-[10px] font-medium leading-relaxed text-slate-650">
            <div className="flex items-center justify-between mb-1.5 border-b border-indigo-50/50 pb-1">
              <span className="font-extrabold text-[10.5px] text-indigo-750">💡 AI 마스터 종합 권고안</span>
              <button
                type="button"
                onClick={handleCopyBriefing}
                className="text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer flex items-center justify-center p-0.5 bg-transparent border-0"
                title="클립보드로 복사"
              >
                {copied ? (
                  <Check size={11} className="text-emerald-500 animate-pulse" />
                ) : (
                  <Copy size={11} />
                )}
              </button>
            </div>
            <div className="whitespace-pre-wrap">{aiBriefing.briefingText}</div>
          </div>

          {/* 과거 이력 드롭다운 */}
          {hasPrivilege && (
            <div className="space-y-1 block">
              <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                <span>History Vault</span>
                <span>과거 아카이브</span>
              </div>
              <select
                value={selectedHistoryId}
                onChange={(e) => handleSelectHistory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-[10px] font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all shadow-3xs"
              >
                <option value="">✨ 실시간 분석 모드로 복귀...</option>
                {briefingHistories.map((hist) => (
                  <option key={hist.id} value={hist.id}>
                    📜 [{hist.target_year_month}] {hist.alert_title.slice(0, 15)}... (Risk: {hist.risk_score}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 실시간 AI 재분석 버튼 */}
          <button
            onClick={triggerAiBriefing}
            className="w-full py-1.5 border border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-650 rounded-xl text-[9px] font-extrabold flex items-center justify-center gap-1 bg-white cursor-pointer transition-all shadow-3xs"
            disabled={aiLoading}
          >
            <RefreshCw size={10} className={aiLoading ? "animate-spin" : ""} />
            실시간 AI 재분석
          </button>
        </div>
      )}
    </div>
  );
};
