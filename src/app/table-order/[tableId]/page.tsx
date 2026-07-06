"use client";

import React from "react";
import { useRouter } from "next/navigation";

// 커스텀 훅 및 하위 컴포넌트 임포트
import { useTableOrder } from "./hooks/useTableOrder";
import { OrderSuccessScreen } from "./components/OrderSuccessScreen";
import { OrderHeader } from "./components/OrderHeader";
import { MenuCatalog } from "./components/MenuCatalog";
import { CartFloatingBar } from "./components/CartFloatingBar";
import { PointGuideModal } from "./components/PointGuideModal";

export default function TableOrderMenuPage() {
  const router = useRouter();
  const {
    tableId,
    loading,
    activeCategory, setActiveCategory,
    searchTerm, setSearchTerm,
    cart,
    updateCart,
    categories,
    filteredProducts,
    cartItemsCount,
    cartTotalAmount,
    finalEarningBasis,
    expectedPoints,
    phoneForPoints, setPhoneForPoints,
    pointBalance,
    pointCustomerId,
    usePointsInput, setUsePointsInput,
    appliedPoints,
    otpCode, setOtpCode,
    isOtpSent, setIsOtpSent,
    isOtpVerified,
    pointError,
    pointInfo,
    isOtpSending,
    isOtpVerifying,
    showPointGuide, setShowPointGuide,
    pointEarningRate,
    couponCode, setCouponCode,
    appliedCoupon, setAppliedCoupon,
    couponError,
    handleLookupPoints,
    handleRequestOtp,
    handleVerifyOtp,
    handleApplyCoupon,
    submitOrder,
    isSubmitting,
    orderSuccess, setOrderSuccess,
    getNumericPrice
  } = useTableOrder();

  // 주문 성공 화면 분기 처리
  if (orderSuccess) {
    return (
      <OrderSuccessScreen
        tableId={tableId}
        onClose={() => setOrderSuccess(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-32 w-full font-sans text-slate-800">
      
      {/* 상단 스티키 헤더 및 검색, 카테고리 탭 영역 */}
      <OrderHeader
        tableId={tableId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onBack={() => router.push('/table-order')}
      />

      {/* 메뉴 카탈로그 리스트 본문 영역 */}
      <MenuCatalog
        loading={loading}
        filteredProducts={filteredProducts}
        cart={cart}
        updateCart={updateCart}
        getNumericPrice={getNumericPrice}
      />

      {/* 장바구니 활성화 시 하단 복합 플로팅 패널 */}
      {cartItemsCount > 0 && (
        <CartFloatingBar
          cartItemsCount={cartItemsCount}
          cartTotalAmount={cartTotalAmount}
          finalEarningBasis={finalEarningBasis}
          expectedPoints={expectedPoints}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          appliedCoupon={appliedCoupon}
          onRemoveCoupon={() => {
            setAppliedCoupon(null);
            setCouponCode('');
          }}
          couponError={couponError}
          onApplyCoupon={handleApplyCoupon}
          phoneForPoints={phoneForPoints}
          setPhoneForPoints={setPhoneForPoints}
          pointBalance={pointBalance}
          usePointsInput={usePointsInput}
          setUsePointsInput={setUsePointsInput}
          appliedPoints={appliedPoints}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          isOtpSent={isOtpSent}
          isOtpVerified={isOtpVerified}
          pointError={pointError}
          pointInfo={pointInfo}
          isOtpSending={isOtpSending}
          isOtpVerifying={isOtpVerifying}
          onLookupPoints={handleLookupPoints}
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtp}
          onResetPoints={() => {
            setPhoneForPoints('');
            setCouponCode(''); // 쿠폰은 초기화하지 않으나 적립금 입력창을 초기화할 때 적립금 상태를 리셋
            setUsePointsInput('');
            setOtpCode('');
            setIsOtpSent(false);
          }}
          setShowPointGuide={setShowPointGuide}
          onSubmitOrder={submitOrder}
          isSubmitting={isSubmitting}
        />
      )}

      {/* 3초 단골 적립 안내 모달 팝업 */}
      {showPointGuide && (
        <PointGuideModal
          pointEarningRate={pointEarningRate}
          onClose={() => setShowPointGuide(false)}
        />
      )}

    </div>
  );
}
