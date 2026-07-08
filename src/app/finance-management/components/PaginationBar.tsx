"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  setCurrentPage: (page: number) => void;
  totalCount: number;
}

export default function PaginationBar({
  currentPage,
  totalPages,
  pageSize,
  setPageSize,
  setCurrentPage,
  totalCount,
}: PaginationProps) {
  return (
    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* 10/30/50개 단위 조절 셀렉터 */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
        <span>페이지당 줄 수:</span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-slate-700 font-bold outline-none cursor-pointer"
        >
          <option value={10}>10개씩 보기</option>
          <option value={30}>30개씩 보기</option>
          <option value={50}>50개씩 보기</option>
        </select>
        <span className="text-slate-400">
          | 총 {totalCount}개 중 {(currentPage - 1) * pageSize + 1}~
          {Math.min(totalCount, currentPage * pageSize)} 표시
        </span>
      </div>

      {/* 페이지 번호 네비게이터 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: totalPages }).map((_, idx) => {
          const pageNum = idx + 1;
          const isCurrent = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isCurrent
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
