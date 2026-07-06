"use client";

import React from "react";
import OrderDetailModal from "@/components/OrderDetailModal";
import { useReservations } from "./hooks/useReservations";
import { ReservationHeader } from "./components/ReservationHeader";
import { ReservationFormSection } from "./components/ReservationFormSection";
import { ReservationTable } from "./components/ReservationTable";
import { ReservationPagination } from "./components/ReservationPagination";

export default function ReservationsPage() {
  const {
    activeOrderId,
    setActiveOrderId,
    form,
    setForm,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    isUploadingExcel,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    handleExcelUpload,
    handleDownloadSample,
    addData,
    deleteData
  } = useReservations();

  return (
    <div className="space-y-6 pb-20" data-easybot-hint="예약 관리 AI: 오프라인 매장 및 서비스 방문 예약을 실시간 모니터링하고 예약 스케줄을 조율합니다.">
      {/* 타이틀 및 엑셀 일괄 액션 바 */}
      <ReservationHeader 
        isUploadingExcel={isUploadingExcel}
        handleExcelUpload={handleExcelUpload}
        handleDownloadSample={handleDownloadSample}
      />
      
      {/* 새 예약 등록 폼 영역 */}
      <ReservationFormSection 
        form={form}
        setForm={setForm}
        onSubmit={addData}
      />

      {/* 예약 목록 검색 및 테이블 영역 */}
      <ReservationTable 
        data={filteredData}
        paginatedData={paginatedData}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setActiveOrderId={setActiveOrderId}
        deleteData={deleteData}
      />

      {/* 페이지네이션 하단 컨트롤 바 */}
      <ReservationPagination 
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        filteredDataLength={filteredData.length}
        startIndex={startIndex}
        endIndex={endIndex}
      />

      {/* 예약 상세 연동 모달 */}
      {activeOrderId && (
        <OrderDetailModal 
          orderId={activeOrderId} 
          onClose={() => setActiveOrderId(null)} 
        />
      )}
    </div>
  );
}
