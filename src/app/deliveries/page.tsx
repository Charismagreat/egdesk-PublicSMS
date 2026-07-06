"use client";

import React from "react";
import OrderDetailModal from "@/components/OrderDetailModal";
import { useDeliveries } from "./hooks/useDeliveries";
import { DeliveryHeader } from "./components/DeliveryHeader";
import { DeliveryFormSection } from "./components/DeliveryFormSection";
import { DeliveryTable } from "./components/DeliveryTable";
import { DeliveryPagination } from "./components/DeliveryPagination";

export default function DeliveriesPage() {
  const {
    data,
    form,
    setForm,
    activeOrderId,
    setActiveOrderId,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    isUploadingExcel,
    handleExcelUpload,
    handleDownloadSample,
    addData,
    deleteData,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData
  } = useDeliveries();

  return (
    <div className="space-y-6 pb-20" data-easybot-hint="배송 관리 AI: 운송장 번호 등록, 배송 상태 추적 및 담당 배송 기사 배정을 관리합니다.">
      {/* 헤더 및 엑셀 일괄 파일 처리 영역 */}
      <DeliveryHeader 
        isUploadingExcel={isUploadingExcel}
        onExcelUpload={handleExcelUpload}
        onDownloadSample={handleDownloadSample}
      />
      
      {/* 새 배송 수동 개별 등록 폼 */}
      <DeliveryFormSection 
        form={form}
        setForm={setForm}
        onSubmit={addData}
      />

      {/* 배송 목록 검색 및 데이터 테이블 */}
      <DeliveryTable
        paginatedData={paginatedData}
        allDataCount={data.length}
        filteredCount={filteredData.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setActiveOrderId={setActiveOrderId}
        onDelete={deleteData}
      />

      {/* 하단 페이지네이션 바 */}
      <DeliveryPagination
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        filteredCount={filteredData.length}
        startIndex={startIndex}
        endIndex={endIndex}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

      {/* 연동 주문상세 모달 */}
      {activeOrderId && (
        <OrderDetailModal 
          orderId={activeOrderId} 
          onClose={() => setActiveOrderId(null)} 
        />
      )}
    </div>
  );
}
