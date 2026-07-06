"use client";

import React from "react";
import { useReserve, SERVICES } from "./hooks/useReserve";
import { ReserveHeader } from "./components/ReserveHeader";
import { ReserveSuccess } from "./components/ReserveSuccess";
import { ServiceSelection } from "./components/ServiceSelection";
import { ReserveFormSection } from "./components/ReserveFormSection";

export default function ReservePage() {
  const {
    form,
    isSubmitting,
    success,
    generateTimeSlots,
    updateForm,
    submitReservation,
    resetForm
  } = useReserve();

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* 히어로 헤더 배너 */}
      <ReserveHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {success ? (
          /* 예약 확정 성공 뷰 */
          <ReserveSuccess 
            reservationDate={form.reservationDate}
            reservationTime={form.reservationTime}
            onReset={resetForm}
          />
        ) : (
          /* 예약 폼 뷰 */
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
            {/* 좌측: 서비스 선택 */}
            <ServiceSelection 
              services={SERVICES}
              selectedServiceName={form.serviceName}
              onSelectService={(name) => updateForm("serviceName", name)}
            />

            {/* 우측: 일정 및 고객 정보 입력 */}
            <ReserveFormSection 
              form={form}
              isSubmitting={isSubmitting}
              timeSlots={timeSlots}
              onUpdateField={updateForm}
              onSubmit={submitReservation}
            />
          </div>
        )}
      </div>
    </div>
  );
}
