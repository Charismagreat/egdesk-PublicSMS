import React from "react";
import { ShoppingBag, Search, X, Package } from "lucide-react";
import { StoreProduct } from "../types";

interface ProductListProps {
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filteredProducts: StoreProduct[];
  openModal: (product: StoreProduct) => void;
  getNumericPrice: (priceStr: string) => number;
}

export function ProductList({
  loading,
  searchTerm,
  setSearchTerm,
  filteredProducts,
  openModal,
  getNumericPrice
}: ProductListProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
        <h2 className="text-3xl font-extrabold text-slate-800 flex items-center tracking-tight">
          <ShoppingBag className="w-8 h-8 mr-3 text-blue-600" />
          전체 상품
        </h2>
        {/* 스마트 실시간 상품 검색창 */}
        <div className="relative w-full sm:max-w-xs flex items-center bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:border-blue-500 transition-colors">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input 
            type="text"
            placeholder="상품명 또는 설명 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button 
              type="button"
              onClick={() => setSearchTerm("")}
              className="p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 shrink-0 ml-1 transition-colors border-none bg-transparent cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl h-80 shadow-sm animate-pulse border border-slate-100"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl shadow-sm text-center border border-slate-100">
          {searchTerm ? (
            <>
              <Search className="w-16 h-16 mx-auto text-slate-300 mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">일치하는 상품이 없습니다</h3>
              <p className="text-slate-500">다른 키워드로 검색해 보세요.</p>
            </>
          ) : (
            <>
              <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">등록된 상품이 없습니다</h3>
              <p className="text-slate-500">현재 판매 중인 상품이 없습니다. 나중에 다시 방문해주세요.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col h-full cursor-pointer" 
              onClick={() => openModal(product)}
            >
              <div className="relative w-full h-56 bg-slate-100 overflow-hidden">
                {(!product.available_methods?.includes('배달') && !product.available_methods?.includes('배송')) && (
                  <span className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-sm border border-red-400">
                    매장/포장 전용
                  </span>
                )}
                {product.main_image_url ? (
                  <img 
                    src={product.main_image_url} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                    <ShoppingBag className="w-12 h-12" />
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow whitespace-pre-line">{product.description || '상세 설명이 없습니다.'}</p>
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                  <span className="text-2xl font-black text-slate-900">
                    {product.price === '상담후결정' 
                      ? '상담 후 결정' 
                      : (getNumericPrice(product.price) > 0 
                          ? `${getNumericPrice(product.price).toLocaleString()}원` 
                          : '가격 문의')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
