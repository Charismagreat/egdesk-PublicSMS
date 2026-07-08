"use client";

import React from "react";
import { Calendar, Search } from "lucide-react";
import { getStartDateForBank, getStartDateForHometax } from "../utils";

interface FinanceFilterBarProps {
  startDate: string;
  endDate: string;
  isDateManuallySet: boolean;
  searchText: string;
  activeTab: "accounts" | "cards" | "hometax" | "sync" | "matching";
  hometaxSubTab: "invoice" | "exempt" | "cash";
  invoiceType: "all" | "sales" | "purchase";
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setIsDateManuallySet: (manually: boolean) => void;
  setSearchText: (text: string) => void;
  setInvoiceType: (type: "all" | "sales" | "purchase") => void;
  onQuickPeriod: (days: number | "year") => void;
  onResetPeriod: () => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
}

export default function FinanceFilterBar({
  startDate,
  endDate,
  isDateManuallySet,
  searchText,
  activeTab,
  hometaxSubTab,
  invoiceType,
  setStartDate,
  setEndDate,
  setIsDateManuallySet,
  setSearchText,
  setInvoiceType,
  onQuickPeriod,
  onResetPeriod,
  selectedPeriod,
  setSelectedPeriod,
}: FinanceFilterBarProps) {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* 기간 필터 컨트롤러 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold flex items-center gap-1 mr-2 text-slate-700">
            <Calendar className="w-4 h-4 text-blue-500" />
            조회 기간
          </span>
          <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setIsDateManuallySet(true);
                setSelectedPeriod("custom");
                setStartDate(e.target.value);
              }}
              className="outline-none bg-transparent font-medium text-xs text-slate-700 cursor-pointer"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setIsDateManuallySet(true);
                setSelectedPeriod("custom");
                setEndDate(e.target.value);
              }}
              className="outline-none bg-transparent font-medium text-xs text-slate-700 cursor-pointer"
            />
          </div>

          {/* 빠른 기간 단축 버튼 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => onQuickPeriod(7)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedPeriod === "7"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              1주일
            </button>
            <button
              onClick={() => onQuickPeriod(30)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedPeriod === "30"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              1개월
            </button>
            <button
              onClick={() => onQuickPeriod(90)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedPeriod === "90"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              3개월
            </button>
            <button
              onClick={() => onQuickPeriod("year")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedPeriod === "year"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              금년도
            </button>
          </div>

          {/* 필터 초기화 버튼 */}
          {isDateManuallySet && (
            <button
              onClick={onResetPeriod}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer"
            >
              기본 조건 복원
            </button>
          )}
        </div>

        {/* 통합 검색어 바 */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {((activeTab === "hometax" && hometaxSubTab !== "cash") || activeTab === "matching") && (
            <select
              value={invoiceType}
              onChange={(e: any) => setInvoiceType(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50 text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">매출/매입 전체</option>
              <option value="sales">매출 내역만</option>
              <option value="purchase">매입 내역만</option>
            </select>
          )}
          
          <div className="relative flex-1 lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === "accounts"
                  ? "거래처, 적요 검색..."
                  : activeTab === "cards"
                  ? "가맹점명 검색..."
                  : activeTab === "matching"
                  ? "공급자, 공급받는자, 품목명 검색..."
                  : "공급자, 공급받는자, 품목명 검색..."
              }
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
