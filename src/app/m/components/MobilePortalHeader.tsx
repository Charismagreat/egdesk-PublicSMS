"use client";

import React, { useState } from "react";
import { LogOut, User } from "lucide-react";

interface MobilePortalHeaderProps {
  userName: string;
  avatarUrl?: string | null;
  pendingLeave?: any;
  onOpenLeaveModal: () => void;
  onOpenPendingLeaveModal?: () => void;
  onLogout: () => void;
}

export const MobilePortalHeader: React.FC<MobilePortalHeaderProps> = ({
  userName,
  avatarUrl,
  pendingLeave,
  onOpenLeaveModal,
  onOpenPendingLeaveModal,
  onLogout,
}) => {
  const [imageError, setImageError] = useState(false);
  const initialChar = userName ? userName.substring(0, 1) : "직";

  const getPendingLabel = () => {
    if (!pendingLeave) return "";
    if (pendingLeave.leave_type === "HALF_AM") return "⏳ 오전반차 대기중";
    if (pendingLeave.leave_type === "HALF_PM") return "⏳ 오후반차 대기중";
    return "⏳ 연차 결재대기";
  };

  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4 text-left">
      {/* 사용자 프로필 및 아바타 */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {avatarUrl && !imageError ? (
            <img
              src={avatarUrl}
              alt={userName}
              onError={() => setImageError(true)}
              className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm ring-2 ring-indigo-50"
            />
          ) : (
            // 실물 프로필 이미지가 없을 때: 이름 첫 글자 이니셜 아바타 (한국형 기본 아바타)
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-lg shadow-sm ring-2 ring-indigo-50">
              {initialChar}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base text-slate-800 tracking-tight">
              {userName}
            </span>
          </div>
        </div>
      </div>

      {/* 우측 연차 신청 및 로그아웃 버튼 */}
      <div className="flex items-center gap-2">
        {pendingLeave ? (
          <button
            onClick={onOpenPendingLeaveModal || onOpenLeaveModal}
            title="결재 대기 중인 반차/연차 현황"
            aria-label="결재 대기 중인 반차/연차 현황"
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-black transition-all active:scale-95 shrink-0 animate-pulse"
          >
            <span>{getPendingLabel()}</span>
          </button>
        ) : (
          <button
            onClick={onOpenLeaveModal}
            title="간편 연차 신청"
            aria-label="간편 연차 신청"
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1 text-xs font-black transition-all active:scale-95 shrink-0"
          >
            <span>연차신청</span>
          </button>
        )}

        <button
          onClick={onLogout}
          title="로그아웃"
          aria-label="로그아웃"
          className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-xl transition duration-200 shadow-2xs cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
