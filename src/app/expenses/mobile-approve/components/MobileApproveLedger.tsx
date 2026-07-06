'use client';

import React from 'react';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import { MobileExpense } from '../types';

interface MobileApproveLedgerProps {
  activeTab: 'pending' | 'all' | 'rejected_hold';
  setActiveTab: (tab: 'pending' | 'all' | 'rejected_hold') => void;
  expensesCountPending: number;
  expensesCountRejectedHold: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  mainFilteredExpenses: MobileExpense[];
  getMainCategory: (subCat: string) => string;
  setSelectedExpense: (exp: MobileExpense | null) => void;
  setShowAttachment: (show: boolean) => void;
  handleReconsiderApprove: (id: string, e: React.MouseEvent) => void;
  isSubmitting: boolean;
}

export default function MobileApproveLedger({
  activeTab,
  setActiveTab,
  expensesCountPending,
  expensesCountRejectedHold,
  searchQuery,
  setSearchQuery,
  mainFilteredExpenses,
  getMainCategory,
  setSelectedExpense,
  setShowAttachment,
  handleReconsiderApprove,
  isSubmitting
}: MobileApproveLedgerProps) {
  return (
    <div className="space-y-4">
      {/* 📱 3단 탭 인터페이스 헤더 */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/50">
        <button 
          id="tab-btn-pending"
          onClick={() => { setActiveTab('pending'); }}
          className={`flex-1 py-2 text-center rounded-lg font-black text-[10px] transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white text-slate-800 shadow-3xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          ⏳ 결재 대기 ({expensesCountPending})
        </button>
        
        <button 
          id="tab-btn-all"
          onClick={() => { setActiveTab('all'); }}
          className={`flex-1 py-2 text-center rounded-lg font-black text-[10px] transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-slate-800 shadow-3xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 전체 대장
        </button>
        
        <button 
          id="tab-btn-rejected_hold"
          onClick={() => { setActiveTab('rejected_hold'); }}
          className={`flex-1 py-2 text-center rounded-lg font-black text-[10px] transition-all cursor-pointer ${
            activeTab === 'rejected_hold'
              ? 'bg-white text-slate-800 shadow-3xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🚫 반려/보류 ({expensesCountRejectedHold})
        </button>
      </div>

      {/* 🔍 실시간 상시 검색창 */}
      <div className="relative w-full shrink-0">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
        <input 
          id="ledger-search-input"
          type="text"
          placeholder="품명, 메모, 거래처, 계정 과목 실시간 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-[11px] bg-white font-bold text-slate-800"
        />
      </div>

      {/* 📋 모바일 카드 피드 리스트 */}
      <div className="space-y-3.5">
        {mainFilteredExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-100 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-[11px] font-black">
              {searchQuery.trim() ? "검색 조건에 매칭되는 지출 내역이 없습니다." : (
                <>
                  {activeTab === 'pending' && "결재 심사를 대기 중인 지출 내역이 없습니다."}
                  {activeTab === 'all' && "등록된 지출 대장 내역이 없습니다."}
                  {activeTab === 'rejected_hold' && "반려 혹은 보류된 지출 건이 없습니다."}
                </>
              )}
            </p>
          </div>
        ) : (
          mainFilteredExpenses.map((exp) => {
            const mainCat = getMainCategory(exp.category);
            const isPending = (exp.approval_status || 'PENDING') === 'PENDING';
            const isRejected = exp.approval_status === 'REJECTED';
            const isHold = exp.approval_status === 'HOLD';
            
            return (
              <div 
                key={exp.id}
                id={`expense-card-${exp.id}`}
                onClick={() => { setSelectedExpense(exp); setShowAttachment(false); }}
                className="expense-card bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs hover:border-rose-200 transition-all cursor-pointer relative"
              >
                
                {/* 카드 헤더 (날짜 및 상태 뱃지) */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-400 font-bold font-mono">{exp.expense_date}</span>
                  
                  {/* HSL 결재 상태 배지 */}
                  {(() => {
                    if (isPending) return <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[8px] font-black">⏳ 결재 대기</span>;
                    if (isRejected) return <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[8px] font-black">🔴 반려됨</span>;
                    if (isHold) return <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[8px] font-black">🟡 결재 보류</span>;
                    return <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-black">🟢 승인 완료</span>;
                  })()}
                </div>

                {/* 카드 내용 */}
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 whitespace-pre-line leading-relaxed">{exp.title}</h3>
                  
                  {/* 계정과목 & 금액 */}
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="inline-flex px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[8px] font-extrabold text-slate-500">
                      {mainCat} 〉 {exp.category}
                    </span>
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {exp.amount.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 지출 태그들 */}
                {exp.memo && (
                  <div className="flex flex-wrap gap-1 mt-2.5 pt-2.5 border-t border-slate-50">
                    {exp.memo.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="inline-flex items-center text-[7.5px] font-bold text-slate-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 반려/보류 사유 명시 */}
                {(isRejected || isHold) && exp.approval_memo && (
                  <div className="mt-2.5 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-500 whitespace-pre-line">
                    💬 {isRejected ? '반려' : '보류'} 의견: {exp.approval_memo}
                  </div>
                )}

                {/* 🔄 보류/반려 탭일 때의 "재심사 및 즉시 승인" 버튼 */}
                {activeTab === 'rejected_hold' && (
                  <div className="mt-3 flex justify-end" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleReconsiderApprove(exp.id, e)}
                      disabled={isSubmitting}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-3xs transition-all active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                      재심사 및 즉시 승인
                    </button>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
