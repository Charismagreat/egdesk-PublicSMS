"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FileText, Clock, CheckCircle2, ChevronRight } from "lucide-react";

interface MobileDailyReportCardProps {
  todayReport: { status: "SUBMITTED" | "APPROVED" | "REJECTED"; updated_at?: string } | null;
}

export const MobileDailyReportCard: React.FC<MobileDailyReportCardProps> = ({
  todayReport,
}) => {
  const router = useRouter();

  if (!todayReport) {
    // A. 아직 미제출 상태
    return (
      <div
        onClick={() => router.push("/m/daily-report")}
        className="bg-white border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/5 rounded-2xl shadow-xs p-3.5 mb-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm animate-scale-in text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center shadow-3xs shrink-0">
            <FileText className="w-4 h-4 text-indigo-600 animate-pulse" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-slate-800 text-xs block leading-tight">
              일일 업무 보고서
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  if (todayReport.status === "SUBMITTED") {
    // B. 결재 대기중 (SUBMITTED)
    return (
      <div
        onClick={() => router.push("/m/daily-report")}
        className="bg-amber-50/40 border border-amber-200 text-amber-800 rounded-2xl shadow-xs p-3.5 mb-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100/70 text-amber-700 rounded-xl flex items-center justify-center shadow-3xs shrink-0">
            <Clock className="w-4 h-4 text-amber-600 animate-spin-slow" />
          </div>
          <div className="text-left space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-xs block leading-tight">
                일일 업무 보고서 (결재 대기)
              </span>
              <span className="bg-amber-100 text-amber-850 text-[8px] px-1.5 py-0.5 rounded-md font-extrabold">
                제출 완료
              </span>
            </div>
            <span className="text-[9px] text-slate-500 font-bold block">
              오늘 일보가 결재권자 승인 대기 중입니다. (클릭 시 수정 가능)
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-600" />
      </div>
    );
  }

  // C. 최종 승인 완료 (APPROVED)
  return (
    <div
      onClick={() => router.push("/m/daily-report")}
      className="bg-emerald-50/40 border border-emerald-200 text-emerald-800 rounded-2xl shadow-xs p-3.5 mb-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm text-left"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-emerald-100/70 text-emerald-700 rounded-xl flex items-center justify-center shadow-3xs shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-left space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-800 text-xs block leading-tight">
              일일 업무 보고서 (승인 완료)
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1.5 py-0.5 rounded-md font-extrabold">
              최종 승인
            </span>
          </div>
          <span className="text-[9px] text-slate-500 font-bold block">
            결재권자 승인이 완료되었습니다.
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-emerald-600" />
    </div>
  );
};
