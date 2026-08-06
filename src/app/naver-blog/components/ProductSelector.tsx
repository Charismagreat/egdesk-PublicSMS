'use client';

import React, { useState } from 'react';
import { ShoppingBag, Search, Check, ImageOff, CheckSquare, Square, Maximize2, ExternalLink } from 'lucide-react';
import { Product, NaverPost } from '../types';
import ProductSelectModal from './ProductSelectModal';

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  selectedProducts: Product[];
  setSelectedProducts: (prods: Product[]) => void;
  productSearchQuery: string;
  setProductSearchQuery: (v: string) => void;
  setSelectedPostForPreview: (p: NaverPost | null) => void;
}

export default function ProductSelector({
  products,
  selectedProduct,
  setSelectedProduct,
  selectedProducts,
  setSelectedProducts,
  productSearchQuery,
  setProductSearchQuery,
  setSelectedPostForPreview
}: ProductSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 검색어에 따른 필터링된 상품 리스트 (정식 승인 상품 우대 정렬)
  const filteredProducts = products.filter(prod => 
    prod.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (prod.brand && prod.brand.toLowerCase().includes(productSearchQuery.toLowerCase()))
  ).sort((a: any, b: any) => {
    const scoreA = (a.status === 'ACTIVE' ? 10 : 0) + (a.brand && a.brand !== '미분류' ? 5 : 0);
    const scoreB = (b.status === 'ACTIVE' ? 10 : 0) + (b.brand && b.brand !== '미분류' ? 5 : 0);
    return scoreB - scoreA;
  });

  const isAllSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.some(sp => sp.id === p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProducts([]);
      setSelectedProduct(null);
    } else {
      setSelectedProducts(filteredProducts);
      if (filteredProducts.length > 0) {
        setSelectedProduct(filteredProducts[0]);
      }
    }
  };

  return (
    <>
      <div className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShoppingBag className="w-4.5 h-4.5" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              1단계: 마케팅 대상 상품 선택
            </h3>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 대형 팝업으로 전체 선택 모달 열기 버튼 */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>대형 팝업으로 상품 선택 📦</span>
            </button>

            {selectedProducts.length > 0 ? (
              <>
                <span className="px-3 py-1 text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-1.5 shadow-3xs">
                  <span>선택된 {selectedProducts.length}개 상품 풀(Pool) 자율 추출 모드</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProducts([]);
                    setSelectedProduct(null);
                  }}
                  className="px-2.5 py-1 text-xs font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                  title="선택된 모든 상품 풀 해제"
                >
                  <span>전체 해제 ✖️</span>
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-500 font-bold hidden sm:block">
                복수 선택 시 선택된 상품 풀 안에서만 AI 자율 추출 포스팅이 빌드됩니다
              </div>
            )}
          </div>
        </div>

        {/* 검색어 입력창, 전체 선택 및 대형 팝업 열기 툴바 */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="등록 상품명, 브랜드, 가격대 검색..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/50 backdrop-blur-xs border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={`px-3.5 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs ${
                isAllSelected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>{isAllSelected ? '전체 해제' : '전체 선택'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>전체 팝업 보기</span>
            </button>
          </div>
        </div>

        {/* 상품 콤팩트 리스트 */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {filteredProducts.map((prod) => {
            const isChecked = selectedProducts.some(sp => sp.id === prod.id);
            const isPrimary = selectedProduct?.id === prod.id;

            const handleCardClick = () => {
              if (isChecked) {
                const updated = selectedProducts.filter(p => p.id !== prod.id);
                setSelectedProducts(updated);
                if (selectedProduct?.id === prod.id) {
                  setSelectedProduct(updated.length > 0 ? updated[0] : null);
                }
              } else {
                const updated = [...selectedProducts, prod];
                setSelectedProducts(updated);
                setSelectedProduct(prod);
                setSelectedPostForPreview(null);
              }
            };

            return (
              <div
                key={prod.id}
                data-testid="product-card"
                onClick={handleCardClick}
                className={`p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer transition-all duration-350 ${
                  isChecked 
                    ? 'bg-purple-50/50 border-purple-300 shadow-sm scale-100.2' 
                    : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                    className="p-1 text-purple-600 hover:scale-110 transition-transform cursor-pointer"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-purple-600 fill-purple-100" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </button>

                  {prod.main_image_url ? (
                    <img 
                      src={prod.main_image_url} 
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100 bg-slate-50 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl border border-slate-200/80 bg-slate-100/90 flex flex-col items-center justify-center text-slate-400 shrink-0 select-none">
                      <ImageOff className="w-4 h-4 text-slate-400 mb-0.5" />
                      <span className="text-[7.5px] font-extrabold text-slate-400 tracking-tighter">이미지 없음</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-500">
                        {prod.brand || '브랜드 분석 중'}
                      </span>
                      <span className="text-xs font-black text-slate-800 line-clamp-1">{prod.name}</span>
                      {isPrimary && (
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                          미리보기 타겟
                        </span>
                      )}
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
                
                {isChecked ? (
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-3xs shrink-0">
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

      {/* 대형 상품 선택 팝업 모달 */}
      <ProductSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        selectedProducts={selectedProducts}
        setSelectedProducts={setSelectedProducts}
      />
    </>
  );
}
