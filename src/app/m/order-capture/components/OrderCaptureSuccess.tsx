import React from "react";
import { CheckCircle } from "lucide-react";

interface OrderCaptureSuccessProps {
  onReset: () => void;
}

export function OrderCaptureSuccess({ onReset }: OrderCaptureSuccessProps) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100 mt-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">접수 완료!</h2>
      <p className="text-slate-500 mb-8 leading-relaxed text-sm">
        성공적으로 접수되었습니다.<br/>
        <span className="font-semibold text-slate-600">PC 관리자 화면</span>에서 즉시 확인 가능합니다.
      </p>
      <button 
        onClick={onReset}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-all border-0 cursor-pointer text-lg"
      >
        새로 접수하기
      </button>
    </div>
  );
}
