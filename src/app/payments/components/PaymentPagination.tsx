import React from "react";

interface PaymentPaginationProps {
  itemsPerPage: number;
  onItemsPerPageChange: (num: number) => void;
  totalFilteredCount: number;
  startIndex: number;
  endIndex: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaymentPagination({
  itemsPerPage,
  onItemsPerPageChange,
  totalFilteredCount,
  startIndex,
  endIndex,
  currentPage,
  totalPages,
  onPageChange
}: PaymentPaginationProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-4 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-semibold">페이지당 표시:</span>
        <select 
          value={itemsPerPage} 
          onChange={e => {
            onItemsPerPageChange(Number(e.target.value));
          }} 
          className="border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-700 focus:border-emerald-500"
        >
          <option value={10}>10개씩 보기</option>
          <option value={20}>20개씩 보기</option>
          <option value={50}>50개씩 보기</option>
          <option value={100}>100개씩 보기</option>
        </select>
        <span className="text-xs text-slate-400 font-semibold ml-2">
          {totalFilteredCount === 0 
            ? "전체 0건 표시" 
            : `전체 ${totalFilteredCount}건 중 ${startIndex + 1}-${Math.min(endIndex, totalFilteredCount)}건 표시`}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          type="button"
          disabled={currentPage === 1 || totalPages <= 1} 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all"
        >
          이전
        </button>
        {totalPages <= 1 ? (
          <button 
            type="button"
            disabled 
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-sm disabled:opacity-50 cursor-not-allowed"
          >
            1
          </button>
        ) : (
          Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button 
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentPage === page 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'border bg-white text-slate-600 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              {page}
            </button>
          ))
        )}
        <button 
          type="button"
          disabled={currentPage === totalPages || totalPages <= 1} 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all"
        >
          다음
        </button>
      </div>
    </div>
  );
}
