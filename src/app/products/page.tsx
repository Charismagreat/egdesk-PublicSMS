"use client";

import React, { useState } from "react";

// 커스텀 훅 및 하위 컴포넌트 임포트
import { useProducts } from "./hooks/useProducts";
import { ProductsHeader } from "./components/ProductsHeader";
import { ProductFormSection } from "./components/ProductFormSection";
import { ProductTable } from "./components/ProductTable";
import { PaginationBar } from "./components/PaginationBar";
import { ImagePreview } from "./components/ImagePreview";
import { TableQrSection } from "./components/TableQrSection";
import { ProductBulkUploadModal } from "./components/ProductBulkUploadModal";
import { ProductGoogleSheetsUploadModal } from "./components/ProductGoogleSheetsUploadModal";

export default function ProductsPage() {
  const {
    data,
    form, setForm,
    editTargetId,
    isUploading,
    hoverImage, setHoverImage,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    statusFilter, setStatusFilter,
    sourceFilter, setSourceFilter,
    categoryFilter, setCategoryFilter,
    approveProduct,
    unapproveProduct,
    activeCount,
    draftCount,
    totalCount,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    filteredData,
    handleBulkImportProducts,
    addData,
    handleEditClick,
    cancelEdit,
    deleteData,
    toggleCouponExclude,
    handleBatchToggleCoupon,
    existingCategories,
    handleFileUpload
  } = useProducts();

  // 📂 엑셀 일괄 업로드 모달 상태
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  // 🌐 구글 시트 연동 모달 상태
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800" data-easybot-hint="상품 관리 AI: 플랫폼에 등록된 상품 명세, 규격(BOM), 판매 가격 및 채널별 판매 활성화 상태를 관리합니다.">
      
      {/* 상단 타이틀 및 엑셀/구글 시트 일괄 업로드 헤더 영역 */}
      <ProductsHeader
        onOpenBulkUpload={() => setIsBulkUploadOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
      />

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🛍️ 판매 중 상품
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full font-sans">
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter('DRAFT')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            statusFilter === 'DRAFT'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ⚙️ 승인 대기 완제품 (DRAFT)
          {draftCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-sans">
              {draftCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter('TABLE_QR')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            statusFilter === 'TABLE_QR'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📱 테이블 오더 QR 관리
        </button>
      </div>
      
      {/* 📱 테이블 오더 QR 관리 탭 뷰 */}
      {statusFilter === 'TABLE_QR' ? (
        <TableQrSection />
      ) : (
        <>
          {/* 신규 상품 등록 및 정보 수정 입력 폼 영역 (판매 중 탭에서만 활성화) */}
          {statusFilter === 'ACTIVE' && (
            <ProductFormSection
              form={form}
              setForm={setForm}
              editTargetId={editTargetId}
              isUploading={isUploading}
              existingCategories={existingCategories}
              onCancelEdit={cancelEdit}
              onSaveProduct={addData}
              onFileUpload={handleFileUpload}
            />
          )}

          {/* 실시간 필터링이 적용된 등록된 상품 목록 그리드 테이블 영역 */}
          <ProductTable
            statusFilter={statusFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            onApprove={approveProduct}
            onUnapprove={unapproveProduct}
            onBatchToggleCoupon={handleBatchToggleCoupon}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredDataCount={totalCount}
            paginatedData={paginatedData}
            totalDataLength={totalCount}
            onHoverImage={setHoverImage}
            onToggleCouponExclude={toggleCouponExclude}
            onEditClick={handleEditClick}
            onDeleteClick={deleteData}
          />

          {/* 페이지네이션 하단 이동 컨트롤러 바 */}
          <PaginationBar
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            filteredDataLength={filteredData.length}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        </>
      )}

      {/* 📂 엑셀 일괄 업로드 모달 */}
      <ProductBulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onImport={handleBulkImportProducts}
      />

      {/* 🌐 구글 시트 업로드 모달 */}
      <ProductGoogleSheetsUploadModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        onImport={handleBulkImportProducts}
      />

      {/* 썸네일 이미지 마우스 호버 트래킹 프리뷰 포털 */}
      <ImagePreview hoverImage={hoverImage} />

    </div>
  );
}
