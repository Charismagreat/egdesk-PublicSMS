import React from "react";
import { Trash2, Search } from "lucide-react";
import { Coupon } from "../types";

interface CouponTableProps {
  filteredCount: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  paginatedData: Coupon[];
  allCouponsCount: number;
  formatDiscount: (type: string, value: number) => string;
  onDelete: (id: string) => void;
}

export function CouponTable({
  filteredCount,
  searchQuery,
  setSearchQuery,
  paginatedData,
  allCouponsCount,
  formatDiscount,
  onDelete
}: CouponTableProps) {
  const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-slate-800 shrink-0">발행된 쿠폰 목록 ({filteredCount}건)</h2>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="쿠폰 코드, 쿠폰명 검색"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-red-500 outline-none text-xs bg-white font-semibold text-slate-800"
          />
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-sm">
            <th className="p-4 font-semibold text-slate-600">상태</th>
            <th className="p-4 font-semibold text-slate-600">쿠폰 코드</th>
            <th className="p-4 font-semibold text-slate-600">쿠폰명</th>
            <th className="p-4 font-semibold text-slate-600">혜택 내역</th>
            <th className="p-4 font-semibold text-slate-600">최소주문금액</th>
            <th className="p-4 font-semibold text-slate-600">유효기간</th>
            <th className="p-4 font-semibold text-slate-600">제한 조건</th>
            <th className="p-4 font-semibold text-slate-600">발행일시</th>
            <th className="p-4 font-semibold text-slate-600 text-center w-24">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-8 text-center text-slate-400">
                {allCouponsCount === 0 ? "발행된 쿠폰이 없습니다." : "검색 결과와 일치하는 쿠폰이 없습니다."}
              </td>
            </tr>
          ) : (
            paginatedData.map(t => {
              const isExpired = !!(t.expires_at && todayStr > t.expires_at);
              const isInactive = isExpired || t.status !== 'active';

              return (
                <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${isInactive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                  <td className="p-4">
                    {isExpired ? (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                        만료됨
                      </span>
                    ) : t.status === 'active' ? (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
                        사용가능
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500">
                        종료됨
                      </span>
                    )}
                  </td>
                  <td className={`p-4 font-mono font-bold text-slate-700 ${isInactive ? 'line-through text-slate-400' : ''}`}>{t.code}</td>
                  <td className={`p-4 font-medium text-slate-800 ${isInactive ? 'line-through text-slate-400' : ''}`}>{t.name}</td>
                  <td className={`p-4 text-red-600 font-bold whitespace-nowrap ${isInactive ? 'text-slate-400 line-through' : ''}`}>
                    {formatDiscount(t.discount_type, Number(t.discount_value))}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    {Number(t.min_order_amount) > 0 ? `${Number(t.min_order_amount).toLocaleString()}원 이상` : '제한없음'}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    {t.expires_at ? (
                      <span className={isExpired ? 'text-red-500 font-semibold' : ''}>
                        {t.expires_at}
                      </span>
                    ) : '무제한'}
                  </td>
                  <td className="p-4 text-slate-500 text-xs">
                    {t.restrictions && t.restrictions.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {t.restrictions.map((r: any, idx: number) => (
                          <span 
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.restriction_type === 'EXCLUDE'
                                ? 'bg-red-50 text-red-650 border border-red-100'
                                : 'bg-indigo-50 text-indigo-650 border border-indigo-100'
                            }`}
                          >
                            {r.restriction_type === 'EXCLUDE' ? '제외' : '허용'}:{r.target_type === 'PRODUCT' ? '상품' : '카테고리'}({r.target_value})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">제한없음</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-400 text-sm">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => onDelete(t.id)} 
                      className="text-slate-350 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 border-0 cursor-pointer bg-transparent"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
