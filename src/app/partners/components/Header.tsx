import React from "react";
import { Handshake } from "lucide-react";

export function Header() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
          <Handshake className="w-8 h-8 text-emerald-500" />
          <span>거래처 관리 AI</span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-semibold">
          B2B 거래의 주체인 공급처(Vendor) 및 도소매 구매처(Buyer)를 체계적으로 관리하고 거래 누적 실적을 AI 마이닝합니다.
        </p>
      </div>
    </div>
  );
}
