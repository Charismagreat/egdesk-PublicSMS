"use client";

import React from "react";
import { CreditCard, Plus, Sparkles, Edit, FileSpreadsheet } from "lucide-react";
import { CardTransaction, DbExpenseCategory, DbExpenseTag } from "../types";
import {
  getCategoryHierarchy,
  getCategoryBadgeStyle,
  downloadCardsExcel,
  downloadPreviewExcel,
} from "../utils";
import RulePreviewPanel from "./RulePreviewPanel";
import TableSkeleton from "./TableSkeleton";
import PaginationBar from "./PaginationBar";

const cardCompanyMap: Record<string, string> = {
  "신한카드": "shinhan-card",
  "KB국민카드": "kb-card",
  "NH농협카드": "nh-card",
  "BC카드": "bc-card",
  "hana카드": "hana-card",
  "하나카드": "hana-card",
};

interface FinanceCardsTabProps {
  groupedCards: any[];
  selectedCardCompanyId: string;
  setSelectedCardCompanyId: (id: string) => void;
  selectedCardNumber: string;
  setSelectedCardNumber: (num: string) => void;
  cardTxList: CardTransaction[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  setCurrentPage: (page: number) => void;
  loading: boolean;
  hasAdminAccess: boolean;
  rulesList: any[];
  newRuleText: string;
  setNewRuleText: (text: string) => void;
  isAddingRule: boolean;
  handleAddRule: (text: string) => Promise<void>;
  handlePreviewRule: (text: string) => Promise<void>;
  isPreviewLoading: boolean;
  isPreviewOpen: boolean;
  setIsPreviewOpen: (open: boolean) => void;
  previewList: any[];
  handleToggleRule: (id: string, active: boolean) => Promise<void>;
  handleDeleteRule: (id: string) => Promise<void>;
  dbCategories: DbExpenseCategory[];
  dbTags: DbExpenseTag[];
  editingCardTxId: string | null;
  setEditingCardTxId: (id: string | null) => void;
  editingField: "category" | "memo" | null;
  setEditingField: (field: "category" | "memo" | null) => void;
  categorySearchTerm: string;
  setCategorySearchTerm: (term: string) => void;
  tempCategory: string;
  setTempCategory: (cat: string) => void;
  tempMemo: string;
  setTempMemo: (memo: string) => void;
  handleTagToggle: (tagName: string) => void;
  getDynamicRecommendations: (merchantName: string, currentMemo: string) => any[];
  handleUpdateCardTransaction: (txId: string, updates: { category?: string; memo?: string }) => Promise<void>;
  isUpdatingCardTx: boolean;
  setIsReceiptModalOpen: (open: boolean) => void;
  setReceiptSelectedTxId: (id: string) => void;
  setViewingReceiptUrl: (url: string | null) => void;
}

export default function FinanceCardsTab({
  groupedCards,
  selectedCardCompanyId,
  setSelectedCardCompanyId,
  selectedCardNumber,
  setSelectedCardNumber,
  cardTxList,
  totalCount,
  currentPage,
  pageSize,
  setPageSize,
  setCurrentPage,
  loading,
  hasAdminAccess,
  rulesList,
  newRuleText,
  setNewRuleText,
  isAddingRule,
  handleAddRule,
  handlePreviewRule,
  isPreviewLoading,
  isPreviewOpen,
  setIsPreviewOpen,
  previewList,
  handleToggleRule,
  handleDeleteRule,
  dbCategories,
  dbTags,
  editingCardTxId,
  setEditingCardTxId,
  editingField,
  setEditingField,
  categorySearchTerm,
  setCategorySearchTerm,
  tempCategory,
  setTempCategory,
  tempMemo,
  setTempMemo,
  handleTagToggle,
  getDynamicRecommendations,
  handleUpdateCardTransaction,
  isUpdatingCardTx,
  setIsReceiptModalOpen,
  setReceiptSelectedTxId,
  setViewingReceiptUrl,
}: FinanceCardsTabProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // 카드 번호 리스트 추출 (고유한 카드 번호 목록)
  const uniqueCardNumbers = Array.from(
    new Set(cardTxList.map((tx) => tx.cardNumber).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      {/* 신용카드 리스트 슬라이드 카드형 레이아웃 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {groupedCards.map((card: any, idx: number) => {
          const companyId = cardCompanyMap[card.cardCompanyName] || "all";
          const isSelected = selectedCardCompanyId === companyId;
          
          return (
            <div
              key={idx}
              onClick={() => {
                if (selectedCardCompanyId === companyId) {
                  setSelectedCardCompanyId("all");
                } else {
                  setSelectedCardCompanyId(companyId);
                  setSelectedCardNumber("all");
                }
              }}
              className={`p-5 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden cursor-pointer ${
                isSelected
                  ? "border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/5"
                  : "border-slate-100"
              }`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-lg"></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md">
                    {card.cardCompanyName}
                  </span>
                  {card.lastTxDate && (
                    <span className="text-[9px] text-slate-400/90 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      최종 승인: {card.lastTxDate}
                    </span>
                  )}
                </div>
                <span className="text-slate-400 text-xs font-mono">{card.cardCount}개 카드 통합</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-50">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 tracking-tight">
                    이번달 사용액
                  </h4>
                  <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">
                    ₩ {card.m0?.toLocaleString()}
                  </p>
                </div>
                <div className="border-l border-slate-100 pl-4 text-right">
                  <h4 className="text-[10px] font-bold text-slate-400 tracking-tight">
                    금년도 사용액
                  </h4>
                  <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">
                    ₩ {card.yTotal?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {groupedCards.length === 0 && (
          <div className="col-span-full bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs font-medium">
            조회된 등록 신용카드가 없습니다.
          </div>
        )}
      </div>

      {/* ⚡ 계정과목 AI Rule Builder - 최고 관리자 전용 */}
      {hasAdminAccess && (
        <div className="bg-linear-to-br from-indigo-50/40 via-purple-50/20 to-amber-50/30 rounded-3xl border border-indigo-100/50 p-5 shadow-2xs mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center p-1 shadow-indigo-100 shadow-sm animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                계정과목 AI 분류 규칙 설정 <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-bold ml-1">AI Rule Builder</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">관리자가 자연어로 설정한 지능형 조건에 매핑되는 승인 건을 영구 자동 분류합니다.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col gap-2 bg-white/70 p-3 rounded-2xl border border-indigo-100/30">
              <textarea
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder='예: "BC카드이고 카드번호 뒤 4자리 숫자가 6975이며 사용일이 휴일이 아니고 오전 6시부터 오후 6시 사이에 승인된 20만원이하의 금액으로 차량번호 뒤 4자리 숫자가 1234인 경우에는 차량유지비로 분류해야합니다."'
                className="border border-indigo-200 bg-slate-50/50 rounded-xl p-3 text-[11px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full min-h-[75px] resize-none leading-relaxed placeholder:text-slate-400/80"
                disabled={isAddingRule}
              />
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setNewRuleText('BC카드이고 카드번호 뒤 4자리 숫자가 6975이며 사용일이 휴일이 아니고 오전 6시부터 오후 6시 사이에 승인된 20만원이하의 금액으로 차량번호 뒤 4자리 숫자가 1234인 경우에는 차량유지비로 분류해야합니다.')}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9.5px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  💡 차량유지비 룰 예시 입력
                </button>
                <button
                  type="button"
                  onClick={() => handlePreviewRule(newRuleText)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-lg text-[9.5px] font-bold transition-all active:scale-95 cursor-pointer disabled:bg-indigo-100/50"
                  disabled={isPreviewLoading || !newRuleText.trim()}
                >
                  {isPreviewLoading ? "분석 중..." : "🔍 영향 건 미리보기"}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRule(newRuleText)}
                  className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-extrabold transition-all active:scale-95 shadow-md shadow-indigo-100 cursor-pointer disabled:bg-indigo-300"
                  disabled={isAddingRule || !newRuleText.trim()}
                >
                  {isAddingRule ? "분석 및 실행 중..." : "🚀 규칙 등록 및 즉시 실행"}
                </button>
              </div>

              {/* ⚡ [경합/충돌 예방] 자연어 규칙 영향 건 미리보기 패널 */}
              <RulePreviewPanel
                isOpen={isPreviewOpen}
                previewList={previewList}
                onClose={() => setIsPreviewOpen(false)}
                onDownloadExcel={() => downloadPreviewExcel(previewList)}
              />
            </div>

            {/* 등록된 규칙 목록 대시보드 */}
            <div className="w-full md:w-[320px] bg-white/70 p-3 rounded-2xl border border-indigo-100/30 flex flex-col gap-2">
              <div className="text-[9.5px] font-extrabold text-slate-400">📋 현재 작동 중인 자연어 규칙 ({rulesList.length}개)</div>
              <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin">
                {rulesList.map((rule) => (
                  <div key={rule.id} className="p-2 bg-white rounded-xl border border-slate-100 shadow-3xs flex flex-col gap-1 text-[9.5px]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-700 leading-tight line-clamp-2" title={rule.natural_text}>
                        {rule.natural_text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-400 hover:text-red-500 font-bold px-1 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-50 pt-1 mt-1 text-[8.5px]">
                      <span className="font-extrabold text-indigo-600 bg-indigo-50 px-1 rounded">
                        👉 {rule.target_category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={rule.is_active ? "text-emerald-600 font-bold" : "text-slate-400"}>
                          {rule.is_active ? "활성" : "정지"}
                        </span>
                        <input
                          type="checkbox"
                          checked={rule.is_active}
                          onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {rulesList.length === 0 && (
                  <span className="text-[9.5px] text-slate-300 font-light py-6 text-center">등록된 자연어 정산 규칙이 없습니다.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 법인 신용 카드 승인 내역 명세서 테이블 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-sm">
              법인 신용 카드 승인 내역 명세서
            </h3>
            <span className="text-xs text-slate-400 font-semibold ml-2">총 {totalCount}건</span>
            <button
              type="button"
              onClick={() => {
                setReceiptSelectedTxId("");
                setIsReceiptModalOpen(true);
              }}
              className="ml-3 flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-[10.5px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              카드 영수증 일괄 등록
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadCardsExcel(cardTxList)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer mr-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              엑셀 다운로드
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">카드사:</span>
              <select
                value={selectedCardCompanyId}
                onChange={(e) => setSelectedCardCompanyId(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="all">전체 카드사</option>
                <option value="shinhan-card">신한카드</option>
                <option value="kb-card">KB국민카드</option>
                <option value="nh-card">NH농협카드</option>
                <option value="bc-card">BC카드</option>
                <option value="hana-card">하나카드</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">카드번호:</span>
              <select
                value={selectedCardNumber}
                onChange={(e) => setSelectedCardNumber(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="all">전체 번호</option>
                {uniqueCardNumbers.map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400">
                <th className="p-4 w-28">사용일시</th>
                <th className="p-4 w-28">승인번호</th>
                <th className="p-4 w-44">카드사 / 카드번호</th>
                <th className="p-4 min-w-[180px]">계정과목 (대 〉 중 〉 소)</th>
                <th className="p-4">가맹점명</th>
                <th className="p-4 min-w-[120px] text-amber-600 font-extrabold">🏷️ 태그</th>
                <th className="p-4 text-right w-28">사용금액</th>
                <th className="p-4 w-20">승인상태</th>
                <th className="p-4 text-center w-24">영수증</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={9} rows={5} />
              ) : (
                cardTxList.map((tx) => {
                  const isCancelled = tx.status === "취소";
                  const catHier = getCategoryHierarchy(tx.category, dbCategories);
                  const badgeStyle = getCategoryBadgeStyle(catHier.main);

                  return (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-xs text-slate-700 animate-fade-in">
                      <td className="p-4 font-mono font-medium text-slate-400">
                        <div>{tx.date}</div>
                        {tx.time && (
                          <div className="text-[10px] text-slate-400/80 mt-0.5">{tx.time}</div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500 font-semibold tracking-wider">
                        {tx.approvalNumber || "-"}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800">{tx.cardCompanyName}</span>
                        <span className="ml-2 font-mono text-[10px] text-slate-400 tracking-wider">({tx.cardNumber})</span>
                      </td>
                      <td className="p-4">
                        {hasAdminAccess && editingCardTxId === tx.id && editingField === "category" ? (
                          (() => {
                            const recommendations = getDynamicRecommendations(tx.merchantName, tx.memo || "");
                            let filteredList = [...dbCategories];
                            
                            if (categorySearchTerm.trim() !== "") {
                              const term = categorySearchTerm.toLowerCase().trim();
                              filteredList = filteredList.filter((c) => {
                                const fullPath = `${c.main_category} ${c.mid_category} ${c.sub_category}`.toLowerCase();
                                return fullPath.includes(term);
                              });
                            }
                            
                            const sortedCategories = filteredList.sort((a, b) => {
                              const indexA = recommendations.findIndex(r => r.category === a.sub_category);
                              const indexB = recommendations.findIndex(r => r.category === b.sub_category);
                              
                              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                              if (indexA !== -1) return -1;
                              if (indexB !== -1) return 1;
                              return 0;
                            });

                            return (
                              <div className="relative flex items-center gap-1.5 min-w-[290px]">
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    id={`card-tx-search-${tx.id}`}
                                    value={categorySearchTerm}
                                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                                    className="border border-amber-300 bg-amber-50 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500 w-full pr-6"
                                    placeholder="계정과목 검색 또는 직접 입력"
                                    autoFocus
                                  />
                                  {categorySearchTerm && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCategorySearchTerm("");
                                        setTempCategory("");
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                                
                                <div className="absolute left-0 top-full mt-1.5 w-full max-h-[220px] overflow-y-auto bg-white border border-slate-100/80 shadow-2xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 scrollbar-thin">
                                  {sortedCategories.map((c) => {
                                    const recItem = recommendations.find(r => r.category === c.sub_category);
                                    const isSelected = tempCategory === c.sub_category;
                                    
                                    return (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          setTempCategory(c.sub_category);
                                          setCategorySearchTerm(c.sub_category);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] transition-all flex flex-col leading-tight cursor-pointer ${
                                          isSelected
                                            ? "bg-amber-500 text-white font-extrabold shadow-sm"
                                            : "hover:bg-slate-50 text-slate-700"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span className={isSelected ? "text-white" : "text-slate-700 font-bold"}>
                                            {c.mid_category} 〉 {c.sub_category}
                                          </span>
                                          {recItem && (
                                            <span className={`text-[8.5px] font-extrabold px-1 rounded ${isSelected ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600"}`}>
                                              ⭐ {recItem.percentage}%
                                            </span>
                                          )}
                                        </div>
                                        <span className={`text-[8px] mt-0.5 ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                                          {c.main_category}
                                        </span>
                                      </button>
                                    );
                                  })}
                                  {sortedCategories.length === 0 && (
                                    <span className="text-[10px] text-slate-400 p-4 text-center font-medium">매칭되는 계정과목이 없습니다.</span>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => handleUpdateCardTransaction(tx.id, { category: tempCategory })}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 shadow-xs cursor-pointer"
                                  disabled={isUpdatingCardTx || !tempCategory}
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCardTxId(null);
                                    setEditingField(null);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                                >
                                  취소
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="flex flex-col gap-1.5 w-full">
                            <div 
                              className={`flex items-center gap-1.5 flex-wrap ${hasAdminAccess ? "cursor-pointer hover:bg-amber-50/50 p-1.5 rounded-xl transition-all group" : ""}`}
                              onClick={() => {
                                if (hasAdminAccess) {
                                  setEditingCardTxId(tx.id);
                                  setEditingField("category");
                                  setTempCategory(tx.category || "");
                                  setCategorySearchTerm(tx.category || "");
                                }
                              }}
                              title={
                                tx.applied_rule_id 
                                  ? `[자동 분류 규칙] ${tx.applied_rule_text}` 
                                  : (hasAdminAccess ? "클릭하여 계정과목 수정" : undefined)
                              }
                            >
                              {tx.applied_rule_id && (
                                <span 
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[8.5px] font-extrabold shadow-sm animate-pulse"
                                  title={`[자동 분류 규칙] ${tx.applied_rule_text}`}
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-white" />
                                  자연어 자동분류
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${badgeStyle}`}>
                                {catHier.main}
                              </span>
                              <span className="text-[9px] text-slate-300 font-bold">〉</span>
                              <span className="text-[11px] font-extrabold text-slate-700">{catHier.mid}</span>
                              <span className="text-[9px] text-slate-300 font-bold">〉</span>
                              <span className="text-[11px] font-bold text-slate-400">{catHier.sub}</span>
                              {hasAdminAccess && (
                                <span className="ml-auto opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity">
                                  <Edit className="w-3 h-3" />
                                </span>
                              )}
                            </div>

                            {/* AI 확률 추천 가이드 칩 */}
                            {hasAdminAccess && (!tx.category || tx.category.trim() === "" || tx.category === "기타") && (
                              <div className="flex flex-col gap-1 mt-1 p-2 bg-slate-50 border border-slate-100 rounded-xl max-w-[280px]">
                                <div className="text-[8.5px] font-extrabold text-slate-400/90 flex items-center gap-1">
                                  <span>🤖 AI 자율 정산 추천 후보군</span>
                                </div>
                                <div className="flex flex-col gap-1 mt-1">
                                  {getDynamicRecommendations(
                                    tx.merchantName, 
                                    editingCardTxId === tx.id && editingField === "memo" ? tempMemo : (tx.memo || "")
                                  ).slice(0, 3).map((rec, index) => {
                                    const recHier = getCategoryHierarchy(rec.category, dbCategories);
                                    const recTags = rec.tags.map((t: string) => `#${t}`).join(" ");
                                    return (
                                      <div 
                                        key={index} 
                                        className="flex items-center justify-between gap-2 p-1 hover:bg-white rounded-lg border border-transparent hover:border-slate-200/60 transition-all text-[10px] group"
                                      >
                                        <span className="font-mono text-[9px] text-amber-600 font-bold bg-amber-50 px-1 rounded">
                                          {rec.percentage}%
                                        </span>
                                        <div className="flex flex-col text-slate-500 truncate flex-1 leading-tight">
                                          <span className="font-semibold text-slate-700 text-[10px]">
                                            {recHier.mid} 〉 {recHier.sub}
                                          </span>
                                          {recTags && (
                                            <span className="text-[8.5px] text-slate-400 truncate mt-0.5">
                                              {recTags}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateCardTransaction(tx.id, {
                                              category: rec.category,
                                              memo: rec.tags.join(", ")
                                            });
                                          }}
                                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-amber-500 hover:text-white text-slate-600 rounded-md text-[9px] font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                        >
                                          적용
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {getDynamicRecommendations(
                                    tx.merchantName, 
                                    editingCardTxId === tx.id && editingField === "memo" ? tempMemo : (tx.memo || "")
                                  ).length === 0 && (
                                    <span className="text-[9px] text-slate-300 font-light">추천 후보를 구성하는 중...</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-extrabold text-slate-800">{tx.merchantName}</span>
                      </td>
                      <td className="p-4 max-w-[150px]">
                        {hasAdminAccess && editingCardTxId === tx.id && editingField === "memo" ? (
                          <div className="flex flex-col gap-1.5 p-1 bg-white rounded-2xl border border-slate-100 shadow-lg min-w-[220px]">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                id={`card-tx-memo-${tx.id}`}
                                value={tempMemo}
                                onChange={(e) => setTempMemo(e.target.value)}
                                className="border border-amber-300 bg-amber-50 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500 w-full"
                                placeholder="쉼표로 태그 구분"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateCardTransaction(tx.id, { memo: tempMemo });
                                  } else if (e.key === "Escape") {
                                    setEditingCardTxId(null);
                                    setEditingField(null);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleUpdateCardTransaction(tx.id, { memo: tempMemo })}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                                disabled={isUpdatingCardTx}
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCardTxId(null);
                                  setEditingField(null);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                              >
                                취소
                              </button>
                            </div>
                            
                            {/* 태그 프리셋 가이드 칩 UI */}
                            <div className="mt-1 p-2 bg-slate-50/50 rounded-xl border border-slate-100/60">
                              <div className="text-[9px] font-extrabold text-slate-400 mb-1.5">사용할 수 있는 태그 목록 (클릭 토글)</div>
                              <div className="flex flex-wrap gap-1">
                                {dbTags.map((tag) => {
                                  const isSelected = tempMemo.split(",")
                                    .map(t => t.trim())
                                    .filter(Boolean)
                                    .includes(tag.name);
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => handleTagToggle(tag.name)}
                                      className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all active:scale-95 cursor-pointer ${
                                        isSelected
                                          ? "bg-amber-500 text-white border-amber-500 shadow-3xs"
                                          : "bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                                      }`}
                                    >
                                      #{tag.name}
                                    </button>
                                  );
                                })}
                                {dbTags.length === 0 && (
                                  <span className="text-[9px] text-slate-300 font-light">프리셋 태그를 로드할 수 없습니다.</span>
                                )}
                              </div>
                              {hasAdminAccess && (
                                <div className="mt-2 pt-1.5 border-t border-slate-100/60 flex justify-end">
                                  <a
                                    href="/expenses"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-black text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-0.5 animate-pulse"
                                  >
                                    ⚙️ 태그 관리 바로가기
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`min-h-[28px] flex items-center w-full ${hasAdminAccess ? "cursor-pointer hover:bg-amber-50/50 p-1.5 rounded-xl transition-all group" : ""}`}
                            onClick={() => {
                              if (hasAdminAccess) {
                                setEditingCardTxId(tx.id);
                                setEditingField("memo");
                                setTempMemo(tx.memo || "");
                              }
                            }}
                            title={hasAdminAccess ? "클릭하여 비고(태그) 수정" : undefined}
                          >
                            {tx.memo ? (
                              <div className="flex flex-wrap gap-1 items-center w-full">
                                {tx.memo.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                                  <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100/60 shadow-3xs">
                                    #{tag}
                                  </span>
                                ))}
                                {hasAdminAccess && (
                                  <span className="ml-auto opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity">
                                    <Edit className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold select-none group-hover:text-amber-500 transition-colors">
                                -
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={`p-4 text-right font-extrabold font-mono ${isCancelled ? "text-slate-300 line-through" : "text-slate-800"}`}>
                        ₩ {tx.amount?.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                            isCancelled
                              ? "bg-slate-100 text-slate-400 border border-slate-200"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}
                        >
                          {tx.status || "승인"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {tx.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewingReceiptUrl(tx.receiptUrl || null)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer border border-blue-150 shadow-3xs"
                          >
                            보기
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptSelectedTxId(tx.id);
                              setIsReceiptModalOpen(true);
                            }}
                            className="px-2 py-1 bg-slate-50 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-slate-400 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer border border-slate-200/60"
                          >
                            + 등록
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && cardTxList.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 text-xs font-semibold">
                    해당 조회 조건에 맞는 신용카드 승인 내역이 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 페이지네이션 컴포넌트 */}
        {!loading && totalCount > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setCurrentPage={setCurrentPage}
            totalCount={totalCount}
          />
        )}
      </div>
    </div>
  );
}
