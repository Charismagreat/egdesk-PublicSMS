"use client";

import React, { useState } from "react";
import { useCustomers } from "./hooks/useCustomers";
import { Header } from "./components/Header";
import { CustomerStats } from "./components/CustomerStats";
import { FilterBar } from "./components/FilterBar";
import { CustomerTable } from "./components/CustomerTable";
import { AddCustomerModal } from "./components/AddCustomerModal";
import { HistoryModal } from "./components/HistoryModal";
import { CustomerBulkImportModal } from "./components/CustomerBulkImportModal";
import { CustomerGoogleSheetsImportModal } from "./components/CustomerGoogleSheetsImportModal";

export default function CustomersPage() {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    selectedCustomer,
    setSelectedCustomer,
    customerHistory,
    setCustomerHistory,
    isLoadingHistory,
    activeHistoryTab,
    setActiveHistoryTab,
    showHistoryModal,
    setShowHistoryModal,
    pointBalance,
    pointHistory,
    adjustAmount,
    setAdjustAmount,
    adjustReason,
    setAdjustReason,
    isAdjusting,
    showAddModal,
    setShowAddModal,
    newCustomer,
    setNewCustomer,
    isSubmitting,
    handleRowClick,
    handleAdjustPoints,
    handleAddCustomer,
    handleBulkImportCustomers,
    filteredCustomers,
    totalPages,
    startIndex,
    endIndex,
    paginatedCustomers,
  } = useCustomers();

  // 📂 엑셀 일괄 등록 모달 상태
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  // 🌐 구글 시트 연동 모달 상태
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);

  return (
    <div className="p-6 md:p-8 space-y-6 w-full min-w-0 font-sans text-slate-800 animate-scale-up" data-easybot-hint="고객 관리 AI: 고객 정보 등록, 그룹핑 필터링 및 고객 맞춤 관리를 지원하는 CRM 센터입니다.">
      {/* 1. 상단 타이틀 및 액션 헤더 */}
      <Header
        onOpenBulkImport={() => setShowBulkImportModal(true)}
        onOpenGoogleSheets={() => setShowGoogleSheetsModal(true)}
        setShowAddModal={setShowAddModal}
      />

      {/* 2. 핵심 지표 요약 카드 (KPI Cards) */}
      <CustomerStats customers={filteredCustomers} />

      {/* 3. 고객 메인 전광판 대장 영역 (단일 카드 래핑) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
        {/* 검색 및 필터 컨트롤 바 */}
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* 고객 목록 테이블 */}
        <CustomerTable
          isLoading={isLoading}
          paginatedCustomers={paginatedCustomers}
          customers={filteredCustomers}
          filteredCustomers={filteredCustomers}
          handleRowClick={handleRowClick}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          onOpenAddModal={() => setShowAddModal(true)}
        />
      </div>

      {/* 신규 등록 모달 */}
      <AddCustomerModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        handleAddCustomer={handleAddCustomer}
        isSubmitting={isSubmitting}
      />

      {/* 📂 엑셀 일괄 등록 모달 */}
      <CustomerBulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImport={handleBulkImportCustomers}
      />

      {/* 🌐 구글 시트 연동 모달 */}
      <CustomerGoogleSheetsImportModal
        isOpen={showGoogleSheetsModal}
        onClose={() => setShowGoogleSheetsModal(false)}
        onImport={handleBulkImportCustomers}
      />

      {/* 상세 이력 모달 */}
      <HistoryModal
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        customerHistory={customerHistory}
        setCustomerHistory={setCustomerHistory}
        isLoadingHistory={isLoadingHistory}
        activeHistoryTab={activeHistoryTab}
        setActiveHistoryTab={setActiveHistoryTab}
        pointBalance={pointBalance}
        pointHistory={pointHistory}
        adjustAmount={adjustAmount}
        setAdjustAmount={setAdjustAmount}
        adjustReason={adjustReason}
        setAdjustReason={setAdjustReason}
        isAdjusting={isAdjusting}
        handleAdjustPoints={handleAdjustPoints}
      />
    </div>
  );
}
