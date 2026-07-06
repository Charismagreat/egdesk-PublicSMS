import React from "react";
import { CheckCircle } from "lucide-react";

interface ReserveSuccessProps {
  reservationDate: string;
  reservationTime: string;
  onReset: () => void;
}

export function ReserveSuccess({
  reservationDate,
  reservationTime,
  onReset
}: ReserveSuccessProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
        <CheckCircle className="w-12 h-12 text-green-500" />
      </div>
      <h2 className="text-3xl font-bold text-slate-800 mb-4">예약이 확정되었습니다!</h2>
      <p className="text-slate-500 text-lg mb-8">
        {reservationDate} {reservationTime}에 뵙겠습니다.<br />
        예약 확인 안내 문자가 발송되었습니다.
      </p>
      <button 
        onClick={onReset}
        className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
      >
        새로운 예약하기
      </button>
    </div>
  );
}
