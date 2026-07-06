"use client";
 
import { usePartners } from "./hooks/usePartners";
import { Header } from "./components/Header";
import { StatsSummary } from "./components/StatsSummary";
import { PartnerTable } from "./components/PartnerTable";
import { PartnerFormModal } from "./components/PartnerFormModal";
import { PartnerDetailModal } from "./components/PartnerDetailModal";
import { PartnerAnalysisModal } from "./components/PartnerAnalysisModal";

export default function PartnersDashboard() {
  const {
    partners,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    form,
    setForm,
    isOcrAnalyzing,
    ocrResult,
    fileDragOver,
    setFileDragOver,
    isDetailOpen,
    setIsDetailOpen,
    selectedPartner,
    detailHistory,
    detailLoading,
    handleFileUpload,
    openDetailPopup,
    handleSavePartner,
    handleEditClick,
    handleCreateClick,
    handleDeletePartner,
    filteredPartners,
    totalVendors,
    totalBuyers,
    totalAffiliates,
    totalPurchases,
    totalSales,
    // 📇 명함 관리 추가
    contacts,
    isCardAnalyzing,
    handleCardUpload,
    // 🔍 AI 위해 모니터링 추가
    isAnalysisOpen,
    setIsAnalysisOpen,
    analysisPartner,
    partnerReports,
    isAnalyzing,
    openAnalysisPopup,
    handleRunAiAnalysis,
    refetchDetail
  } = usePartners();

  // 외상 거래 경고 거래처 집계
  const pendingAlertCount = partners.filter(p => p.pending_count! > 0).length;

  return (
    <div className="space-y-8 animate-fade-in relative pb-16" data-easybot-hint="거래처 관리 AI: 파트너사 정보 등록, 거래처 신용 등급 및 누적 매출 거래 이력을 종합 관제합니다.">
      
      {/* 백그라운드 퍼플 광채 */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <StatsSummary
        partnersCount={partners.length}
        totalVendors={totalVendors}
        totalBuyers={totalBuyers}
        totalAffiliates={totalAffiliates}
        totalPurchases={totalPurchases}
        totalSales={totalSales}
        pendingAlertCount={pendingAlertCount}
      />

      <PartnerTable
        loading={loading}
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredPartners={filteredPartners}
        openDetailPopup={openDetailPopup}
        handleEditClick={handleEditClick}
        handleCreateClick={handleCreateClick}
        handleDeletePartner={handleDeletePartner}
        // 🔍 AI 위해 모니터링 추가
        openAnalysisPopup={openAnalysisPopup}
      />

      <PartnerFormModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        modalMode={modalMode}
        form={form}
        setForm={setForm}
        isOcrAnalyzing={isOcrAnalyzing}
        ocrResult={ocrResult}
        fileDragOver={fileDragOver}
        setFileDragOver={setFileDragOver}
        handleFileUpload={handleFileUpload}
        handleSavePartner={handleSavePartner}
        // 📇 명함 관리 추가
        contacts={contacts}
        isCardAnalyzing={isCardAnalyzing}
        handleCardUpload={handleCardUpload}
      />

      <PartnerDetailModal
        isDetailOpen={isDetailOpen}
        setIsDetailOpen={setIsDetailOpen}
        selectedPartner={selectedPartner}
        detailHistory={detailHistory}
        detailLoading={detailLoading}
        refetchDetail={refetchDetail}
      />

      <PartnerAnalysisModal
        isAnalysisOpen={isAnalysisOpen}
        setIsAnalysisOpen={setIsAnalysisOpen}
        analysisPartner={analysisPartner}
        partnerReports={partnerReports}
        isAnalyzing={isAnalyzing}
        handleRunAiAnalysis={handleRunAiAnalysis}
      />

    </div>
  );
}
