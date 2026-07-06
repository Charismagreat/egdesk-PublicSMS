import React from "react";
import { CreditCard } from "lucide-react";

export function PaymentHeader() {
  return (
    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
      <CreditCard className="w-8 h-8 mr-3 text-emerald-500" /> 
      결제 관리 AI
    </h1>
  );
}
