"use client";

import React from "react";
import { Landmark, FileSpreadsheet, CreditCard, Receipt, RefreshCw, Globe } from "lucide-react";

interface FinanceHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
  setIsUploadModalOpen: (open: boolean) => void;
  setIsBankGoogleSheetsModalOpen?: (open: boolean) => void;
  setIsCardModalOpen: (open: boolean) => void;
  setIsCardGoogleSheetsModalOpen?: (open: boolean) => void;
  setIsHometaxModalOpen: (open: boolean) => void;
  setIsHometaxGoogleSheetsModalOpen?: (open: boolean) => void;
}

export default function FinanceHeader({
  refreshing,
  onRefresh,
  setIsUploadModalOpen,
  setIsBankGoogleSheetsModalOpen,
  setIsCardModalOpen,
  setIsCardGoogleSheetsModalOpen,
  setIsHometaxModalOpen,
  setIsHometaxGoogleSheetsModalOpen,
}: FinanceHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Landmark className="w-8 h-8 text-blue-600" />
          금융 정보 AI
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* 🏦 은행 거래 내역 그룹 */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>은행거래내역 업로드(엑셀)</span>
        </button>

        {setIsBankGoogleSheetsModalOpen && (
          <button
            onClick={() => setIsBankGoogleSheetsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="구글 스프레드시트의 은행 거래내역 탭을 실시간 연동하여 일괄 등록합니다."
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>은행거래내역 업로드(구글시트)</span>
          </button>
        )}

        {/* 💳 신용카드 내역 그룹 */}
        <button
          onClick={() => setIsCardModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>신용카드내역 업로드(엑셀)</span>
        </button>

        {setIsCardGoogleSheetsModalOpen && (
          <button
            onClick={() => setIsCardGoogleSheetsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="구글 스프레드시트의 신용카드 승인내역 탭을 실시간 연동하여 일괄 등록합니다."
          >
            <Globe className="w-3.5 h-3.5 text-amber-600" />
            <span>신용카드내역 업로드(구글시트)</span>
          </button>
        )}

        {/* 📑 세금계산서 내역 그룹 */}
        <button
          onClick={() => setIsHometaxModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>세금계산서내역 업로드(엑셀)</span>
        </button>

        {setIsHometaxGoogleSheetsModalOpen && (
          <button
            onClick={() => setIsHometaxGoogleSheetsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="구글 스프레드시트의 홈택스 매입/매출 탭을 실시간 연동하여 일괄 등록합니다."
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>세금계산서내역 업로드(구글시트)</span>
          </button>
        )}

        {/* 🔄 동기화 (Sync) */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "동기화 중..." : "Sync"}</span>
        </button>
      </div>
    </div>
  );
}
