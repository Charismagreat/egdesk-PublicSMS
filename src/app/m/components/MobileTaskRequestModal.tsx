"use client";

import React, { useState } from "react";
import { X, Send, Camera, Mic, Folder, Link, Sparkles, AlertCircle, FileText, Trash2 } from "lucide-react";

export interface RequestPhoto {
  name: string;
  preview: string;
  base64: string;
}

export interface RequestFile {
  name: string;
  size: string;
  type: string;
  isLink?: boolean;
  url?: string;
  file?: File;
}

interface MobileTaskRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: RequestPhoto[];
  files: RequestFile[];
  voiceText: string;
  setVoiceText: (text: string) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveFile: (index: number) => void;
  taskFolders: any[];
  onSendGovernanceRequest: (title: string, note: string) => Promise<void>;
  onSaveToTaskFolder: (folderId: string, title: string) => Promise<void>;
}

export const MobileTaskRequestModal: React.FC<MobileTaskRequestModalProps> = ({
  isOpen,
  onClose,
  photos,
  files,
  voiceText,
  setVoiceText,
  onRemovePhoto,
  onRemoveFile,
  taskFolders,
  onSendGovernanceRequest,
  onSaveToTaskFolder,
}) => {
  const [activeTab, setActiveTab] = useState<"request" | "folder">("request");
  const [requestTitle, setRequestTitle] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [folderItemTitle, setFolderItemTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGovernanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle.trim() && !voiceText.trim() && photos.length === 0 && files.length === 0) {
      alert("상신할 업무 제목 또는 수집 자료를 첨부해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendGovernanceRequest(requestTitle || "현장 모바일 수집 상신", voiceText);
      setRequestTitle("");
      setVoiceText("");
      onClose();
    } catch (e: any) {
      alert("상신 실패: " + (e.message || "오류 발생"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFolderSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) {
      alert("보관할 태스크 폴더를 선택해 주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaveToTaskFolder(selectedFolderId, folderItemTitle || "현장 수집 자료");
      setFolderItemTitle("");
      onClose();
    } catch (e: any) {
      alert("태스크 보관 실패: " + (e.message || "오류 발생"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-scale-in">
        {/* 모달 상단 탭 헤더 */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("request")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                activeTab === "request"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              AI 관제 상신 & 태스크 발급
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("folder")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                activeTab === "folder"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              태스크 보관함
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 1: AI 관제 상신 & 태스크 발급 */}
        {activeTab === "request" ? (
          <form onSubmit={handleGovernanceSubmit} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1">
                업무 / 태스크 제목
              </label>
              <input
                type="text"
                required
                placeholder="예: [상신] 동우수주 현장 점검"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* 수집된 미디어 첨부 목록 */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 block">
                수집된 수집 자료 ({photos.length + files.length}건)
              </span>

              {photos.length > 0 || files.length > 0 ? (
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 space-y-2 max-h-36 overflow-y-auto">
                  {photos.map((p, idx) => (
                    <div
                      key={`p_${idx}`}
                      className="flex items-center justify-between bg-white p-1.5 px-2 rounded-xl border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <img
                          src={p.preview}
                          alt="thumb"
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <span className="font-bold text-slate-700 truncate">{p.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {files.map((f, idx) => (
                    <div
                      key={`f_${idx}`}
                      className="flex items-center justify-between bg-white p-1.5 px-2 rounded-xl border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {f.isLink ? (
                          <Link className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        )}
                        <span className="font-bold text-slate-700 truncate">{f.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveFile(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs font-bold">
                  첨부된 현장 사진/파일이 없습니다.
                </div>
              )}
            </div>

            {/* 음성 / 텍스트 메모 */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1">
                상신 내용 및 요청 메모
              </label>
              <textarea
                rows={3}
                placeholder="상신할 업무 내용이나 특이사항을 적어주세요."
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-none"
              />
            </div>

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
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "상신 중..." : "AI 관제 상신"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* 탭 2: 태스크 폴더 보관 */
          <form onSubmit={handleFolderSaveSubmit} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1">
                보관할 태스크 폴더
              </label>
              <select
                required
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="">태스크 폴더를 선택하세요</option>
                {taskFolders.map((tf) => (
                  <option key={tf.id} value={tf.id}>
                    {tf.name || tf.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1">
                자료 제목
              </label>
              <input
                type="text"
                placeholder="예: 현장 시방서 및 사진"
                value={folderItemTitle}
                onChange={(e) => setFolderItemTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

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
                disabled={isSubmitting || !selectedFolderId}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-xs border-none cursor-pointer"
              >
                {isSubmitting ? "저장 중..." : "폴더에 보관"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
