import React from "react";
import { Search, X, Minus, Plus } from "lucide-react";
import { Product } from "../types";

interface ProductSelectorProps {
  products: Product[];
  filteredProducts: Product[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  quantities: Record<string, number>;
  onAdjustQuantity: (productId: string, amount: number) => void;
}

export function ProductSelector({
  products,
  filteredProducts,
  searchTerm,
  setSearchTerm,
  quantities,
  onAdjustQuantity
}: ProductSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">견적 요청 품목 선택</span>
      </div>

      {/* 스마트 실시간 B2B 자재 검색창 */}
      {products.length > 0 && (
        <div className="relative w-full flex items-center bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-indigo-500 transition-colors">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input 
            type="text"
            placeholder="자재/상품 이름 또는 설명 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400 border-0 p-0 focus:ring-0"
          />
          {searchTerm && (
            <button 
              type="button"
              onClick={() => setSearchTerm("")}
              className="p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 shrink-0 ml-1 transition-colors border-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      
      {products.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 font-semibold text-sm">
          현재 견적 전용으로 등록된 상품 품목이 없습니다.
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 font-semibold text-sm">
          <Search className="w-12 h-12 mx-auto text-slate-350 mb-3 animate-bounce" />
          <p className="text-slate-500 text-xs">일치하는 자재 품목이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map(p => {
            const qty = quantities[p.id] || 0;
            
            return (
              <div 
                key={p.id} 
                className={`bg-white border p-4 rounded-2xl flex items-center justify-between transition-all shadow-sm ${
                  qty > 0 ? 'border-indigo-500 ring-2 ring-indigo-500/5' : 'border-slate-100'
                }`}
              >
                <div className="flex-1 min-w-0 pr-4 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {p.category || '기본품목'}
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-sm md:text-base truncate block">{p.name}</h3>
                  <p className="text-slate-400 text-xs truncate block">{p.description || '최고급 사양의 비즈니스 전용 품목'}</p>
                  <span className="text-xs font-bold text-slate-600 block">
                    참고 단가: {parseFloat(p.price).toLocaleString()}원
                  </span>
                </div>

                {/* 수량 플러스 마이너스 */}
                <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => onAdjustQuantity(p.id, -1)}
                    className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shadow-sm border-0 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-black text-slate-800 text-sm">{qty}</span>
                  <button 
                    type="button"
                    onClick={() => onAdjustQuantity(p.id, 1)}
                    className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shadow-sm border-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
