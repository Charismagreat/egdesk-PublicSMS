"use client";

import { useCustomers } from "./hooks/useCustomers";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { CustomerTable } from "./components/CustomerTable";
import { AddCustomerModal } from "./components/AddCustomerModal";
import { HistoryModal } from "./components/HistoryModal";

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
    isUploading,
    handleRowClick,
    handleAdjustPoints,
    handleAddCustomer,
    handleCsvUpload,
    filteredCustomers,
    totalPages,
    startIndex,
    endIndex,
    paginatedCustomers,
  } = useCustomers();

  return (
    <div className="space-y-6 w-full min-w-0 font-sans text-slate-800" data-easybot-hint="고객 관리 AI: 고객 정보 등록, 그룹핑 필터링 및 고객 맞춤 관리를 지원하는 CRM 센터입니다.">
      <Header
        isUploading={isUploading}
        handleCsvUpload={handleCsvUpload}
        setShowAddModal={setShowAddModal}
      />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <CustomerTable
          isLoading={isLoading}
          paginatedCustomers={paginatedCustomers}
          customers={filteredCustomers} // filteredCustomers 로 대치하거나 전체 고객 수 정보용으로 사용
          filteredCustomers={filteredCustomers}
          handleRowClick={handleRowClick}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      </div>

      <AddCustomerModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        handleAddCustomer={handleAddCustomer}
        isSubmitting={isSubmitting}
      />

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
