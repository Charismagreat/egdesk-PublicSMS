import React from "react";
import { Search, Trash2 } from "lucide-react";
import { Delivery } from "../types";

interface DeliveryTableProps {
  paginatedData: Delivery[];
  allDataCount: number;
  filteredCount: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setActiveOrderId: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export function DeliveryTable({
  paginatedData,
  allDataCount,
  filteredCount,
  searchQuery,
  setSearchQuery,
  setActiveOrderId,
  onDelete
}: DeliveryTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-slate-800 shrink-0">배송 목록 ({filteredCount}건)</h2>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="고객명, 연락처, 주소, 송장 검색"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-amber-500 outline-none text-xs bg-white font-semibold text-slate-800"
          />
        </div>
      </div>
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-sm">
            <th className="p-4 font-semibold text-slate-650">고객명</th>
            <th className="p-4 font-semibold text-slate-650">연관 주문</th>
            <th className="p-4 font-semibold text-slate-650">연락처</th>
            <th className="p-4 font-semibold text-slate-650">주소</th>
            <th className="p-4 font-semibold text-slate-650">택배사</th>
            <th className="p-4 font-semibold text-slate-650">운송장번호</th>
            <th className="p-4 font-semibold text-slate-650">상태</th>
            <th className="p-4 font-semibold text-slate-650">관리</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(t => (
            <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="p-4 font-bold text-slate-800">{t.customer_name}</td>
              <td className="p-4">
                {t.order_id ? (
                  <button 
                    onClick={() => setActiveOrderId(t.order_id || null)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-tight transition-all active:scale-95 cursor-pointer"
                  >
                    ORD-{t.order_id.slice(-6).toUpperCase()}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">-</span>
                )}
              </td>
              <td className="p-4 font-semibold text-slate-700">{t.customer_phone}</td>
              <td className="p-4 text-xs text-slate-600 font-semibold">{t.address}</td>
              <td className="p-4 font-bold text-slate-700">{t.courier}</td>
              <td className="p-4 font-mono text-amber-600 font-bold">{t.tracking_number || '-'}</td>
              <td className="p-4">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  t.status === '배송완료' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {t.status}
                </span>
              </td>
              <td className="p-4">
                <button 
                  onClick={() => onDelete(t.id)} 
                  className="text-red-400 hover:text-red-650 p-2 rounded-lg hover:bg-red-50 transition-colors border-0 cursor-pointer bg-transparent" 
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
              </td>
            </tr>
          ))}
          {paginatedData.length === 0 && (
            <tr>
              <td colSpan={8} className="p-12 text-center text-slate-400 font-semibold">
                {allDataCount === 0 ? "배송 내역이 존재하지 않습니다." : "검색 결과와 일치하는 배송 내역이 존재하지 않습니다."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
