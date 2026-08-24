import React, { useState, useRef, useEffect } from 'react';
import { Search, Package, TrendingUp, Sliders, MapPin, Building, Edit, FileText, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Filter, ChevronDown, Check, MoreHorizontal, Download, Globe } from 'lucide-react';
import { InventoryItem, InventoryLog } from '../types';
import { calculateValuation } from '../utils/valuation';
import { getSavedGoogleSheetUrl } from '@/lib/google-sheets-storage';
import { openGoogleSheetsViewer } from '@/lib/excel-export';

interface InventoryTableProps {
  items: InventoryItem[];
  logs: InventoryLog[];
  activeTab: 'material' | 'product' | 'deadstock';
  setActiveTab: (tab: 'material' | 'product' | 'deadstock') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  valuationMethod: 'moving_average' | 'fifo' | 'lifo';
  onOpenTxModal: (type: 'in' | 'out' | 'adjust', item?: InventoryItem) => void;
  onOpenEditItemModal: (item: InventoryItem) => void;
  onOpenLabelPrintModal: (item: InventoryItem) => void;
  onDeleteItem: (id: number) => void;
  inbounds: any[];
  onOpenInboundDetail: (inboundId: string) => void;
  totalItemsCount: number;
  materialCount: number;
  productCount: number;
  sortKey: string;
  setSortKey: (key: string) => void;
  sortDir: 'ASC' | 'DESC';
  setSortDir: (dir: 'ASC' | 'DESC') => void;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[] | ((prev: string[]) => string[])) => void;
  dbCategories: string[];
  selectedTags: string[];
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
  dbTags: any[];
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
}

// 태그별 세련된 네온 배지 컬러 클래스 연산
export const getTagColorClass = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;
  const colors = [
    'bg-emerald-50 text-emerald-700 border-emerald-100', // 에메랄드 그린
    'bg-indigo-50 text-indigo-750 border-indigo-100',   // 인디고 퍼플
    'bg-amber-50 text-amber-700 border-amber-100',     // 앰버 오렌지
    'bg-rose-50 text-rose-700 border-rose-100',       // 로즈 핑크
    'bg-sky-50 text-sky-700 border-sky-100'          // 스카이 블루
  ];
  return colors[index];
};

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  logs,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  loading,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  valuationMethod,
  onOpenTxModal,
  onOpenEditItemModal,
  onOpenLabelPrintModal,
  onDeleteItem,
  inbounds,
  onOpenInboundDetail,
  totalItemsCount,
  materialCount,
  productCount,
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  selectedCategories,
  setSelectedCategories,
  dbCategories,
  selectedTags,
  setSelectedTags,
  dbTags,
  onExportExcel,
  isExportingExcel
}) => {
  // ⚡ 바코드/품목코드 정렬 토글 핸들러
  const handleBarcodeSortToggle = () => {
    if (sortKey !== 'barcode') {
      setSortKey('barcode');
      setSortDir('ASC');
    } else {
      if (sortDir === 'ASC') {
        setSortDir('DESC');
      } else {
        setSortKey('createdAt'); // 기본 최신등록순
        setSortDir('DESC');
      }
    }
  };

  // ⚡ 카테고리 멀티 필터링 드롭다운 관리 상태 및 훅
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // ⚡ 태그 멀티 필터링 드롭다운 관리 상태 및 훅
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const tagFilterDropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기 통합
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryFilterOpen(false);
      }
      if (tagFilterDropdownRef.current && !tagFilterDropdownRef.current.contains(event.target as Node)) {
        setIsTagFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
  };

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  // ⚡ 서버 사이드 페이지네이션 윈도우 계산
  const totalPages = Math.ceil(totalItemsCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + items.length;
  const paginatedItems = items; // 서버가 페이지 단위로 쪼개 준 데이터 자체를 바로 렌더링

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      
      {/* 검색 및 탭 컨트롤러 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-start pb-6 border-b border-slate-100 gap-4 md:gap-x-12">
        
        {/* 좌측 타이틀 및 상황판 역할 가이드 */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4.5 h-4.5 text-indigo-500" />
            <span>실시간 재고 자산 대장</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'material' ? '등록된 원부자재 및 매입 거래처 정보를 통합 조회합니다.' : activeTab === 'product' ? '출하 가능한 완제품 및 판매 단가 정보를 통합 조회합니다.' : '외부 입고 및 매입 대기 내역을 관리합니다.'}
          </p>
        </div>

        {/* 우측 밀착 정렬 (탭 스위치 + 검색 바) */}
        <div className="flex flex-col sm:flex-row items-center justify-start sm:justify-end gap-3 w-full md:w-auto md:flex-none flex-nowrap">
          
          {/* 자재 vs 제품 탭 스위치 */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto flex-shrink-0 flex-wrap gap-1">
            <button
              onClick={() => {
                setActiveTab('material');
                setSearchQuery('');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 min-w-[110px] flex-shrink-0 cursor-pointer ${
                activeTab === 'material'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>원부자재({materialCount})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('product');
                setSearchQuery('');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 min-w-[110px] flex-shrink-0 cursor-pointer ${
                activeTab === 'product'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>완제품({productCount})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('deadstock');
                setSearchQuery('');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 min-w-[110px] flex-shrink-0 cursor-pointer ${
                activeTab === 'deadstock'
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-650 text-white shadow-sm'
                  : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50/50'
              }`}
            >
              <span>🪐 AI 관제</span>
            </button>
          </div>

          {/* 통합 필터 검색 바 및 엑셀 다운로드 버튼 묶음 */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-shrink-0">
            <div className="relative w-full sm:w-[280px]" style={{ maxWidth: '280px' }}>
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={activeTab === 'material' ? '자재명, 거래처, 보관 위치...' : '제품명, 카테고리, 보관 위치...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-250 rounded-2xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {onExportExcel && (
              <button 
                onClick={onExportExcel}
                disabled={isExportingExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed whitespace-nowrap h-[38px] flex-shrink-0"
                title="현재 조회 조건의 전체 대장 리스트를 엑셀 파일로 저장합니다."
              >
                {isExportingExcel ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>다운로드 중...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-emerald-200" />
                    <span>엑셀 다운로드</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => openGoogleSheetsViewer(getSavedGoogleSheetUrl())}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-teal-500 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap h-[38px] flex-shrink-0"
              title="연동된 구글 스프레드시트 열람 또는 실시간 시트 화면으로 이동합니다."
            >
              <Globe className="w-3.5 h-3.5 text-teal-200" />
              <span>구글시트 조회</span>
            </button>
          </div>

        </div>

      </div>

      {/* 재고 리스트 테이블 */}
      <div className="overflow-x-auto mt-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">SQLite 안전 테이블 조회 중...</span>
          </div>

        ) : totalItemsCount === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold">해당 탭에 등록된 품목이 존재하지 않습니다.</p>
            <p className="text-xs">상단의 '품목등록' 또는 'AI 비전 분석'을 통해 첫 재고를 생성해 주세요.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th 
                  onClick={handleBarcodeSortToggle}
                  className="py-4 px-4 cursor-pointer hover:bg-slate-100/70 select-none group transition-colors whitespace-nowrap"
                  title="클릭하여 오름차순/내림차순 정렬"
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>바코드/품목코드</span>
                    {sortKey === 'barcode' ? (
                      sortDir === 'ASC' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-indigo-650 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-indigo-650 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                    )}
                  </div>
                </th>
                <th className="py-4 px-4 relative select-none whitespace-nowrap">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>카테고리</span>
                    <button 
                      onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                      className={`p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer ${
                        selectedCategories.length > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'
                      }`}
                      title="카테고리 멀티 필터"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                    {selectedCategories.length > 0 && (
                      <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full normal-case">
                        {selectedCategories.length}
                      </span>
                    )}
                  </div>

                  {/* 카테고리 멀티 필터 드롭다운 팝업 */}
                  {isCategoryFilterOpen && (
                    <div 
                      ref={filterDropdownRef}
                      className="absolute left-4 top-10 z-50 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-3 w-48 text-left normal-case text-slate-800 tracking-normal font-normal animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400">
                        <span>카테고리 필터 ({dbCategories.length})</span>
                        {selectedCategories.length > 0 && (
                          <button 
                            onClick={handleClearCategories}
                            className="text-indigo-600 hover:underline cursor-pointer"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {dbCategories.length === 0 ? (
                          <p className="text-[10px] text-slate-400 text-center py-2">등록된 카테고리가 없습니다.</p>
                        ) : (
                          dbCategories.map((cat) => {
                            const isChecked = selectedCategories.includes(cat);
                            return (
                              <label 
                                key={cat}
                                className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded-lg cursor-pointer text-xs select-none w-full"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCategoryToggle(cat)}
                                  className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className={`truncate ${isChecked ? 'text-indigo-600 font-bold' : 'text-slate-600 font-semibold'}`}>
                                  {cat}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </th>
                <th className="py-4 px-4">품목명</th>
                <th className="py-4 px-4 relative select-none whitespace-nowrap min-w-[150px] w-[180px]">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span>태그</span>
                    <button 
                      onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
                      className={`p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer ${
                        selectedTags.length > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'
                      }`}
                      title="태그 멀티 필터"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                    {selectedTags.length > 0 && (
                      <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full normal-case">
                        {selectedTags.length}
                      </span>
                    )}
                  </div>

                  {/* 태그 멀티 필터 드롭다운 팝업 */}
                  {isTagFilterOpen && (
                    <div 
                      ref={tagFilterDropdownRef}
                      className="absolute left-4 top-10 z-50 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-3 w-48 text-left normal-case text-slate-800 tracking-normal font-normal animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400">
                        <span>태그 필터 ({dbTags.length})</span>
                        {selectedTags.length > 0 && (
                          <button 
                            onClick={handleClearTags}
                            className="text-indigo-600 hover:underline cursor-pointer"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {dbTags.length === 0 ? (
                          <p className="text-[10px] text-slate-400 text-center py-2">등록된 태그가 없습니다.</p>
                        ) : (
                          dbTags.map((tagObj) => {
                            const tagName = tagObj.name;
                            const isChecked = selectedTags.includes(tagName);
                            return (
                              <label 
                                key={tagObj.id}
                                className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded-lg cursor-pointer text-xs select-none w-full"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTagToggle(tagName)}
                                  className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className={`truncate ${isChecked ? 'text-indigo-600 font-bold' : 'text-slate-600 font-semibold'}`}>
                                  {tagName}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">규격</th>
                <th className="py-4 px-4 whitespace-nowrap">단위</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">입수량</th>
                <th className="py-4 px-4 whitespace-nowrap">보관 위치</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">현재고 / 안전재고</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">
                  구매단가
                </th>
                <th className="py-4 px-4 min-w-[150px] max-w-[280px] whitespace-nowrap">
                  {activeTab === 'material' ? '주 거래처' : '상세 설명'}
                </th>
                <th className="py-4 px-4 text-center w-[80px] shrink-0 whitespace-nowrap">동작</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedItems.map((item) => {
                const isAlert = item.safeStock > 0 && item.stock <= item.safeStock;
                const valuation = calculateValuation(item, logs, valuationMethod);
                const displayBarcode = item.barcode && item.barcode !== '-' && item.barcode !== 'null' ? item.barcode : `INV-${item.id}`;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-mono font-semibold text-slate-650">
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] border border-slate-200/80">
                        {displayBarcode}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-semibold">{item.category}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        {isAlert && (
                          <span className="bg-rose-100 text-rose-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-rose-200 animate-pulse">
                            부족
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 min-w-[150px] w-[180px]">
                      {item.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.split(',').map((tag) => (
                            <span 
                              key={tag}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-3xs ${getTagColorClass(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-350">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500">{item.spec || '-'}</td>
                    <td className="py-4 px-4 text-slate-500 font-semibold">{item.unitValue || '개'}</td>
                    <td className="py-4 px-4 text-right text-slate-500 font-medium">
                      {item.boxContains ? `${item.boxContains} 개` : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.location || '위치 미지정'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium">
                      <span className={`font-bold ${isAlert ? 'text-rose-600' : 'text-slate-800'}`}>
                        {item.stock.toLocaleString()}
                      </span>
                      <span className="text-slate-400"> / {item.safeStock} 개</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-800">
                          ₩ {(() => {
                            const isProd = item.type === 'product' || (item.type as string) === '완제품' || (item.type as string) === '제품';
                            const basePrice = isProd ? (item.purchasePrice || 0) : item.price;
                            return (valuation.unitPrice > 0 ? valuation.unitPrice : basePrice).toLocaleString();
                          })()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mt-0.5">
                          총 ₩ {valuation.totalValue.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-[280px] truncate text-slate-500 font-medium">
                      {activeTab === 'material' ? (
                        <div className="flex items-center space-x-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.partner || '-'}</span>
                        </div>
                      ) : (
                        <span>{item.description || '-'}</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-center w-[80px] shrink-0 relative group">
                      <div className="flex items-center justify-center">
                        <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 호버 시 부드럽게 나타나는 플로팅 동작 패널 */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2.5 z-[9999] animate-in fade-in slide-in-from-right-2 duration-150">
                        <button
                          onClick={() => onOpenTxModal('in', item)}
                          className="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100/50 hover:border-blue-200 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          title="입고 등록"
                        >
                          입고
                        </button>
                        <button
                          onClick={() => onOpenTxModal('out', item)}
                          className="text-red-650 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100/50 hover:border-rose-200 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          title="출고 등록"
                        >
                          출고
                        </button>
                        <button
                          onClick={() => onOpenTxModal('adjust', item)}
                          className="text-purple-600 hover:bg-purple-50 px-2.5 py-1.5 rounded-xl border border-purple-100/50 hover:border-purple-200 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          title="재고 실사 조정"
                        >
                          실사
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1"></div>
                        <button
                          onClick={() => onOpenEditItemModal(item)}
                          className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-lg text-[10px] cursor-pointer"
                          title="정보 수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenLabelPrintModal(item)}
                          className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg text-[10px] cursor-pointer"
                          title="바코드 라벨 인쇄"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg text-[10px] cursor-pointer"
                          title="품목 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 페이지네이션 하단 컨트롤바 */}
        {!loading && (() => {
          const pageLimit = 5;
          let startPage = Math.max(1, currentPage - Math.floor(pageLimit / 2));
          let endPage = Math.min(totalPages, startPage + pageLimit - 1);
          if (endPage - startPage + 1 < pageLimit) {
            startPage = Math.max(1, endPage - pageLimit + 1);
          }
          const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

          return (
            <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-2xl mt-4">
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap whitespace-nowrap">
                <span className="text-xs text-slate-505 font-semibold shrink-0">페이지당 표시:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }} 
                  className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-700 transition-all shrink-0 ${
                    activeTab === 'material' ? 'focus:border-indigo-500' : 'focus:border-emerald-555'
                  }`}
                >
                  <option value={10}>10개씩 보기</option>
                  <option value={20}>20개씩 보기</option>
                  <option value={50}>50개씩 보기</option>
                  <option value={100}>100개씩 보기</option>
                </select>
                <span className="text-xs text-slate-400 font-semibold ml-2 shrink-0">
                  {totalItemsCount === 0 
                    ? "전체 0건 표시" 
                    : `전체 ${totalItemsCount}건 중 ${startIndex + 1}-${Math.min(endIndex, totalItemsCount)}건 표시`}
                </span>
              </div>
              
              <div className="flex items-center gap-1 flex-wrap whitespace-nowrap">
                <button 
                  disabled={currentPage === 1 || totalPages <= 1} 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-650 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  이전
                </button>
                
                {totalPages <= 1 ? (
                  <button 
                    disabled 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm disabled:opacity-50 cursor-not-allowed ${
                      activeTab === 'material' ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}
                  >
                    1
                  </button>
                ) : (
                  <>
                    {startPage > 1 && (
                      <>
                        <button 
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-1.5 rounded-lg border bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs font-bold transition-all"
                        >
                          1
                        </button>
                        {startPage > 2 && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                      </>
                    )}

                    {pages.map(page => (
                      <button 
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currentPage === page 
                            ? activeTab === 'material'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-emerald-600 text-white shadow-sm'
                            : 'border bg-white text-slate-600 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {endPage < totalPages && (
                      <>
                        {endPage < totalPages - 1 && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                        <button 
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-1.5 rounded-lg border bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs font-bold transition-all"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </>
                )}
                
                <button 
                  disabled={currentPage === totalPages || totalPages <= 1} 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-650 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  다음
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
