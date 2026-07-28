"use client";

import React, { useState } from "react";
import { Folder, Plus, Upload, FileText, Image as ImageIcon, Music, Trash2, Edit3, ArrowRightLeft, Info, Search, X, Eye } from "lucide-react";
import { MobileItemViewerModal } from "./MobileItemViewerModal";

interface MobileFieldTaskCollectorProps {
  folders: any[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onOpenNewFolderModal: () => void;
  onEditFolder: (folder: any) => void;
  onDeleteFolder: (folderId: string) => void;
  collectedItems: any[];
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenItemViewer: (item: any) => void;
  onMoveItem: (item: any) => void;
  onDeleteItem: (itemId: string) => void;
  onClearFolderItems: () => void;
  isUploading: boolean;
}

export const MobileFieldTaskCollector: React.FC<MobileFieldTaskCollectorProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onOpenNewFolderModal,
  onEditFolder,
  onDeleteFolder,
  collectedItems,
  onUploadFile,
  onOpenItemViewer,
  onMoveItem,
  onDeleteItem,
  onClearFolderItems,
  isUploading,
}) => {
  // 🔍 태스크 폴더 및 수집 항목 실시간 검색어 상태
  const [searchQuery, setSearchQuery] = useState("");

  // 👁️ 미리보기 팝업 모달 상태
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const selectedFolder = folders.find((f) => String(f.id) === String(selectedFolderId));

  const handleOpenItemPreview = (item: any) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
    onOpenItemViewer(item);
  };

  // 검색어에 따른 폴더 필터링
  const filteredFolders = folders.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = f.name?.toLowerCase().includes(q) || f.title?.toLowerCase().includes(q);
    const descMatch = f.description?.toLowerCase().includes(q);
    return nameMatch || descMatch;
  });

  // 검색어에 따른 수집 항목 필터링
  const filteredItems = collectedItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q) || item.file_name?.toLowerCase().includes(q);
    const contentMatch = item.content?.toLowerCase().includes(q);
    return nameMatch || contentMatch;
  });

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 text-left space-y-3">
        {/* 1. 타이틀 바 (태스크 폴더 & 새 폴더 생성) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">태스크 폴더</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenNewFolderModal}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border-none cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>새 폴더 생성</span>
          </button>
        </div>

        {/* 🔍 2. 태스크 폴더 & 수집 항목 검색 입력창 */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="폴더 이름, 설명, 수집 파일명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3. 태스크 폴더 칩 스크롤 바 (📁 폴더명 (N)) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filteredFolders.length === 0 ? (
            <div className="text-xs font-bold text-slate-400 py-1">
              {searchQuery ? `'${searchQuery}' 검색 결과와 일치하는 폴더가 없습니다.` : "생성된 태스크 폴더가 없습니다."}
            </div>
          ) : (
            filteredFolders.map((folder) => {
              const isSelected = String(folder.id) === String(selectedFolderId);
              const count = folder.itemCount || 0;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onSelectFolder(String(folder.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border border-transparent cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-indigo-600"}`} />
                  <span>
                    {folder.name || folder.title} ({count})
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* 4. 선택된 폴더 정보 및 관리 도구 (설명, 편집 ✏️, 삭제 🗑️) */}
        {selectedFolder && (
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-800 truncate">{selectedFolder.name}</span>
              </div>
              {selectedFolder.description && (
                <p className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                  <Info className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="truncate">{selectedFolder.description}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onEditFolder(selectedFolder)}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg border-none bg-transparent cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="폴더 편집"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>편집</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`'${selectedFolder.name}' 폴더와 수집 항목을 삭제하시겠습니까?`)) {
                    onDeleteFolder(String(selectedFolder.id));
                  }
                }}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border-none bg-transparent cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="폴더 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. 업로드 & 수집 내역 비우기 액션 바 */}
        {selectedFolderId && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-extrabold cursor-pointer transition-colors flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? "업로드 중..." : "파일/사진 추가"}</span>
                <input type="file" className="hidden" onChange={onUploadFile} disabled={isUploading} />
              </label>
            </div>
            {collectedItems.length > 0 && (
              <button
                type="button"
                onClick={onClearFolderItems}
                className="text-[11px] font-bold text-rose-500 hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>전체 비우기</span>
              </button>
            )}
          </div>
        )}

        {/* 6. 선택된 태스크 폴더 내 수집 파일 내역 (파일명 터치 시 미리보기) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400">
                {searchQuery ? `'${searchQuery}' 검색 결과와 일치하는 수집 파일이 없습니다.` : "선택된 폴더에 수집된 파일이 없습니다."}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/70 rounded-xl transition-all flex items-center justify-between text-left group"
              >
                <div
                  onClick={() => handleOpenItemPreview(item)}
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:text-indigo-600"
                  title="미리보기 열기"
                >
                  {item.type === "IMAGE" || item.content_type?.includes("image") ? (
                    <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                  ) : item.type === "AUDIO" || item.content_type?.includes("audio") ? (
                    <Music className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-800 hover:text-indigo-600 truncate">
                      {item.name || item.title || item.file_name || "첨부 파일"}
                    </p>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                      {item.date || (item.created_at ? item.created_at.substring(0, 10) : "")}
                    </p>
                  </div>
                  <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1 hover:text-indigo-600" />
                </div>

                {/* 항목 단위 이동 🔄 & 삭제 🗑️ 도구 */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => onMoveItem(item)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border-none bg-transparent cursor-pointer"
                    title="다른 폴더로 이동"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(String(item.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg border-none bg-transparent cursor-pointer"
                    title="항목 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🔍 폴더 수집 항목 파일명 터치 시 팝업 미리보기 모달 */}
      <MobileItemViewerModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        item={previewItem}
      />
    </>
  );
};
