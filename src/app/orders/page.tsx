"use client";

import React from "react";
import OrderDetailModal from "@/components/OrderDetailModal";
import { useOrders } from "./hooks/useOrders";
import { OrderHeader } from "./components/OrderHeader";
import { OrderForm } from "./components/OrderForm";
import { OrderToolbar } from "./components/OrderToolbar";
import { OrderTable } from "./components/OrderTable";
import { OrderPagination } from "./components/OrderPagination";
import { OrderAttachmentViewer } from "./components/OrderAttachmentViewer";

export default function OrdersPage() {
  const {
    activeOrderId,
    setActiveOrderId,
    data,
    form,
    setForm,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedIds,
    isUpdating,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    trackingEdits,
    setTrackingEdits,
    viewerUrl,
    setViewerUrl,
    TABS,
    addData,
    deleteData,
    updateOrder,
    bulkUpdateStatus,
    saveTrackingNumber,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    toggleSelectAll,
    toggleSelect
  } = useOrders();

  return (
    <div className="space-y-6 pb-20" data-easybot-hint="주문 관리 AI: 주문 접수 대기, 결제 검토 및 주문 상세 명세 조회를 수행하는 통합 수주창입니다.">
      {/* 헤더 */}
      <OrderHeader />
      
      {/* 새 주문 등록 폼 */}
      <OrderForm 
        form={form}
        setForm={setForm}
        onSubmit={addData}
      />

      {/* 관리 테이블 및 컨트롤 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* 상단 검색 및 탭 필터 툴바 */}
        <OrderToolbar
          tabs={TABS}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        
        {/* 메인 리스트 테이블 */}
        <OrderTable
          paginatedData={paginatedData}
          selectedIds={selectedIds}
          isUpdating={isUpdating}
          tabs={TABS}
          trackingEdits={trackingEdits}
          setTrackingEdits={setTrackingEdits}
          toggleSelectAll={toggleSelectAll}
          toggleSelect={toggleSelect}
          setActiveOrderId={setActiveOrderId}
          setViewerUrl={setViewerUrl}
          updateOrder={updateOrder}
          bulkUpdateStatus={bulkUpdateStatus}
          saveTrackingNumber={saveTrackingNumber}
          onDelete={deleteData}
          allDataCount={data.length}
        />

        {/* 하단 페이지네이션 바 */}
        <OrderPagination
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          filteredCount={filteredData.length}
          startIndex={startIndex}
          endIndex={endIndex}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>

      {/* 첨부 이미지 오버레이 모달 */}
      <OrderAttachmentViewer 
        viewerUrl={viewerUrl}
        onClose={() => setViewerUrl(null)}
      />

      {/* 상세 내역 모달 */}
      {activeOrderId && (
        <OrderDetailModal 
          orderId={activeOrderId} 
          onClose={() => setActiveOrderId(null)} 
        />
      )}
    </div>
  );
}
