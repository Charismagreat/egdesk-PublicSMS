import React from "react";
import { Customer } from "../types";

interface CustomerTableProps {
  isLoading: boolean;
  paginatedCustomers: Customer[];
  customers: Customer[];
  filteredCustomers: Customer[];
  handleRowClick: (customer: Customer) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  currentPage: number;
  setCurrentPage: (val: number | ((prev: number) => number)) => void;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function CustomerTable({
  isLoading,
  paginatedCustomers,
  customers,
  filteredCustomers,
  handleRowClick,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex,
  endIndex
}: CustomerTableProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      {/* 3. 고객 메인 전광판 테이블 (PC 대화면 스크롤 없는 레이아웃) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-250">
            <tr>
              <th className="p-4 w-12 text-center">
                <input type="checkbox" className="rounded text-blue-600 focus:ring-0" />
              </th>
              <th className="p-4">이름</th>
              <th className="p-4">연락처</th>
              <th className="p-4">주소</th>
              <th className="p-4">배송지 정보</th>
              <th className="p-4">그룹/태그</th>
              <th className="p-4">적립금</th>
              <th className="p-4">등록일</th>
              <th className="p-4 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  로딩 중...
                </td>
              </tr>
            ) : paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-450 font-bold">
                  {customers.length === 0 
                    ? "등록된 고객이 없습니다. 우측 상단의 '신규 등록' 버튼을 눌러 고객을 추가하세요." 
                    : "검색 조건과 일치하는 고객이 없습니다."}
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((c) => (
                <tr 
                  key={c.id} 
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(c)}
                >
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-0" />
                  </td>
                  <td className="p-4 font-black text-slate-800 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-650 text-white flex items-center justify-center font-bold mr-3 shadow-sm text-xs shrink-0 select-none">
                      {c.name.charAt(0)}
                    </div>
                    {c.name}
                  </td>
                  <td className="p-4 text-slate-505 font-mono font-bold">{c.phone}</td>
                  <td className="p-4 text-slate-500 truncate max-w-[150px] font-semibold" title={c.address}>{c.address || '-'}</td>
                  <td className="p-4 text-slate-500 text-xs">
                    {c.shipping_address ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-700">{c.recipient_name} <span className="font-mono text-[10px] text-slate-400">({c.recipient_phone})</span></p>
                        <p className="truncate max-w-[150px] font-semibold text-slate-450" title={c.shipping_address}>{c.shipping_address}</p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4">
                    {c.tags && (
                      <span className="bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-750 border border-indigo-100 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs">
                        {c.tags}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-indigo-650 font-mono">
                    {(c.point_balance || 0).toLocaleString()}p
                  </td>
                  <td className="p-4 text-slate-505 font-semibold">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleRowClick(c)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-655 hover:text-indigo-600 rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      이력 조회
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. 테이블 하단 페이지네이션 바 */}
      {!isLoading && (
        <div className="mt-4 flex items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">페이지당 표시:</span>
            <select 
              value={itemsPerPage} 
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }} 
              className="border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-700 focus:border-blue-500"
            >
              <option value={10}>10명씩 보기</option>
              <option value={20}>20명씩 보기</option>
              <option value={50}>50명씩 보기</option>
              <option value={100}>100명씩 보기</option>
            </select>
            <span className="text-xs text-slate-400 font-semibold ml-2">
              {filteredCustomers.length === 0 
                ? "전체 0명 표시" 
                : `전체 ${filteredCustomers.length}명 중 ${startIndex + 1}-${Math.min(endIndex, filteredCustomers.length)}명 표시`}
            </span>
          </div>
          
          <div className="flex space-x-1">
            <button 
              disabled={currentPage === 1 || totalPages <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-655 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              이전
            </button>
            {totalPages <= 1 ? (
              <button 
                disabled
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm border border-blue-600 cursor-not-allowed"
              >
                1
              </button>
            ) : (
              Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentPage === page 
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-600' 
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  {page}
                </button>
              ))
            )}
            <button 
              disabled={currentPage === totalPages || totalPages <= 1}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-655 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
