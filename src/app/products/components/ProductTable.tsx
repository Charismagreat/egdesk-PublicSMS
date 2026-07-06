"use client";

import React from "react";
import { Search, Pencil, Trash2 } from "lucide-react";
import { Product, HoverImage } from "../types";

interface ProductTableProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredDataCount: number;
  paginatedData: Product[];
  totalDataLength: number;
  onHoverImage: (img: HoverImage | null) => void;
  onToggleCouponExclude: (id: string, currentValue: number) => void;
  onEditClick: (product: Product) => void;
  onDeleteClick: (id: string) => void;
}

export function ProductTable({
  searchQuery,
  setSearchQuery,
  filteredDataCount,
  paginatedData,
  totalDataLength,
  onHoverImage,
  onToggleCouponExclude,
  onEditClick,
  onDeleteClick
}: ProductTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full text-slate-800">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-slate-800 shrink-0">등록된 상품 목록 ({filteredDataCount}건)</h2>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="상품명, 카테고리, 상세 설명 검색"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-xs bg-white font-semibold"
          />
        </div>
      </div>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-sm">
              <th className="p-4 font-semibold text-slate-600">ID</th>
              <th className="p-4 font-semibold text-slate-600">분류</th>
              <th className="p-4 font-semibold text-slate-600">카테고리</th>
              <th className="p-4 font-semibold text-slate-600 w-[25%]">상품정보</th>
              <th className="p-4 font-semibold text-slate-600 text-right">가격</th>
              <th className="p-4 font-semibold text-slate-600">쿠폰 적용</th>
              <th className="p-4 font-semibold text-slate-600">상세 설명</th>
              <th className="p-4 font-semibold text-slate-600 text-center w-24">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-450 font-bold text-sm">
                  {totalDataLength === 0 ? "등록된 상품이 없습니다." : "검색 결과와 일치하는 상품이 없습니다."}
                </td>
              </tr>
            ) : (
              paginatedData.map(t => {
                const isPriceTbd = t.price === '상담후결정';
                const numericPrice = isPriceTbd ? 0 : Number(String(t.price).replace(/[^0-9]/g, ''));
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-400">{(t.id).slice(-6)}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg">{t.category || '스토어용'}</span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-bold">{t.menu_category || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {t.main_image_url ? (
                          <img 
                            src={t.main_image_url} 
                            alt={t.name} 
                            className="w-10 h-10 object-cover rounded shadow-sm cursor-pointer" 
                            onMouseEnter={(e) => onHoverImage({url: t.main_image_url, x: e.clientX, y: e.clientY})}
                            onMouseMove={(e) => onHoverImage({url: t.main_image_url, x: e.clientX, y: e.clientY})}
                            onMouseLeave={() => onHoverImage(null)}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 font-bold select-none">No Img</div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{t.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-1">
                            {t.available_methods ? t.available_methods.split(',').map((method: string, i: number) => (
                              <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">{method}</span>
                            )) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-pink-600 font-black text-sm whitespace-nowrap text-right">
                      {isPriceTbd ? '상담후결정' : `${numericPrice.toLocaleString()}원`}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          type="button"
                          onClick={() => onToggleCouponExclude(t.id, t.is_coupon_excludable || 0)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                            (t.is_coupon_excludable || 0) === 1 ? 'bg-slate-200' : 'bg-green-500 shadow-sm shadow-green-500/20'
                          }`}
                        >
                          <span 
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              (t.is_coupon_excludable || 0) === 1 ? 'translate-x-0' : 'translate-x-4'
                            }`}
                          />
                        </button>
                        <span className={`text-xs font-bold ${
                          (t.is_coupon_excludable || 0) === 1 ? 'text-slate-400' : 'text-green-600'
                        }`}>
                          {(t.is_coupon_excludable || 0) === 1 ? '제외' : '허용'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      <p className="truncate max-w-[180px] font-medium" title={t.description}>{t.description || '-'}</p>
                      {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline mt-1 block font-bold">링크</a>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button 
                          onClick={() => onEditClick(t)} 
                          className="text-slate-400 hover:text-pink-650 transition-colors p-2 rounded-lg hover:bg-pink-50 border-0 bg-transparent cursor-pointer" 
                          title="수정"
                        >
                          <Pencil className="w-4 h-4"/>
                        </button>
                        <button 
                          onClick={() => onDeleteClick(t.id)} 
                          className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 border-0 bg-transparent cursor-pointer" 
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
