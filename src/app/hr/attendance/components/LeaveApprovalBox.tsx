import React from "react";
import { Check, X } from "lucide-react";
import { LeaveRequest } from "../types";

// 연차 결재 대기함 Props 정의
interface LeaveApprovalBoxProps {
  leaveRequests: LeaveRequest[];
  pendingLeavesCount: number;
  currentUser: any;
  handleLeaveDecision: (id: string, action: 'APPROVE' | 'REJECT') => Promise<void>;
  setSelectedLeaveId: (id: string | null) => void;
  setIsRejectModalOpen: (open: boolean) => void;
}

export const LeaveApprovalBox: React.FC<LeaveApprovalBoxProps> = ({
  leaveRequests,
  pendingLeavesCount,
  currentUser,
  handleLeaveDecision,
  setSelectedLeaveId,
  setIsRejectModalOpen,
}) => {
  // 관리자 권한 여부 체크
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PRESIDENT';

  if (!isAdmin) return null;

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'PENDING');

  return (
    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm block">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
        <h3 className="text-xs font-black text-slate-800 flex items-center justify-between w-full">
          <span>휴가 결재 대기함</span>
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-650 font-black text-[9px]">
            {pendingLeavesCount}건
          </span>
        </h3>
      </div>

      <div className="pt-3 divide-y divide-slate-100 custom-scrollbar max-h-[300px] overflow-y-auto">
        {pendingLeaves.length === 0 ? (
          <p className="text-center text-[10px] text-slate-400 font-bold py-8">
            결재 대기 중인 연차 신청서가 없습니다 ⛱️
          </p>
        ) : (
          pendingLeaves.map((req) => (
            <div key={req.id} className="py-3.5 space-y-2.5 first:pt-0">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black text-slate-850">
                    {req.employee_name} {req.employee_number ? `(${req.employee_number})` : ''}{' '}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-650 font-extrabold text-[8px]">
                    {req.leave_type === 'ANNUAL'
                      ? '연차'
                      : req.leave_type === 'HALF'
                      ? '반차'
                      : req.leave_type === 'SICK'
                      ? '병가'
                      : '경조휴가'}
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    신청기간: {req.start_date} ~ {req.end_date} (소모: {req.days_spent}일)
                  </p>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100/50 text-[9.5px] font-semibold text-slate-650 leading-relaxed">
                <span className="block font-black text-[8px] text-slate-400 uppercase tracking-widest mb-0.5">
                  휴가 사유
                </span>
                <div className="whitespace-pre-wrap">{req.reason}</div>
              </div>

              {req.leave_type === 'SICK' && req.medical_certificate_path && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-100 bg-violet-50/30 text-[9px] font-bold text-violet-700 animate-in fade-in-50 duration-200">
                  <span>📄 진단서 증빙:</span>
                  <a 
                    href={req.medical_certificate_path} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="underline text-violet-600 hover:text-violet-850 font-black"
                  >
                    [실물 증빙 파일 확인]
                  </a>
                </div>
              )}

              <div className="flex gap-2 w-full pt-0.5">
                <button
                  onClick={() => handleLeaveDecision(req.id, 'APPROVE')}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1 border-0"
                >
                  <Check size={11} />
                  승인 ⚡
                </button>
                <button
                  onClick={() => {
                    setSelectedLeaveId(req.id);
                    setIsRejectModalOpen(true);
                  }}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                >
                  <X size={11} />
                  반려 ❌
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
