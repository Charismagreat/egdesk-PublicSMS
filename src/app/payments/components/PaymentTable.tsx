import React from "react";
import { Search, Trash2 } from "lucide-react";
import { PaymentItem } from "../types";

interface PaymentTableProps {
  totalCount: number;
  filteredCount: number;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  paginatedData: PaymentItem[];
  onOrderClick: (orderId: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function PaymentTable({
  totalCount,
  filteredCount,
  searchQuery,
  onSearchQueryChange,
  paginatedData,
  onOrderClick,
  onDelete
}: PaymentTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-slate-800 shrink-0">결제 목록 ({filteredCount}건)</h2>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="고객명, 결제수단, 주문번호 검색"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-emerald-500 outline-none text-xs bg-white font-semibold"
          />
        </div>
      </div>
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-600">
            <th className="p-4">결제일시</th>
            <th className="p-4">연관 주문</th>
            <th className="p-4">고객명</th>
            <th className="p-4">결제수단</th>
            <th className="p-4 text-right">결제금액</th>
            <th className="p-4">상태</th>
            <th className="p-4">관리</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(t => (
            <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="p-4">{t.payment_date}</td>
              <td className="p-4">
                {t.order_id ? (
                  <button 
                    type="button"
                    onClick={() => onOrderClick(t.order_id!)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-tight transition-all active:scale-95 cursor-pointer"
                  >
                    ORD-{t.order_id.slice(-6).toUpperCase()}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-light">-</span>
                )}
              </td>
              <td className="p-4">{t.customer_name}</td>
              <td className="p-4">{t.payment_method}</td>
              <td className="p-4 font-bold text-emerald-600 text-right">
                {t.amount ? Number(String(t.amount).replace(/[^0-9]/g, '')).toLocaleString() : '-'}
              </td>
              <td className="p-4">{t.status}</td>
              <td className="p-4">
                <button 
                  type="button"
                  onClick={() => onDelete(t.id)} 
                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer" 
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {paginatedData.length === 0 && (
            <tr>
              <td colSpan={7} className="p-12 text-center text-slate-400">
                {totalCount === 0 ? "등록된 결제 내역이 없습니다." : "검색 결과와 일치하는 결제 내역이 없습니다."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
