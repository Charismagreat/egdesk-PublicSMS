"use client";

import React, { useRef } from "react";
import { Calendar, X, AlertTriangle, Paperclip, FileText, Camera } from "lucide-react";

export interface LeaveFileItem {
  name: string;
  size: string;
  type: string;
  base64: string;
}

interface MobileLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveBalance: { total: number; used: number; remaining: number };
  leaveType: "ANNUAL" | "HALF_AM" | "HALF_PM";
  setLeaveType: (type: "ANNUAL" | "HALF_AM" | "HALF_PM") => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  leaveFiles: LeaveFileItem[];
  onAddLeaveFiles: (files: LeaveFileItem[]) => void;
  onRemoveLeaveFile: (index: number) => void;
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => void;
}

export const MobileLeaveRequestModal: React.FC<MobileLeaveRequestModalProps> = ({
  isOpen,
  onClose,
  leaveBalance,
  leaveType,
  setLeaveType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reason,
  setReason,
  leaveFiles,
  onAddLeaveFiles,
  onRemoveLeaveFile,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const leaveFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newItems: LeaveFileItem[] = [];

    fileList.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`파일 용량이 10MB를 초과합니다: ${file.name}`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const sizeFormatted = (file.size / 1024).toFixed(1) + " KB";
        newItems.push({
          name: file.name,
          size: sizeFormatted,
          type: file.type,
          base64,
        });
        if (newItems.length === fileList.length) {
          onAddLeaveFiles(newItems);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = "";
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-left animate-scale-in">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">간편 연차 신청</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 잔여 연차 요약 카드 */}
        <div className="bg-gradient-to-br from-indigo-50 to-cyan-50/50 border border-indigo-100/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-wider">
              나의 잔여 연차
            </span>
            <span className="font-extrabold text-xl text-indigo-950">
              {leaveBalance.remaining} <span className="text-xs font-bold">일</span>
            </span>
          </div>
          <div className="text-right text-[10px] font-bold text-slate-500 space-y-0.5">
            <div>총 부여: {leaveBalance.total}일</div>
            <div>사용: {leaveBalance.used}일</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 연차 종류 세그먼트 */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              휴가 구분
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "ANNUAL", label: "종일 연차" },
                { id: "HALF_AM", label: "오전 반차" },
                { id: "HALF_PM", label: "오후 반차" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setLeaveType(item.id as any)}
                  className={`py-1.5 text-xs font-black rounded-lg transition-all border-none cursor-pointer ${
                    leaveType === item.id
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 bg-transparent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 선택 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                시작일
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                종료일
              </label>
              <input
                type="date"
                required
                disabled={leaveType !== "ANNUAL"}
                value={leaveType === "ANNUAL" ? endDate : startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* 사유 입력 */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              신청 사유
            </label>
            <textarea
              required
              rows={2}
              placeholder="예: 개인 사유로 인한 연차 사용"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* 📎 [복원] 연차 증빙 문서 및 사진 첨부 (PDF, 이미지) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-slate-600">
                📎 증빙 문서 및 사진 (PDF, 이미지)
              </label>
              <button
                type="button"
                onClick={() => leaveFileInputRef.current?.click()}
                className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-2.5 py-1 rounded-lg transition border border-indigo-200/60 cursor-pointer flex items-center gap-1"
              >
                <Paperclip className="w-3 h-3" />
                <span>파일/사진 첨부</span>
              </button>
              <input
                ref={leaveFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* 첨부된 파일 리스트 목록 */}
            {leaveFiles.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {leaveFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-50 p-2 px-2.5 rounded-xl border border-slate-200/80 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {file.type.includes("pdf") ? (
                        <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      )}
                      <span className="font-bold text-slate-700 truncate max-w-[180px]">
                        {file.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        ({file.size})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveLeaveFile(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition cursor-pointer border-none bg-transparent"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-none cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs border-none cursor-pointer"
            >
              {isSubmitting ? "상신 중..." : "결재 상신"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
