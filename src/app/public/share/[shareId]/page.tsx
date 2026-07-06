"use client";

import React from "react";
import { usePublicShare } from "./hooks/usePublicShare";
import { ShareLoading } from "./components/ShareLoading";
import { ShareError } from "./components/ShareError";
import { ShareHeader } from "./components/ShareHeader";
import { ShareChartSection } from "./components/ShareChartSection";
import { ShareBriefingSection } from "./components/ShareBriefingSection";

export default function PublicShareViewerPage() {
  const {
    dashboard,
    loading,
    error,
    specObj,
    sampleRows
  } = usePublicShare();

  if (loading) {
    return <ShareLoading />;
  }

  if (error || !dashboard) {
    return <ShareError error={error} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col leading-normal select-none">
      {/* 🚀 퍼블릭 탑 바 헤더 */}
      <ShareHeader 
        refreshInterval={dashboard.refresh_interval}
        lastRefreshedAt={dashboard.last_refreshed_at}
      />

      {/* 🎯 몰입형 단독 뷰 콘텐트 바디 */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* 대시보드 타이틀 정보 */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{dashboard.title}</h1>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-2xl">
            본 보고서는 최고관리자 자연어 분석 질의에 기반하여 Gemini AI 비즈니스 지능형 엔진과 4단계 보안 비식별화 가드레일을 통과해 실시간 생성 및 퍼블릭 공유된 안전 보고서입니다.
          </p>
        </div>

        {/* 웅장한 다크 테마 일체형 통합 대시보드 카드 */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8">
          {/* 📊 1. 지능형 SVG 차트 렌더러 영역 */}
          <ShareChartSection 
            specObj={specObj}
            sampleRows={sampleRows}
          />

          {/* 일체형 대시보드 다크 구분 경계선 */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-850 to-transparent my-8" />

          {/* 📝 2. AI 비즈니스 통찰 브리핑 요약 영역 */}
          <ShareBriefingSection 
            briefingMarkdown={dashboard.briefing_markdown}
          />
        </div>

        {/* ⏰ 모바일용 갱신 시각 피드 */}
        <div className="flex sm:hidden items-center justify-center gap-1.5 text-[10px] text-slate-600 font-bold font-mono py-2">
          최종 갱신 시각: {dashboard.last_refreshed_at || '-'}
        </div>
      </main>

      {/* 💳 퍼블릭 푸터 */}
      <footer className="border-t border-slate-900 py-6 text-center text-[10px] text-slate-500 font-semibold select-none">
        © 2026 EGDESK FreeSMS. Powered by Gemini Generative AI Platform.
      </footer>
    </div>
  );
}
