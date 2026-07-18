"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { JobPosting } from "../types";

interface ContractSigningProps {
  jobPosting: JobPosting | null;
  name: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasSigned: boolean;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  clearCanvas: () => void;
  onSubmitContract: () => void;
}

export function ContractSigning({
  jobPosting,
  name,
  canvasRef,
  hasSigned,
  startDrawing,
  draw,
  stopDrawing,
  clearCanvas,
  onSubmitContract
}: ContractSigningProps) {
  return (
    <div className="space-y-4 animate-fade-in text-left text-slate-800">
      <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 shrink-0">
        <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
        <p className="text-[10px] font-black text-emerald-600">축하합니다! 모바일 근로계약서 성사 단계</p>
      </div>

      {/* 표준근로계약서 문서화 렌더 */}
      <div className="bg-white text-slate-900 p-4.5 rounded-2xl shadow-md border border-slate-200 space-y-3 font-sans text-[10px] leading-relaxed">
        <h2 className="text-xs font-black text-center border-b-2 border-slate-800 pb-2 text-slate-900">표준근로계약서</h2>
        <div className="text-slate-600">
          <p><strong>갑 (매장대표)</strong>: EGDESK 제휴 매장</p>
          <p><strong>을 (근로자)</strong>: {name}</p>
        </div>
        <div className="text-slate-800 space-y-1 border-t border-slate-100 pt-2 font-semibold">
          <p>• <strong>직무</strong>: {jobPosting?.category}</p>
          <p>• <strong>급여</strong>: {jobPosting?.salary}</p>
          <p>• <strong>시간</strong>: {jobPosting?.timeRange}</p>
          <p>• <strong>위치</strong>: {jobPosting?.location}</p>
        </div>
        <p className="text-[8px] text-slate-400 border-t border-slate-100 pt-2 leading-normal font-bold">※ 아래 스케치 패드에 마우스 또는 손가락으로 정식 실명 사인을 친필로 그리고 완료를 탭해 주세요.</p>
      </div>

      {/* 친필 서명 캔버스 그리기 보드 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-600 font-bold">을(근로자) 친필 서명</label>
          <button 
            onClick={clearCanvas} 
            className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-300 cursor-pointer font-bold"
          >
            새로 그리기
          </button>
        </div>
        <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-300 shadow-inner h-28 relative">
          <canvas 
            ref={canvasRef}
            width={360}
            height={112}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair touch-none"
          />
          {!hasSigned && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[10px] font-bold pointer-events-none">
               여기에 손가락이나 마우스로 사인을 하세요
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={onSubmitContract}
        disabled={!hasSigned}
        className={`w-full font-black text-xs py-3.5 rounded-xl border-0 shadow-lg transition-all cursor-pointer ${
          hasSigned 
            ? "bg-gradient-to-r from-[#f91f7f] to-[#e84e27] text-white active:scale-95" 
            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
        }`}
      >
        ✍️ 디지털 서명 제출 및 채용 확정
      </button>
    </div>
  );
}
