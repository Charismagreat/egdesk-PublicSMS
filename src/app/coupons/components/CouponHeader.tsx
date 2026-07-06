import React from "react";
import { Ticket } from "lucide-react";

export function CouponHeader() {
  return (
    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
      <Ticket className="w-8 h-8 mr-3 text-red-500" /> 
      쿠폰 관리 AI
    </h1>
  );
}
