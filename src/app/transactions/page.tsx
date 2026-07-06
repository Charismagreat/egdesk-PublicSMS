"use client";

import React from "react";
import OrderDetailModal from "@/components/OrderDetailModal";
import { useTransactions } from "./hooks/useTransactions";
import { TransactionHeader } from "./components/TransactionHeader";
import { TransactionFormSection } from "./components/TransactionFormSection";
import { TransactionTable } from "./components/TransactionTable";
import { TransactionPagination } from "./components/TransactionPagination";

export default function TransactionsPage() {
  const {
    transactions,
    selectedIds,
    activeOrderId,
    setActiveOrderId,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    newName,
    setNewName,
    newPhone,
    setNewPhone,
    newProduct,
    setNewProduct,
    newAmount,
    setNewAmount,
    isSending,
    filteredTransactions,
    totalPages,
    startIndex,
    endIndex,
    paginatedTransactions,
    addTransaction,
    deleteTransaction,
    toggleSelectAll,
    toggleSelect,
    sendOrderSms
  } = useTransactions();

  return (
    <div className="space-y-6 pb-20">
      {/* 타이틀 및 헤더 영역 */}
      <TransactionHeader />

      {/* 새 거래 등록 수동 기입 폼 섹션 */}
      <TransactionFormSection 
        newName={newName}
        setNewName={setNewName}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        newAmount={newAmount}
        setNewAmount={setNewAmount}
        onSubmit={addTransaction}
      />

      {/* 거래 목록 및 제어 툴바 데이터 테이블 */}
      <TransactionTable 
        transactionsCount={filteredTransactions.length}
        filteredTransactions={filteredTransactions}
        paginatedTransactions={paginatedTransactions}
        selectedIds={selectedIds}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSending={isSending}
        sendOrderSms={sendOrderSms}
        toggleSelectAll={toggleSelectAll}
        toggleSelect={toggleSelect}
        setActiveOrderId={setActiveOrderId}
        deleteTransaction={deleteTransaction}
      />

      {/* 페이지네이션 하단 컨트롤 바 */}
      <TransactionPagination 
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        filteredTransactionsLength={filteredTransactions.length}
        startIndex={startIndex}
        endIndex={endIndex}
      />

      {/* 연관 주문 상세 내역 모달 */}
      {activeOrderId && (
        <OrderDetailModal 
          orderId={activeOrderId} 
          onClose={() => setActiveOrderId(null)} 
        />
      )}
    </div>
  );
}
