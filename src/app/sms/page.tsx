"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send, BarChart3, Zap } from "lucide-react";
import { usePersistedState } from "@/hooks/usePersistedState";

// 1. 발송 탭 훅 & 컴포넌트
import { useSms } from "@/hooks/useSms";
import SmsTestSendModal from "@/components/sms/SmsTestSendModal";
import SmsTemplateEditModal from "@/components/sms/SmsTemplateEditModal";
import SmsDeviceAddModal from "@/components/sms/SmsDeviceAddModal";
import { AiPanel } from "./components/AiPanel";
import { MessageForm } from "./components/MessageForm";
import { TargetSelector } from "./components/TargetSelector";
import { DeviceHub } from "./components/DeviceHub";
import { TemplateLibrary } from "./components/TemplateLibrary";

// 2. 발송 내역 탭 훅 & 컴포넌트
import { useMessageLogs } from "../message-logs/hooks/useMessageLogs";
import { MessageLogsFilter } from "../message-logs/components/MessageLogsFilter";
import { MessageLogsTable } from "../message-logs/components/MessageLogsTable";
import { MessageLogsPagination } from "../message-logs/components/MessageLogsPagination";

// 3. 자동 발송 탭 훅 & 컴포넌트
import { useAutomation } from "../automation/hooks/useAutomation";
import { AutomationHeader } from "../automation/components/AutomationHeader";
import { AutomationInfo } from "../automation/components/AutomationInfo";
import { AutomationGrid } from "../automation/components/AutomationGrid";

function SmsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab")?.toUpperCase();

  // 브라우저 탭 보존 상태 (SEND | LOGS | AUTO)
  const [activeTab, setActiveTab] = usePersistedState<"SEND" | "LOGS" | "AUTO">("active_sms_tab", "SEND");

  useEffect(() => {
    if (tabParam === "LOGS" || tabParam === "AUTO" || tabParam === "SEND") {
      setActiveTab(tabParam as "SEND" | "LOGS" | "AUTO");
    }
  }, [tabParam, setActiveTab]);

  // 1. 발송 탭 데이터 & 바인딩
  const smsHook = useSms();

  // 2. 발송 내역 탭 데이터 & 바인딩
  const logsHook = useMessageLogs();

  // 3. 자동 발송 탭 데이터 & 바인딩
  const autoHook = useAutomation();

  return (
    <div className="space-y-6 pb-20" data-easybot-hint="문자 관제 AI: 무료 SMS/LMS 문자 생성 및 발송, 실시간 발송 로그 모니터링, AI 자동 발송 규칙을 한곳에서 원스톱으로 관리합니다.">
      {/* 📱 메인 서브 타이틀 헤더 바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-indigo-600" />
              <span>📱 문자 관제 AI</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-black">
              All-in-One 원스톱 관리
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            무료 AI 문자 생성·발송, 실시간 발송 내역 조회, AI 자동 발송 규칙 설정을 한 화면에서 유기적으로 처리합니다.
          </p>
        </div>

        {/* 서브 탭 컨트롤러 */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shrink-0 w-full md:w-auto overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("SEND")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "SEND"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>💬 문자 즉시 & AI 발송</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOGS")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "LOGS"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>📊 발송 내역 & 모니터링</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("AUTO")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "AUTO"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>⚡ AI 자동 발송 규칙</span>
          </button>
        </div>
      </div>

      {/* 탭 1: 💬 문자 즉시 & AI 발송 */}
      {activeTab === "SEND" && (
        <div className="space-y-6 animate-fade-in">
          <AiPanel {...(smsHook as any)} />
          <TemplateLibrary {...(smsHook as any)} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-6">
              <MessageForm {...(smsHook as any)} />
              <DeviceHub {...(smsHook as any)} />
            </div>

            <div className="lg:col-span-6 space-y-6">
              <TargetSelector {...(smsHook as any)} />
            </div>
          </div>

          {/* 모달 3종 */}
          <SmsTestSendModal
            isOpen={smsHook.showTestModal}
            onClose={() => smsHook.setShowTestModal(false)}
            testPhone={smsHook.testPhone}
            setTestPhone={smsHook.setTestPhone}
            testDeviceId={smsHook.testDeviceId}
            setTestDeviceId={smsHook.setTestDeviceId}
            smsDevices={smsHook.smsDevices}
            isSending={smsHook.isSending}
            handleTestSend={smsHook.handleTestSend}
          />

          <SmsTemplateEditModal
            isOpen={!!smsHook.editingTemplate}
            editingTemplate={smsHook.editingTemplate}
            setEditingTemplate={smsHook.setEditingTemplate}
            messageTemplates={smsHook.messageTemplates}
            setMessageTemplates={smsHook.setMessageTemplates}
            onClose={() => smsHook.setEditingTemplate(null)}
          />

          <SmsDeviceAddModal
            isOpen={smsHook.showAddDeviceModal}
            onClose={() => smsHook.setShowAddDeviceModal(false)}
            newDevicePhone={smsHook.newDevicePhone}
            setNewDevicePhone={smsHook.setNewDevicePhone}
            newDeviceName={smsHook.newDeviceName}
            setNewDeviceName={smsHook.setNewDeviceName}
            isAddingDevice={smsHook.isAddingDevice}
            handleAddDevice={smsHook.handleAddDevice}
          />
        </div>
      )}

      {/* 탭 2: 📊 발송 내역 & 모니터링 */}
      {activeTab === "LOGS" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <MessageLogsFilter 
              filteredCount={logsHook.filteredData.length}
              searchQuery={logsHook.searchQuery}
              setSearchQuery={logsHook.setSearchQuery}
              isMounted={logsHook.isMounted}
              activePreset={logsHook.activePreset}
              setPreset={logsHook.setPreset}
              startDate={logsHook.startDate}
              setStartDate={logsHook.setStartDate}
              endDate={logsHook.endDate}
              setEndDate={logsHook.setEndDate}
              setActivePreset={logsHook.setActivePreset}
            />

            <MessageLogsTable 
              data={logsHook.filteredData}
              paginatedData={logsHook.paginatedData}
              formatKoreanTime={logsHook.formatKoreanTime}
              parseSenderDevice={logsHook.parseSenderDevice}
            />

            <MessageLogsPagination 
              filteredDataLength={logsHook.filteredData.length}
              currentPage={logsHook.currentPage}
              totalPages={logsHook.totalPages}
              itemsPerPage={logsHook.itemsPerPage}
              setCurrentPage={logsHook.setCurrentPage}
              setItemsPerPage={logsHook.setItemsPerPage}
              startIndex={logsHook.startIndex}
              endIndex={logsHook.endIndex}
            />
          </div>
        </div>
      )}

      {/* 탭 3: ⚡ AI 자동 발송 규칙 */}
      {activeTab === "AUTO" && (
        <div className="space-y-6 animate-fade-in">
          <AutomationHeader 
            isSaving={autoHook.isSaving}
            onSave={autoHook.saveRules}
          />

          <AutomationInfo />

          <AutomationGrid 
            rules={autoHook.rules}
            templates={autoHook.templates}
            toggleRule={autoHook.toggleRule}
            changeTemplate={autoHook.changeTemplate}
          />
        </div>
      )}
    </div>
  );
}

export default function SmsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">페이지 로딩 중...</div>}>
      <SmsContent />
    </Suspense>
  );
}
