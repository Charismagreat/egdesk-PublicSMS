"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { FolderGit2, FileSpreadsheet, Mail, Code, FileText } from "lucide-react";
import DriveHeader from "./components/DriveHeader";
import DriveStatsBoard from "./components/DriveStatsBoard";
import DriveFolderManager from "./components/DriveFolderManager";
import DriveSheetsManager from "./components/DriveSheetsManager";
import DriveGmailManager from "./components/DriveGmailManager";
import DriveAppsScriptManager from "./components/DriveAppsScriptManager";
import DriveEventTable from "./components/DriveEventTable";

export default function GoogleDrivePage() {
  const [activeTab, setActiveTab, isRestored] = usePersistedState<"folders" | "sheets" | "gmail" | "apps-script" | "events">(
    "google_drive_active_tab",
    "folders"
  );

  const [authStatus, setAuthStatus] = useState<any>(null);
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchDriveData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, eventsRes] = await Promise.all([
        apiFetch("/api/google-drive/status").then(r => r.json()).catch(() => ({})),
        apiFetch("/api/google-drive/events?limit=100").then(r => r.json()).catch(() => ({}))
      ]);

      if (statusRes.success) {
        setAuthStatus(statusRes.auth);
        setDriveStatus(statusRes.status);
        setFolders(statusRes.folders || []);
      }

      if (eventsRes.success) {
        setEvents(eventsRes.events || []);
      }
    } catch (err) {
      console.error("Fetch Google Drive data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    fetchDriveData();
  }, [isRestored, fetchDriveData]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await apiFetch("/api/google-drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "poll", download: true })
      });
      await fetchDriveData();
    } catch (err) {
      console.error("Sync now error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const downloadedCount = events.filter((e) => e.downloaded === 1 || e.downloaded === true || e.localPath).length;

  return (
    <div 
      className="w-full px-4 md:px-8 pt-8 pb-20 bg-slate-50 min-h-screen space-y-6 min-w-0 font-sans text-slate-800 animate-fade-in text-left"
      data-easybot-hint="구글 드라이브 관리 AI: 구글 워크스페이스(드라이브 폴더, 스프레드시트, G메일, 앱스 스크립트)의 실시간 관제 및 동기화를 통합 제공합니다."
    >
      {/* 1. 상단 타이틀 및 동기화 컨트롤 헤더 */}
      <DriveHeader
        authStatus={authStatus}
        driveStatus={driveStatus}
        isSyncing={isSyncing}
        onRefresh={fetchDriveData}
        onSyncNow={handleSyncNow}
      />

      {/* 2. 지표 통계 보드 */}
      <DriveStatsBoard
        foldersCount={folders.length}
        eventsCount={events.length}
        downloadedCount={downloadedCount}
        driveStatus={driveStatus}
      />

      {/* 3. 탭 네비게이션 */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-max shadow-3xs">
        {/* 1) 연동 폴더 관리 */}
        <button
          type="button"
          onClick={() => setActiveTab("folders")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "folders"
              ? "bg-white text-indigo-600 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>연동 폴더 관리 ({folders.length})</span>
        </button>

        {/* 2) 연동 시트 관리 */}
        <button
          type="button"
          onClick={() => setActiveTab("sheets")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "sheets"
              ? "bg-white text-emerald-600 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>연동 시트 관리</span>
        </button>

        {/* 3) 연동 G메일 관리 */}
        <button
          type="button"
          onClick={() => setActiveTab("gmail")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "gmail"
              ? "bg-white text-rose-600 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>연동 G메일 관리</span>
        </button>

        {/* 4) 연동 앱스 스크립트 관리 */}
        <button
          type="button"
          onClick={() => setActiveTab("apps-script")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "apps-script"
              ? "bg-white text-amber-600 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Code className="w-4 h-4" />
          <span>연동 앱스 스크립트 관리</span>
        </button>

        {/* 5) 실시간 변동 이력 대장 */}
        <button
          type="button"
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "events"
              ? "bg-white text-indigo-600 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>실시간 변동 이력 대장 ({events.length})</span>
        </button>
      </div>

      {/* 4. 탭 콘텐츠 영역 */}
      {activeTab === "folders" && (
        <DriveFolderManager
          folders={folders}
          onRefresh={fetchDriveData}
        />
      )}

      {activeTab === "sheets" && (
        <DriveSheetsManager />
      )}

      {activeTab === "gmail" && (
        <DriveGmailManager />
      )}

      {activeTab === "apps-script" && (
        <DriveAppsScriptManager />
      )}

      {activeTab === "events" && (
        <DriveEventTable
          events={events}
          loading={loading}
          onRefresh={fetchDriveData}
        />
      )}
    </div>
  );
}
