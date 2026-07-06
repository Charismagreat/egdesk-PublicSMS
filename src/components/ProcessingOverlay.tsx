'use client';

import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

interface ProcessingOverlayProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

/**
 * AI 거버넌스 통제 및 데이터 처리 시 화면 전체를 덮어
 * 중복 조작을 방지하고 처리 진행 상태를 안내하는 공통 오버레이 컴포넌트입니다.
 */
export default function ProcessingOverlay({
  isOpen,
  title = '요청을 처리하는 중입니다',
  message = 'AI 통제 센터에서 데이터 무결성을 검증하고 안전하게 처리 중입니다. 잠시만 기다려 주세요.',
}: ProcessingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-opacity duration-300">
      <div className="relative flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-2xl max-w-md w-full mx-4 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* 아이콘 영역: 회전하는 로더와 고정된 AI ShieldCheck 엠블럼의 시각적 조합 */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
          <Loader2 className="w-20 h-20 text-indigo-500 animate-spin absolute" strokeWidth={1.5} />
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-950/80 border border-indigo-500/30 rounded-full shadow-inner shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
        </div>

        {/* 텍스트 정보 영역 */}
        <h3 className="text-lg font-semibold text-slate-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
          {message}
        </p>

        {/* 하단 투명 가이드 */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-medium bg-indigo-950/30 px-3 py-1.5 rounded-full border border-indigo-500/10">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
          AI 모니터링 활성화됨
        </div>
      </div>
    </div>
  );
}
