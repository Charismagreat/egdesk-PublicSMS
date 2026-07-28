"use client";

import React from "react";
import { Clock, MapPin, CheckCircle, AlertTriangle } from "lucide-react";

interface MobileAttendanceWidgetProps {
  currentTime: string;
  workplaceName: string;
  attendanceStatus: "before" | "working" | "done";
  checkInTime: string | null;
  checkOutTime: string | null;
  elapsedTimeStr: string;
  totalWorkTimeStr: string;
  isTodayLate: boolean;
  isLateReasonReported: boolean;
  lateReason: string;
  setLateReason: (reason: string) => void;
  isReportingLateReason: boolean;
  onReportLateReason: (e: React.FormEvent) => void;
  onClockIn: () => void;
  onClockOut: () => void;
  onOpenLocationMap: () => void;
}

export const MobileAttendanceWidget: React.FC<MobileAttendanceWidgetProps> = ({
  currentTime,
  workplaceName,
  attendanceStatus,
  checkInTime,
  checkOutTime,
  elapsedTimeStr,
  totalWorkTimeStr,
  isTodayLate,
  isLateReasonReported,
  lateReason,
  setLateReason,
  isReportingLateReason,
  onReportLateReason,
  onClockIn,
  onClockOut,
  onOpenLocationMap,
}) => {
  return (
    <>
      {/* 2. 콤팩트화된 가로형 실시간 근태 체크 위젯 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 mb-4 flex items-center justify-between">
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span className="font-mono font-extrabold text-xl text-slate-800 tracking-wider">
              {currentTime || "00:00:00"}
            </span>
          </div>
          <button
            onClick={onOpenLocationMap}
            title="출퇴근 인정 위치 지도 보기"
            className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-indigo-600 mt-1.5 font-extrabold bg-slate-100/90 hover:bg-indigo-50 px-2 py-0.5 rounded-lg border border-slate-200/60 transition-all cursor-pointer active:scale-95 w-fit shadow-3xs"
          >
            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
            <span>{workplaceName || "본사"} (KST)</span>
            <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 rounded font-black">
              지도
            </span>
          </button>
        </div>

        <div className="shrink-0">
          {attendanceStatus === "before" && (
            <button
              onClick={onClockIn}
              className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer border-none"
            >
              출근 등록
            </button>
          )}

          {attendanceStatus === "working" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-mono shadow-3xs">
                <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
                <span>근무 {elapsedTimeStr}</span>
              </span>
              <button
                onClick={onClockOut}
                className="px-4 py-2.5 bg-slate-800 text-white text-xs font-black rounded-xl shadow-xs hover:bg-slate-900 active:scale-95 transition-all cursor-pointer border-none"
              >
                퇴근 등록
              </button>
            </div>
          )}

          {attendanceStatus === "done" && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black px-3 py-2 rounded-xl flex items-center gap-1 shadow-3xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                근무 완료 ({checkInTime}~{checkOutTime}, 총 {totalWorkTimeStr})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ 지각 사유 간편 상신 폼 */}
      {isTodayLate && !isLateReasonReported && (
        <form
          onSubmit={onReportLateReason}
          className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 mb-4 text-left animate-scale-in"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-black text-amber-950">지각 사유 제출</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="지각 사유를 기입하세요 (예: 대중교통 지연)"
              className="flex-1 bg-white border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={isReportingLateReason}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-350 text-white text-xs font-black rounded-xl border-none cursor-pointer shadow-3xs"
            >
              {isReportingLateReason ? "상신 중.." : "제출"}
            </button>
          </div>
        </form>
      )}
    </>
  );
};
