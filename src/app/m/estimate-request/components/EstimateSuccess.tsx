import React from "react";
import { Check } from "lucide-react";

interface EstimateSuccessProps {
  submittedId: string;
}

export function EstimateSuccess({ submittedId }: EstimateSuccessProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-lg shadow-emerald-500/5">
        <Check className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 leading-tight">견적 요청 접수 완료!</h2>
      <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-sm">
        사장님께 견적서 요청 및 첫 파트너 회원 가입이 안전하게 자동 접수되었습니다. <br />
        검토 후 AI가 산정한 맞춤형 VIP 볼륨 할인 견적서와 안내문을 즉시 전송해 드리겠습니다.
      </p>
      <div className="mt-8 bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm text-xs font-mono text-slate-500 inline-block">
        요청 번호: {submittedId}
      </div>
    </div>
  );
}
