import React from "react";
import { X, Cpu, CheckCircle2, Lock, AlertCircle } from "lucide-react";

interface AutopilotModalProps {
  showAutopilotModal: boolean;
  setShowAutopilotModal: (val: boolean) => void;
  autopilotResult: any;
  autopilotAnimScore: number;
  setAutopilotAnimScore: (val: number) => void;
}

export function AutopilotModal({
  showAutopilotModal,
  setShowAutopilotModal,
  autopilotResult,
  autopilotAnimScore,
  setAutopilotAnimScore,
}: AutopilotModalProps) {
  if (!showAutopilotModal || !autopilotResult) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in select-none">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-sm w-full shadow-xl relative">
        <button
          onClick={() => {
            setShowAutopilotModal(false);
            setAutopilotAnimScore(0);
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-800"
          id="btn-close-autopilot"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Cpu className="w-8 h-8 animate-pulse text-emerald-500" />
          </div>
          <h3 className="text-md font-bold text-slate-800">AI Autopilot 자동 결재 분석</h3>
          <p className="text-xs text-slate-400 mt-1">상신 문서를 정밀 채점하여 전결 적합도를 계산합니다.</p>
        </div>

        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">결재 적합성 점수:</span>
            <span className={`font-bold ${autopilotAnimScore >= 95.0 ? "text-emerald-600" : "text-amber-600"}`}>
              {autopilotAnimScore.toFixed(1)}점
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden border border-slate-300 relative">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                autopilotAnimScore >= 95.0 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-amber-500 to-yellow-400"
              }`}
              style={{ width: `${autopilotAnimScore}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-400 font-mono text-center">
            * 95.0점 이상 획득 시 AI 자동 무인 전결 자격 부여
          </div>
        </div>

        <div className="mt-4 text-xs font-mono leading-relaxed space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          {autopilotResult.status === "APPROVED_AUTO" ? (
            <>
              <div className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> AI 자동 파일럿 전결 승인 완료!
              </div>
              <p className="text-slate-500 text-[11px] font-sans">
                소액 품의 금액 기준 만족 및 서식 일치성 98.7%로 전결 요건을 완수하여 즉시 최종 승인되었습니다.
              </p>
              <div className="text-[10px] bg-rose-50 text-rose-600 p-2.5 rounded border border-rose-200 font-semibold font-sans mt-2 flex items-start gap-1.5">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  [보안 잠금 고지] 승인이 완료된 후에도 제로 트러스트 보안 규정에 따라 <strong>A등급 최고 기밀</strong>로
                  강제 잠금 적재되었습니다. 최고관리자 등급 심사를 거치십시오.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-amber-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 리스크 감지: 수동 결재선 이송
              </div>
              <p className="text-slate-500 text-[11px] font-sans">
                해당 자산은 대외비 등급이거나 고액 기안, 혹은 비정형 오디오로 판별되어 AI 파일럿 승인 대상에서 제외되었습니다.
                추천 부서장 수동 결재선으로 안전하게 이송되었습니다. (최초 A등급 격리)
              </p>
            </>
          )}
        </div>

        <button
          onClick={() => {
            setShowAutopilotModal(false);
            setAutopilotAnimScore(0);
          }}
          className="w-full mt-5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-98"
          id="btn-close-autopilot-confirm"
          type="button"
        >
          닫기 및 관제판 확인
        </button>
      </div>
    </div>
  );
}
