'use client';

import React from 'react';
import { ShoppingBag, Search, Check } from 'lucide-react';
import { Product, NaverPost } from '../types';

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  productSearchQuery: string;
  setProductSearchQuery: (v: string) => void;
  setSelectedPostForPreview: (p: NaverPost | null) => void;
}

export default function ProductSelector({
  products,
  selectedProduct,
  setSelectedProduct,
  productSearchQuery,
  setProductSearchQuery,
  setSelectedPostForPreview
}: ProductSelectorProps) {
  
  // 검색어에 따른 필터링된 상품 리스트
  const filteredProducts = products.filter(prod => 
    prod.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (prod.brand && prod.brand.toLowerCase().includes(productSearchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ShoppingBag className="w-4.5 h-4.5" />
          </span>
          <h3 className="text-base font-bold text-slate-800">
            1단계: 마케팅 대상 상품 선택
          </h3>
        </div>
        <div className="text-xs text-slate-500 font-bold">
          선택 시 AI 자동 매핑 키워드가 즉시 갱신됩니다
        </div>
      </div>

      {/* 검색어 입력창 */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
        <input 
          type="text"
          placeholder="등록 상품명, 브랜드, 가격대 검색..."
          value={productSearchQuery}
          onChange={(e) => setProductSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white/50 backdrop-blur-xs border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold shadow-2xs"
        />
      </div>

      {/* 상품 콤팩트 리스트 */}
      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
        {filteredProducts.map((prod) => {
          const isSelected = selectedProduct?.id === prod.id;
          return (
            <div
              key={prod.id}
              data-testid="product-card"
              onClick={() => {
                setSelectedProduct(prod);
                setSelectedPostForPreview(null);
              }}
              className={`p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer transition-all duration-350 ${
                isSelected 
                  ? 'bg-emerald-50/40 border-emerald-500/50 shadow-sm scale-100.5' 
                  : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <img 
                  src={prod.main_image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'} 
                  alt={prod.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-100 bg-slate-50 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-500">
                      {prod.brand || '브랜드 분석 중'}
                    </span>
                    <span className="text-xs font-black text-slate-800 line-clamp-1">{prod.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-450 mt-1.5 flex items-center gap-2">
                    <span className="font-extrabold text-emerald-600">
                      {Number(prod.price).toLocaleString()}원
                    </span>
                    <span className="text-slate-200">|</span>
                    <span className="line-clamp-1 max-w-[200px] text-slate-500 font-semibold">{prod.specs || '스펙 정보 분석 중'}</span>
                  </div>
                </div>
              </div>
              
              {isSelected ? (
                <div className="w-6 h-6 rounded-full bg-[#03C75A] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(3,199,90,0.3)] shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-slate-250 bg-slate-50 shrink-0"></div>
              )}
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400 font-bold bg-white rounded-2xl border border-slate-100">
            검색 결과에 부합하는 연동 상품이 없습니다. 🔍
          </div>
        )}
      </div>
    </div>
  );
}
