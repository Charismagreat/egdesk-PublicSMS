"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useCoupons } from "./hooks/useCoupons";
import { CouponHeader } from "./components/CouponHeader";
import { CouponFormSection } from "./components/CouponFormSection";
import { RestrictionSettings } from "./components/RestrictionSettings";
import { CouponTable } from "./components/CouponTable";
import { CouponPagination } from "./components/CouponPagination";

export default function CouponsPage() {
  const {
    data,
    issueType,
    setIssueType,
    form,
    setForm,
    loading,
    restrictions,
    currentRestriction,
    setCurrentRestriction,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    addRestriction,
    removeRestriction,
    addData,
    deleteData,
    formatDiscount,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData
  } = useCoupons();

  return (
    <div className="space-y-6 pb-20" data-easybot-hint="쿠폰 관리 AI: 신규 프로모션 할인 쿠폰을 발행하고 쿠폰 사용 이력 및 마케팅 성과를 분석합니다.">
      {/* 헤더 */}
      <CouponHeader />
      
      {/* 새 쿠폰 발행 폼 */}
      <CouponFormSection
        issueType={issueType}
        setIssueType={setIssueType}
        form={form}
        setForm={setForm}
        loading={loading}
        onSubmit={addData}
      >
        {/* 쿠폰 적용 및 제한 대상 설정 (선택) */}
        <RestrictionSettings
          restrictions={restrictions}
          currentRestriction={currentRestriction}
          setCurrentRestriction={setCurrentRestriction}
          onAddRestriction={addRestriction}
          onRemoveRestriction={removeRestriction}
        />
        
        {/* 발행 제출 버튼 */}
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition flex items-center justify-center mt-2 disabled:bg-slate-400 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1"/> {loading ? '발행 중...' : '쿠폰 발행하기'}
        </button>
      </CouponFormSection>

      {/* 발행된 쿠폰 목록 테이블 */}
      <CouponTable
        filteredCount={filteredData.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        paginatedData={paginatedData}
        allCouponsCount={data.length}
        formatDiscount={formatDiscount}
        onDelete={deleteData}
      />

      {/* 페이지네이션 하단 컨트롤바 */}
      <CouponPagination
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
  );
}
