import React from "react";
import { CalendarDays, Search } from "lucide-react";
import { BookingProduct } from "../types";

interface BookingProductListProps {
  loading: boolean;
  filteredProducts: BookingProduct[];
  allProductsCount: number;
  onProductClick: (product: BookingProduct) => void;
  getNumericPrice: (priceStr: string) => number;
}

export function BookingProductList({
  loading,
  filteredProducts,
  allProductsCount,
  onProductClick,
  getNumericPrice
}: BookingProductListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-80 shadow-sm animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (allProductsCount === 0) {
    return (
      <div className="bg-white p-20 rounded-3xl shadow-sm text-center border border-gray-100">
        <CalendarDays className="w-16 h-16 mx-auto text-slate-200 mb-4" />
        <h3 className="text-xl font-semibold text-slate-600 mb-2">등록된 예약 서비스가 없습니다.</h3>
        <p className="text-slate-400">관리자 페이지에서 예약상품을 등록해주세요.</p>
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="bg-white p-20 rounded-3xl shadow-sm text-center border border-gray-100">
        <Search className="w-16 h-16 mx-auto text-slate-300 mb-4 animate-bounce" />
        <h3 className="text-xl font-semibold text-slate-600 mb-2">일치하는 예약 코스가 없습니다.</h3>
        <p className="text-slate-400">다른 키워드로 검색해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredProducts.map((product) => (
        <div 
          key={product.id} 
          className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group flex flex-col h-full cursor-pointer" 
          onClick={() => onProductClick(product)}
        >
          <div className="relative w-full h-64 bg-gray-50 overflow-hidden">
            {product.main_image_url ? (
              <img 
                src={product.main_image_url} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                <CalendarDays className="w-10 h-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-slate-900 font-bold px-8 py-3 rounded-full shadow-lg">
                예약하기
              </div>
            </div>
          </div>
          <div className="p-8 flex flex-col flex-grow text-center">
            <h3 className="text-xl font-semibold text-slate-800 mb-3">{product.name}</h3>
            <p className="text-slate-500 text-sm mb-6 line-clamp-2 font-light whitespace-pre-line">
              {product.description || '상세 설명이 없습니다.'}
            </p>
            <div className="mt-auto">
              <span className="text-lg font-medium text-slate-900">
                {product.price === '상담후결정' 
                  ? '상담 후 결정' 
                  : (getNumericPrice(product.price) > 0 ? `${getNumericPrice(product.price).toLocaleString()}원` : '가격 문의')}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
