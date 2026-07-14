"use client";

import React from "react";
import { Search, Plus, Edit2, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { Partner } from "../types";

interface PartnerTableProps {
  loading: boolean;
  activeTab: 'VENDOR' | 'BUYER' | 'AFFILIATE';
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredPartners: Partner[];
  openDetailPopup: (pt: Partner) => void;
  handleEditClick: (pt: Partner, e: React.MouseEvent) => void;
  handleCreateClick: () => void;
  handleDeletePartner: (pt: Partner, e: React.MouseEvent) => void;
  openAnalysisPopup: (pt: Partner, e: React.MouseEvent) => void;
  // 📂 엑셀 일괄 등록 트리거
  handleBulkImportClick: () => void;
  // ⚡ 페이지네이션 Props 추가
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  paginatedPartners: Partner[];
}

export function PartnerTable({
  loading,
  activeTab,
  searchQuery,
  setSearchQuery,
  filteredPartners,
  openDetailPopup,
  handleEditClick,
  handleCreateClick,
  handleDeletePartner,
  openAnalysisPopup,
  handleBulkImportClick,
  // ⚡ 페이지네이션 Props 연동
  currentPage,
  setCurrentPage,
  totalPages,
  paginatedPartners
}: PartnerTableProps) {
  
  // 페이지 번호 리스트 계산 (최대 5개씩 묶어서 출력)
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`w-8 h-8 rounded-lg text-xs font-black border transition-all ${
            currentPage === i
              ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/20"
              : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:border-slate-300"
          } cursor-pointer`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
      
      {/* 검색 및 추가/일괄 등록 버튼 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="거래처명, 대표명, 담당자명, 번호로 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-emerald-500 rounded-xl outline-none text-xs font-semibold text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* 📂 엑셀 일괄 등록 버튼 */}
          <button
            onClick={handleBulkImportClick}
            className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black rounded-xl flex items-center gap-1.5 border border-emerald-100 cursor-pointer transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            엑셀 일괄 등록
          </button>

          <button
            onClick={handleCreateClick}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-slate-900/10 border-none cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            신규 {activeTab === 'VENDOR' ? '공급사' : '바이어'} 등록
          </button>
        </div>
      </div>

      {/* 메인 테이블 (가로 폭을 충분히 확보하여 데이터 누수 방지) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-semibold border-collapse min-w-[1300px]">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/50">
              <th className="py-3 px-3.5 rounded-l-xl">구분 / 코드</th>
              <th className="py-3 px-3.5">상호명 / 대표자 / 사업자번호</th>
              <th className="py-3 px-3.5">연락처 / 팩스 / 주소</th>
              <th className="py-3 px-3.5">대표담당자 정보</th>
              <th className="py-3 px-3.5">계산서 이메일</th>
              <th className="py-3 px-3.5">등급 / 여신한도</th>
              <th className="py-3 px-3.5">누적 거래액</th>
              <th className="py-3 px-3.5 text-right rounded-r-xl">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">거래처 목록 분석 중...</td>
              </tr>
            ) : paginatedPartners.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  등록된 {activeTab === 'VENDOR' ? '공급처가' : activeTab === 'BUYER' ? '바이어가' : '관계사가'} 없습니다.
                </td>
              </tr>
            ) : (
              paginatedPartners.map(pt => (
                <tr 
                  key={pt.id} 
                  onClick={() => openDetailPopup(pt)}
                  className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                >
                  {/* 1. 구분 및 코드 */}
                  <td className="py-4 px-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(pt.type || '').split(',').filter(Boolean).map(t => (
                        <span key={t} className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider ${
                          t === 'VENDOR' 
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                            : t === 'BUYER' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {t === 'VENDOR' ? '공급사' : t === 'BUYER' ? '바이어' : '관계사'}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 block mt-1.5">{pt.id}</span>
                  </td>

                  {/* 2. 상호명 / 대표자 / 사업자번호 */}
                  <td className="py-4 px-3.5">
                    <span className="font-extrabold text-slate-800 block text-xs">{pt.company_name}</span>
                    <span className="text-[10px] text-slate-450 block mt-1">
                      대표: <span className="text-slate-600 font-bold">{pt.representative || '미기입'}</span>
                      <span className="mx-1 text-slate-200">|</span>
                      사업자: <span className="font-mono text-slate-500">{pt.business_number ? pt.business_number.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : '사업자 없음'}</span>
                    </span>
                  </td>

                  {/* 3. 연락처 / 팩스 / 주소 */}
                  <td className="py-4 px-3.5">
                    <span className="text-slate-700 block">{pt.phone || '전화 없음'}</span>
                    <span className="text-[10px] text-slate-450 block mt-1">
                      팩스: <span className="font-mono">{pt.fax || '-'}</span>
                      <span className="mx-1 text-slate-200">|</span>
                      주소: <span className="text-slate-500 font-medium">{pt.address || '주소 미기입'}</span>
                    </span>
                  </td>

                  {/* 4. 대표담당자 정보 */}
                  <td className="py-4 px-3.5">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-700">{pt.manager_name || '미지정'}</span>
                      {pt.manager_position && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-bold">{pt.manager_position}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-450 block mt-1.5">
                      연락처: <span className="text-slate-600 font-semibold">{pt.manager_phone || '-'}</span>
                      {pt.manager_email && (
                        <>
                          <span className="mx-1 text-slate-200">|</span>
                          이메일: <span className="font-mono text-slate-500">{pt.manager_email}</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* 5. 계산서 이메일 */}
                  <td className="py-4 px-3.5 text-slate-550 font-mono">{pt.email || '계산서 미지정'}</td>

                  {/* 6. 우대 등급 / 여신한도 */}
                  <td className="py-4 px-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      pt.vip_level === 'VIP'
                        ? 'bg-amber-100 text-amber-600 border border-amber-200' 
                        : pt.vip_level === 'VVIP'
                        ? 'bg-rose-100 text-rose-600 border border-rose-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {pt.vip_level || 'NORMAL'}
                    </span>
                    <span className="text-[10px] text-slate-450 block mt-1.5">
                      여신: <span className="font-extrabold text-slate-700">{(pt.credit_limit || 0).toLocaleString()}원</span>
                    </span>
                  </td>

                  {/* 7. 누적 거래액 / 외상 건수 */}
                  <td className="py-4 px-3.5">
                    <span className="font-black text-indigo-600">{(pt.total_performance || 0).toLocaleString()}원</span>
                    {pt.pending_count! > 0 && (
                      <span className="text-[9px] bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.2 rounded ml-1.5 font-bold">
                        외상 {pt.pending_count}건
                      </span>
                    )}
                  </td>

                  {/* 8. 관리 버튼 */}
                  <td className="py-4 px-3.5 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => openAnalysisPopup(pt, e)}
                        className="flex items-center gap-1.5 py-1.5 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all border-none cursor-pointer text-[10px] font-black shrink-0"
                        title="AI 위해 분석"
                      >
                        🔍 AI 분석
                      </button>
                      <button 
                        onClick={(e) => handleEditClick(pt, e)}
                        className="p-1.5 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-lg transition-all border-none cursor-pointer"
                        title="수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeletePartner(pt, e)}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all border-none cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ⚡ 페이지네이션 바 */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <div>
            총 <span className="text-slate-800 font-extrabold">{filteredPartners.length}</span>건 중{" "}
            <span className="text-slate-800 font-extrabold">{(currentPage - 1) * 10 + 1}</span> -{" "}
            <span className="text-slate-800 font-extrabold">
              {Math.min(currentPage * 10, filteredPartners.length)}
            </span>
            건 표시
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* 이전 페이지 버튼 */}
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* 페이지 번호 목록 */}
            {renderPageNumbers()}
            
            {/* 다음 페이지 버튼 */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
