import React from "react";
import { X, Camera, Mic, FileText, Send } from "lucide-react";

interface SnapControllerProps {
  attachedFile: File | null;
  attachedFileType: 'IMAGE' | 'PDF' | 'AUDIO' | 'LINK' | 'TEXT';
  setAttachedFile: (file: File | null) => void;
  setAttachedFileBase64: (val: string) => void;
  contentText: string;
  setContentText: (val: string) => void;
  snapping: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF' | 'AUDIO') => void;
  onSnapSubmit: (e: React.FormEvent) => void;
}

export function SnapController({
  attachedFile,
  attachedFileType,
  setAttachedFile,
  setAttachedFileBase64,
  contentText,
  setContentText,
  snapping,
  fileInputRef,
  onFileChange,
  onSnapSubmit
}: SnapControllerProps) {
  return (
    <div className="bg-slate-900/90 border-t border-slate-800 p-4 sticky bottom-0 z-40 backdrop-blur-md shrink-0">
      <form onSubmit={onSnapSubmit} className="max-w-lg mx-auto space-y-3.5">
        
        {/* 파일 첨부 프레임 */}
        {attachedFile && (
          <div className="bg-slate-950 border border-indigo-500/20 p-2.5 rounded-2xl flex items-center justify-between text-xs font-semibold animate-scale-up">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                {attachedFileType}
              </span>
              <span className="text-slate-300 truncate max-w-xs">{attachedFile.name}</span>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setAttachedFile(null);
                setAttachedFileBase64("");
              }} 
              className="p-1 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 border-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 입력란 + 액션 버튼 트레이 */}
        <div className="flex items-end gap-2.5 relative">
          
          {/* 수기 텍스트 인풋 */}
          <div className="flex-1 bg-slate-950 border border-slate-850 rounded-2xl px-3.5 py-2.5 flex flex-col focus-within:border-indigo-500 transition-colors">
            <textarea 
              value={contentText}
              onChange={e => setContentText(e.target.value)}
              placeholder={attachedFile ? "이 파일에 대한 핵심 미팅 요약 메모를 적어주세요..." : "상담 수기 메모 기입 또는 지도 위치 공유 링크 붙여넣기..."}
              className="w-full bg-transparent outline-none resize-none text-xs font-semibold text-slate-200 placeholder-slate-650 h-10 scrollbar-none border-0 p-0 focus:ring-0"
            />
            
            {/* 퀵 미디어 첨부 단추들 */}
            <div className="flex gap-3 pt-2.5 border-t border-slate-900 mt-2 text-slate-500">
              <input 
                type="file" 
                id="snapImage" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={e => onFileChange(e, 'IMAGE')}
                className="hidden" 
              />
              <label htmlFor="snapImage" className="hover:text-indigo-400 cursor-pointer flex items-center gap-1 text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>카메라</span>
              </label>

              <input 
                type="file" 
                id="snapAudio" 
                accept="audio/*" 
                onChange={e => onFileChange(e, 'AUDIO')}
                className="hidden" 
              />
              <label htmlFor="snapAudio" className="hover:text-indigo-400 cursor-pointer flex items-center gap-1 text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors">
                <Mic className="w-3.5 h-3.5" />
                <span>녹취음성</span>
              </label>

              <input 
                type="file" 
                id="snapPdf" 
                accept="application/pdf" 
                onChange={e => onFileChange(e, 'PDF')}
                className="hidden" 
              />
              <label htmlFor="snapPdf" className="hover:text-indigo-400 cursor-pointer flex items-center gap-1 text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors">
                <FileText className="w-3.5 h-3.5" />
                <span>문서 PDF</span>
              </label>
            </div>
          </div>

          {/* 전송 단추 */}
          <button
            type="submit"
            disabled={snapping || (!contentText.trim() && !attachedFile)}
            className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-xs shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all shrink-0 disabled:opacity-40 animate-pulse border-0 cursor-pointer"
          >
            {snapping ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>

        </div>
      </form>
    </div>
  );
}
