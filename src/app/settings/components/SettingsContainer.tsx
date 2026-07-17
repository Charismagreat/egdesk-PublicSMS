"use client";

import React, { useState, useEffect } from "react";
import { Building, Mail, Cpu, LayoutGrid, Coins } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";
import DatabaseInitCard from "../DatabaseInitCard";
import CompanySettingsCard from "../CompanySettingsCard";
import SmtpSettingsCard from "../SmtpSettingsCard";
import FaxSettingsCard from "../FaxSettingsCard";
import EstimateSettingsCard from "../EstimateSettingsCard";
import PointSettingsCard from "../../PointSettingsCard";
import MenuSettingsCard from "../MenuSettingsCard";
import FeedbackManagementCard from "../FeedbackManagementCard";
import MobileHubWidget from "@/components/MobileHubWidget";

// AI 비서 설정 컴포넌트 및 훅 임포트
import { useAiSettings } from "@/app/ai-settings/hooks/useAiSettings";
import { AiSettingsForm } from "@/app/ai-settings/components/AiSettingsForm";
import { AiSettingsMonitor } from "@/app/ai-settings/components/AiSettingsMonitor";

type TabType = "basic" | "communication" | "ai" | "point" | "ui";

// 지연 마운팅(Lazy Activation)을 위한 AI 라우팅 설정 탭 전용 컴포넌트
function AiSettingsTabContent() {
  const settings = useAiSettings();
  return (
    <div className="space-y-6">
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

export function SettingsContainer() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab, isRestored] = usePersistedState<TabType>(
    "egdesk_settings_active_tab",
    "basic"
  );

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await apiFetch("/api/auth/me");
        const json = await res.json();
        if (json.success && json.role === "SUPER_ADMIN" && json.username === "admin") {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error("Failed to check admin status:", e);
      }
    }
    checkAdmin();
  }, []);

  // SSR 하이드레이션 및 상태 복구 대기 가드
  if (!isRestored) {
    return (
      <div className="w-full py-20 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: "basic", label: "본사 & 플랫폼 설정", icon: Building },
    { id: "communication", label: "메일 & 팩스 연동", icon: Mail },
    { id: "ai", label: "AI 라우팅 설정", icon: Cpu },
    { id: "point", label: "포인트 정책 설정", icon: Coins },
    { id: "ui", label: "메뉴 & 피드백 관리", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* 🎨 세련된 대형 탭 스위처 */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap md:flex-nowrap gap-1 border border-slate-200/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer ${
                isActive
                  ? "bg-white text-indigo-600 shadow-sm animate-fade-in"
                  : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div className="space-y-6 animate-fade-in">
        {activeTab === "basic" && (
          <>
            {isAdmin && <DatabaseInitCard />}
            <CompanySettingsCard />
          </>
        )}

        {activeTab === "communication" && (
          <>
            <SmtpSettingsCard />
            <FaxSettingsCard />
          </>
        )}

        {activeTab === "ai" && (
          <>
            <AiSettingsTabContent />
            <EstimateSettingsCard />
          </>
        )}

        {activeTab === "point" && (
          <>
            <PointSettingsCard />
          </>
        )}

        {activeTab === "ui" && (
          <>
            {/* 📱 모바일 채널 허브 위젯 (설정 탭으로 이식) */}
            <MobileHubWidget />
            <MenuSettingsCard />
            <FeedbackManagementCard />
          </>
        )}
      </div>
    </div>
  );
}
