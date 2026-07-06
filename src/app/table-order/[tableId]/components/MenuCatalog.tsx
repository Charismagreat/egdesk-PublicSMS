"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
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
                <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                  {product.main_image_url ? (
                    <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-350 font-black text-xs select-none">No Img</div>
                  )}
                </div>
                <div className="flex flex-col flex-1 justify-between py-1">
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight mb-1 text-sm">{product.name}</h3>
                    <div className="text-orange-650 font-black tracking-tight text-lg">
                      {product.price === '상담후결정' ? '직원 문의' : `${getNumericPrice(product.price).toLocaleString()}원`}
                    </div>
                  </div>
                  <div className="flex justify-end items-center mt-2">
                    {qty > 0 ? (
                      <div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg overflow-hidden h-10 w-28">
                        <button 
                          onClick={() => updateCart(product.id, -1)} 
                          className="flex-1 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors h-full border-0 bg-transparent cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="flex-1 text-center font-bold text-orange-755 select-none">{qty}</span>
                        <button 
                          onClick={() => updateCart(product.id, 1)} 
                          className="flex-1 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors h-full border-0 bg-transparent cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => updateCart(product.id, 1)} 
                        className="bg-slate-900 text-white font-bold text-sm px-5 py-2 rounded-lg hover:bg-slate-800 transition-colors border-0 cursor-pointer"
                      >
                        담기
                      </button>
                    )}
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
