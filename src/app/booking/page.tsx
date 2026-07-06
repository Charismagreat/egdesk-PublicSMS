"use client";

import React from "react";
import { useBooking } from "./hooks/useBooking";
import { BookingHero } from "./components/BookingHero";
import { BookingSearch } from "./components/BookingSearch";
import { BookingProductList } from "./components/BookingProductList";
import { BookingModal } from "./components/BookingModal";

export default function BookingPage() {
  const {
    products,
    searchTerm,
    setSearchTerm,
    loading,
    selectedService,
    form,
    setForm,
    isSubmitting,
    orderSuccess,
    couponCode,
    setCouponCode,
    appliedCoupon,
    setAppliedCoupon,
    couponError,
    openModal,
    closeModal,
    submitReservation,
    getNumericPrice,
    handleApplyCoupon,
    filteredProducts
  } = useBooking();

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen" data-easybot-hint="예약 관리 AI: 오프라인 매장 및 서비스 방문 예약을 실시간 모니터링하고 예약 스케줄을 조율합니다.">
      {/* Hero 비주얼 배너 섹션 */}
      <BookingHero />

      {/* 스마트 실시간 예약 코스 검색 바 및 리스트 섹션 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* 검색 필터 바 */}
        <BookingSearch 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showSearch={!loading && products.length > 0}
        />

        {/* 예약 상품 카드 그리드 목록 */}
        <BookingProductList 
          loading={loading}
          filteredProducts={filteredProducts}
          allProductsCount={products.length}
          onProductClick={openModal}
          getNumericPrice={getNumericPrice}
        />
      </div>

      {/* 상세 정보 기입 및 할인코드 적용 예약 모달 */}
      <BookingModal
        selectedService={selectedService}
        onClose={closeModal}
        form={form}
        setForm={setForm}
        isSubmitting={isSubmitting}
        orderSuccess={orderSuccess}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        couponError={couponError}
        onSubmit={submitReservation}
        getNumericPrice={getNumericPrice}
        handleApplyCoupon={handleApplyCoupon}
      />
    </div>
  );
}
