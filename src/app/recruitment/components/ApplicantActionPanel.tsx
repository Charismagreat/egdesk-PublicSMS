"use client";

import React from "react";
import { User, UserCheck } from "lucide-react";
import { Applicant } from "../types";

interface ApplicantActionPanelProps {
  /**
   * 선택된 지원자
   */
  selectedApplicant: Applicant;
  /**
   * AI 면접 승인 핸들러
   */
  onApproveInterview: (app: Applicant) => void;
  /**
   * 최종합격 및 계약 요청 핸들러
   */
  onApproveHiring: (app: Applicant) => void;
}

/**
 * 선택된 지원자의 상태 모니터링 및 채용 단계별 액션 실행 패널 컴포넌트
 */
export default function ApplicantActionPanel({
  selectedApplicant,
  onApproveInterview,
  onApproveHiring,
}: ApplicantActionPanelProps) {
  return (
    <div className="p-4 bg-slate-100 border-t-2 border-slate-300 flex items-center justify-between gap-4 shrink-0 animate-slide-up shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f91f7f] to-[#e84e27] p-[1.5px] shrink-0">
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden border border-slate-300">
            <User className="w-5 h-5 text-slate-800 animate-pulse" />
          </div>
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-black text-slate-950 truncate">
            {selectedApplicant.name} • {selectedApplicant.phone}
          </p>
          <p className="text-[10px] text-slate-700 font-extrabold truncate">
            단계:{" "}
            <span
              className={`font-black uppercase tracking-wider ${
                selectedApplicant.status === "approved"
                  ? "text-emerald-700"
                  : selectedApplicant.status === "interviewing"
                  ? "text-[#d91b5c]"
                  : selectedApplicant.status === "interview_done"
                  ? "text-purple-800"
                  : "text-[#4f5bd5]"
              }`}
            >
              {selectedApplicant.status === "approved"
                ? "채용 및 계약 체결 완료"
                : selectedApplicant.status === "interviewing"
                ? "실시간 AI DM 면접 진행 중"
                : selectedApplicant.status === "interview_done"
                ? "AI 면접 완료 (결재 대기)"
                : "지원 접수 완료"}
            </span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {selectedApplicant.status === "applied" && (
          <button
            onClick={() => onApproveInterview(selectedApplicant)}
            className="bg-gradient-to-r from-[#f91f7f] to-[#e84e27] hover:opacity-90 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all border border-[#f91f7f]/30 shadow-md cursor-pointer"
          >
            🚀 실시간 AI 면접 승인
          </button>
        )}
        {selectedApplicant.status === "interview_done" && (
          <button
            onClick={() => onApproveHiring(selectedApplicant)}
            className="bg-gradient-to-r from-[#e84e27] to-[#9b2bb4] hover:opacity-90 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all border border-[#9b2bb4]/30 shadow-md cursor-pointer"
          >
            📜 최종합격 & 근로계약 요청
          </button>
        )}
        {selectedApplicant.status === "approved" && (
          <span className="text-xs bg-emerald-100 border-2 border-emerald-300 text-emerald-800 font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm">
            <UserCheck className="w-4 h-4" /> 채용 성사 완료됨
          </span>
        )}
      </div>
    </div>
  );
}
