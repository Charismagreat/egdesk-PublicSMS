"use client";

import React from "react";
import { useAiSettings } from "./hooks/useAiSettings";
import { AiSettingsHeader } from "./components/AiSettingsHeader";
import { AiSettingsForm } from "./components/AiSettingsForm";
import { AiSettingsMonitor } from "./components/AiSettingsMonitor";

export default function AiSettingsPage() {
  const settings = useAiSettings();

  return (
    <div 
      className="w-full space-y-6 pb-20 min-w-0 font-sans text-slate-805 animate-fade-in text-left px-4 md:px-8"
      data-easybot-hint="AI 비서 및 하이브리드 라우팅 설정: 구글 Gemini 클라우드 모델 또는 이지데스크 로컬 LLM을 분기 처리하고 실시간 토큰 소모량을 정밀 분석합니다."
    >
      {/* 1. 헤더 */}
      <AiSettingsHeader />

      {/* 2. 설정 변경 폼 */}
      <AiSettingsForm
        aiModel={settings.aiModel}
        setAiModel={settings.setAiModel}
        omnichannelEnabled={settings.omnichannelEnabled}
        setOmnichannelEnabled={settings.setOmnichannelEnabled}
        copilotWidgetEnabled={settings.copilotWidgetEnabled}
        setCopilotWidgetEnabled={settings.setCopilotWidgetEnabled}
        aiProvider={settings.aiProvider}
        setAiProvider={settings.setAiProvider}
        localLlmUrl={settings.localLlmUrl}
        setLocalLlmUrl={settings.setLocalLlmUrl}
        localLlmModel={settings.localLlmModel}
        setLocalLlmModel={settings.setLocalLlmModel}
        availableModels={settings.availableModels}
        isLoadingModels={settings.isLoadingModels}
        fetchLlmModels={settings.fetchLlmModels}
        isTesting={settings.isTesting}
        testStatus={settings.testStatus}
        testError={settings.testError}
        isSaved={settings.isSaved}
        handleTestConnection={settings.handleTestConnection}
        handleSave={settings.handleSave}
      />

      {/* 3. AI API 토큰 감사 모니터링 */}
      <AiSettingsMonitor
        range={settings.range}
        setRange={settings.setRange}
        summary={settings.summary}
        purposes={settings.purposes}
        models={settings.models}
        recentLogs={settings.recentLogs}
        page={settings.page}
        setPage={settings.setPage}
        limit={settings.limit}
        setLimit={settings.setLimit}
        pagination={settings.pagination}
        loading={settings.loading}
        error={settings.error}
        isTableCollapsed={settings.isTableCollapsed}
        handleToggleTableCollapse={settings.handleToggleTableCollapse}
      />
    </div>
  );
}
