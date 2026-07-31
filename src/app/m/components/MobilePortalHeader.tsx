"use client";

import React, { useState, useRef } from "react";
import { LogOut, Camera, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface MobilePortalHeaderProps {
  userName: string;
  avatarUrl?: string | null;
  pendingLeave?: any;
  onOpenLeaveModal: () => void;
  onOpenPendingLeaveModal?: () => void;
  onLogout: () => void;
  onAvatarUpdated?: (newUrl: string) => void;
}

export const MobilePortalHeader: React.FC<MobilePortalHeaderProps> = ({
  userName,
  avatarUrl,
  pendingLeave,
  onOpenLeaveModal,
  onOpenPendingLeaveModal,
  onLogout,
  onAvatarUpdated,
}) => {
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl || null);
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialChar = userName ? userName.substring(0, 1) : "직";

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 확장자 체크
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일(PNG, JPG, WEBP 등)만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. /api/shared/files 통한 스토리지 업로드
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await apiFetch("/api/shared/files", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success || !uploadData.file?.url) {
        alert(uploadData.message || "이미지 업로드 실패");
        return;
      }

      const uploadedUrl = uploadData.file.url;

      // 2. /api/auth/me 통한 프로필 avatar_url DB 저장
      const saveRes = await apiFetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: uploadedUrl }),
      });
      const saveData = await saveRes.json();

      if (saveData.success) {
        setCurrentAvatar(uploadedUrl);
        setImageError(false);
        if (onAvatarUpdated) onAvatarUpdated(uploadedUrl);
        alert("📸 프로필 사진이 성공적으로 변경되었습니다!");
      } else {
        alert(saveData.message || "프로필 사진 저장 실패");
      }
    } catch (err) {
      alert("프로필 사진 업로드 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getPendingLabel = () => {
    if (!pendingLeave) return "";
    if (pendingLeave.leave_type === "HALF_AM") return "⏳ 오전반차 대기중";
    if (pendingLeave.leave_type === "HALF_PM") return "⏳ 오후반차 대기중";
    return "⏳ 연차 결재대기";
  };

  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4 text-left">
      {/* 숨겨진 파일 선택 트리거 */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 사용자 프로필 및 아바타 */}
      <div className="flex items-center gap-3">
        <div 
          onClick={handleAvatarClick}
          className="relative cursor-pointer group shrink-0"
          title="클릭하여 프로필 사진 교체"
        >
          {currentAvatar && !imageError ? (
            <img
              src={currentAvatar}
              alt={userName}
              onError={() => setImageError(true)}
              className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm ring-2 ring-indigo-50 group-hover:opacity-85 transition-opacity"
            />
          ) : (
            // 실물 프로필 이미지가 없을 때: 이름 첫 글자 이니셜 아바타 (한국형 기본 아바타)
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-lg shadow-sm ring-2 ring-indigo-50 group-hover:opacity-85 transition-opacity">
              {initialChar}
            </div>
          )}

          {/* 카메라 오버레이 뱃지 */}
          <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white p-1 rounded-full border-2 border-white shadow-xs group-hover:scale-110 transition-transform">
            {isUploading ? (
              <Loader2 className="w-3 h-3 animate-spin text-white" />
            ) : (
              <Camera className="w-3 h-3 text-white" />
            )}
          </div>
        </div>

        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base text-slate-800 tracking-tight">
              {userName}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium cursor-pointer hover:text-indigo-600 transition-colors" onClick={handleAvatarClick}>
            📸 터치하여 사진 교체
          </p>
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
