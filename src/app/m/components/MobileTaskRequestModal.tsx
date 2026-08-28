"use client";

import React, { useState, useRef } from "react";
import { X, Send, Sparkles, Link as LinkIcon, FileText, Trash2, Eye, Mic } from "lucide-react";
import { MobileItemViewerModal } from "./MobileItemViewerModal";

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
  setVoiceText: (text: string | ((prev: string) => string)) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveFile: (index: number) => void;
  onAddPhoto?: (photo: RequestPhoto) => void;
  onAddFile?: (file: RequestFile) => void;
  taskFolders: any[];
  onSendGovernanceRequest: (title: string, note: string, photos?: RequestPhoto[], files?: RequestFile[]) => Promise<void>;
  onSaveToTaskFolder: (folderId: string, title: string, photos?: RequestPhoto[], files?: RequestFile[]) => Promise<void>;
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
  onAddPhoto,
  onAddFile,
  taskFolders,
  onSendGovernanceRequest,
  onSaveToTaskFolder,
}) => {
  // 등록 타겟: 'TODO' (할 일 상신) vs 'FOLDER' (태스크 폴더 보관)
  const [targetType, setTargetType] = useState<"TODO" | "FOLDER">("TODO");
  const [title, setTitle] = useState("");
  const [localPhotos, setLocalPhotos] = useState<RequestPhoto[]>(photos || []);
  const [localFiles, setLocalFiles] = useState<RequestFile[]>(files || []);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // props가 외부에서 변경될 때 로컬 상태 동기화
  React.useEffect(() => {
    if (photos && photos.length > 0) setLocalPhotos(photos);
  }, [photos]);
  React.useEffect(() => {
    if (files && files.length > 0) setLocalFiles(files);
  }, [files]);

  // 📸 모달 내부 파일/사진 선택 전용 ref
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔍 미리보기 팝업 상태
  const [viewerItem, setViewerItem] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // 🎤 실시간 음성-텍스트(STT) 인식 상태
  const [isSTTListening, setIsSTTListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  // Web Speech API 실시간 음성-텍스트 받아쓰기 시작
  const startSTT = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("현재 브라우저에서 음성 인식을 지원하지 않습니다. 마이크 입력을 허용해 주세요.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsSTTListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setVoiceText((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (err: any) => {
        const errorType = err?.error || err?.message || "unknown";
        console.warn(`[STT] Speech recognition notice: ${errorType}`);
        setIsSTTListening(false);
        if (errorType === "not-allowed" || errorType === "service-not-allowed") {
          alert("🎤 마이크 접근 권한이 거부되었습니다. 브라우저 주소창 마이크 권한을 허용해 주세요.");
        } else if (errorType === "audio-capture") {
          alert("🎤 마이크 장치를 찾을 수 없습니다. 마이크 연결 상태를 확인해 주세요.");
        }
      };

      recognition.onend = () => {
        setIsSTTListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsSTTListening(false);
    }
  };

  // 음성 인식 중지
  const stopSTT = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsSTTListening(false);
    }
  };

  const handleOpenPreview = (item: any) => {
    setViewerItem(item);
    setIsViewerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePhotos = localPhotos.length > 0 ? localPhotos : photos;
    const effectiveFiles = localFiles.length > 0 ? localFiles : files;

    if (!title.trim() && !voiceText.trim() && effectivePhotos.length === 0 && effectiveFiles.length === 0) {
      alert("상신할 업무 제목 또는 수집 자료를 첨부해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const smartTitle = 
        title.trim() || 
        (effectiveFiles.length > 0 && effectiveFiles[0]?.name ? effectiveFiles[0].name.replace(/\.[^/.]+$/, "") : "") || 
        (effectivePhotos.length > 0 && effectivePhotos[0]?.name ? effectivePhotos[0].name.replace(/\.[^/.]+$/, "") : "") || 
        (voiceText.trim() ? voiceText.trim().substring(0, 30) : "현장 업무 접수");

      if (targetType === "TODO") {
        await onSendGovernanceRequest(smartTitle, voiceText, effectivePhotos, effectiveFiles);
      } else {
        if (!selectedFolderId) {
          alert("보관할 태스크 폴더를 선택해 주세요.");
          setIsSubmitting(false);
          return;
        }
        await onSaveToTaskFolder(selectedFolderId, smartTitle, effectivePhotos, effectiveFiles);
      }
      setTitle("");
      setVoiceText("");
      setLocalPhotos([]);
      setLocalFiles([]);
      onClose();
    } catch (err: any) {
      alert("등록 실패: " + (err.message || "오류가 발생했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-scale-in max-h-[85vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">자료 & 업무 등록</h3>
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
            {/* 등록 대상 선택 세그먼트 (할 일 vs 특정 태스크 폴더) */}
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

            {/* 📦 숨김 파일/사진 인풋 필드 */}
            <input
              type="file"
              ref={photoInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const selectedFiles = e.target.files;
                if (!selectedFiles || selectedFiles.length === 0) return;
                Array.from(selectedFiles).forEach((file) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64Str = reader.result as string;
                    const newPhoto = { name: file.name, preview: base64Str, base64: base64Str };
                    setLocalPhotos((prev) => [...prev, newPhoto]);
                    if (onAddPhoto) onAddPhoto(newPhoto);
                  };
                  reader.readAsDataURL(file);
                });
                if (e.target) e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              multiple
              className="hidden"
              onChange={(e) => {
                const selectedFiles = e.target.files;
                if (!selectedFiles || selectedFiles.length === 0) return;
                Array.from(selectedFiles).forEach((file) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64Str = reader.result as string;
                    const newFile = {
                      name: file.name,
                      size: (file.size / 1024).toFixed(1) + " KB",
                      type: file.type || "application/octet-stream",
                      preview: base64Str,
                      base64: base64Str,
                      url: base64Str,
                    };
                    setLocalFiles((prev) => [...prev, newFile]);
                    if (onAddFile) onAddFile(newFile);
                  };
                  reader.readAsDataURL(file);
                });
                if (e.target) e.target.value = "";
              }}
            />

            {/* 📦 등록된 자료 목록 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400">
                  등록된 자료 ({localPhotos.length + localFiles.length}건)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-lg border border-indigo-200/80 cursor-pointer"
                  >
                    📷 사진 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-lg border border-amber-200/80 cursor-pointer"
                  >
                    📎 서류 첨부
                  </button>
                </div>
              </div>

              {localPhotos.length > 0 || localFiles.length > 0 ? (
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {localPhotos.map((p, idx) => (
                    <div
                      key={`p_${idx}`}
                      className="flex items-center justify-between bg-white p-1.5 px-2 rounded-xl border border-slate-150 text-xs"
                    >
                      <div
                        onClick={() => handleOpenPreview({ name: p.name, preview: p.preview, type: "IMAGE" })}
                        className="flex items-center gap-2 truncate cursor-pointer hover:text-indigo-600 transition-colors flex-1"
                      >
                        <img src={p.preview} alt={p.name} className="w-6 h-6 object-cover rounded-md border border-slate-200" />
                        <span className="truncate max-w-[150px] font-bold text-slate-700 text-[11px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview({ name: p.name, preview: p.preview, type: "IMAGE" })}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                          title="미리보기"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLocalPhotos((prev) => prev.filter((_, i) => i !== idx));
                            onRemovePhoto(idx);
                          }}
                          className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 border-none bg-transparent cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {localFiles.map((f, idx) => (
                    <div
                      key={`f_${idx}`}
                      className="flex items-center justify-between bg-white p-1.5 px-2 rounded-xl border border-slate-150 text-xs"
                    >
                      <div
                        onClick={() => handleOpenPreview({ name: f.name, preview: f.url || f.preview, type: "DOCUMENT" })}
                        className="flex items-center gap-2 truncate cursor-pointer hover:text-indigo-600 transition-colors flex-1"
                      >
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[150px] font-bold text-slate-700 text-[11px]">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview({ name: f.name, preview: f.url || f.preview, type: "DOCUMENT" })}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                          title="미리보기"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLocalFiles((prev) => prev.filter((_, i) => i !== idx));
                            onRemoveFile(idx);
                          }}
                          className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 border-none bg-transparent cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs font-bold">
                  등록된 사진/음성/문서/링크가 없습니다. 하단 + 버튼을 눌러 추가하세요.
                </div>
              )}
            </div>

            {/* 🎤 음성 및 추가 텍스트 메모 (실시간 음성-텍스트 변환 STT 연동) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-400">
                  음성 / 추가 메모
                </label>
                <button
                  type="button"
                  onClick={isSTTListening ? stopSTT : startSTT}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border-none cursor-pointer flex items-center gap-1 transition-all ${
                    isSTTListening
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                  }`}
                  title="음성으로 말하여 입력"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isSTTListening ? "🔴 음성 인식 중 (터치 시 정지)" : "🎤 음성으로 입력"}</span>
                </button>
              </div>
              <textarea
                rows={2}
                onFocus={() => {
                  if (!isSTTListening && !voiceText) {
                    startSTT();
                  }
                }}
                placeholder="입력 박스를 선택하거나 🎤 음성으로 입력 버튼을 누르고 말씀하시면 텍스트로 자동 변환됩니다."
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                className={`w-full bg-slate-50 border rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none resize-none transition-all ${
                  isSTTListening
                    ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/30"
                    : "border-slate-200 focus:border-indigo-500 focus:bg-white"
                }`}
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
                <span>{isSubmitting ? "등록 중..." : targetType === "TODO" ? "할 일에 등록" : "태스크 폴더에 저장"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 🔍 수집 항목 파일명 터치 시 팝업 미리보기 모달 */}
      <MobileItemViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        item={viewerItem}
      />
    </>
  );
};
