import React from "react";
import { ClipboardList } from "lucide-react";

export function OrderHeader() {
  return (
    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
      <ClipboardList className="w-8 h-8 mr-3 text-blue-500" /> 주문 관리 AI
    </h1>
  );
}
