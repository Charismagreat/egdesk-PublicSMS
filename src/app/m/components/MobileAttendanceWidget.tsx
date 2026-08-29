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
  pendingLeave?: any;
  onOpenPendingLeaveModal?: () => void;
  isTodayEarlyLeave?: boolean;
  isEarlyLeaveReasonReported?: boolean;
  earlyLeaveReason?: string;
  setEarlyLeaveReason?: (reason: string) => void;
  isReportingEarlyLeaveReason?: boolean;
  onReportEarlyLeaveReason?: (e: React.FormEvent) => void;
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
  pendingLeave,
  onOpenPendingLeaveModal,
  isTodayEarlyLeave,
  isEarlyLeaveReasonReported,
  earlyLeaveReason,
  setEarlyLeaveReason,
  isReportingEarlyLeaveReason,
  onReportEarlyLeaveReason,
}) => {
  const getPendingBadgeText = () => {
    if (!pendingLeave) return "";
    const typeLabel =
      pendingLeave.leave_type === "HALF_AM"
        ? "오전반차"
        : pendingLeave.leave_type === "HALF_PM"
        ? "오후반차"
        : "연차";
    return `⏳ ${typeLabel} 승인대기 (${checkInTime}~${checkOutTime}, 실근무 ${totalWorkTimeStr})`;
  };

  return (
    <>
      {/* 2. 콤팩트화된 가로형 실시간 근태 체크 위젯 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-3.5 sm:p-4 mb-3 sm:mb-4 flex items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex flex-col text-left shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
            <span className="font-mono font-extrabold text-xl text-slate-800 tracking-wider whitespace-nowrap">
              {currentTime || "00:00:00"}
            </span>
          </div>
          <button
            onClick={onOpenLocationMap}
            title="출퇴근 인정 위치 지도 보기"
            className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-indigo-600 mt-1.5 font-extrabold bg-slate-100/90 hover:bg-indigo-50 px-2 py-0.5 rounded-lg border border-slate-200/60 transition-all cursor-pointer active:scale-95 w-fit shadow-3xs whitespace-nowrap"
          >
            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
            <span>{workplaceName || "본사"} (KST)</span>
            <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 rounded font-black">
              지도
            </span>
          </button>
        </div>

        <div className="shrink-0 text-right">
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
            <div className="flex items-center gap-2">
              {pendingLeave ? (
                <div 
                  onClick={onOpenPendingLeaveModal}
                  className="bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-black px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-3xs cursor-pointer hover:bg-amber-100 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{getPendingBadgeText()}</span>
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl shadow-3xs flex flex-col items-end gap-0.5 text-right">
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-800">
                    <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>근무 완료 (총 {totalWorkTimeStr})</span>
                  </div>
                  <div className="text-[9px] font-mono text-emerald-700/90 font-bold">
                    {checkInTime} ~ {checkOutTime}
                  </div>
                </div>
              )}
              <button
                onClick={onClockIn}
                title="오늘 추가 근무(재출근) 스탬프 찍기"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-xs transition-all cursor-pointer border-none whitespace-nowrap"
              >
                + 추가 출근
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ℹ️ 반차/연차 결재 대기 안내 배너 */}
      {pendingLeave && (
        <div
          onClick={onOpenPendingLeaveModal}
          className="bg-gradient-to-r from-amber-50 to-indigo-50/60 border border-amber-200/80 rounded-2xl p-3.5 mb-4 text-left shadow-xs cursor-pointer hover:border-indigo-300 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-black text-amber-950">
                {pendingLeave.leave_type === "HALF_AM"
                  ? "오전 반차 결재 대기 중"
                  : pendingLeave.leave_type === "HALF_PM"
                  ? "오후 반차 결재 대기 중"
                  : "연차 결재 대기 중"}
              </span>
            </div>
            <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-100 shadow-3xs">
              상세 확인 ➔
            </span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
            최고관리자의 결재 승인이 완료되면 <strong className="text-indigo-700 font-bold">당일 정상 근무(8시간)</strong>로 최종 확정 정산됩니다.
          </p>
        </div>
      )}

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

      {/* ⚠️ 조퇴 사유 간편 상신 폼 */}
      {isTodayEarlyLeave && !isEarlyLeaveReasonReported && (
        <form
          onSubmit={onReportEarlyLeaveReason}
          className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 mb-4 text-left animate-scale-in"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-black text-rose-950">조퇴/조기퇴근 사유 제출</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={earlyLeaveReason}
              onChange={(e) => setEarlyLeaveReason && setEarlyLeaveReason(e.target.value)}
              placeholder="조퇴 사유를 기입하세요 (예: 병원 진료, 개인 외출)"
              className="flex-1 bg-white border border-rose-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-rose-400"
            />
            <button
              type="submit"
              disabled={isReportingEarlyLeaveReason}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-350 text-white text-xs font-black rounded-xl border-none cursor-pointer shadow-3xs"
            >
              {isReportingEarlyLeaveReason ? "상신 중.." : "제출"}
            </button>
          </div>
        </form>
      )}
    </>
  );
};
