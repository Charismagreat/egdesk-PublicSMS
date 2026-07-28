"use client";

import React from "react";
import { Clock, MapPin } from "lucide-react";

interface MobileAttendanceWidgetProps {
  currentTime: string;
  workplaceName: string;
  attendanceStatus: "CHECKED_IN" | "CHECKED_OUT" | "NOT_YET";
  checkInTime: string | null;
  checkOutTime: string | null;
  isClocking: boolean;
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
  isClocking,
  onClockIn,
  onClockOut,
  onOpenLocationMap,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 mb-4 flex items-center justify-between">
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="font-mono font-extrabold text-xl text-slate-800 tracking-wider">
            {currentTime || "00:00:00"}
          </span>
        </div>

        {/* 인정 위치 지도 뱃지 */}
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

      {/* 출/퇴근 스탬프 액션 단추 */}
      <div className="flex items-center gap-2">
        {attendanceStatus === "CHECKED_IN" ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="block text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                출근 {checkInTime || "완료"}
              </span>
            </div>
            <button
              onClick={onClockOut}
              disabled={isClocking}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 cursor-pointer border-none"
            >
              {isClocking ? "처리 중..." : "퇴근 등록"}
            </button>
          </div>
        ) : attendanceStatus === "CHECKED_OUT" ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="block text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                퇴근 {checkOutTime || "완료"}
              </span>
            </div>
            <button
              disabled
              className="px-4 py-2.5 bg-slate-200 text-slate-400 rounded-xl font-extrabold text-xs cursor-not-allowed border-none"
            >
              오늘 근무 완료
            </button>
          </div>
        ) : (
          <button
            onClick={onClockIn}
            disabled={isClocking}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 cursor-pointer border-none"
          >
            {isClocking ? "처리 중..." : "출근 등록"}
          </button>
        )}
      </div>
    </div>
  );
};
