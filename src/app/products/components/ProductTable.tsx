"use client";

import { apiFetch } from '@/lib/api';
import React from "react";
import { Search, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Product, HoverImage } from "../types";

interface ProductTableProps {
  statusFilter?: 'ACTIVE' | 'DRAFT';
  sourceFilter?: 'ALL' | 'INVENTORY' | 'MANUAL';
  setSourceFilter?: (v: 'ALL' | 'INVENTORY' | 'MANUAL') => void;
  categoryFilter?: 'ALL' | '테이블용' | '스토어용' | '예약용';
  setCategoryFilter?: (v: 'ALL' | '테이블용' | '스토어용' | '예약용') => void;
  onApprove?: (id: string, price: string, mainImageUrl: string) => Promise<void>;
  onUnapprove?: (id: string) => Promise<void>;
  onBatchToggleCoupon?: (targetValue: number) => Promise<void>;
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

// ⚙️ 승인 대기 완제품 전용 인라인 편집 및 승인 렌더링 컴포넌트
function DraftRow({ 
  product, 
  onApprove, 
  onDeleteClick, 
  onHoverImage 
}: { 
  product: Product; 
  onApprove: (id: string, price: string, mainImageUrl: string) => Promise<void>;
  onDeleteClick: (id: string) => void;
  onHoverImage: (img: HoverImage | null) => void;
}) {
  const [price, setPrice] = React.useState(product.price || '');
  const [mainImageUrl, setMainImageUrl] = React.useState(product.main_image_url || '');
  const [isUploading, setIsUploading] = React.useState(false);

  const handleApprove = async () => {
    if (!price || String(price).trim() === '') {
      alert('소비자 판매가를 입력해 주세요.');
      return;
    }
    if (onApprove) {
      await onApprove(product.id, price, mainImageUrl);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setMainImageUrl(json.url);
      } else {
        alert('업로드 실패: ' + json.error);
      }
    } catch (err) {
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <tr className="hover:bg-amber-50/10 transition-colors">
      <td className="p-4 text-xs font-mono text-slate-400">{String(product.id || '').slice(-6)}</td>
      <td className="p-4">
        <span className="px-2.5 py-1 text-xs font-extrabold text-purple-700 bg-purple-50 border border-purple-200/80 rounded-lg inline-flex items-center gap-1 shadow-3xs">
          📦 재고 연동
        </span>
      </td>
      <td className="p-4 text-sm text-slate-650 font-bold">{product.menu_category || '-'}</td>
      <td className="p-4 text-sm font-bold text-slate-700">
        {product.brand ? (
          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {product.brand}
          </span>
        ) : (
          <span className="text-slate-300 font-semibold">-</span>
        )}
      </td>
      <td className="p-4">
        <div className="space-y-1.5">
          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
            <span>{product.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* 🏷️ 품목코드 (inventory_barcode / itemCode) 표시 */}
            {(product.inventory_barcode || product.itemCode || product.inventory_item_id) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md shadow-3xs">
                <span className="text-[10px]">🏷️</span>
                <span>{product.inventory_barcode || product.itemCode || `INV-${product.inventory_item_id}`}</span>
              </span>
            )}

            {/* 📐 규격 정보 (spec / inventory_spec) 및 단위 표시 */}
            {(product.spec || product.inventory_spec) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md shadow-3xs">
                <span className="text-[10px]">📐</span>
                <span className="font-mono">{product.spec || product.inventory_spec}</span>
                {(product.unit || product.inventory_unit) && (
                  <span className="text-[10px] text-slate-400 font-bold">({product.unit || product.inventory_unit})</span>
                )}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-450 truncate max-w-[220px]" title={product.description}>
            {product.description || '재고관리 설명 없음'}
          </p>
        </div>
      </td>
      <td className="p-4 text-slate-600 font-semibold text-sm whitespace-nowrap text-right">
        {Number(product.price || 0).toLocaleString()}원
      </td>
      <td className="p-4">
        <input 
          type="text" 
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="소비자 판매가 입력"
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-32 focus:ring-1 focus:ring-amber-500 outline-none bg-white text-slate-800"
        />
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          {mainImageUrl ? (
            <img 
              src={mainImageUrl} 
              alt="Preview" 
              className="w-8 h-8 object-cover rounded shadow-sm cursor-pointer"
              onMouseEnter={(e) => onHoverImage({url: mainImageUrl, x: e.clientX, y: e.clientY})}
              onMouseMove={(e) => onHoverImage({url: mainImageUrl, x: e.clientX, y: e.clientY})}
              onMouseLeave={() => onHoverImage(null)}
            />
          ) : (
            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-[8px] text-slate-400 font-bold select-none">No Img</div>
          )}
          <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[10px] font-bold cursor-pointer transition-all active:scale-95 whitespace-nowrap">
            {isUploading ? '업로드 중...' : '이미지 변경'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </td>
      <td className="p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={handleApprove}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap border-0"
          >
            승인 & 활성화
          </button>
          <button 
            onClick={() => onDeleteClick(product.id)} 
            className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 border-0 bg-transparent cursor-pointer" 
            title="반려 및 삭제"
          >
            <Trash2 className="w-4 h-4"/>
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ProductTable({
  statusFilter = 'ACTIVE',
  sourceFilter = 'ALL',
  setSourceFilter,
  categoryFilter = 'ALL',
  setCategoryFilter,
  onApprove,
  onUnapprove,
  onBatchToggleCoupon,
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
  const isDraftTab = statusFilter === 'DRAFT';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full text-slate-800">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-slate-800 shrink-0">
            {isDraftTab ? '승인 대기 완제품 목록' : '등록된 상품 목록'} ({filteredDataCount}건)
          </h2>

          {/* 🍽️ 대분류 카테고리 필터 칩 (테이블오더 전용 강조 뱃지 포함) */}
          {!isDraftTab && setCategoryFilter && (
            <div className="flex items-center p-0.5 rounded-xl bg-orange-100/60 border border-orange-200/80 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전체 분류
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('테이블용')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === '테이블용'
                    ? 'bg-orange-600 text-white shadow-2xs font-extrabold ring-1 ring-orange-300'
                    : 'text-orange-700 hover:bg-orange-200/50'
                }`}
              >
                <span>🍽️ 테이블오더 전용</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('스토어용')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === '스토어용'
                    ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                    : 'text-blue-700 hover:bg-blue-100/50'
                }`}
              >
                <span>🛍️ 일반 스토어용</span>
              </button>
            </div>
          )}

          {/* 🏷️ 출처별 세부 필터 버튼 탭 (판매 중 탭일 때 노출) */}
          {!isDraftTab && setSourceFilter && (
            <div className="flex items-center p-0.5 rounded-xl bg-slate-200/60 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setSourceFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sourceFilter === 'ALL'
                    ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                전체 출처
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('INVENTORY')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'INVENTORY'
                    ? 'bg-purple-600 text-white shadow-2xs font-extrabold'
                    : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                <span>📦 재고 연동</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('MANUAL')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'MANUAL'
                    ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>✍️ 직접 등록</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="상품명, 카테고리, 브랜드, 상세 설명 검색"
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
              <th className="p-4 font-semibold text-slate-600">브랜드</th>
              <th className="p-4 font-semibold text-slate-600 w-[22%]">상품정보</th>
              {isDraftTab ? (
                <>
                  <th className="p-4 font-semibold text-slate-600 text-right">기초 원가</th>
                  <th className="p-4 font-semibold text-slate-600">소비자 판매가</th>
                  <th className="p-4 font-semibold text-slate-600">대표 이미지</th>
                  <th className="p-4 font-semibold text-slate-600 text-center w-36">승인 관리</th>
                </>
              ) : (
                <>
                  <th className="p-4 font-semibold text-slate-600 text-right">가격</th>
                  <th className="p-4 font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>쿠폰 적용</span>
                      {onBatchToggleCoupon && (
                        (() => {
                          const isAllAllowed = paginatedData.length > 0 && paginatedData.every(p => Number(p.is_coupon_excludable ?? 1) === 0);
                          return (
                            <button
                              type="button"
                              onClick={() => onBatchToggleCoupon(isAllAllowed ? 1 : 0)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border shadow-3xs flex items-center gap-1 ${
                                isAllAllowed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-600 hover:text-white'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-700 hover:text-white'
                              }`}
                              title={isAllAllowed ? '클릭 시 목록 내 모든 상품 쿠폰 적용을 [전체 제외]로 변경합니다.' : '클릭 시 목록 내 모든 상품 쿠폰 적용을 [전체 허용]으로 변경합니다.'}
                            >
                              <span>{isAllAllowed ? '전체 제외 ⚪' : '전체 허용 🟢'}</span>
                            </button>
                          );
                        })()
                      )}
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-slate-600">상세 설명</th>
                  <th className="p-4 font-semibold text-slate-600 text-center w-24">관리</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-450 font-bold text-sm">
                  {totalDataLength === 0 ? "조회할 상품이 없습니다." : "검색 결과와 일치하는 상품이 없습니다."}
                </td>
              </tr>
            ) : (
              paginatedData.map((t, idx) => {
                const uniqueKey = `${t.id}-${idx}`;
                if (isDraftTab) {
                  return (
                    <DraftRow
                      key={uniqueKey}
                      product={t}
                      onApprove={onApprove!}
                      onDeleteClick={onDeleteClick}
                      onHoverImage={onHoverImage}
                    />
                  );
                }

                const isPriceTbd = t.price === '상담후결정';
                const numericPrice = isPriceTbd ? 0 : Number(String(t.price).replace(/[^0-9]/g, ''));
                return (
                  <tr key={uniqueKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-400">{String(t.id || '').slice(-6)}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        {t.inventory_item_id ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200/80 rounded-lg inline-flex items-center gap-1.5 shadow-3xs">
                            <span>📦 재고 연동</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-purple-200/60 text-purple-900 text-[10px] font-black">
                              {t.stock !== undefined && t.stock !== null ? Number(t.stock).toLocaleString() : 0}개
                            </span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg inline-flex items-center gap-1 shadow-3xs">
                            ✍️ 직접 등록
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 pl-0.5">{t.category || '스토어용'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-bold">{t.menu_category || '-'}</td>
                    <td className="p-4 text-sm font-bold text-slate-700">
                      {t.brand ? (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {t.brand}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-semibold">-</span>
                      )}
                    </td>
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
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-800 text-sm">{t.name}</div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* 🏷️ 품목코드 (inventory_barcode / itemCode) 표시 */}
                            {(t.inventory_barcode || t.itemCode || t.inventory_item_id) && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md shadow-3xs">
                                <span className="text-[10px]">🏷️</span>
                                <span>{t.inventory_barcode || t.itemCode || `INV-${t.inventory_item_id}`}</span>
                              </span>
                            )}

                            {/* 📐 규격 정보 (spec / inventory_spec) 표시 */}
                            {(t.spec || t.inventory_spec) && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md shadow-3xs">
                                <span className="text-[10px]">📐</span>
                                <span className="font-mono">{t.spec || t.inventory_spec}</span>
                                {(t.unit || t.inventory_unit) && (
                                  <span className="text-[10px] text-slate-400 font-bold">({t.unit || t.inventory_unit})</span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap gap-1">
                            {(() => {
                              const methods = Array.isArray(t.available_methods) 
                                ? t.available_methods 
                                : (typeof t.available_methods === 'string' && t.available_methods.trim() 
                                  ? (t.available_methods as string).split(',') 
                                  : []);
                              return methods.map((method: string, i: number) => (
                                <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">{method}</span>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-pink-600 font-black text-sm whitespace-nowrap text-right">
                      {isPriceTbd ? '상담후결정' : `${numericPrice.toLocaleString()}원`}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const isExcludable = (t.is_coupon_excludable !== undefined && t.is_coupon_excludable !== null) ? Number(t.is_coupon_excludable) : 1;
                        return (
                          <div className="flex items-center space-x-2">
                            <button 
                              type="button"
                              onClick={() => onToggleCouponExclude(t.id, isExcludable)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                isExcludable === 1 ? 'bg-slate-200' : 'bg-green-500 shadow-sm shadow-green-500/20'
                              }`}
                            >
                              <span 
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isExcludable === 1 ? 'translate-x-0' : 'translate-x-4'
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-bold ${
                              isExcludable === 1 ? 'text-slate-400' : 'text-green-600'
                            }`}>
                              {isExcludable === 1 ? '제외' : '허용'}
                            </span>
                          </div>
                        );
                      })()}
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
                          onClick={() => onUnapprove ? onUnapprove(t.id) : onDeleteClick(t.id)} 
                          className="text-slate-400 hover:text-amber-600 transition-colors p-2 rounded-lg hover:bg-amber-50 border-0 bg-transparent cursor-pointer" 
                          title="승인 취소 (승인 대기 완제품 탭으로 되돌리기)"
                        >
                          <RotateCcw className="w-4 h-4 text-amber-500" />
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

