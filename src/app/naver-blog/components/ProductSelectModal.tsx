'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, CheckSquare, Square, Check, ShoppingBag, 
  Sparkles, ImageOff, Filter, ArrowUpDown 
} from 'lucide-react';
import { Product } from '../types';

interface ProductSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  selectedProducts: Product[];
  setSelectedProducts: (prods: Product[]) => void;
}

export default function ProductSelectModal({
  isOpen,
  onClose,
  products,
  selectedProduct,
  setSelectedProduct,
  selectedProducts,
  setSelectedProducts
}: ProductSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');

  if (!isOpen) return null;

  // 브랜드 유니크 목록
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[];

  // 검색 & 브랜드 필터링
  const filteredProducts = products.filter(prod => {
    const matchesSearch = 
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.brand && prod.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.specs && prod.specs.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesBrand = filterBrand === 'ALL' || prod.brand === filterBrand;
    return matchesSearch && matchesBrand;
  }).sort((a: any, b: any) => {
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

  const handleToggleProduct = (prod: Product) => {
    const isChecked = selectedProducts.some(sp => sp.id === prod.id);
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
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden relative"
        >
          {/* 모달 상단 헤더 */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  마케팅 대상 상품 선택 팝업
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    전체 {products.length}개 상품
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  AI 자동 포스팅에 활용할 상품을 자유롭게 검색하고 멀티 선택하세요.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 컨트롤 툴바 (검색, 브랜드 필터, 전체선택) */}
          <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="상품명, 브랜드, 가격, 스펙으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
              {/* 브랜드 필터 */}
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">전체 브랜드 ({brands.length})</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* 전체 선택 토글 버튼 */}
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs ${
                  isAllSelected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isAllSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                <span>{isAllSelected ? '전체 해제' : '검색 결과 전체 선택'}</span>
              </button>
            </div>
          </div>

          {/* 중앙 대형 2열 그리드 상품 리스트 영역 */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredProducts.map((prod) => {
                const isChecked = selectedProducts.some(sp => sp.id === prod.id);
                const isPrimary = selectedProduct?.id === prod.id;

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleToggleProduct(prod)}
                    className={`p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all duration-200 ${
                      isChecked
                        ? 'bg-purple-50/70 border-purple-300 shadow-sm ring-2 ring-purple-500/20'
                        : 'bg-white border-slate-200/80 hover:border-emerald-500/50 hover:bg-emerald-50/10 hover:-translate-y-0.5 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProduct(prod);
                        }}
                        className="p-1 text-purple-600 hover:scale-110 transition-transform cursor-pointer shrink-0"
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
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-100 bg-slate-50 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl border border-slate-200/80 bg-slate-100/90 flex flex-col items-center justify-center text-slate-400 shrink-0 select-none">
                          <ImageOff className="w-5 h-5 text-slate-400 mb-0.5" />
                          <span className="text-[8px] font-extrabold text-slate-400 tracking-tighter">이미지 없음</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                            {prod.brand || '브랜드 분석 중'}
                          </span>
                          {isPrimary && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                              미리보기 타겟
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-slate-800 truncate mt-1">{prod.name}</h4>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-extrabold text-emerald-600 shrink-0">
                            {Number(prod.price).toLocaleString()}원
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="truncate text-slate-450 font-semibold">{prod.specs || '스펙 정보 분석 중'}</span>
                        </div>
                      </div>
                    </div>

                    {isChecked ? (
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-xs shrink-0 ml-2">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-250 bg-slate-50 shrink-0 ml-2"></div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 my-4">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">검색어 및 필터 조건에 일치하는 상품이 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">검색어를 바꾸거나 브랜드 필터를 전체로 변경해 보세요.</p>
              </div>
            )}
          </div>

          {/* 모달 하단 툴바 및 선택 완료 액션 */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 flex-wrap max-w-2xl">
              <span className="text-xs font-extrabold text-slate-700">
                선택된 상품 ({selectedProducts.length}개):
              </span>
              {selectedProducts.length > 0 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
                  {selectedProducts.slice(0, 4).map(sp => (
                    <span key={sp.id} className="px-2.5 py-1 bg-purple-100 border border-purple-200 text-purple-800 rounded-xl text-[10px] font-bold shrink-0">
                      {sp.name}
                    </span>
                  ))}
                  {selectedProducts.length > 4 && (
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-extrabold">
                      +{selectedProducts.length - 4}개 더보기
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-medium">선택된 상품이 없습니다. (전체 자율 무작위 포스팅 모드)</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedProducts([]);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                전체 해제
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>선택 완료 ({selectedProducts.length}개 적용)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
