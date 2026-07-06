"use client";

import { useStorefront } from "./hooks/useStorefront";
import { HeroSection } from "./components/HeroSection";
import { ProductList } from "./components/ProductList";
import { OrderModal } from "./components/OrderModal";
import { VoiceWizardModal } from "./components/VoiceWizardModal";
import { PointGuideModal } from "./components/PointGuideModal";
import { Bot } from "lucide-react";

export default function StorefrontPage() {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    selectedProduct,
    form,
    setForm,
    isSubmitting,
    orderSuccess,
    couponCode,
    setCouponCode,
    appliedCoupon,
    setAppliedCoupon,
    couponError,
    setCouponError,
    pointBalance,
    setPointBalance,
    usePointsInput,
    setUsePointsInput,
    appliedPoints,
    setAppliedPoints,
    otpCode,
    setOtpCode,
    isOtpSent,
    setIsOtpSent,
    isOtpVerified,
    setIsOtpVerified,
    pointError,
    setPointError,
    pointInfo,
    setPointInfo,
    isOtpSending,
    isOtpVerifying,
    showPointGuide,
    setShowPointGuide,
    pointEarningRate,
    voiceStep,
    setVoiceStep,
    transcript,
    isListening,
    handleVoiceOrderStart,
    handleConfirmProduct,
    stopListening,
    handleLookupPoints,
    handleRequestOtp,
    handleVerifyOtp,
    openModal,
    closeModal,
    getNumericPrice,
    submitOrder,
    handleApplyCoupon,
    filteredProducts,
  } = useStorefront();

  return (
    <div className="w-full">
      <HeroSection />

      <ProductList
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredProducts={filteredProducts}
        openModal={openModal}
        getNumericPrice={getNumericPrice}
      />

      <OrderModal
        selectedProduct={selectedProduct}
        closeModal={closeModal}
        form={form}
        setForm={setForm}
        isSubmitting={isSubmitting}
        orderSuccess={orderSuccess}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        couponError={couponError}
        pointBalance={pointBalance}
        setPointBalance={setPointBalance}
        usePointsInput={usePointsInput}
        setUsePointsInput={setUsePointsInput}
        appliedPoints={appliedPoints}
        setAppliedPoints={setAppliedPoints}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        isOtpSent={isOtpSent}
        setIsOtpSent={setIsOtpSent}
        isOtpVerified={isOtpVerified}
        setIsOtpVerified={setIsOtpVerified}
        pointError={pointError}
        setPointError={setPointError}
        pointInfo={pointInfo}
        setPointInfo={setPointInfo}
        isOtpSending={isOtpSending}
        isOtpVerifying={isOtpVerifying}
        setShowPointGuide={setShowPointGuide}
        pointEarningRate={pointEarningRate}
        handleLookupPoints={handleLookupPoints}
        handleRequestOtp={handleRequestOtp}
        handleVerifyOtp={handleVerifyOtp}
        handleApplyCoupon={handleApplyCoupon}
        submitOrder={submitOrder}
        getNumericPrice={getNumericPrice}
      />

      <VoiceWizardModal
        voiceStep={voiceStep}
        setVoiceStep={setVoiceStep}
        transcript={transcript}
        isListening={isListening}
        selectedProduct={selectedProduct}
        handleConfirmProduct={handleConfirmProduct}
        stopListening={stopListening}
      />

      <PointGuideModal
        showPointGuide={showPointGuide}
        setShowPointGuide={setShowPointGuide}
        pointEarningRate={pointEarningRate}
      />

      {/* Floating Voice Button */}
      {voiceStep === 'IDLE' && !selectedProduct && (
        <button 
          onClick={handleVoiceOrderStart}
          className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 w-16 h-16 bg-blue-600 text-white rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:scale-105 hover:shadow-[0_10px_50px_rgba(37,99,235,0.6)] transition-all duration-300 flex items-center justify-center z-50 group border-none cursor-pointer"
        >
          <Bot className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <div className="absolute right-20 bg-white text-slate-800 text-sm font-bold px-4 py-2 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-100">
            💬 말로 주문하기
          </div>
        </button>
      )}
    </div>
  );
}
