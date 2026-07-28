"use client";

import React, { useState } from "react";
import { X, Send, Camera, Mic, Folder, Link as LinkIcon, FileText, Trash2, CheckCircle2, Sparkles } from "lucide-react";

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
  // 등록 타겟: 'TODO' (할 일 상신) vs 'FOLDER' (태스크 폴더 보관)
  const [targetType, setTargetType] = useState<"TODO" | "FOLDER">("TODO");
  const [title, setTitle] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !voiceText.trim() && photos.length === 0 && files.length === 0) {
      alert("상신할 업무 제목 또는 수집 자료를 첨부해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (targetType === "TODO") {
        // 📌 등록 경로 A: 할 일에 상신 -> 관제대상 리스트 및 진행중 할일 발급
        await onSendGovernanceRequest(title || "현장 수집 업무 상신", voiceText);
      } else {
        // 📁 등록 경로 B: 특정 태스크 폴더에 보관 -> 태스크 폴더 관제 영역 및 파일 적재
        if (!selectedFolderId) {
          alert("보관할 태스크 폴더를 선택해 주세요.");
          setIsSubmitting(false);
          return;
        }
        await onSaveToTaskFolder(selectedFolderId, title || "현장 수집 자료");
      }
      setTitle("");
      setVoiceText("");
      onClose();
    } catch (err: any) {
      alert("등록 실패: " + (err.message || "오류가 발생했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-scale-in">
        {/* 헤더 */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">현장 수집 & 업무 등록</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 🎯 [핵심] 등록 대상 선택 세그먼트 (할 일 vs 특정 태스크 폴더) */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
              등록 대상 선택
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setTargetType("TODO")}
                className={`py-2 px-3 text-xs font-black rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  targetType === "TODO"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 bg-transparent"
                }`}
              >
                <span>📌 할 일에 등록</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType("FOLDER")}
                className={`py-2 px-3 text-xs font-black rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                  targetType === "FOLDER"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 bg-transparent"
                }`}
              >
                <span>📁 태스크 폴더</span>
              </button>
            </div>
          </div>

          {/* 타겟별 동적 필드 */}
          {targetType === "TODO" ? (
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1">
                할 일 / 업무 제목
              </label>
              <input
                type="text"
                required
                placeholder="예: [상신] 동우수주 현장 점검"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1">
                  보관할 태스크 폴더 선택
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
                  자료 구분 제목 (선택)
                </label>
                <input
                  type="text"
                  placeholder="예: 현장 시방서 및 사진 수집"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* 📦 한 번에 수집된 각종 수집 데이터 목록 (카메라/음성/파일/링크 한눈에) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400">
                한 번에 수집된 자료 ({photos.length + files.length}건)
              </span>
            </div>

            {photos.length > 0 || files.length > 0 ? (
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-2 space-y-1.5 max-h-36 overflow-y-auto">
                {photos.map((p, idx) => (
                  <div
                    key={`p_${idx}`}
                    className="flex items-center justify-between bg-white p-1.5 px-2 rounded-xl border border-slate-150 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={p.preview}
                        alt="thumb"
                        className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <span className="font-extrabold text-slate-700 truncate">{p.name}</span>
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
                    className="flex items-center justify-between bg-white p-1.5 px-2 rounded-xl border border-slate-150 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {f.isLink ? (
                        <LinkIcon className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      )}
                      <span className="font-extrabold text-slate-700 truncate">{f.name}</span>
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
                수집된 사진/음성/문서/링크가 없습니다.
              </div>
            )}
          </div>

          {/* 음성 및 추가 텍스트 메모 */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">
              음성 / 추가 메모
            </label>
            <textarea
              rows={2}
              placeholder="음성 인식 문장이나 추가 메모를 기입하세요."
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* 액션 버튼 */}
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
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-black text-xs rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "등록 중..." : targetType === "TODO" ? "할 일로 상신" : "태스크 폴더에 저장"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
