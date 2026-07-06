import React, { useRef } from 'react';
import { Sparkles, FileText, Loader2, UploadCloud } from 'lucide-react';

interface AiVisionTerminalProps {
  aiVisionLoading: boolean;
  scanningLine: boolean;
  onOpenItemModal: () => void;
  onFileSelect?: (file: File) => void; // 실제 파일 OCR 분석 트리거용
}

export const AiVisionTerminal: React.FC<AiVisionTerminalProps> = ({
  aiVisionLoading,
  scanningLine,
  onOpenItemModal,
  onFileSelect
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBoxClick = () => {
    if (aiVisionLoading) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    // 동일 파일 연속 업로드 시에도 이벤트가 항상 발생하도록 파일 인풋 값 리셋
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (aiVisionLoading) return;
    const file = e.dataTransfer.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 bg-indigo-50 text-indigo-600 rounded-bl-2xl font-bold text-[10px] uppercase flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5 animate-spin" /> Vision OCR AI Engine
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          <span>AI 비전 명세서 분석 입고</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          매입 영수증이나 인보이스 사진을 드래그해 넣으면 AI가 분석하여 품목, 단가, 거래처 등을 파싱해 입력폼에 채웁니다.
        </p>
      </div>

      {/* 숨겨진 파일 인풋 */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 영수증/인보이스 드롭존 & 실제 스캔 가능 구역 */}
      <div 
        onClick={handleBoxClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 min-h-[140px] overflow-hidden group cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-300/60 transition-all"
      >
        {scanningLine && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-bounce z-20"></div>
        )}
        {aiVisionLoading ? (
          <div className="flex flex-col items-center space-y-2 z-10">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-indigo-600 font-semibold animate-pulse">명세서 이미지 픽셀 스캔 및 분석 중...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-2">
            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform" />
            <div className="text-xs text-slate-500">
              <span className="text-indigo-500 font-bold hover:underline cursor-pointer">실제 이미지/PDF 파일 찾아보기</span> 또는 드래그 앤 드롭
            </div>
            <div className="text-[10px] text-slate-400">PNG, JPG, PDF (Gemini 실시간 연동 지원)</div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
        <span>* 실제 파일 업로드 시 <strong className="text-indigo-600">실시간 AI OCR 모달</strong>이 팝업되어 입고를 일괄 승인합니다.</span>
      </div>
    </div>
  );
};
