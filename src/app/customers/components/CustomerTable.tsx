import React from "react";
import { Customer } from "../types";
import { Users, Plus, FileSpreadsheet, History, ChevronLeft, ChevronRight } from "lucide-react";

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
  onOpenAddModal?: () => void;
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
  endIndex,
  onOpenAddModal
}: CustomerTableProps) {
  return (
    <div className="space-y-4">
      {/* 메인 대장 테이블 */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider">
            <tr>
              <th className="p-3.5 w-12 text-center">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer" />
              </th>
              <th className="p-3.5">고객명</th>
              <th className="p-3.5">연락처</th>
              <th className="p-3.5">주소</th>
              <th className="p-3.5">배송지 정보</th>
              <th className="p-3.5">그룹 / 태그</th>
              <th className="p-3.5">보유 적립금</th>
              <th className="p-3.5">등록일자</th>
              <th className="p-3.5 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-slate-500">고객 데이터를 안전하게 불러오는 중입니다...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-16 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-xs">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 tracking-tight">
                        {customers.length === 0 ? "등록된 고객 정보가 없습니다" : "검색 조건과 일치하는 고객이 없습니다"}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                        {customers.length === 0 
                          ? "신규 고객을 직접 등록하거나 엑셀 파일로 일괄 등록하여 스마트 CRM 관리를 시작해 보세요." 
                          : "검색어를 확인하거나 필터를 초기화해 보세요."}
                      </p>
                    </div>
                    {customers.length === 0 && onOpenAddModal && (
                      <button
                        onClick={onOpenAddModal}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>첫 고객 신규 등록하기</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((c) => (
                <tr 
                  key={c.id} 
                  className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(c)}
                >
                  <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer" />
                  </td>
                  <td className="p-3.5 font-black text-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-3xs">
                        {c.name.charAt(0)}
                      </div>
                      <span className="hover:text-indigo-600 transition-colors">{c.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-600 font-mono font-bold">{c.phone}</td>
                  <td className="p-3.5 text-slate-500 truncate max-w-[150px] font-medium" title={c.address}>{c.address || '-'}</td>
                  <td className="p-3.5 text-slate-500 text-xs">
                    {c.shipping_address ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-700">{c.recipient_name} <span className="font-mono text-[10px] text-slate-400">({c.recipient_phone})</span></p>
                        <p className="truncate max-w-[150px] font-medium text-slate-400" title={c.shipping_address}>{c.shipping_address}</p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3.5">
                    {c.tags ? (
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-3xs">
                        {c.tags}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-3.5 font-black text-indigo-600 font-mono">
                    {(c.point_balance || 0).toLocaleString()}P
                  </td>
                  <td className="p-3.5 text-slate-400 font-medium">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleRowClick(c)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1 mx-auto active:scale-95"
                    >
                      <History className="w-3 h-3 text-indigo-500" />
                      <span>이력 조회</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 테이블 하단 페이지네이션 및 표시 건수 제어 바 */}
      {!isLoading && filteredCustomers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">페이지당 표시:</span>
            <select 
              value={itemsPerPage} 
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }} 
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-700 focus:border-indigo-500 shadow-3xs"
            >
              <option value={10}>10명씩 보기</option>
              <option value={20}>20명씩 보기</option>
              <option value={50}>50명씩 보기</option>
              <option value={100}>100명씩 보기</option>
            </select>
            <span className="text-xs text-slate-400 font-semibold ml-2">
              전체 {filteredCustomers.length.toLocaleString()}명 중 {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)}명 표시
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1 || totalPages <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all shadow-3xs"
              title="이전 페이지"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {totalPages <= 1 ? (
              <button 
                disabled
                className="w-8 h-8 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-sm border border-indigo-600"
              >
                1
              </button>
            ) : (
              Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === page 
                      ? 'bg-indigo-600 text-white shadow-sm font-black' 
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
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all shadow-3xs"
              title="다음 페이지"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
