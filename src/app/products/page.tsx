"use client";

import React from "react";

// 커스텀 훅 및 하위 컴포넌트 임포트
import { useProducts } from "./hooks/useProducts";
import { ProductsHeader } from "./components/ProductsHeader";
import { ProductFormSection } from "./components/ProductFormSection";
import { ProductTable } from "./components/ProductTable";
import { PaginationBar } from "./components/PaginationBar";
import { ImagePreview } from "./components/ImagePreview";

export default function ProductsPage() {
  const {
    form, setForm,
    editTargetId,
    isUploading,
    hoverImage, setHoverImage,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    isUploadingExcel,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    filteredData,
    handleExcelUpload,
    handleDownloadSample,
    addData,
    handleEditClick,
    cancelEdit,
    deleteData,
    toggleCouponExclude,
    existingCategories,
    handleFileUpload
  } = useProducts();

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800" data-easybot-hint="상품 관리 AI: 플랫폼에 등록된 상품 명세, 규격(BOM), 판매 가격 및 채널별 판매 활성화 상태를 관리합니다.">
      
      {/* 상단 타이틀 및 엑셀 일괄 파일 처리 헤더 영역 */}
      <ProductsHeader
        isUploadingExcel={isUploadingExcel}
        onDownloadSample={handleDownloadSample}
        onExcelUpload={handleExcelUpload}
      />
      
      {/* 신규 상품 등록 및 정보 수정 입력 폼 영역 */}
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

      {/* 실시간 필터링이 적용된 등록된 상품 목록 그리드 테이블 영역 */}
      <ProductTable
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredDataCount={filteredData.length}
        paginatedData={paginatedData}
        totalDataLength={filteredData.length}
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
      
      {/* 썸네일 이미지 마우스 호버 트래킹 프리뷰 포털 */}
      <ImagePreview hoverImage={hoverImage} />

    </div>
  );
}
