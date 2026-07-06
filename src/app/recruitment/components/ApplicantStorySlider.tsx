"use client";

import React from "react";
import { Applicant } from "../types";

interface ApplicantStorySliderProps {
  /**
   * 지원자 목록
   */
  applicants: Applicant[];
  /**
   * 선택된 지원자
   */
  selectedApplicant: Applicant | null;
  /**
   * 지원자 선택 핸들러
   */
  onSelectApplicant: (app: Applicant) => void;
}

/**
 * 실시간 구직자 스토리 링 슬라이더 목록 컴포넌트
 */
export default function ApplicantStorySlider({
  applicants,
  selectedApplicant,
  onSelectApplicant,
}: ApplicantStorySliderProps) {
  if (applicants.length === 0) return null;

  return (
    <div className="px-6 py-4 border-b border-slate-300 bg-slate-100/60 flex flex-col gap-2 shrink-0">
      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
        실시간 유입 구직자 스토리 ({applicants.length}명)
      </span>
      <div className="flex gap-4 overflow-x-auto py-1 no-scrollbar">
        {applicants.map((app) => {
          const isSelected = selectedApplicant?.id === app.id;
          return (
            <div
              key={app.id}
              onClick={() => onSelectApplicant(app)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group transition-all"
            >
              {/* 인스타 스토리 링 스타일 아바타 (화이트 배경 대비 뚜렷하게) */}
              <div
                className={`p-[2px] rounded-full transition-all ${
                  app.status === "approved"
                    ? "bg-emerald-600 scale-105"
                    : isSelected
                    ? "bg-gradient-to-tr from-[#ffd016] via-[#f91f7f] to-[#9b2bb4] scale-105"
                    : "bg-slate-300 group-hover:bg-gradient-to-tr group-hover:from-[#f91f7f] group-hover:to-[#9b2bb4]"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-white overflow-hidden">
                  <span className="text-xs font-black text-slate-900">{app.name.substring(0, 2)}</span>
                </div>
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-black truncate max-w-[65px] ${isSelected ? "text-[#d91b5c]" : "text-slate-900"}`}>
                  {app.name}
                </p>
                <span className="text-[8px] font-black text-slate-800 bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm">
                  {app.matchingScore}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
