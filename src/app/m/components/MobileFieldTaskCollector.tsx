"use client";

import React from "react";
import { Folder, Plus, Upload, FileText, Image as ImageIcon, Music, Trash2 } from "lucide-react";

interface MobileFieldTaskCollectorProps {
  folders: any[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onOpenNewFolderModal: () => void;
  collectedItems: any[];
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenItemViewer: (item: any) => void;
  onClearFolderItems: () => void;
  isUploading: boolean;
}

export const MobileFieldTaskCollector: React.FC<MobileFieldTaskCollectorProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onOpenNewFolderModal,
  collectedItems,
  onUploadFile,
  onOpenItemViewer,
  onClearFolderItems,
  isUploading,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 text-left">
      {/* 타이틀 바 (태스크 정보 수집) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">태스크 정보 수집</h3>
            <p className="text-[10px] text-slate-400 font-bold">태스크별 파일, 메모, 사진, 문서 보관</p>
          </div>
        </div>
        <button
          onClick={onOpenNewFolderModal}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border-none cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>새 태스크</span>
        </button>
      </div>

      {/* 태스크 폴더 칩 스크롤 바 (📁 태스크명 (N)) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {folders.length === 0 ? (
          <div className="text-xs font-bold text-slate-400 py-1">등록된 태스크 폴더가 없습니다.</div>
        ) : (
          folders.map((folder) => {
            const isSelected = String(folder.id) === String(selectedFolderId);
            const count = folder.itemCount || 0;
            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(String(folder.id))}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border border-transparent cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-indigo-600"}`} />
                <span>
                  {folder.title || folder.name} ({count})
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* 업로드 & 수집 내역 관리 액션 바 */}
      {selectedFolderId && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-extrabold cursor-pointer transition-colors flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? "업로드 중..." : "태스크 파일 추가"}</span>
              <input type="file" className="hidden" onChange={onUploadFile} disabled={isUploading} />
            </label>
          </div>
          {collectedItems.length > 0 && (
            <button
              onClick={onClearFolderItems}
              className="text-[11px] font-bold text-rose-500 hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>비우기</span>
            </button>
          )}
        </div>
      )}

      {/* 수집 데이터 내역 타일 그리드 */}
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        {collectedItems.length === 0 ? (
          <div className="col-span-2 py-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-400">수집된 태스크 정보가 없습니다.</p>
          </div>
        ) : (
          collectedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenItemViewer(item)}
              className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 rounded-xl cursor-pointer transition-all flex items-center gap-2 text-left"
            >
              {item.type === "IMAGE" || item.content_type?.includes("image") ? (
                <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
              ) : item.type === "AUDIO" || item.content_type?.includes("audio") ? (
                <Music className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-800 truncate">
                  {item.name || item.content || "태스크 첨부파일"}
                </p>
                <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                  {item.date || (item.created_at ? item.created_at.substring(0, 10) : "")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
