import React from "react";
import { Camera, Volume2, FileText, X, Plus } from "lucide-react";

interface PcSnapFormProps {
  contentText: string;
  setContentText: (val: string) => void;
  attachedFile: File | null;
  setAttachedFile: (val: File | null) => void;
  attachedFileType: "IMAGE" | "PDF" | "AUDIO" | "LINK" | "TEXT";
  setAttachedFileType: (val: "IMAGE" | "PDF" | "AUDIO" | "LINK" | "TEXT") => void;
  setAttachedFileBase64: (val: string) => void;
  snapping: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (file: File, type: "IMAGE" | "PDF" | "AUDIO") => void;
  handleSnapSubmit: (e: React.FormEvent) => void;
}

export function PcSnapForm({
  contentText,
  setContentText,
  attachedFile,
  setAttachedFile,
  attachedFileType,
  setAttachedFileBase64,
  snapping,
  fileInputRef,
  handleFileChange,
  handleSnapSubmit,
}: PcSnapFormProps) {
  const onFileChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>, type: "IMAGE" | "PDF" | "AUDIO") => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file, type);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 bg-white shrink-0">
      <form onSubmit={handleSnapSubmit} className="space-y-3">
        {/* 파일 첨부 미리보기 */}
        {attachedFile && (
          <div className="bg-slate-50 border border-indigo-500/10 p-2 rounded-xl flex items-center justify-between text-xs font-semibold animate-scale-up">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                {attachedFileType}
              </span>
              <span className="text-slate-700 truncate text-[11px] font-bold">{attachedFile.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttachedFile(null);
                setAttachedFileBase64("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2.5">
          {/* 텍스트 입력창 & 첨부 버튼 트레이 */}
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-indigo-500 focus-within:bg-white transition-all flex flex-col">
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder={
                attachedFile
                  ? "이 첨부파일에 대한 AI 자율 분석 및 조치 지시 요약 메모를 입력하세요..."
                  : "현장 업무 상담 메모 기입, 주소 링크 입력 또는 AI에게 자율 지시를 내려보세요..."
              }
              className="w-full bg-transparent outline-none resize-none text-xs font-semibold text-slate-750 placeholder-slate-400 h-12 scrollbar-none"
              onKeyDown={(e) => {
                // Ctrl+Enter 시 즉석 전송 편리 기능
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleSnapSubmit(e);
                }
              }}
            />

            {/* 파일 첨부 퀵 버튼 */}
            <div className="flex gap-4 pt-2 border-t border-slate-100 mt-2 text-slate-500 select-none">
              <input
                type="file"
                id="pcSnapImage"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => onFileChangeWrapper(e, "IMAGE")}
                className="hidden"
              />
              <label
                htmlFor="pcSnapImage"
                className="hover:text-indigo-600 cursor-pointer flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>이미지 첨부</span>
              </label>

              <input
                type="file"
                id="pcSnapAudio"
                accept="audio/*"
                onChange={(e) => onFileChangeWrapper(e, "AUDIO")}
                className="hidden"
              />
              <label
                htmlFor="pcSnapAudio"
                className="hover:text-indigo-600 cursor-pointer flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>음성/녹취</span>
              </label>

              <input
                type="file"
                id="pcSnapPdf"
                accept="application/pdf"
                onChange={(e) => onFileChangeWrapper(e, "PDF")}
                className="hidden"
              />
              <label
                htmlFor="pcSnapPdf"
                className="hover:text-indigo-600 cursor-pointer flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>문서 PDF</span>
              </label>

              <span className="text-[9px] text-slate-400 font-medium ml-auto self-center select-none font-mono">
                Ctrl + Enter 로 즉석 전송
              </span>
            </div>
          </div>

          {/* 전송 단추 */}
          <button
            type="submit"
            disabled={snapping || (!contentText.trim() && !attachedFile)}
            className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-xs shadow-md hover:from-indigo-500 hover:to-purple-550 transition-all shrink-0 disabled:opacity-40"
          >
            {snapping ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Plus className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
