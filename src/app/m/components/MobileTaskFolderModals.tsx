"use client";

import React from "react";
import { Folder, Edit2, X, Plus, AlertCircle, Clock, Calendar, ArrowRight } from "lucide-react";

interface MobileTaskFolderModalsProps {
  // 1. 신규 폴더 모달
  isNewFolderModalOpen: boolean;
  setIsNewFolderModalOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  newFolderDesc: string;
  setNewFolderDesc: (desc: string) => void;
  handleCreateNewFolder: () => void;

  // 2. 폴더 수정 모달
  isEditFolderModalOpen: boolean;
  setIsEditFolderModalOpen: (open: boolean) => void;
  editFolderName: string;
  setEditFolderName: (name: string) => void;
  editFolderDesc: string;
  setEditFolderDesc: (desc: string) => void;
  handleSaveEditFolder: () => void;

  // 3. 아이템 이동 모달
  isMoveItemModalOpen: boolean;
  setIsMoveItemModalOpen: (open: boolean) => void;
  movingItem: any | null;
  taskFolders: any[];
  targetFolderId: string;
  setTargetFolderId: (id: string) => void;
  handleMoveItemToFolder: () => void;

  // 4. 결재 대기 연차 모달
  isPendingLeaveModalOpen: boolean;
  setIsPendingLeaveModalOpen: (open: boolean) => void;
  pendingLeave: any | null;
}

export const MobileTaskFolderModals: React.FC<MobileTaskFolderModalsProps> = ({
  isNewFolderModalOpen,
  setIsNewFolderModalOpen,
  newFolderName,
  setNewFolderName,
  newFolderDesc,
  setNewFolderDesc,
  handleCreateNewFolder,
  isEditFolderModalOpen,
  setIsEditFolderModalOpen,
  editFolderName,
  setEditFolderName,
  editFolderDesc,
  setEditFolderDesc,
  handleSaveEditFolder,
  isMoveItemModalOpen,
  setIsMoveItemModalOpen,
  movingItem,
  taskFolders,
  targetFolderId,
  setTargetFolderId,
  handleMoveItemToFolder,
  isPendingLeaveModalOpen,
  setIsPendingLeaveModalOpen,
  pendingLeave,
}) => {
  return (
    <>
      {/* 📁 신규 폴더 생성 모달 */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Folder className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">새 업무 폴더 생성</h3>
              </div>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">폴더명 (필수)</label>
                <input
                  type="text"
                  placeholder="예: 3호선 현장 점검, 부품 영수증"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">설명 (선택)</label>
                <input
                  type="text"
                  placeholder="폴더에 대한 간단한 메모"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-all bg-white cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateNewFolder}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all border-none cursor-pointer"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 폴더 정보 수정 모달 */}
      {isEditFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">폴더 정보 수정</h3>
              </div>
              <button
                onClick={() => setIsEditFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">폴더명 (필수)</label>
                <input
                  type="text"
                  placeholder="폴더명"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">설명 (선택)</label>
                <input
                  type="text"
                  placeholder="설명"
                  value={editFolderDesc}
                  onChange={(e) => setEditFolderDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditFolderModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-all bg-white cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEditFolder}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all border-none cursor-pointer"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📦 아이템 폴더 이동 모달 */}
      {isMoveItemModalOpen && movingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">자료 폴더 이동</h3>
              </div>
              <button
                onClick={() => setIsMoveItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">이동할 자료</span>
                <p className="text-xs font-extrabold text-slate-800 line-clamp-2">
                  {movingItem.content_text || movingItem.title || "수집 파일"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">대상 폴더 선택</label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold text-slate-700 bg-white"
                >
                  <option value="">-- 폴더를 선택하세요 --</option>
                  {taskFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMoveItemModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-all bg-white cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleMoveItemToFolder}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all border-none cursor-pointer"
              >
                이동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⏳ 결재 대기 중인 연차 상세 모달 */}
      {isPendingLeaveModalOpen && pendingLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">결재 대기 중인 휴가</h3>
                  <span className="text-[10px] text-amber-600 font-bold">관리자 승인 진행 중</span>
                </div>
              </div>
              <button
                onClick={() => setIsPendingLeaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold">신청 구분</span>
                <span className="font-extrabold text-slate-800">
                  {pendingLeave.leave_type === "ANNUAL"
                    ? "🏖️ 전일 연차"
                    : pendingLeave.leave_type === "HALF_AM"
                    ? "🌅 오전 반차"
                    : "🌇 오후 반차"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold">신청 기간</span>
                <span className="font-extrabold text-slate-800">
                  {pendingLeave.start_date} ~ {pendingLeave.end_date}
                </span>
              </div>
              <div className="py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold block mb-1">신청 사유</span>
                <p className="font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  {pendingLeave.reason || "사유 미입력"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPendingLeaveModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-none cursor-pointer transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
};
