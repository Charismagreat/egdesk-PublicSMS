import React from "react";
import { Handshake } from "lucide-react";

interface HeaderProps {
  activeTab: 'VENDOR' | 'BUYER' | 'AFFILIATE';
  setActiveTab: (tab: 'VENDOR' | 'BUYER' | 'AFFILIATE') => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
          <Handshake className="w-8 h-8 text-emerald-500" />
          <span>거래처 관리 AI</span>
        </h1>
        <p className="text-slate-505 mt-2 text-sm font-semibold">
          B2B 거래의 주체인 공급처(Vendor) 및 도소매 구매처(Buyer)를 체계적으로 관리하고 거래 누적 실적을 AI 마이닝합니다.
        </p>
      </div>

      {/* 탭 버튼 */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-2xl border border-slate-100 max-w-md shadow-inner shrink-0">
        <button 
          onClick={() => setActiveTab("VENDOR")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center transition-all border-none cursor-pointer whitespace-nowrap ${
            activeTab === "VENDOR" ? "bg-emerald-600 text-white shadow-md" : "bg-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          공급처 (Vendor)
        </button>
        <button 
          onClick={() => setActiveTab("BUYER")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center transition-all border-none cursor-pointer whitespace-nowrap ${
            activeTab === "BUYER" ? "bg-emerald-600 text-white shadow-md" : "bg-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          바이어 (Buyer)
        </button>
        <button 
          onClick={() => setActiveTab("AFFILIATE")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center transition-all border-none cursor-pointer whitespace-nowrap ${
            activeTab === "AFFILIATE" ? "bg-emerald-600 text-white shadow-md" : "bg-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🤝 관계사 (Affiliate)
        </button>
      </div>
    </div>
  );
}
