"use client";

import React, { useState } from "react";
import { 
  Users, Search, X, Clock, CheckCircle2, AlertTriangle, 
  Palmtree, Moon, RefreshCw, ChevronRight, MessageSquare 
} from "lucide-react";
import { Employee } from "../types";

interface TodayAttendanceLiveBoardProps {
  employees: Employee[];
  currentUser?: any;
  onRefresh?: () => void;
}

// 시간 문자열(HH:mm or H:mm or HH:mm:ss)을 분(minute) 수치로 변환하는 헬퍼
function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':').map((p) => parseInt(p, 10));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

// 지각 여부 판별 헬퍼 (DB status가 LATE이거나, 실제 출근시간이 기준 출근시간을 초과한 경우)
function checkIsLate(emp: Employee): boolean {
  if (emp.status === "LATE") return true;
  if (!emp.clock_in || emp.status === "LEAVE") return false;
  const clockInMin = parseTimeToMinutes(emp.clock_in);
  const startMin = parseTimeToMinutes(emp.work_start_time || "09:00");
  if (clockInMin !== null && startMin !== null && clockInMin > startMin) {
    return true;
  }
  return false;
}

export const TodayAttendanceLiveBoard: React.FC<TodayAttendanceLiveBoardProps> = ({
  employees,
  currentUser,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<"ALL" | "WORKING" | "ABSENT" | "LATE" | "LEAVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 상태별 직원 수 카운트 계산
  const workingEmployees = employees.filter((e) => e.clock_in && !e.clock_out);
  const doneEmployees = employees.filter((e) => e.clock_in && e.clock_out);
  const lateEmployees = employees.filter((e) => checkIsLate(e));
  const leaveEmployees = employees.filter((e) => e.status === "LEAVE");
  const absentEmployees = employees.filter((e) => !e.clock_in && e.status !== "LEAVE");

  // 검색 및 필터 적용
  const filteredEmployees = employees.filter((emp) => {
    const isLate = checkIsLate(emp);

    // 1. 상태 필터
    if (filterStatus === "WORKING") {
      if (!emp.clock_in || emp.clock_out) return false;
    } else if (filterStatus === "ABSENT") {
      if (emp.clock_in || emp.status === "LEAVE") return false;
    } else if (filterStatus === "LATE") {
      if (!isLate) return false;
    } else if (filterStatus === "LEAVE") {
      if (emp.status !== "LEAVE") return false;
    }

    // 2. 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (emp.name || "").toLowerCase().includes(q);
      const usernameMatch = (emp.username || "").toLowerCase().includes(q);
      const empNumMatch = (emp.employee_number || "").toLowerCase().includes(q);
      const deptMatch = (emp.department || "").toLowerCase().includes(q);
      return nameMatch || usernameMatch || empNumMatch || deptMatch;
    }

    return true;
  });

  // 상태 뱃지 렌더링 헬퍼
  const renderStatusBadge = (emp: Employee) => {
    const isLate = checkIsLate(emp);

    if (emp.status === "LEAVE") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          <Palmtree className="w-3 h-3" />
          휴가/반차
        </span>
      );
    }
    if (emp.clock_in && emp.clock_out) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
          <Moon className="w-3 h-3 text-slate-500" />
          퇴근 완료
        </span>
      );
    }
    if (isLate) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          지각 출근
        </span>
      );
    }
    if (emp.clock_in) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          근무중
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200/60 shrink-0">
        미출근
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 text-left">
      {/* 1. 상단 타이틀 바 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              전체 직원 출퇴근 현황
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            </h3>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. 빠른 상태 필터 세그먼트 버튼 */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100/90 rounded-xl text-center">
        <button
          type="button"
          onClick={() => setFilterStatus("ALL")}
          className={`py-1 px-1 text-[11px] rounded-lg transition-all font-bold border-none cursor-pointer ${
            filterStatus === "ALL"
              ? "bg-white text-slate-900 shadow-xs font-black"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          전체 ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("WORKING")}
          className={`py-1 px-1 text-[11px] rounded-lg transition-all font-bold border-none cursor-pointer ${
            filterStatus === "WORKING"
              ? "bg-emerald-600 text-white shadow-xs font-black"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          근무 ({workingEmployees.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("ABSENT")}
          className={`py-1 px-1 text-[11px] rounded-lg transition-all font-bold border-none cursor-pointer ${
            filterStatus === "ABSENT"
              ? "bg-slate-700 text-white shadow-xs font-black"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          미출근 ({absentEmployees.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("LATE")}
          className={`py-1 px-1 text-[11px] rounded-lg transition-all font-bold border-none cursor-pointer ${
            filterStatus === "LATE"
              ? "bg-rose-600 text-white shadow-xs font-black"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          지각 ({lateEmployees.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("LEAVE")}
          className={`py-1 px-1 text-[11px] rounded-lg transition-all font-bold border-none cursor-pointer ${
            filterStatus === "LEAVE"
              ? "bg-amber-600 text-white shadow-xs font-black"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          휴가 ({leaveEmployees.length})
        </button>
      </div>

      {/* 3. 검색창 */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="직원 이름 또는 사번 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-700 placeholder-slate-400 border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 rounded-xl outline-none transition-all font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full border-none bg-transparent cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. 직원 출퇴근 리스트 */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {filteredEmployees.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-bold bg-slate-50/50 rounded-2xl border border-slate-100">
            {searchQuery || filterStatus !== "ALL"
              ? "해당 조건의 직원이 없습니다."
              : "등록된 임직원이 없습니다."}
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const isMe = String(emp.id) === String(currentUser?.id) || emp.username === currentUser?.id;
            const initial = (emp.name || "직").substring(0, 1);

            return (
              <div
                key={emp.id}
                className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                  isMe
                    ? "bg-indigo-50/40 border-indigo-200/80 shadow-3xs"
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/40 shadow-xs"
                }`}
              >
                {/* 상단: 직원 프로필 & 상태 뱃지 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs text-white shrink-0 ${
                      isMe 
                        ? "bg-gradient-to-tr from-indigo-600 to-indigo-500 ring-2 ring-indigo-200" 
                        : "bg-gradient-to-tr from-slate-600 to-slate-500"
                    }`}>
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800 truncate">
                          {emp.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-indigo-600 text-white font-black px-1.5 py-0.2 rounded-full">
                            나
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                        {emp.department && (
                          <span className="font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                            {emp.department}
                          </span>
                        )}
                        <span>{emp.employee_number || emp.username || "사원"}</span>
                      </div>
                    </div>
                  </div>

                  {renderStatusBadge(emp)}
                </div>

                {/* 기준 시각 안내 태그 */}
                <div className="flex items-center justify-between text-[10px] bg-slate-50/80 px-2 py-1 rounded-lg text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    기준 시각
                  </span>
                  <span className="font-bold text-slate-600">
                    {emp.work_start_time || "09:00"} ~ {emp.work_end_time || "18:00"}
                  </span>
                </div>

                {/* 하단: 출퇴근 타임스탬프 & 근무시간 */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-500">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">실제 출근</span>
                      <span className={`font-black ${emp.status === 'LATE' ? 'text-rose-600' : 'text-slate-700'}`}>
                        {emp.clock_in ? emp.clock_in.substring(0, 5) : "--:--"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">실제 퇴근</span>
                      <span className="font-black text-slate-700">
                        {emp.clock_out ? emp.clock_out.substring(0, 5) : "--:--"}
                      </span>
                    </div>
                  </div>

                  {emp.working_hours && Number(emp.working_hours) > 0 ? (
                    <div className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                      누적 {Number(emp.working_hours).toFixed(1)}시간
                    </div>
                  ) : null}
                </div>

                {/* 직원이 직접 입력한 특이사항 사유 메모가 있을 때만 표시 (시스템 기본 문구 제외) */}
                {(() => {
                  const systemDefaultMemos = [
                    "정상 출근", "지각 출근", "지각 출근 기록", "모바일 포털 출근", 
                    "출근", "출근 완료", "정상출근", "지각출근"
                  ];
                  const rawMemo = emp.memo ? emp.memo.trim() : "";
                  const hasCustomMemo = Boolean(rawMemo && !systemDefaultMemos.includes(rawMemo));

                  if (!hasCustomMemo) return null;

                  return (
                    <div className="flex items-start gap-1 text-[10px] text-indigo-700 bg-indigo-50/70 rounded-lg p-1.5 border border-indigo-100">
                      <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-indigo-500" />
                      <span className="leading-tight break-all font-medium">
                        {rawMemo}
                      </span>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
