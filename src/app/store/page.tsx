"use client";

import { useStorefront } from "./hooks/useStorefront";
import { HeroSection } from "./components/HeroSection";
import { ProductList } from "./components/ProductList";
import { OrderModal } from "./components/OrderModal";
import { VoiceWizardModal } from "./components/VoiceWizardModal";
import { PointGuideModal } from "./components/PointGuideModal";
import { CartModal } from "./components/CartModal";
import { Bot, UploadCloud, Loader2 } from "lucide-react";

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
    cart,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    submitCartOrder,
    selectedCategory,
    setSelectedCategory,
    categories,
    isNewPartnerOrder,
    attachmentFilename,
    isOcrLoading,
    ocrParsedTotalAmount,
    ocrParsedTotalQty,
    handleOcrUpload,
  } = useStorefront();

  return (
    <div className="w-full">
      <HeroSection />

      {/* 🚀 B2B 전용 간편 발주서 AI 주문 카드 영역 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs p-8 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] hover:border-blue-400 hover:shadow-sm transition-all duration-300">
          
          {isOcrLoading ? (
            <div className="flex flex-col items-center justify-center animate-fade-in py-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <h4 className="text-base font-extrabold text-slate-800 mb-1">AI가 발주서(PDF/이미지)를 해독하고 있습니다</h4>
              <p className="text-xs text-slate-400 font-semibold animate-pulse">상품 마스터 매칭 및 사업자 정보 자동 추출을 완료하고 있습니다. 잠시만 기다려주세요.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full max-w-xl">
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && handleOcrUpload) {
                    await handleOcrUpload(file);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2 tracking-tight">
                ⚡ B2B 간편 발주서 AI 원클릭 주문
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-1">
                자사 양식의 발주서(이미지 또는 PDF 파일)를 여기에 올려주세요.
              </p>
              <p className="text-[10px] text-slate-400 font-semibold">
                AI가 품목, 수량 및 사업자 증빙 정보를 자동 판독하여 즉시 주문 모달로 전환해 드립니다.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProductList
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredProducts={filteredProducts}
        openModal={openModal}
        getNumericPrice={getNumericPrice}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
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
        onAddToCart={addToCart}
        isNewPartnerOrder={isNewPartnerOrder}
        attachmentFilename={attachmentFilename}
        isOcrLoading={isOcrLoading}
        ocrParsedTotalAmount={ocrParsedTotalAmount}
        ocrParsedTotalQty={ocrParsedTotalQty}
        handleOcrUpload={handleOcrUpload}
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

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        submitCartOrder={submitCartOrder}
        getNumericPrice={getNumericPrice}
        pointEarningRate={pointEarningRate}
        isNewPartnerOrder={isNewPartnerOrder}
        attachmentFilename={attachmentFilename}
        isOcrLoading={isOcrLoading}
        ocrParsedTotalAmount={ocrParsedTotalAmount}
        ocrParsedTotalQty={ocrParsedTotalQty}
        handleOcrUpload={handleOcrUpload}
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
