"use client";

export const dynamic = "force-dynamic";

import { SettingsHeader } from "./components/SettingsHeader";
import { SettingsContainer } from "./components/SettingsContainer";

// 시스템 설정 메인 페이지 오케스트레이터 컴포넌트
export default function SettingsPage() {
  return (
    <div className="w-full space-y-6 pb-20 min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="시스템 설정: 이지데스크 플랫폼 구동에 필수적인 API Key(Google AI Key 등) 등록 및 시스템 전역 설정을 제어합니다.">
      {/* 설정 페이지 상단 헤더 영역 */}
      <SettingsHeader />

      {/* 설정 항목 카드 리스트 영역 */}
      <SettingsContainer />
    </div>
  );
}

