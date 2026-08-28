"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, UploadCloud, FileText, Image as ImageIcon, Film, Music, 
  Compass, Trash2, Loader2, Plus, Sparkles, Folder, CheckCircle2,
  Mic, MicOff
} from "lucide-react";

export type FileCategory = "IMAGE" | "VIDEO" | "AUDIO" | "CAD" | "DOCUMENT";

export function detectFileCategory(fileName: string, mimeType?: string): FileCategory {
  const name = (fileName || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (mime.startsWith("image/") || name.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i)) {
    return "IMAGE";
  }
  if (mime.startsWith("video/") || name.match(/\.(mp4|mov|avi|mkv|wmv|webm|3gp)$/i)) {
    return "VIDEO";
  }
  if (mime.startsWith("audio/") || name.match(/\.(mp3|m4a|wav|aac|ogg|flac)$/i)) {
    return "AUDIO";
  }
  if (name.match(/\.(dwg|dxf|stp|step|iges|igs|sldprt|catpart|stl)$/i)) {
    return "CAD";
  }
  return "DOCUMENT";
}

interface MobileTaskRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGovernanceRequest?: (title: string, note: string, photos?: any[], files?: any[]) => Promise<void>;
  onSaveToTaskFolder?: (folderId: string, title: string, photos?: any[], files?: any[]) => Promise<void>;
  taskFolders?: Array<{ id: string; name: string; title?: string }>;
  photos?: any[];
  files?: any[];
  voiceText?: string;
  setVoiceText?: (text: string) => void;
  onRemovePhoto?: (idx: number) => void;
  onRemoveFile?: (idx: number) => void;
  onAddPhoto?: (p: any) => void;
  onAddFile?: (f: any) => void;
}

export function MobileTaskRequestModal({
  isOpen,
  onClose,
  onSendGovernanceRequest,
  taskFolders = [],
}: MobileTaskRequestModalProps) {
  const [targetType, setTargetType] = useState<"TODO" | "FOLDER">("TODO");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // 모달 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setNote("");
      setSelectedFiles([]);
      setIsSubmitting(false);
      setIsRecording(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const incomingFiles = Array.from(e.target.files);
    
    setSelectedFiles((prev) => [...prev, ...incomingFiles]);

    // 제목이 비어있다면 첫 번째 파일명으로 자동 추천
    setTitle((prev) => {
      if (!prev.trim() && incomingFiles.length > 0) {
        return incomingFiles[0].name.replace(/\.[^/.]+$/, "");
      }
      return prev;
    });

    if (e.target) e.target.value = "";
  };

  // 파일 삭제 핸들러
  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 음성 녹음 토글
  const toggleVoiceRecording = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("현재 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setNote((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (err) {
        console.error("음성 녹음 시작 실패:", err);
        setIsRecording(false);
      }
    }
  };

  // 🚀 최종 제출 핸들러 (브라우저 표준 FormData 단일 직송 전송 + 이지데스크 MCP 스토리지 자동 연동)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle && !note.trim() && selectedFiles.length === 0) {
      alert("상신할 업무 제목 또는 수집 자료를 첨부해 주세요.");
      return;
    }

    if (targetType === "FOLDER" && !selectedFolderId) {
      alert("자료를 보관할 태스크 폴더를 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalTitle = 
        trimmedTitle || 
        (selectedFiles.length > 0 ? selectedFiles[0].name.replace(/\.[^/.]+$/, "") : "") || 
        (note.trim() ? note.trim().substring(0, 30) : "현장 업무 접수");

      // 📦 브라우저 표준 FormData 패키징 (Base64 변환 없음, 용량 팽창 0%)
      const formData = new FormData();
      formData.append("title", finalTitle);
      formData.append("doc_title", finalTitle);
      formData.append("note", note.trim());
      formData.append("reason", note.trim());
      formData.append("targetType", targetType);
      
      if (targetType === "FOLDER") {
        formData.append("folder_id", selectedFolderId);
      }

      // 실물 파일 바이너리 직송
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/governance?action=create_log", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "서버 응답 오류가 발생했습니다.");
      }

      alert("🎉 업무 상신 및 실물 파일 첨부가 완벽하게 등록되었습니다!");
      
      // 화면 갱신
      if (onSendGovernanceRequest) {
        // 부모의 fetchTasks() 유도를 위한 완료 트리거
        try {
          await onSendGovernanceRequest(finalTitle, note.trim(), [], []);
        } catch {}
      }
      
      onClose();
    } catch (err: any) {
      console.error("상신 제출 실패:", err);
      alert("등록 실패: " + (err.message || "오류가 발생했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 파일 카테고리 아이콘 렌더러
  const renderCategoryIcon = (category: FileCategory) => {
    switch (category) {
      case "IMAGE":
        return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case "VIDEO":
        return <Film className="w-4 h-4 text-purple-500" />;
      case "AUDIO":
        return <Music className="w-4 h-4 text-rose-500" />;
      case "CAD":
        return <Compass className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col relative">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">현장 업무 자료 상신</h3>
              <p className="text-[11px] text-slate-400 font-bold">실물 파일 첨부 및 태스크 자동 발급</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {/* 목적지 선택: 할 일 등록 vs 태스크 폴더 */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setTargetType("TODO")}
              className={`py-2 rounded-xl text-xs font-black transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                targetType === "TODO"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 bg-transparent"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>할 일 대장에 상신</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetType("FOLDER")}
              className={`py-2 rounded-xl text-xs font-black transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                targetType === "FOLDER"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 bg-transparent"
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>태스크 폴더에 저장</span>
            </button>
          </div>

          {/* 태스크 폴더 선택 (FOLDER 모드일 때) */}
          {targetType === "FOLDER" && (
            <div>
              <label className="text-[11px] font-black text-slate-500 block mb-1">
                저장할 태스크 폴더 <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              >
                <option value="">태스크 폴더를 선택하세요</option>
                {taskFolders.map((tf) => (
                  <option key={tf.id} value={tf.id}>
                    {tf.name || tf.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 제목 입력 */}
          <div>
            <label className="text-[11px] font-black text-slate-500 block mb-1">
              업무 / 자료 제목 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="예: [상신] 동양특수금속 수주 접수 (또는 777)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* 파일 첨부 영역 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black text-slate-500">
                첨부 자료 ({selectedFiles.length}건)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[11px] rounded-xl border border-indigo-200/80 cursor-pointer flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>사진 / 동영상 / 음성 / CAD / 문서 첨부</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="*/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* 선택된 파일 목록 */}
            {selectedFiles.length > 0 ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, idx) => {
                  const category = detectFileCategory(file.name, file.type);
                  const sizeStr = file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(file.size / 1024).toFixed(0)} KB`;

                  return (
                    <div
                      key={`${file.name}_${idx}`}
                      className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-2xs gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                          {renderCategoryIcon(category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-xs truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{sizeStr}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border-none bg-transparent cursor-pointer shrink-0 transition-colors"
                        title="첨부 파일 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors"
              >
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-600">터치하여 파일 및 사진을 첨부하세요</p>
                <p className="text-[10px] text-slate-400">고화질 사진(7MB+), 동영상, CAD 도면, 녹음 파일 등 원본 그대로 전송</p>
              </div>
            )}
          </div>

          {/* 상세 메모 및 음성 입력 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-black text-slate-500">
                상세 메모 / 현장 지시 사항
              </label>
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border-none cursor-pointer flex items-center gap-1 transition-all ${
                  isRecording
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>{isRecording ? "음성 인식 중..." : "음성 입력"}</span>
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="현장 특이사항, 납기 요청 또는 전달 사항을 작성하세요..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors resize-none"
            />
          </div>

          {/* 하단 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>실물 파일 업로드 및 상신 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{targetType === "TODO" ? "할 일에 상신 등록하기 🚀" : "태스크 폴더에 저장하기 📁"}</span>
                </>
              )}
                )}
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
