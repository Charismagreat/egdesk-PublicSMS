'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MobileSpeechOpinionModalProps {
  opinionModalType: 'REJECTED' | 'HOLD';
  onClose: () => void;
  approvalOpinion: string;
  setApprovalOpinion: (s: string) => void;
  isListening: boolean;
  handleToggleSpeech: () => void;
  handleOpinionSubmit: () => void;
  isSubmitting: boolean;
}

export default function MobileSpeechOpinionModal({
  opinionModalType,
  onClose,
  approvalOpinion,
  setApprovalOpinion,
  isListening,
  handleToggleSpeech,
  handleOpinionSubmit,
  isSubmitting
}: MobileSpeechOpinionModalProps) {
  return (
    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl border border-slate-100 animate-scale-up">
        
        <div className="p-4 border-b border-slate-50">
          <h5 className="text-[11px] font-black text-slate-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            대표 결재 {opinionModalType === 'REJECTED' ? '반려' : '보류'} 의견 작성
          </h5>
        </div>

        <div className="p-4 space-y-2">
          <label className="block text-[9px] font-extrabold text-slate-455 mb-0.5">
            {opinionModalType === 'REJECTED' ? '반려' : '보류'} 처리 사유를 작성해주세요.
          </label>
          <div className="relative">
            <textarea
              id="opinion-textarea"
              value={approvalOpinion}
              onChange={e => setApprovalOpinion(e.target.value)}
              placeholder="예: 예산 한도 초과로 하반기에 다시 상신 바람."
              rows={3}
              className="w-full border border-slate-200 rounded-xl p-2.5 pr-10 outline-none font-bold text-[10px] bg-slate-50 text-slate-800 focus:ring-2 focus:ring-rose-500"
            />
            
            {/* 🎙️ 음성 인식 마이크 버튼 이식 */}
            <button
              id="speech-mic-btn"
              type="button"
              onClick={handleToggleSpeech}
              className={`absolute right-2 bottom-3 p-1.5 rounded-lg border-none cursor-pointer transition-all ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              title="음성으로 의견 받아쓰기"
            >
              🎙️
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            id="opinion-submit-btn"
            onClick={handleOpinionSubmit}
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black text-white border-none cursor-pointer ${
              opinionModalType === 'REJECTED' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            의견 제출 및 결재 완료
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-[10px] border-none cursor-pointer"
          >
            취소
          </button>
        </div>

      </div>
    </div>
  );
}
