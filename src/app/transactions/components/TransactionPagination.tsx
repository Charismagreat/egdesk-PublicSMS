import React from "react";

interface TransactionPaginationProps {
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  filteredTransactionsLength: number;
  startIndex: number;
  endIndex: number;
}

export function TransactionPagination({
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
  filteredTransactionsLength,
  startIndex,
  endIndex
}: TransactionPaginationProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-4 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-semibold">페이지당 표시:</span>
        <select 
          value={itemsPerPage} 
          onChange={e => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }} 
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-700 focus:border-orange-500 transition-colors"
        >
          <option value={10}>10개씩 보기</option>
          <option value={20}>20개씩 보기</option>
          <option value={50}>50개씩 보기</option>
          <option value={100}>100개씩 보기</option>
        </select>
        <span className="text-xs text-slate-400 font-semibold ml-2">
          {filteredTransactionsLength === 0 
            ? "전체 0건 표시" 
            : `전체 ${filteredTransactionsLength}건 중 ${startIndex + 1}-${Math.min(endIndex, filteredTransactionsLength)}건 표시`}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          type="button"
          disabled={currentPage === 1 || totalPages <= 1} 
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all"
        >
          이전
        </button>
        {totalPages <= 1 ? (
          <button 
            type="button"
            disabled
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 text-white shadow-sm disabled:opacity-50 cursor-not-allowed border-0"
          >
            1
          </button>
        ) : (
          Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button 
              type="button"
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentPage === page 
                  ? "bg-orange-600 text-white shadow-sm border-0" 
                  : "border bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              }`}
            >
              {page}
            </button>
          ))
        )}
        <button 
          type="button"
          disabled={currentPage === totalPages || totalPages <= 1} 
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all"
        >
          다음
        </button>
      </div>
    </div>
  );
}
