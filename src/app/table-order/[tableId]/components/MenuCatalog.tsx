"use client";

import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Product, CartState } from "../types";

interface MenuCatalogProps {
  loading: boolean;
  filteredProducts: Product[];
  cart: CartState;
  updateCart: (productId: string, delta: number) => void;
  getNumericPrice: (priceStr: string) => number;
}

export function MenuCatalog({
  loading,
  filteredProducts,
  cart,
  updateCart,
  getNumericPrice
}: MenuCatalogProps) {
  return (
    <div className="flex-1 px-4 py-6 w-full">
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-semibold text-sm">
          해당 분류의 상품이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.map(product => {
            const qty = cart[product.id] || 0;
            return (
              <div key={product.id} className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm border border-slate-100">
                <div className="w-28 min-h-[105px] h-full rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center self-stretch">
                  {product.main_image_url ? (
                    <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-350 font-black text-xs select-none">No Img</div>
                  )}
                </div>
                <div className="flex flex-col flex-1 justify-between py-0.5 min-w-0">
                  <div>
                    {product.menu_category && (
                      <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md text-[10px] font-bold mb-1 border border-orange-100">
                        {product.menu_category}
                      </span>
                    )}
                    <h3 className="font-bold text-slate-800 leading-tight mb-1 text-sm truncate">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-1 whitespace-pre-line">
                        {product.description}
                      </p>
                    )}
                  </div>
                  
                  {/* 하단 가격 & 담기 버튼 라인 (사진 하단 라인과 완벽 정렬) */}
                  <div className="flex items-end justify-between mt-2 pt-1 gap-2">
                    <div className="text-orange-650 font-black tracking-tight text-lg leading-none">
                      {product.price === '상담후결정' ? '직원 문의' : `${getNumericPrice(product.price).toLocaleString()}원`}
                    </div>

                    <div className="shrink-0">
                      {qty > 0 ? (
                        <div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg overflow-hidden h-9 w-24">
                          <button 
                            onClick={() => updateCart(product.id, -1)} 
                            className={`flex-1 flex items-center justify-center transition-colors h-full border-0 bg-transparent cursor-pointer ${
                              qty === 1 ? "text-rose-500 hover:bg-rose-100" : "text-orange-600 hover:bg-orange-100"
                            }`}
                            title={qty === 1 ? "담기 취소" : "수량 감소"}
                          >
                            {qty === 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="flex-1 text-center font-bold text-orange-755 text-xs select-none">{qty}</span>
                          <button 
                            onClick={() => updateCart(product.id, 1)} 
                            className="flex-1 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors h-full border-0 bg-transparent cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => updateCart(product.id, 1)} 
                          className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors border-0 cursor-pointer"
                        >
                          담기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
