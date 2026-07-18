"use client";

import React from "react";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { useEstimateRequest } from "./hooks/useEstimateRequest";
import { EstimateHeader } from "./components/EstimateHeader";
import { ProductSelector } from "./components/ProductSelector";
import { PartnerVerification } from "./components/PartnerVerification";
import { NewPartnerForm } from "./components/NewPartnerForm";
import { ExistingPartnerCard } from "./components/ExistingPartnerCard";
import { EstimateSuccess } from "./components/EstimateSuccess";

export default function MobileEstimateRequestPage() {
  const {
    products,
    loading,
    searchTerm, setSearchTerm,
    quantities,
    partnerName, setPartnerName,
    partnerPhone, setPartnerPhone,
    businessNumber, setBusinessNumber,
    representative, setRepresentative,
    email, setEmail,
    address, setAddress,
    isCheckPerformed,
    isNewPartner,
    checkStatusMsg,
    uploading,
    licenseFileUrl,
    ocrScanning,
    ocrSuccessMsg,
    submitting,
    submittedId,
    filteredProducts,
    handleAdjustQuantity,
    handleCheckBusiness,
    handleLicenseUpload,
    handleSubmitRequest
  } = useEstimateRequest();

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold text-sm">로딩 분석 중...</p>
      </div>
    );
  }

  if (submittedId) {
    return <EstimateSuccess submittedId={submittedId} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 overflow-x-hidden">
      
      {/* 상단 소개 카드 */}
      <EstimateHeader />

      <form onSubmit={handleSubmitRequest} className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
        
        {/* 1. 상품 선택 영역 */}
        <ProductSelector
          products={products}
          filteredProducts={filteredProducts}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          quantities={quantities}
          onAdjustQuantity={handleAdjustQuantity}
        />

        {/* 2. B2B 사업자 인증 및 중복체크 */}
        <PartnerVerification
          businessNumber={businessNumber}
          setBusinessNumber={setBusinessNumber}
          loading={loading}
          checkStatusMsg={checkStatusMsg}
          onCheckBusiness={handleCheckBusiness}
        />

        {/* 3. B2B 상세 정보 입력 (신규 가입일 경우만 폼이 유기적으로 오픈) */}
        {isCheckPerformed && isNewPartner && (
          <NewPartnerForm
            partnerName={partnerName}
            setPartnerName={setPartnerName}
            partnerPhone={partnerPhone}
            setPartnerPhone={setPartnerPhone}
            representative={representative}
            setRepresentative={setRepresentative}
            email={email}
            setEmail={setEmail}
            address={address}
            setAddress={setAddress}
            uploading={uploading}
            licenseFileUrl={licenseFileUrl}
            ocrScanning={ocrScanning}
            ocrSuccessMsg={ocrSuccessMsg}
            onLicenseUpload={handleLicenseUpload}
          />
        )}

        {/* 기존 등록 거래처 정보 확인용 읽기전용 서식 카드 */}
        {isCheckPerformed && !isNewPartner && (
          <ExistingPartnerCard
            partnerName={partnerName}
            representative={representative}
            partnerPhone={partnerPhone}
            email={email}
            address={address}
          />
        )}

        {/* 4. 최종 제출 버튼 */}
        <button
          type="submit"
          disabled={submitting || (isCheckPerformed && isNewPartner && !licenseFileUrl)}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm md:text-base rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center transition-all duration-300 transform active:scale-95 disabled:opacity-50 border-0 cursor-pointer"
        >
          <ShoppingBag className="w-5 h-5 mr-2 animate-pulse" />
          {submitting ? "요청서 안전 전송 중..." : "AI 견적서 즉시 요청하기"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>

      </form>
    </div>
  );
}
