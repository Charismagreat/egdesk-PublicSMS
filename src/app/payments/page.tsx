"use client";

import React from "react";
import { usePayments } from "./hooks/usePayments";
import { PaymentHeader } from "./components/PaymentHeader";
import { PaymentFormSection } from "./components/PaymentFormSection";
import { PaymentTable } from "./components/PaymentTable";
import { PaymentPagination } from "./components/PaymentPagination";
import OrderDetailModal from "@/components/OrderDetailModal";

export default function PaymentsPage() {
  const {
    activeOrderId,
    setActiveOrderId,
    data,
    form,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    updateForm,
    addData,
    deleteData
  } = usePayments();

  return (
    <div className="space-y-6 pb-20" data-easybot-hint="결제 관리 AI: 거래별 PG 결제 상세 정보 확인 및 채널별 정산 수수료율 설정을 관리합니다.">
      {/* 타이틀 및 헤더 영역 */}
      <PaymentHeader />

      {/* 새 결제 등록 폼 */}
      <PaymentFormSection 
        form={form}
        onUpdateField={updateForm}
        onSubmit={addData}
      />

      {/* 결제 목록 테이블 */}
      <PaymentTable 
        totalCount={data.length}
        filteredCount={filteredData.length}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        paginatedData={paginatedData}
        onOrderClick={setActiveOrderId}
        onDelete={deleteData}
      />

      {/* 하단 페이지네이션 바 */}
      <PaymentPagination 
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={(num) => {
          setItemsPerPage(num);
          setCurrentPage(1);
        }}
        totalFilteredCount={filteredData.length}
        startIndex={startIndex}
        endIndex={endIndex}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* 주문 상세 모달 연동 */}
      {activeOrderId && (
        <OrderDetailModal 
          orderId={activeOrderId} 
          onClose={() => setActiveOrderId(null)} 
        />
      )}
    </div>
  );
}
