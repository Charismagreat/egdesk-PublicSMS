import React from "react";
import { Search, Send, Trash2 } from "lucide-react";
import { Transaction } from "../types";

interface TransactionTableProps {
  transactionsCount: number;
  filteredTransactions: Transaction[];
  paginatedTransactions: Transaction[];
  selectedIds: Set<string>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSending: boolean;
  sendOrderSms: () => Promise<void>;
  toggleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleSelect: (id: string) => void;
  setActiveOrderId: (id: string | null) => void;
  deleteTransaction: (id: string) => Promise<void>;
}

export function TransactionTable({
  transactionsCount,
  filteredTransactions,
  paginatedTransactions,
  selectedIds,
  searchQuery,
  setSearchQuery,
  isSending,
  sendOrderSms,
  toggleSelectAll,
  toggleSelect,
  setActiveOrderId,
  deleteTransaction
}: TransactionTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* 툴바 컨트롤러 */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-slate-800 shrink-0">거래 목록 ({transactionsCount}건)</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="고객명, 연락처, 상품 검색"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-orange-500 outline-none text-xs bg-white font-semibold text-slate-800"
            />
          </div>
          <button 
            type="button"
            onClick={sendOrderSms}
            disabled={isSending}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center text-white w-full sm:w-auto shrink-0 border-0 cursor-pointer transition-colors ${
              isSending ? "bg-slate-400 cursor-not-allowed" : "bg-orange-655 bg-orange-600 hover:bg-orange-700"
            }`}
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "발송 중..." : "선택 주문 자동 안내문자 발송"}
          </button>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 text-sm text-slate-500 bg-slate-50 font-bold">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll} 
                  checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length} 
                  className="rounded cursor-pointer" 
                />
              </th>
              <th className="p-4">주문일자</th>
              <th className="p-4">연관 주문</th>
              <th className="p-4">고객명</th>
              <th className="p-4">연락처</th>
              <th className="p-4">주문상품</th>
              <th className="p-4 text-right">결제금액</th>
              <th className="p-4">관리</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(t.id)} 
                    onChange={() => toggleSelect(t.id)} 
                    className="rounded cursor-pointer" 
                  />
                </td>
                <td className="p-4 text-sm text-slate-600 font-medium">{t.orderDate}</td>
                <td className="p-4">
                  {t.orderId ? (
                    <button 
                      type="button"
                      onClick={() => setActiveOrderId(t.orderId || null)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-tight transition-all active:scale-95 cursor-pointer"
                    >
                      ORD-{t.orderId.slice(-6).toUpperCase()}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-light">-</span>
                  )}
                </td>
                <td className="p-4 font-bold text-slate-800">{t.customerName}</td>
                <td className="p-4 text-slate-600 font-medium">{t.customerPhone}</td>
                <td className="p-4 text-slate-850 font-semibold">{t.productName}</td>
                <td className="p-4 text-slate-700 font-bold text-right font-mono">
                  {t.amount ? Number(String(t.amount).replace(/[^0-9]/g, "")).toLocaleString() : "-"}
                </td>
                <td className="p-4">
                  <button 
                    type="button"
                    onClick={() => deleteTransaction(t.id)} 
                    className="text-red-400 hover:text-red-650 p-1 border-0 bg-transparent cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {paginatedTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400 font-bold text-sm">
                  {filteredTransactions.length === 0 ? "등록된 거래 내역이 없습니다." : "검색 결과와 일치하는 거래 내역이 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
