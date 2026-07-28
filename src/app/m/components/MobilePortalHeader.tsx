"use client";

import React from "react";
import { LogOut } from "lucide-react";

interface MobilePortalHeaderProps {
  userName: string;
  avatarUrl: string;
  onOpenLeaveModal: () => void;
  onLogout: () => void;
}

export const MobilePortalHeader: React.FC<MobilePortalHeaderProps> = ({
  userName,
  avatarUrl,
  onOpenLeaveModal,
  onLogout,
}) => {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
      {/* 사용자 프로필 및 아바타 */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={avatarUrl}
            alt={userName}
            className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm ring-2 ring-indigo-50"
          />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base text-slate-800 tracking-tight">
              {userName}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">
            오늘도 활기찬 하루 되세요! ☀️
          </p>
        </div>
      </div>

      {/* 우측 연차 신청 및 로그아웃 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenLeaveModal}
          title="간편 연차 신청"
          aria-label="간편 연차 신청"
          className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1 text-xs font-black transition-all active:scale-95 shrink-0"
        >
          <span>연차신청</span>
        </button>

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
