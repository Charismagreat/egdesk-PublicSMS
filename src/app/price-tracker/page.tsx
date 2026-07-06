"use client";

import React from "react";
import { Cpu, RefreshCw, Bell, CheckCircle2 } from "lucide-react";

// 커스텀 훅 및 모달 컴포넌트 임포트
import { usePriceTracker } from "@/hooks/usePriceTracker";
import ItemRegisterModal from "@/components/price-tracker/ItemRegisterModal";
import CollectorMappingModal from "@/components/price-tracker/CollectorMappingModal";
import CollectorGuideModal from "@/components/price-tracker/CollectorGuideModal";
import SmsAlertSettingModal from "@/components/price-tracker/SmsAlertSettingModal";

// 신규 분리된 서브 컴포넌트 임포트
import DaemonControlCard from "./components/DaemonControlCard";
import ExchangeRateTicker from "./components/ExchangeRateTicker";
import PriceTrendChart from "./components/PriceTrendChart";
import ScmMarginWarningCard from "./components/ScmMarginWarningCard";
import MarginSpreadTable from "./components/MarginSpreadTable";

export default function PriceTrackerAIPage() {
  const {
    items,
    activeItem,
    urls,
    alerts,
    alertLogs,
    exchangeRates,
    exchangeRateHistories,
    daemonInfo,
    activeRateTab,
    setActiveRateTab,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    isItemModalOpen,
    setIsItemModalOpen,
    isCollectorModalOpen,
    setIsCollectorModalOpen,
    isEditMode,
    setIsEditMode,
    editingItemId,
    miningItemIds,
    isAlertModalOpen,
    setIsAlertModalOpen,
    isCronHelpOpen,
    setIsCronHelpOpen,
    isDaemonHelpOpen,
    setIsDaemonHelpOpen,
    copiedUrlId,
    miningLoading,
    miningLoadStep,
    searchChannels,
    setSearchChannels,
    newChannelName,
    setNewChannelName,
    itemForm,
    setItemForm,
    urlForm,
    setUrlForm,
    alertForm,
    setAlertForm,
    loading,
    refreshing,
    crawlerTesting,
    updatingRates,
    startingDaemon,
    copiedText,
    selectorAnalyzing,
    backfillStartDate,
    setBackfillStartDate,
    backfillEndDate,
    setBackfillEndDate,
    isBackfilling,
    rateHoverInfo,
    setRateHoverInfo,
    itemHoverInfo,
    setItemHoverInfo,
    rateScrollRef,
    itemScrollRef,
    explainCron,
    handleRefresh,
    handleSyncExchangeRates,
    handleStartDaemon,
    handleCopyCommand,
    handleBulkBackfill,
    handleItemSelect,
    handleSaveItem,
    handleDeleteItem,
    handleCopyUrl,
    handleEditItemClick,
    handleAnalyzeSelector,
    handleAddUrl,
    handleDeleteUrl,
    handleAddAlertRule,
    handleAutoDeploy,
    handleAddChannel,
    handleToggleChannel,
    handleRemoveChannel,
    filteredItems,
    marginWarningCount,
    isDaemonRunning
  } = usePriceTracker();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" data-easybot-hint="가격 추적 AI: 등록된 타사 쇼핑몰 상품 URL의 실시간 판매 가격을 모니터링하여 최저가 변동을 분석합니다.">
        <RefreshCw className="w-8 h-8 text-pink-600 animate-spin" />
        <span className="text-sm font-bold text-slate-500">SCM 가격 관제 시스템 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 text-slate-800 font-sans text-left">
      
      {/* 1. 상단 타이틀 주변 영역 (PC용 고정 수평 레이아웃) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <Cpu className="w-8 h-8 text-pink-600 mr-3 animate-pulse" />
            가격 추적 AI
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncExchangeRates}
            disabled={updatingRates}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-slate-900 to-indigo-955 text-white hover:from-slate-800 hover:to-indigo-900 border border-slate-800 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updatingRates ? "animate-spin" : ""}`} />
            실시간 환율 강제 갱신
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "시세 갱신 중..." : "전광판 즉시 동기화"}
          </button>
        </div>
      </div>

      {/* 2. 🤖 SCM 가격 및 환율 수집 자율 데몬 통합 관제 센터 */}
      <DaemonControlCard
        isDaemonRunning={isDaemonRunning}
        daemonInfo={daemonInfo}
        startingDaemon={startingDaemon}
        handleStartDaemon={handleStartDaemon}
        handleCopyCommand={handleCopyCommand}
        copiedText={copiedText}
        isDaemonHelpOpen={isDaemonHelpOpen}
        setIsDaemonHelpOpen={setIsDaemonHelpOpen}
        backfillStartDate={backfillStartDate}
        setBackfillStartDate={setBackfillStartDate}
        backfillEndDate={backfillEndDate}
        setBackfillEndDate={setBackfillEndDate}
        handleBulkBackfill={handleBulkBackfill}
        isBackfilling={isBackfilling}
      />

      {/* 3. 🎛️ 최상단 실시간 주식시장 환율 & 원자재 Ticker 전광판 */}
      <ExchangeRateTicker exchangeRates={exchangeRates} />

      {/* 4. 🌐 글로벌 4대 외환의 올해 전체 가격 변동 추이 선형 차트 */}
      <PriceTrendChart
        exchangeRateHistories={exchangeRateHistories}
        activeRateTab={activeRateTab}
        setActiveRateTab={setActiveRateTab}
        rateHoverInfo={rateHoverInfo}
        setRateHoverInfo={setRateHoverInfo}
        rateScrollRef={rateScrollRef}
      />

      {/* 5. SCM 리스크 미니 위젯 및 검색 필터링 */}
      <ScmMarginWarningCard
        items={items}
        marginWarningCount={marginWarningCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* 6. 📈 주식거래소 스타일 SCM 실시간 통합 전광 대장 테이블 */}
      <MarginSpreadTable
        filteredItems={filteredItems}
        items={items}
        activeItem={activeItem}
        urls={urls}
        alerts={alerts}
        miningItemIds={miningItemIds}
        itemHoverInfo={itemHoverInfo}
        setItemHoverInfo={setItemHoverInfo}
        itemScrollRef={itemScrollRef}
        handleItemSelect={handleItemSelect}
        setIsItemModalOpen={setIsItemModalOpen}
        setIsEditMode={setIsEditMode}
        setItemForm={setItemForm}
        setIsCollectorModalOpen={setIsCollectorModalOpen}
        setIsAlertModalOpen={setIsAlertModalOpen}
        handleEditItemClick={handleEditItemClick}
        handleDeleteItem={handleDeleteItem}
      />

      {/* 7. 🔔 최근 발송 경보 로그 명세서 (주식시장 공시처럼) */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden w-full">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-xs font-black text-slate-800">FreeSMS 가격 임계값 돌파 문자 발송 이력</span>
          </div>
          <span className="text-[9px] font-bold text-slate-450 bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
            LOGS ({alertLogs.length}건)
          </span>
        </div>
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 font-mono text-left">
          {alertLogs.map((log: any) => (
            <div key={log.log_id} className="p-3.5 bg-white hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 text-[10px]">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-rose-600 font-sans text-xs">{log.rule_name}</span>
                  <span className="text-[9px] text-slate-400 font-normal">{log.sent_at || log.fired_at}</span>
                </div>
                <p className="text-slate-655 font-semibold font-sans leading-relaxed">{log.sent_message || log.message_sent}</p>
              </div>
              <span className="shrink-0 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md font-sans font-bold flex items-center gap-1 self-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SMS 발송 완료
              </span>
            </div>
          ))}
          {alertLogs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold bg-white font-sans">
              현재까지 긴급 경보로 발송된 FreeSMS 내역이 존재하지 않습니다.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4대 분리된 모달 컴포넌트 렌더링 영역 */}
      {/* ============================================================ */}
      
      {/* MODAL 1: 신규/수정 품목 등록 모달 */}
      <ItemRegisterModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        isEditMode={isEditMode}
        itemForm={itemForm}
        setItemForm={setItemForm}
        handleSaveItem={handleSaveItem}
      />

      {/* MODAL 2: 수집 로봇 매핑 및 검수 모달 */}
      <CollectorMappingModal
        isOpen={isCollectorModalOpen}
        onClose={() => setIsCollectorModalOpen(false)}
        activeItem={activeItem}
        urls={urls}
        copiedUrlId={copiedUrlId}
        miningLoading={miningLoading}
        miningLoadStep={miningLoadStep}
        searchChannels={searchChannels}
        newChannelName={newChannelName}
        urlForm={urlForm}
        crawlerTesting={crawlerTesting}
        selectorAnalyzing={selectorAnalyzing}
        setSearchChannels={setSearchChannels}
        setNewChannelName={setNewChannelName}
        setUrlForm={setUrlForm}
        setIsCronHelpOpen={setIsCronHelpOpen}
        handleCopyUrl={handleCopyUrl}
        handleDeleteUrl={handleDeleteUrl}
        handleToggleChannel={handleToggleChannel}
        handleRemoveChannel={handleRemoveChannel}
        handleAddChannel={handleAddChannel}
        handleAutoDeploy={handleAutoDeploy}
        handleAnalyzeSelector={handleAnalyzeSelector}
        handleAddUrl={handleAddUrl}
        explainCron={explainCron}
      />

      {/* MODAL 2-B: 수집 주기 (Cron) 설정 안내 팝업 */}
      <CollectorGuideModal
        isOpen={isCronHelpOpen}
        onClose={() => setIsCronHelpOpen(false)}
        setUrlForm={setUrlForm}
      />

      {/* MODAL 3: FreeSMS 경보 조건 설정 모달 */}
      <SmsAlertSettingModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        activeItem={activeItem}
        alertForm={alertForm}
        setAlertForm={setAlertForm}
        handleAddAlertRule={handleAddAlertRule}
      />
      
    </div>
  );
}
