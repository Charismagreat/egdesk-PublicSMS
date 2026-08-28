"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, Send, Sparkles, FileText, Trash2, Eye, Mic, 
  Image as ImageIcon, Film, Music, Compass, Loader2 
} from "lucide-react";
import { MobileItemViewerModal } from "./MobileItemViewerModal";

export type FileCategory = "IMAGE" | "VIDEO" | "AUDIO" | "CAD" | "DOCUMENT";

export interface AttachmentItem {
  id: string;
  name: string;
  size: string;
  type: string;
  category: FileCategory;
  base64: string;
  preview: string;
  url?: string;
}

export interface RequestPhoto {
  name: string;
  preview: string;
  base64: string;
  type?: string;
}

export interface RequestFile {
  name: string;
  size: string;
  type: string;
  isLink?: boolean;
  url?: string;
  preview?: string;
  base64?: string;
}

interface MobileTaskRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos?: RequestPhoto[];
  files?: RequestFile[];
  voiceText: string;
  setVoiceText: (text: string | ((prev: string) => string)) => void;
  onRemovePhoto?: (index: number) => void;
  onRemoveFile?: (index: number) => void;
  onAddPhoto?: (photo: RequestPhoto) => void;
  onAddFile?: (file: RequestFile) => void;
  taskFolders: any[];
  onSendGovernanceRequest: (title: string, note: string, photos?: any[], files?: any[]) => Promise<void>;
  onSaveToTaskFolder: (folderId: string, title: string, photos?: any[], files?: any[]) => Promise<void>;
}

export function detectFileCategory(fileName: string, mimeType?: string): FileCategory {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "gif", "svg"].includes(ext)) {
    return "IMAGE";
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "webm", "mkv", "wmv"].includes(ext)) {
    return "VIDEO";
  }
  if (mime.startsWith("audio/") || ["mp3", "m4a", "wav", "aac", "ogg", "flac"].includes(ext)) {
    return "AUDIO";
  }
  if (["dwg", "dxf", "stp", "step", "iges", "igs", "sldprt", "catpart"].includes(ext)) {
    return "CAD";
  }
  return "DOCUMENT";
}

export const MobileTaskRequestModal: React.FC<MobileTaskRequestModalProps> = ({
  isOpen,
  onClose,
  photos = [],
  files = [],
  voiceText,
  setVoiceText,
  taskFolders,
  onSendGovernanceRequest,
  onSaveToTaskFolder,
}) => {
  const [targetType, setTargetType] = useState<"TODO" | "FOLDER">("TODO");
  const [title, setTitle] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // 모달이 열릴 때 props로 전달된 photos/files를 attachments에 병합
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setAttachments([]);
      return;
    }

    const itemsFromProps: AttachmentItem[] = [];

    (photos || []).forEach((p, idx) => {
      if (p.base64 || p.preview) {
        itemsFromProps.push({
          id: `prop_p_${idx}_${Date.now()}`,
          name: p.name || `사진_${idx + 1}.jpg`,
          size: "이미지",
          type: p.type || "image/jpeg",
          category: "IMAGE",
          base64: p.base64 || p.preview,
          preview: p.preview || p.base64,
        });
      }
    });

    (files || []).forEach((f, idx) => {
      const category = detectFileCategory(f.name, f.type);
      itemsFromProps.push({
        id: `prop_f_${idx}_${Date.now()}`,
        name: f.name || `첨부파일_${idx + 1}`,
        size: f.size || "파일",
        type: f.type || "application/octet-stream",
        category: category,
        base64: f.base64 || f.preview || f.url || "",
        preview: f.preview || f.base64 || f.url || "",
      });
    });

    if (itemsFromProps.length > 0) {
      setAttachments((prev) => {
        const next = [...prev];
        itemsFromProps.forEach((it) => {
          if (!next.some((n) => n.name === it.name && (n.base64 === it.base64 || n.preview === it.preview))) {
            next.push(it);
          }
        });
        return next;
      });
    }
  }, [isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerItem, setViewerItem] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isSTTListening, setIsSTTListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  const startSTT = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("현재 브라우저에서 음성 인식을 지원하지 않습니다.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => setIsSTTListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setVoiceText((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsSTTListening(false);
      recognition.onend = () => setIsSTTListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsSTTListening(false);
    }
  };

  const stopSTT = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsSTTListening(false);
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsReadingFiles(true);
    const fileList = Array.from(selectedFiles);

    try {
      const readPromises = fileList.map((file) => {
        return new Promise<AttachmentItem>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64Str = reader.result as string;
            const category = detectFileCategory(file.name, file.type);
            const sizeStr = file.size > 1024 * 1024 
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
              : `${(file.size / 1024).toFixed(0)} KB`;

            resolve({
              id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: sizeStr,
              type: file.type || "application/octet-stream",
              category: category,
              base64: base64Str,
              preview: base64Str,
            });
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      });

      const newItems = await Promise.all(readPromises);
      setAttachments((prev) => [...prev, ...newItems]);

      if (!title.trim() && newItems.length > 0) {
        const pureName = newItems[0].name.replace(/\.[^/.]+$/, "");
        setTitle(pureName);
      }
    } catch (readErr) {
      console.error("파일 로드 중 오류:", readErr);
      alert("파일을 읽는 도중 오류가 발생했습니다.");
    } finally {
      setIsReadingFiles(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleOpenPreview = (item: AttachmentItem) => {
    setViewerItem({
      name: item.name,
      url: item.base64 || item.preview,
      preview: item.preview || item.base64,
      type: item.category,
      category: item.category
    });
    setIsViewerOpen(true);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadingFiles) {
      alert("⏳ 첨부 파일을 변환 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle && !voiceText.trim() && attachments.length === 0) {
      alert("상신할 업무 제목 또는 수집 자료를 첨부해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const smartTitle = 
        trimmedTitle || 
        (attachments.length > 0 ? attachments[0].name.replace(/\.[^/.]+$/, "") : "") || 
        (voiceText.trim() ? voiceText.trim().substring(0, 30) : "현장 업무 접수");

      const photosPayload = attachments
        .filter((a) => a.category === "IMAGE")
        .map((a) => ({ name: a.name, preview: a.preview, base64: a.base64, type: a.type }));

      const filesPayload = attachments
        .map((a) => ({
          name: a.name,
          size: a.size,
          type: a.type,
          category: a.category,
          preview: a.preview,
          base64: a.base64,
          url: a.base64,
        }));

      if (targetType === "TODO") {
        await onSendGovernanceRequest(smartTitle, voiceText, photosPayload, filesPayload);
      } else {
        if (!selectedFolderId) {
          alert("보관할 태스크 폴더를 선택해 주세요.");
          setIsSubmitting(false);
          return;
        }
        await onSaveToTaskFolder(selectedFolderId, smartTitle, photosPayload, filesPayload);
      }

      setTitle("");
      setVoiceText("");
      setAttachments([]);
      onClose();
    } catch (err: any) {
      alert("등록 실패: " + (err.message || "오류가 발생했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCategoryBadge = (category: FileCategory) => {
    switch (category) {
      case "IMAGE":
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><ImageIcon className="w-3 h-3" /> 사진</span>;
      case "VIDEO":
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"><Film className="w-3 h-3" /> 동영상</span>;
      case "AUDIO":
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><Music className="w-3 h-3" /> 녹음</span>;
      case "CAD":
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"><Compass className="w-3 h-3" /> CAD도면</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><FileText className="w-3 h-3" /> 문서</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-scale-in max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Sparkles className="w-5 h-5" /></div>
              <h3 className="font-extrabold text-base text-slate-800">자료 & 업무 등록</h3>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">등록 대상 선택</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setTargetType("TODO")} className={`py-2 px-3 text-xs font-black rounded-xl transition-all border-none cursor-pointer ${targetType === "TODO" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-transparent"}`}>📌 할 일에 등록</button>
                <button type="button" onClick={() => setTargetType("FOLDER")} className={`py-2 px-3 text-xs font-black rounded-xl transition-all border-none cursor-pointer ${targetType === "FOLDER" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-transparent"}`}>📁 태스크 폴더</button>
              </div>
            </div>

            {targetType === "TODO" ? (
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-1">할 일 / 업무 제목 <span className="text-rose-500">*</span></label>
                <input type="text" required placeholder="예: [상신] 동양특수금속 수주 접수" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white" />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block mb-1">보관할 태스크 폴더 선택</label>
                  <select required value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500">
                    <option value="">태스크 폴더를 선택하세요</option>
                    {taskFolders.map((tf) => <option key={tf.id} value={tf.id}>{tf.name || tf.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 block mb-1">자료 구분 제목</label>
                  <input type="text" placeholder="예: 현장 시방서 및 도면 자료 수집" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white" />
                </div>
              </div>
            )}

            <input type="file" ref={fileInputRef} accept="*/*" multiple className="hidden" onChange={handleFilesSelected} />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">첨부 자료 ({attachments.length}건) {isReadingFiles && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}</span>
                <button type="button" disabled={isReadingFiles} onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-700 font-extrabold text-[11px] rounded-xl border border-indigo-200/80 cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95">➕ 파일 / 사진 / 동영상 / CAD 첨부</button>
              </div>

              {attachments.length > 0 ? (
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {attachments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-150 text-xs shadow-2xs">
                      <div onClick={() => handleOpenPreview(item)} className="flex items-center gap-2 truncate cursor-pointer hover:text-indigo-600 transition-colors flex-1">
                        {item.category === "IMAGE" ? <img src={item.preview} alt={item.name} className="w-7 h-7 object-cover rounded-lg border border-slate-200 shrink-0" /> : <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">{renderCategoryBadge(item.category)}</div>}
                        <div className="truncate flex flex-col"><span className="truncate max-w-[140px] font-bold text-slate-800 text-[11px]">{item.name}</span><span className="text-[9px] text-slate-400 font-mono">{item.size}</span></div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => handleOpenPreview(item)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"><Eye className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleRemoveAttachment(item.id)} className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 border-none bg-transparent cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-600">📷 사진, 🎬 영상, 🎙️ 녹음, 📐 CAD, 📄 문서</span>
                  <span className="text-[10px] text-slate-400">여기를 터치하여 파일을 첨부하세요</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-400">음성 / 추가 메모</label>
                <button type="button" onClick={isSTTListening ? stopSTT : startSTT} className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border-none cursor-pointer flex items-center gap-1 transition-all ${isSTTListening ? "bg-rose-500 text-white animate-pulse" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"}`}>
                  <Mic className="w-3 h-3" />
                  <span>{isSTTListening ? "🔴 음성 인식 중" : "🎤 음성으로 입력"}</span>
                </button>
              </div>
              <textarea rows={2} placeholder="현장 특이사항 및 세부 메모를 입력하세요." value={voiceText} onChange={(e) => setVoiceText(e.target.value)} className={`w-full bg-slate-50 border rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none resize-none transition-all ${isSTTListening ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/30" : "border-slate-200 focus:border-indigo-500 focus:bg-white"}`} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-none cursor-pointer">취소</button>
              <button type="submit" disabled={isSubmitting || isReadingFiles} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-black text-xs rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
                {isReadingFiles ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>자료 변환 중...</span></>
                ) : isSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>등록 중...</span></>
                ) : (
                  <><Send className="w-3.5 h-3.5" /><span>{targetType === "TODO" ? "할 일에 등록" : "태스크 폴더에 저장"}</span></>
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
