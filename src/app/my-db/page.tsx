"use client";

import React, { useState, useEffect } from "react";
import { Table as TableIcon, Code, Terminal, BarChart, Link, Download, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

import FriendlyShareModal from "./components/FriendlyShareModal";
import PublicShareModal from "./components/PublicShareModal";
import SharedDashboardsTab from "./components/SharedDashboardsTab";
import StandaloneView from "./components/StandaloneView";
import { SqlConsolePlayground, SqlConsoleResult } from "./components/SqlConsoleTab";
import SchemaTab from "./components/SchemaTab";
import DataBriefingTab from "./components/DataBriefingTab";

// 리팩토링으로 생성된 신규 컴포넌트 및 훅 수입
import { useMyDB } from "./hooks/useMyDB";
import Toast from "./components/Toast";
import MyDBHeader from "./components/MyDBHeader";
import LeftTableList from "./components/LeftTableList";
import RecordTableTab from "./components/RecordTableTab";
import RowEditModal from "./components/RowEditModal";

export default function MyDBManagementPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await apiFetch("/api/auth/me");
        const json = await res.json();
        const isSuperOrTenantAdmin = ['SUPER_ADMIN', 'TENANT_ADMIN', 'SYSTEM_ADMIN', 'PRESIDENT'].includes(json.role) || json.username === "admin" || json.username === "guest";
        if (json.success && isSuperOrTenantAdmin) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error("Failed to check admin status in MY DB:", e);
      }
    }
    checkAdmin();
  }, []);

  const {
    isStandalone,
    tables,
    isTablesLoading,
    selectedTable,
    setSelectedTable,
    tableSchema,
    tableDDL,
    tableRows,
    totalRows,
    currentPage,
    totalPages,
    itemsPerPage,
    activeTab,
    setActiveTab,
    searchKey,
    setSearchKey,
    searchValue,
    setSearchValue,
    debouncedSearchValue,
    tableSearchQuery,
    setTableSearchQuery,
    sqlQuery,
    setSqlQuery,
    consoleResult,
    setConsoleResult,
    safetyUnlocked,
    setSafetyUnlocked,
    consoleTab,
    setConsoleTab,
    aiPrompt,
    setAiPrompt,
    isAiLoading,
    setIsAiLoading,
    aiGeneratedSql,
    setAiGeneratedSql,
    showDeleted,
    setShowDeleted,
    aiChartSpec,
    setAiChartSpec,
    aiBriefing,
    setAiBriefing,
    isVisualizing,
    setIsVisualizing,
    isShareModalOpen,
    setIsShareModalOpen,
    shareTitle,
    setShareTitle,
    shareInterval,
    setShareInterval,
    generatedShareUrl,
    setGeneratedShareUrl,
    sharedDashboards,
    isSharing,
    tunePrompt,
    setTunePrompt,
    tuneHistory,
    setTuneHistory,
    selectedChartPart,
    setSelectedChartPart,
    attachedImage,
    setAttachedImage,
    previousSnapshot,
    initialSnapshot,
    isFriendlyShareModalOpen,
    setIsFriendlyShareModalOpen,
    friendlyShareTableName,
    setFriendlyShareTableName,
    friendlyColumnMappings,
    setFriendlyColumnMappings,
    friendlySortColumn,
    setFriendlySortColumn,
    friendlySortDirection,
    setFriendlySortDirection,
    friendlyAllowCsv,
    setFriendlyAllowCsv,
    generatedFriendlyShareUrl,
    setGeneratedFriendlyShareUrl,
    isFriendlySharing,
    isFriendlyRecommendLoading,
    sharedViewsList,
    isSharedViewsLoading,
    isLoading,
    setIsLoading,
    toast,
    showToast,
    isRowModalOpen,
    setIsRowModalOpen,
    editingRow,
    setEditingRow,
    handleCreateShare,
    triggerAIVisualization,
    handleTuneChart,
    handleResetChat,
    handleResetAllPlayground,
    handleUndoTuning,
    handleResetToOriginal,
    handleOpenFriendlyShareModal,
    fetchAIRecommendations,
    handleCreateFriendlyShare,
    fetchSharedViews,
    handleDeleteSharedView,
    handleDeleteRow,
    handleRestoreRow,
    handleSaveRow,
    handleExportExcel,
    handleSyncAll,
    handlePageChange,
    handleSearch,
    handleExecuteSQL,
    handleTranslateSQL
  } = useMyDB();

  // 🖥️ 독립 화면 모드 감지 시, StandaloneView 컴포넌트 렌더링
  if (isStandalone) {
    return (
      <StandaloneView
        tables={tables}
        selectedTable={selectedTable}
        sqlQuery={sqlQuery}
        tableRows={tableRows}
        consoleResult={consoleResult}
        aiChartSpec={aiChartSpec}
        setAiChartSpec={setAiChartSpec}
        aiBriefing={aiBriefing}
        setAiBriefing={setAiBriefing}
        tunePrompt={tunePrompt}
        setTunePrompt={setTunePrompt}
        tuneHistory={tuneHistory}
        setTuneHistory={setTuneHistory}
        selectedChartPart={selectedChartPart}
        setSelectedChartPart={setSelectedChartPart}
        attachedImage={attachedImage}
        setAttachedImage={setAttachedImage}
        isVisualizing={isVisualizing}
        setIsVisualizing={setIsVisualizing}
        initialSnapshot={initialSnapshot}
        previousSnapshot={previousSnapshot}
        toast={toast}
        showToast={showToast}
        setIsShareModalOpen={setIsShareModalOpen}
        setShareTitle={setShareTitle}
        setShareInterval={setShareInterval}
        setGeneratedShareUrl={setGeneratedShareUrl}
        handleTuneChart={handleTuneChart}
        handleResetToOriginal={handleResetToOriginal}
        handleUndoTuning={handleUndoTuning}
        handleResetChat={handleResetChat}
      />
    );
  }

  return (
    <div className="w-full px-4 md:px-8 pt-8 pb-20 text-left bg-slate-50 min-h-screen space-y-6">
      
      {/* 🛎️ 알림 토스트 컴포넌트 */}
      <Toast toast={toast} />

      {/* 🚀 상단 헤더 섹션 */}
      <MyDBHeader
        isLoading={isLoading}
        handleResetAllPlayground={handleResetAllPlayground}
        handleSyncAll={handleSyncAll}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* 📁 좌측 영역: 테이블 스캐너 리스트 */}
        <LeftTableList
          tables={tables}
          isTablesLoading={isTablesLoading}
          selectedTable={selectedTable}
          setSelectedTable={setSelectedTable}
          tableSearchQuery={tableSearchQuery}
          setTableSearchQuery={setTableSearchQuery}
        />

        {/* 🛠️ 우측 영역: 커스텀 SQL 콘솔 + 제어 탭 */}
        <div className="xl:col-span-3 space-y-6">

          {/* 💻 대화형 커스텀 SQL 콘솔 패널 - 🛡️ 오직 호스트 최고관리자(admin)만 사용 가능 */}
          {isAdmin && (
            <SqlConsolePlayground
              tables={tables}
              selectedTable={selectedTable}
              sqlQuery={sqlQuery}
              setSqlQuery={setSqlQuery}
              consoleTab={consoleTab}
              setConsoleTab={setConsoleTab}
              safetyUnlocked={safetyUnlocked}
              setSafetyUnlocked={setSafetyUnlocked}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              isAiLoading={isAiLoading}
              setIsAiLoading={setIsAiLoading}
              aiGeneratedSql={aiGeneratedSql}
              setAiGeneratedSql={setAiGeneratedSql}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              setConsoleResult={setConsoleResult}
              setActiveTab={setActiveTab}
              triggerAIVisualization={triggerAIVisualization}
              handleExecuteSQL={handleExecuteSQL}
              handleTranslateSQL={handleTranslateSQL}
              showToast={showToast}
            />
          )}

          {/* 🏷️ 데이터 탭 헤더 및 뷰어 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            
            {/* 상단 탭 2단 도구막대 */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                
                <div className="flex items-center bg-slate-200/50 rounded-xl p-0.5 border border-slate-200/70 shrink-0">
                  <button
                    onClick={() => setActiveTab('data')}
                    className={`px-4 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-none cursor-pointer ${
                      activeTab === 'data' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5 inline mr-1" />
                    레코드 데이터 ({totalRows})
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('schema')}
                    className={`px-4 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-none cursor-pointer ${
                      activeTab === 'schema' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5 inline mr-1" />
                    테이블 스키마 DDL
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setActiveTab('console')}
                      disabled={!consoleResult}
                      className={`px-4 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        activeTab === 'console' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 bg-transparent'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5 inline mr-1" />
                      SQL 실행 결과
                    </button>
                  )}

                  {isAdmin && consoleResult && consoleResult.success && consoleResult.rows && consoleResult.rows.length > 0 && (
                    <button
                      onClick={() => setActiveTab('chart')}
                      className={`px-4 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-none cursor-pointer ${
                        activeTab === 'chart' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 bg-transparent'
                      }`}
                    >
                      <BarChart className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
                      📊 AI 지능형 시각화 & 브리핑
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveTab('shared');
                      fetchSharedViews();
                    }}
                    className={`px-4 py-1.5 rounded-lg transition-all text-[11px] font-extrabold shrink-0 border-none cursor-pointer ${
                      activeTab === 'shared' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5 inline mr-1 text-teal-505" />
                    🌐 공유 뷰 관리
                  </button>
                </div>

                {activeTab === 'data' && selectedTable && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold shadow-3xs cursor-pointer transition-colors"
                      title="엑셀 포맷으로 데이터 백업"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel 백업
                    </button>
                    <button
                      onClick={() => {
                        setEditingRow(null);
                        setIsRowModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black border-none cursor-pointer shadow-3xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      행 삽입 (INSERT)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 탭 콘텐트 영역 1: 레코드 데이터 표 뷰어 */}
            {activeTab === 'data' && (
              <RecordTableTab
                selectedTable={selectedTable}
                tableSchema={tableSchema}
                tableRows={tableRows}
                totalRows={totalRows}
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                searchKey={searchKey}
                setSearchKey={setSearchKey}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
                showDeleted={showDeleted}
                setShowDeleted={setShowDeleted}
                handleSearch={handleSearch}
                handlePageChange={handlePageChange}
                handleOpenFriendlyShareModal={handleOpenFriendlyShareModal}
                handleRestoreRow={handleRestoreRow}
                handleDeleteRow={handleDeleteRow}
                setEditingRow={setEditingRow}
                setIsRowModalOpen={setIsRowModalOpen}
                setDebouncedSearchValue={setTableSearchQuery}
              />
            )}

            {/* 탭 콘텐트 영역 2: 스키마 구조 및 DDL */}
            {activeTab === 'schema' && (
              <SchemaTab tableDDL={tableDDL} tableSchema={tableSchema} />
            )}

            {/* 탭 콘텐트 영역 3: SQL 콘솔 실행 로그 및 결과 테이블 */}
            {activeTab === 'console' && consoleResult && (
              <SqlConsoleResult consoleResult={consoleResult} />
            )}

            {/* 탭 콘텐트 영역 4: AI 지능형 시각화 & 비즈니스 브리핑 통합 뷰 */}
            {activeTab === 'chart' && consoleResult && consoleResult.success && consoleResult.rows && (
              <DataBriefingTab
                sqlQuery={sqlQuery}
                selectedTable={selectedTable}
                tables={tables}
                tableRows={tableRows}
                consoleResult={consoleResult}
                aiChartSpec={aiChartSpec}
                setAiChartSpec={setAiChartSpec}
                aiBriefing={aiBriefing}
                setAiBriefing={setAiBriefing}
                tunePrompt={tunePrompt}
                setTunePrompt={setTunePrompt}
                tuneHistory={tuneHistory}
                setTuneHistory={setTuneHistory}
                selectedChartPart={selectedChartPart}
                setSelectedChartPart={setSelectedChartPart}
                attachedImage={attachedImage}
                setAttachedImage={setAttachedImage}
                isVisualizing={isVisualizing}
                setIsVisualizing={setIsVisualizing}
                initialSnapshot={initialSnapshot}
                previousSnapshot={previousSnapshot}
                showToast={showToast}
                setIsShareModalOpen={setIsShareModalOpen}
                setShareTitle={setShareTitle}
                setShareInterval={setShareInterval}
                setGeneratedShareUrl={setGeneratedShareUrl}
                handleTuneChart={handleTuneChart}
                handleResetToOriginal={handleResetToOriginal}
                handleUndoTuning={handleUndoTuning}
                handleResetChat={handleResetChat}
              />
            )}

            {/* 탭 콘텐트 영역 5: 데이터 공유 뷰 목록 관리 그리드 */}
            {activeTab === 'shared' && (
              <SharedDashboardsTab
                sharedViewsList={sharedViewsList}
                isSharedViewsLoading={isSharedViewsLoading}
                fetchSharedViews={fetchSharedViews}
                handleDeleteSharedView={handleDeleteSharedView}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      </div>

      {/* 📁 레코드 삽입/수정용 모달 (INSERT / UPDATE Modal) */}
      <RowEditModal
        isOpen={isRowModalOpen}
        onClose={() => {
          setIsRowModalOpen(false);
          setEditingRow(null);
        }}
        selectedTable={selectedTable}
        tableSchema={tableSchema}
        editingRow={editingRow}
        isLoading={isLoading}
        handleSaveRow={handleSaveRow}
      />

      {/* 🌐 퍼블릭 웹 게시 및 자동 실시간 갱신용 모달 */}
      <PublicShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        generatedShareUrl={generatedShareUrl}
        setGeneratedShareUrl={setGeneratedShareUrl}
        shareTitle={shareTitle}
        setShareTitle={setShareTitle}
        shareInterval={shareInterval}
        setShareInterval={setShareInterval}
        isSharing={isSharing}
        handleCreateShare={handleCreateShare}
        showToast={showToast}
      />

      {/* 👥 임직원 친화형 공유 테이블 뷰 생성 모달 */}
      <FriendlyShareModal
        isOpen={isFriendlyShareModalOpen}
        onClose={() => setIsFriendlyShareModalOpen(false)}
        selectedTable={selectedTable}
        tableSchema={tableSchema}
        tableRows={tableRows}
        generatedFriendlyShareUrl={generatedFriendlyShareUrl}
        setGeneratedFriendlyShareUrl={setGeneratedFriendlyShareUrl}
        friendlyShareTableName={friendlyShareTableName}
        setFriendlyShareTableName={setFriendlyShareTableName}
        friendlyAllowCsv={friendlyAllowCsv}
        setFriendlyAllowCsv={setFriendlyAllowCsv}
        friendlyColumnMappings={friendlyColumnMappings}
        setFriendlyColumnMappings={setFriendlyColumnMappings}
        friendlySortColumn={friendlySortColumn}
        setFriendlySortColumn={setFriendlySortColumn}
        friendlySortDirection={friendlySortDirection}
        setFriendlySortDirection={setFriendlySortDirection}
        isFriendlyRecommendLoading={isFriendlyRecommendLoading}
        isFriendlySharing={isFriendlySharing}
        fetchAIRecommendations={fetchAIRecommendations}
        handleCreateFriendlyShare={handleCreateFriendlyShare}
        showToast={showToast}
      />

    </div>
  );
}
