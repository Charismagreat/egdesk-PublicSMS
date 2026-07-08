import React from "react";
import { Users, UserCheck, Clock, UserMinus, Sparkles } from "lucide-react";

// 대시보드 5대 통계 카드 Props 정의
interface AttendanceStatsProps {
  totalEmployees: number;
  currentWorkingCount: number;
  lateCount: number;
  leaveCount: number;
  pendingLeavesCount: number;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  totalEmployees,
  currentWorkingCount,
  lateCount,
  leaveCount,
  pendingLeavesCount,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 전체 등록 직원 */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">전체 등록 직원</p>
          <h4 className="text-xl font-black text-slate-800 mt-1">
            {totalEmployees} <span className="text-xs font-semibold text-slate-400">명</span>
          </h4>
        </div>
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
          <Users className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* 현재 정상 근무 중 */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">현재 정상 근무 중</p>
          <h4 className="text-xl font-black text-slate-800 mt-1">
            {currentWorkingCount} <span className="text-xs font-semibold text-slate-400">명</span>
          </h4>
        </div>
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
          <UserCheck className="w-4.5 h-4.5 animate-pulse" />
        </div>
      </div>

      {/* 오늘 누적 지각 */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">오늘 누적 지각</p>
          <h4 className="text-xl font-black text-slate-800 mt-1">
            {lateCount} <span className="text-xs font-semibold text-slate-400">명</span>
          </h4>
        </div>
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* 오늘 승인 휴가자 */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">오늘 승인 휴가자</p>
          <h4 className="text-xl font-black text-slate-800 mt-1">
            {leaveCount} <span className="text-xs font-semibold text-slate-400">명</span>
          </h4>
        </div>
        <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
          <UserMinus className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* 결재 대기 연차서 */}
      <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/20 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">결재 대기 연차서</p>
          <h4 className="text-xl font-black text-indigo-900 mt-1">
            {pendingLeavesCount} <span className="text-xs font-semibold text-slate-400">건</span>
          </h4>
        </div>
        <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-650 flex items-center justify-center shrink-0">
          <Sparkles className="w-4.5 h-4.5 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
