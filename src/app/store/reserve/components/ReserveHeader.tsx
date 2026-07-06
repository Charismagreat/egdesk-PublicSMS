import React from "react";

export function ReserveHeader() {
  return (
    <div className="bg-white border-b border-slate-200 pt-16 pb-12 text-center">
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">예약 서비스</h1>
      <p className="text-lg text-slate-500 max-w-xl mx-auto">
        원하시는 날짜와 시간에 서비스를 예약해보세요.<br />
        전문가가 최고의 경험을 선사합니다.
      </p>
    </div>
  );
}
