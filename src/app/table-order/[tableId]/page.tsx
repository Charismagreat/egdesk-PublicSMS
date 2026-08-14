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
import { TableOrderHistoryModal } from "./components/TableOrderHistoryModal";

export default function TableOrderMenuPage() {
  const router = useRouter();
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);

  const {
    tableId,
    loading,
    isTokenValid,
    tokenError,
    activeCategory, setActiveCategory,
    searchTerm, setSearchTerm,
    cart,
    updateCart,
    clearCart,
    resetPointState,
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

  // 보안 토큰 불일치 (어뷰징 무단 접근 차단 스크린)
  if (!loading && !isTokenValid) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center font-sans">
        <div className="bg-slate-800/90 border border-slate-700/80 p-8 rounded-3xl max-w-md space-y-4 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
            🔒
          </div>
          <h2 className="text-xl font-black text-white">보안 접근 차단 (어뷰징 방지)</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            주소창의 테이블 번호가 무단 변경되었거나 보안 토큰이 불일치합니다.<br />
            타 테이블 결제 보호를 위해 주문 접근이 원천 차단되었습니다.
          </p>
          <div className="bg-red-950/60 border border-red-800/80 p-3.5 rounded-2xl text-[11px] text-red-300 font-mono leading-snug">
            {tokenError}
          </div>
        </div>
      </div>
    );
  }

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
        onOpenHistory={() => setShowHistoryModal(true)}
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
          onResetPoints={resetPointState}
          setShowPointGuide={setShowPointGuide}
          onSubmitOrder={submitOrder}
          onClearCart={clearCart}
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

      {/* 테이블 1차/2차 누적 주문 내역 모달 */}
      {showHistoryModal && (
        <TableOrderHistoryModal
          tableId={tableId}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

    </div>
  );
}
