"use client";

import { motion, AnimatePresence } from "framer-motion";

// 기존 모달 컴포넌트 임포트
import UploadExcelModal from "./components/UploadExcelModal";
import UploadHometaxModal from "./components/UploadHometaxModal";
import UploadCardModal from "./components/UploadCardModal";
import ReceiptViewerModal from "./components/ReceiptViewerModal";

// 새로 정의된 컴포넌트 임포트
import FinanceHeader from "./components/FinanceHeader";
import FinanceStatsBoard from "./components/FinanceStatsBoard";
import FinanceFilterBar from "./components/FinanceFilterBar";
import FinanceTabNav from "./components/FinanceTabNav";
import FinanceAccountsTab from "./components/FinanceAccountsTab";
import FinanceCardsTab from "./components/FinanceCardsTab";
import FinanceHometaxTab from "./components/FinanceHometaxTab";
import FinanceSyncTab from "./components/FinanceSyncTab";
import FinanceMatchingTab from "./components/FinanceMatchingTab";

// 비즈니스 로직 커스텀 훅 임포트
import { useExcelFinance } from "./hooks/useExcelFinance";

export default function FinancePage() {
  const {
    activeTab,
    setActiveTab,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isHometaxModalOpen,
    setIsHometaxModalOpen,
    isCardModalOpen,
    setIsCardModalOpen,
    editingCardTxId,
    setEditingCardTxId,
    editingBankTxId,
    setEditingBankTxId,
    editingHometaxTxId,
    setEditingHometaxTxId,
    editingField,
    setEditingField,
    tempCategory,
    setTempCategory,
    tempMemo,
    setTempMemo,
    categorySearchTerm,
    setCategorySearchTerm,
    rulesList,
    newRuleText,
    setNewRuleText,
    isAddingRule,
    isUpdatingCardTx,
    isUpdatingBankTx,
    isUpdatingHometaxTx,
    dbTags,
    previewList,
    isPreviewLoading,
    isPreviewOpen,
    setIsPreviewOpen,
    hometaxSubTab,
    setHometaxSubTab,
    loading,
    refreshing,
    accounts,
    stats,
    summaryData,
    transactionList,
    cardTxList,
    taxInvoiceList,
    taxExemptList,
    cashReceiptList,
    syncHistory,
    hometaxSync,
    dbCategories,
    matchingList,
    matchingStatus,
    setMatchingStatus,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchText,
    setSearchText,
    invoiceType,
    setInvoiceType,
    selectedCardCompanyId,
    setSelectedCardCompanyId,
    selectedCardNumber,
    setSelectedCardNumber,
    selectedCashPurpose,
    setSelectedCashPurpose,
    selectedBankId,
    setSelectedBankId,
    selectedAccountId,
    setSelectedAccountId,
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    receiptSelectedTxId,
    setReceiptSelectedTxId,
    viewingReceiptUrl,
    setViewingReceiptUrl,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isDateManuallySet,
    setIsDateManuallySet,
    selectedPeriod,
    setSelectedPeriod,
    
    // 파생 연산 데이터
    hasAdminAccess,
    hometaxStats,
    groupedCards,

    // 동작 함수
    handleAddRule,
    handlePreviewRule,
    handleToggleRule,
    handleDeleteRule,
    handleRefresh,
    handleTagToggle,
    handleUpdateCardTransaction,
    handleUpdateBankTransaction,
    handleUpdateHometaxTransaction,
    getDynamicRecommendations,
    handleQuickPeriod,
    handleResetPeriod,
  } = useExcelFinance();

  return (
    <div className="w-full px-4 md:px-8 pt-8 pb-20 bg-slate-50 min-h-screen space-y-6 min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="금융 관리 AI: 등록된 사내 법인 계좌의 예적금 현황과 실시간 금융 거래 내역 관리를 통합 제공합니다.">
      {/* 1. 상단 웰컴 및 실시간 동기화 헤더 */}
      <FinanceHeader
        refreshing={refreshing}
        onRefresh={handleRefresh}
        setIsUploadModalOpen={setIsUploadModalOpen}
        setIsCardModalOpen={setIsCardModalOpen}
        setIsHometaxModalOpen={setIsHometaxModalOpen}
      />

      {/* 2. 감성적인 Framer Motion 통계 카드 영역 */}
      <FinanceStatsBoard
        accounts={accounts}
        stats={stats}
        summaryData={summaryData}
        groupedCards={groupedCards}
      />

      {/* 3. 통합 금융 검색 및 날짜 필터 영역 */}
      <FinanceFilterBar
        startDate={startDate}
        endDate={endDate}
        isDateManuallySet={isDateManuallySet}
        searchText={searchText}
        activeTab={activeTab}
        hometaxSubTab={hometaxSubTab}
        invoiceType={invoiceType}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        setIsDateManuallySet={setIsDateManuallySet}
        setSearchText={setSearchText}
        setInvoiceType={setInvoiceType}
        onQuickPeriod={handleQuickPeriod}
        onResetPeriod={handleResetPeriod}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
      />

      {/* 4. 메인 탭 네비게이션 스위치 */}
      <FinanceTabNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 5. 탭별 상세 데이터 테이블 및 보드 렌더링 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${hometaxSubTab}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB 1: 은행 계좌 & 거래 내역 */}
          {activeTab === "accounts" && (
            <FinanceAccountsTab
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
              selectedBankId={selectedBankId}
              setSelectedBankId={setSelectedBankId}
              transactionList={transactionList}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              setCurrentPage={setCurrentPage}
              loading={loading}
              hasAdminAccess={hasAdminAccess}
              editingBankTxId={editingBankTxId}
              setEditingBankTxId={setEditingBankTxId}
              editingField={editingField}
              setEditingField={setEditingField}
              tempMemo={tempMemo}
              setTempMemo={setTempMemo}
              dbTags={dbTags}
              handleTagToggle={handleTagToggle}
              handleUpdateBankTransaction={handleUpdateBankTransaction}
              isUpdatingBankTx={isUpdatingBankTx}
            />
          )}

          {/* TAB 2: 신용 카드 사용 내역 */}
          {activeTab === "cards" && (
            <FinanceCardsTab
              groupedCards={groupedCards}
              selectedCardCompanyId={selectedCardCompanyId}
              setSelectedCardCompanyId={setSelectedCardCompanyId}
              selectedCardNumber={selectedCardNumber}
              setSelectedCardNumber={setSelectedCardNumber}
              cardTxList={cardTxList}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              setCurrentPage={setCurrentPage}
              loading={loading}
              hasAdminAccess={hasAdminAccess}
              rulesList={rulesList}
              newRuleText={newRuleText}
              setNewRuleText={setNewRuleText}
              isAddingRule={isAddingRule}
              handleAddRule={handleAddRule}
              handlePreviewRule={handlePreviewRule}
              isPreviewLoading={isPreviewLoading}
              isPreviewOpen={isPreviewOpen}
              setIsPreviewOpen={setIsPreviewOpen}
              previewList={previewList}
              handleToggleRule={handleToggleRule}
              handleDeleteRule={handleDeleteRule}
              dbCategories={dbCategories}
              dbTags={dbTags}
              editingCardTxId={editingCardTxId}
              setEditingCardTxId={setEditingCardTxId}
              editingField={editingField}
              setEditingField={setEditingField}
              categorySearchTerm={categorySearchTerm}
              setCategorySearchTerm={setCategorySearchTerm}
              tempCategory={tempCategory}
              setTempCategory={setTempCategory}
              tempMemo={tempMemo}
              setTempMemo={setTempMemo}
              handleTagToggle={handleTagToggle}
              getDynamicRecommendations={getDynamicRecommendations}
              handleUpdateCardTransaction={handleUpdateCardTransaction}
              isUpdatingCardTx={isUpdatingCardTx}
              setIsReceiptModalOpen={setIsReceiptModalOpen}
              setReceiptSelectedTxId={setReceiptSelectedTxId}
              setViewingReceiptUrl={setViewingReceiptUrl}
            />
          )}

          {/* TAB 3: 국세청 홈택스 자료 */}
          {activeTab === "hometax" && (
            <FinanceHometaxTab
              hometaxSubTab={hometaxSubTab}
              setHometaxSubTab={setHometaxSubTab}
              taxInvoiceList={taxInvoiceList}
              taxExemptList={taxExemptList}
              cashReceiptList={cashReceiptList}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              setCurrentPage={setCurrentPage}
              loading={loading}
              hasAdminAccess={hasAdminAccess}
              invoiceType={invoiceType}
              setInvoiceType={setInvoiceType}
              selectedCashPurpose={selectedCashPurpose}
              setSelectedCashPurpose={setSelectedCashPurpose}
              editingHometaxTxId={editingHometaxTxId}
              setEditingHometaxTxId={setEditingHometaxTxId}
              editingField={editingField}
              setEditingField={setEditingField}
              tempMemo={tempMemo}
              setTempMemo={setTempMemo}
              dbTags={dbTags}
              handleTagToggle={handleTagToggle}
              handleUpdateHometaxTransaction={handleUpdateHometaxTransaction}
              isUpdatingHometaxTx={isUpdatingHometaxTx}
            />
          )}

          {/* TAB 4: 금융 동기화 역사 */}
          {activeTab === "sync" && (
            <FinanceSyncTab syncHistory={syncHistory} hometaxSync={hometaxSync} />
          )}

          {/* TAB 5: 수금/지급 대조 AI */}
          {activeTab === "matching" && (
            <FinanceMatchingTab
              matchingList={matchingList}
              loading={loading}
              matchingStatus={matchingStatus}
              setMatchingStatus={setMatchingStatus}
              invoiceType={invoiceType}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              setCurrentPage={setCurrentPage}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* 6. 인터넷뱅킹 거래 내역 엑셀 수동 가져오기 UI */}
      <UploadExcelModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        accounts={accounts}
        onSuccess={handleRefresh}
      />

      {/* 7. 국세청 홈택스 엑셀 수동 가져오기 UI */}
      <UploadHometaxModal
        isOpen={isHometaxModalOpen}
        onClose={() => setIsHometaxModalOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* 8. 신용카드 수동 엑셀 업로드 모달 UI */}
      <UploadCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* 9. 카드 영수증 사진 다중 등록 및 뷰어 모달 */}
      <ReceiptViewerModal
        isOpen={isReceiptModalOpen || !!viewingReceiptUrl}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setViewingReceiptUrl(null);
        }}
        txId={receiptSelectedTxId}
        receiptUrl={viewingReceiptUrl}
        cardTxList={cardTxList}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
