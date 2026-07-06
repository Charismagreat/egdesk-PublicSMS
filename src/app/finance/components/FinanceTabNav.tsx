"use client";

import React from "react";
import { Landmark, CreditCard, Receipt, RefreshCw, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface FinanceTabNavProps {
  activeTab: "accounts" | "cards" | "hometax" | "sync" | "matching";
  setActiveTab: (tab: "accounts" | "cards" | "hometax" | "sync" | "matching") => void;
}

export default function FinanceTabNav({ activeTab, setActiveTab }: FinanceTabNavProps) {
  return (
    <div className="border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center space-x-6">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 relative transition-colors ${
            activeTab === "accounts" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Landmark className="w-4.5 h-4.5" />
          은행 계좌 & 거래 내역
          {activeTab === "accounts" && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("cards")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 relative transition-colors ${
            activeTab === "cards" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <CreditCard className="w-4.5 h-4.5" />
          신용 카드 사용 내역
          {activeTab === "cards" && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("hometax")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 relative transition-colors ${
            activeTab === "hometax" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Receipt className="w-4.5 h-4.5" />
          국세청 홈택스 자료
          {activeTab === "hometax" && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("matching")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 relative transition-colors ${
            activeTab === "matching" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <TrendingUp className="w-4.5 h-4.5" />
          수금/지급 대조 AI 📈
          {activeTab === "matching" && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("sync")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 relative transition-colors ${
            activeTab === "sync" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <RefreshCw className="w-4.5 h-4.5" />
          금융 동기화 이력
          {activeTab === "sync" && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
          )}
        </button>
      </div>
    </div>
  );
}
