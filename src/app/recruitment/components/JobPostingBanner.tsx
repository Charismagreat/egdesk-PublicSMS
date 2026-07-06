"use client";

import React, { useState, useEffect } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { JobPosting } from "../types";

interface JobPostingBannerProps {
  /**
   * 활성화된 채용 공고 정보
   */
  jobPosting: JobPosting;
  /**
   * 구인공고 링크 복사 성공 상태
   */
  copiedLink: boolean;
  /**
   * 링크 복사 핸들러
   */
  onCopyLink: () => void;
  /**
   * 링크 열기 핸들러
   */
  onOpenLink: () => void;
}

/**
 * 채용 공고가 활성화되었을 때 상단에 표시되는 배포 링크 배너 컴포넌트
 */
export default function JobPostingBanner({
  jobPosting,
  copiedLink,
  onCopyLink,
  onOpenLink,
}: JobPostingBannerProps) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  return (
    <div className="px-6 py-4 bg-slate-100 border-b border-slate-300 flex items-center justify-between shrink-0 animate-fade-in gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-gradient-to-r from-[#f91f7f] to-[#e84e27] text-white text-[9px] font-black px-2.5 py-0.5 rounded border border-transparent uppercase tracking-wider">
            Live Ad
          </span>
          <h3 className="text-xs font-black text-slate-950 truncate">{jobPosting.title}</h3>
        </div>
        <p className="text-[10px] text-slate-700 font-extrabold truncate">
          스폰서드 모바일 채용 링크:{" "}
          <span className="text-[#d91b5c] font-black underline cursor-pointer" onClick={onOpenLink}>
            {origin}/m/recruitment
          </span>
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onCopyLink}
          className={`text-xs px-3 py-2 rounded-xl font-black transition-all border flex items-center gap-1 cursor-pointer ${
            copiedLink
              ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-sm"
          }`}
        >
          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedLink ? "카피완료" : "구인링크 카피"}
        </button>
        <button
          onClick={onOpenLink}
          className="text-xs bg-gradient-to-tr from-[#f91f7f] to-[#e84e27] hover:opacity-90 text-white px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-1 cursor-pointer border border-[#f91f7f]/30 shadow-md"
        >
          <ExternalLink className="w-3.5 h-3.5" /> 지원자 탭 오픈
        </button>
      </div>
    </div>
  );
}
