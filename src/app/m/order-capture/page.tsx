"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useOrderCapture } from "./hooks/useOrderCapture";
import { OrderCaptureHeader } from "./components/OrderCaptureHeader";
import { OrderCaptureSuccess } from "./components/OrderCaptureSuccess";
import { OrderCaptureForm } from "./components/OrderCaptureForm";
import { CustomerSearchModal } from "./components/CustomerSearchModal";

export default function MobileOrderCapture() {
  const {
    isLoadingAuth,
    isAuthenticated,
    preview,
    isUploading,
    isSubmitting,
    success,
    customers,
    isCustomerModalOpen,
    setIsCustomerModalOpen,
    customerSearchTerm,
    setCustomerSearchTerm,
    form,
    setForm,
    fileInputRef,
    handleFileChange,
    removeFile,
    handleSubmit,
    resetForm
  } = useOrderCapture();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* 모바일 최적화 헤더 바 */}
      <OrderCaptureHeader />

      <div className="p-4 max-w-lg mx-auto">
        {success ? (
          /* 접수 성공 정보 영역 */
          <OrderCaptureSuccess 
            onReset={resetForm}
          />
        ) : (
          /* 접수 입력 폼 영역 */
          <OrderCaptureForm 
            form={form}
            setForm={setForm}
            preview={preview}
            isUploading={isUploading}
            isSubmitting={isSubmitting}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            removeFile={removeFile}
            onSearchCustomerClick={() => {
              setIsCustomerModalOpen(true);
              setCustomerSearchTerm("");
            }}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {/* CRM 단골 고객 실시간 매핑 모달 */}
      <CustomerSearchModal 
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        searchTerm={customerSearchTerm}
        setSearchTerm={setCustomerSearchTerm}
        customers={customers}
        onSelectCustomer={(name, phone) => {
          setForm({
            ...form,
            customerName: name,
            customerPhone: phone
          });
          setIsCustomerModalOpen(false);
        }}
      />
    </div>
  );
}
