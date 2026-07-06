"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Filter, Search, Calendar, Trash2, FileText, RefreshCw, AlertCircle, Edit, Plus, X, Tags, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { Expense, DbExpenseTag } from "../types";

export interface ExpenseLedgerTableProps {
  filteredExpenses: Expense[];
  paginatedExpenses: Expense[];
  activeCategoryFilter: string;
  setActiveCategoryFilter: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  currentPage: number;
  setCurrentPage: (val: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  selectedIds: Set<string>;
  toggleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleSelect: (id: string) => void;
  handleDeleteSelectedExpenses: () => Promise<void>;
  handleDeleteExpense: (id: string) => Promise<void>;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  setQuickRange: (rangeType: 'today' | 'week' | 'month' | '3month' | 'clear') => void;
  userRole: string;
  hasAdminAccess: boolean;
  setEditExpense: (expense: any) => void;
  dbTags: DbExpenseTag[];
  handleUpdateExpense: (id: string, updatedExpense: any) => Promise<{ success: boolean; error?: string }>;
}

export default function ExpenseLedgerTable({
  filteredExpenses,
  paginatedExpenses,
  activeCategoryFilter,
  setActiveCategoryFilter,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  selectedIds,
  toggleSelectAll,
  toggleSelect,
  handleDeleteSelectedExpenses,
  handleDeleteExpense,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setQuickRange,
  userRole,
  hasAdminAccess,
  setEditExpense,
  dbTags,
  handleUpdateExpense,
}: ExpenseLedgerTableProps) {
  // 대장 필터용 고유 카테고리 목록 동적 계산
  const uniqueCategories = useMemo(() => {
    const categories = paginatedExpenses.map(exp => exp.category).concat(filteredExpenses.map(exp => exp.category));
    return Array.from(new Set(categories)).filter(Boolean);
  }, [filteredExpenses, paginatedExpenses]);

  // 🏷️ 태그 인라인 에디팅 관련 상태 선언
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [isUpdatingTag, setIsUpdatingTag] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setEditingExpenseId(null);
        setNewTagInput("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 🏷️ 메모에서 쉼표 구분 태그 목록 파싱
  const parseTags = (memoStr?: string) => {
    if (!memoStr) return [];
    return memoStr
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");
  };

  // 🏷️ 인라인 태그 토글 처리 및 DB 업데이트
  const handleToggleTag = async (expense: Expense, tag: string) => {
    if (!hasAdminAccess) return;
    
    setIsUpdatingTag(expense.id);
    try {
      const currentTags = parseTags(expense.memo);
      let nextTags: string[];
      if (currentTags.includes(tag)) {
        nextTags = currentTags.filter(t => t !== tag);
      } else {
        nextTags = [...currentTags, tag];
      }
      
      const updatedMemo = nextTags.join(", ");
      
      let parsedAi = {};
      try {
        if (expense.ai_analysis) {
          parsedAi = JSON.parse(expense.ai_analysis);
        }
      } catch (e) {}

      const updatedPayload = {
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount),
        payment_method: expense.payment_method,
        actual_expense_date: expense.actual_expense_date || null,
        deduction_amount: Number(expense.deduction_amount) || 0,
        transfer_fee: Number(expense.transfer_fee) || 0,
        memo: updatedMemo,
        expense_date: expense.expense_date,
        ai_analysis: expense.ai_analysis || ""
      };

      const result = await handleUpdateExpense(expense.id, updatedPayload);
      if (!result.success) {
        alert("태그 업데이트 실패: " + result.error);
      }
    } catch (e) {
      console.error("태그 업데이트 중 오류 발생:", e);
      alert("태그 업데이트 중 통신 오류가 발생했습니다.");
    } finally {
      setIsUpdatingTag(null);
    }
  };

  // 🏷️ 인라인 커스텀 태그 추가 및 DB 업데이트
  const handleAddCustomTag = async (expense: Expense) => {
    if (!hasAdminAccess || !newTagInput.trim()) return;
    
    const tag = newTagInput.trim();
    setIsUpdatingTag(expense.id);
    try {
      const currentTags = parseTags(expense.memo);
      if (currentTags.includes(tag)) {
        setNewTagInput("");
        return;
      }
      
      const nextTags = [...currentTags, tag];
      const updatedMemo = nextTags.join(", ");
      
      let parsedAi = {};
      try {
        if (expense.ai_analysis) {
          parsedAi = JSON.parse(expense.ai_analysis);
        }
      } catch (e) {}

      const updatedPayload = {
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount),
        payment_method: expense.payment_method,
        actual_expense_date: expense.actual_expense_date || null,
        deduction_amount: Number(expense.deduction_amount) || 0,
        transfer_fee: Number(expense.transfer_fee) || 0,
        memo: updatedMemo,
        expense_date: expense.expense_date,
        ai_analysis: expense.ai_analysis || ""
      };

      const result = await handleUpdateExpense(expense.id, updatedPayload);
      if (result.success) {
        setNewTagInput("");
      } else {
        alert("커스텀 태그 추가 실패: " + result.error);
      }
    } catch (e) {
      console.error("커스텀 태그 추가 중 오류 발생:", e);
      alert("커스텀 태그 추가 중 통신 오류가 발생했습니다.");
    } finally {
      setIsUpdatingTag(null);
    }
  };

  // 페이지 계산
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredExpenses.length);

  // 📝 지출결의대장 엑셀 파일 일괄 내보내기 헬퍼 함수
  const downloadLedgerExcel = () => {
    try {
      const dataToExport = filteredExpenses.map((exp, idx) => {
        let department = "-";
        let staff = "-";
        let project = "-";
        let payee = "";
        let requisitionDate = exp.expense_date;

        try {
          if (exp.ai_analysis) {
            const parsed = JSON.parse(exp.ai_analysis);
            payee = parsed.payee || "";
            requisitionDate = parsed.requisition_date || exp.expense_date;
          }
        } catch (e) {}

        // 적요란 @ 태그 역산
        const tagRegex = /@([^\s@]+)/g;
        let match;
        while ((match = tagRegex.exec(exp.title)) !== null) {
          const name = match[1];
          // 태그 추정 매핑
          if (exp.memo?.includes(name)) {
            department = name;
          } else {
            staff = name;
          }
        }

        const finalPayment = (exp.amount || 0) - (exp.deduction_amount || 0) + (exp.transfer_fee || 0);

        return {
          "번호": idx + 1,
          "결재상태": exp.approval_status === "APPROVED" ? "승인 완료" : exp.approval_status === "REJECTED" ? "반려" : "결재 대기",
          "품의일자": requisitionDate,
          "실지출일": exp.actual_expense_date || "-",
          "계정과목": exp.category,
          "적요": exp.title,
          "거래처/영수인": payee || "-",
          "결제수단": exp.payment_method,
          "승인번호": exp.card_approval_no || "-",
          "원금액": exp.amount,
          "공제액": exp.deduction_amount || 0,
          "송금수수료": exp.transfer_fee || 0,
          "최종지급액": finalPayment,
          "귀속부서": department,
          "소속사원": staff,
          "귀속사업": project,
          "비고(태그)": exp.memo || "-"
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "지출대장_리포트");

      ws["!cols"] = [
        { wch: 8 },  // 번호
        { wch: 12 }, // 결재상태
        { wch: 14 }, // 품의일자
        { wch: 14 }, // 실지출일
        { wch: 15 }, // 계정과목
        { wch: 30 }, // 적요
        { wch: 20 }, // 거래처
        { wch: 12 }, // 결제수단
        { wch: 15 }, // 승인번호
        { wch: 12 }, // 원금
        { wch: 10 }, // 공제
        { wch: 10 }, // 수수료
        { wch: 12 }, // 지급액
        { wch: 12 }, // 부서
        { wch: 12 }, // 사원
        { wch: 15 }, // 사업
        { wch: 20 }  // 비고
      ];

      XLSX.writeFile(wb, `지출대장_일괄출력_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error("대장 엑셀 내보내기 오류:", e);
      alert("지출 대장 엑셀 파일 내보내기 중 에러가 발생했습니다.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6 text-left">
      
      {/* 검색 및 필터 헤더 도구막대 */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-805 flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 mb-2 gap-3">
          <div className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-rose-500" />
            통합 지출 결의서 대장
          </div>
          
          <button 
            type="button"
            onClick={downloadLedgerExcel}
            disabled={filteredExpenses.length === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-3xs cursor-pointer disabled:bg-slate-300 disabled:shadow-none border-none transition-all active:scale-95"
            title="현재 필터링되어 화면에 표시될 대장 목록 전체를 엑셀 파일로 내려받습니다."
          >
            <FileText className="w-4 h-4 text-white" />
            엑셀 통합 출력 (EXPORT)
          </button>
        </h2>

        {/* 1층: 기간 피커 & 실시간 검색창 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
          {/* 기간 필터 */}
          <div 
            data-easybot-hint="품의서 일자 범위 설정: 지출 전표의 품의일자를 기준으로 대장에 노출할 기간 범위를 지정합니다. 달력을 통해 시작일과 종료일을 지정하거나, 우측의 '오늘', '1주일', '1개월', '3개월' 단축 버튼을 사용하여 빠르게 설정할 수 있습니다."
            className="xl:col-span-2 space-y-2 text-left"
          >
            <label className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              품의서 일자 범위 설정
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-slate-250 rounded-xl px-3 py-1.5 outline-none font-bold text-xs bg-white text-slate-700 cursor-pointer shadow-3xs"
              />
              <span className="text-slate-400 font-bold text-xs">~</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-slate-250 rounded-xl px-3 py-1.5 outline-none font-bold text-xs bg-white text-slate-700 cursor-pointer shadow-3xs"
              />
              <div className="flex items-center gap-1 pl-1">
                <button 
                  type="button"
                  onClick={() => setQuickRange('today')} 
                  className="px-2 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black cursor-pointer shadow-3xs transition-all active:scale-95"
                >
                  오늘
                </button>
                <button 
                  type="button"
                  onClick={() => setQuickRange('week')} 
                  className="px-2 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black cursor-pointer shadow-3xs transition-all active:scale-95"
                >
                  1주일
                </button>
                <button 
                  type="button"
                  onClick={() => setQuickRange('month')} 
                  className="px-2 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black cursor-pointer shadow-3xs transition-all active:scale-95"
                >
                  1개월
                </button>
                <button 
                  type="button"
                  onClick={() => setQuickRange('3month')} 
                  className="px-2 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black cursor-pointer shadow-3xs transition-all active:scale-95"
                >
                  3개월
                </button>
                {(startDate || endDate) && (
                  <button 
                    type="button"
                    onClick={() => setQuickRange('clear')} 
                    className="px-2 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black cursor-pointer shadow-3xs transition-all active:scale-95"
                  >
                    해제
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 검색창 */}
          <div 
            data-easybot-hint="지출 대장 통합 검색: 찾고자 하는 지출 결의서의 적요(용도), 가맹점명(공급자), 혹은 적용된 태그명을 입력하여 실시간으로 필터링 검색을 수행합니다."
            className="space-y-2 text-left"
          >
            <label className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              적요/가맹점/태그 통합 검색
            </label>
            <div className="relative">
              <input 
                type="text"
                placeholder="적요, 가맹점, 태그명 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border border-slate-250 rounded-xl pl-3.5 pr-8 py-1.5 outline-none font-bold text-xs bg-white text-slate-805 placeholder-slate-400 focus:border-rose-400 shadow-3xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full border-none bg-transparent cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2층: 카테고리 필터 피드 */}
        <div 
          data-easybot-hint="계정과목(비목)별 필터 탭: 현재 기간 및 검색 조건에 맞는 지출 항목들을 복리후생비, 여비교통비 등 계정과목별로 분류하여 탭 형태로 보여줍니다. 특정 계정과목 탭을 클릭하면 해당 비목의 지출만 모아서 볼 수 있습니다."
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
              activeCategoryFilter === "ALL" 
                ? 'bg-rose-500 text-white border-rose-500 shadow-3xs' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            전체 비목 ({filteredExpenses.length}건)
          </button>
          {uniqueCategories.map(cat => {
            const count = filteredExpenses.filter(e => e.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                  activeCategoryFilter === cat 
                    ? 'bg-rose-500 text-white border-rose-500 shadow-3xs' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 다중 선택 일괄 제어판 */}
      {selectedIds.size > 0 && (
        <div 
          data-easybot-hint="선택 지출 일괄 삭제 기능: 대장 테이블 좌측의 체크박스를 통해 여러 개의 지출 항목을 선택한 경우 노출되며, '선택 일괄 삭제' 버튼을 클릭하면 선택된 모든 지출 전표가 한 번에 데이터베이스에서 삭제됩니다."
          className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between animate-fade-in shadow-3xs"
        >
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-rose-700 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1 text-rose-600 shrink-0" />
              선택한 지출결의서 내역: {selectedIds.size}건
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeleteSelectedExpenses}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10.5px] font-black border-none cursor-pointer shadow-3xs transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 text-white" />
            선택 일괄 삭제
          </button>
        </div>
      )}

      {/* 테이블 대장 영역 */}
      <div className="overflow-x-auto w-full border border-slate-100 rounded-2xl shadow-3xs max-h-[500px]">
        {paginatedExpenses.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 font-bold">
            지출 대장에 등록된 내역이 없거나 검색 결과가 없습니다.
          </div>
        ) : (
          <table className="w-full border-collapse bg-white">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-500 select-none">
              <tr>
                <th className="p-3.5 text-center w-10">
                  <input 
                    type="checkbox"
                    checked={selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500/20 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 text-left w-14">결재</th>
                <th className="p-3.5 text-left w-24">품의 일자</th>
                <th className="p-3.5 text-left w-24">실지출일</th>
                <th className="p-3.5 text-left w-28">계정과목</th>
                <th className="p-3.5 text-left min-w-[200px]">적요 (용도 및 세부내역)</th>
                <th className="p-3.5 text-left min-w-[150px]">태그</th>
                <th className="p-3.5 text-left w-32">거래처/영수인</th>
                <th className="p-3.5 text-left w-24">결제수단</th>
                <th className="p-3.5 text-left w-28">승인번호</th>
                <th className="p-3.5 text-right w-24">지출액</th>
                <th className="p-3.5 text-center w-20 sticky right-0 bg-slate-50 border-l z-10">제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-mono text-[11px] text-slate-650">
              {paginatedExpenses.map(exp => {
                let payeeText = "-";
                let reqDate = exp.expense_date;

                try {
                  if (exp.ai_analysis) {
                    const parsed = JSON.parse(exp.ai_analysis);
                    payeeText = parsed.payee || "-";
                    reqDate = parsed.requisition_date || exp.expense_date;
                  }
                } catch (e) {}

                // 결재 상태 뱃지 스타일 매핑
                const statusBadge = {
                  APPROVED: "bg-green-50 text-green-700 border-green-200",
                  REJECTED: "bg-red-50 text-red-700 border-red-200",
                  HOLD: "bg-amber-50 text-amber-700 border-amber-200",
                  PENDING: "bg-slate-100 text-slate-500 border-slate-200"
                }[exp.approval_status || "PENDING"];

                const statusLabel = {
                  APPROVED: "승인",
                  REJECTED: "반려",
                  HOLD: "보류",
                  PENDING: "대기"
                }[exp.approval_status || "PENDING"];

                return (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(exp.id)}
                        onChange={() => toggleSelect(exp.id)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500/20 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="p-3.5 font-sans font-semibold text-slate-700">{reqDate}</td>
                    <td className="p-3.5 font-sans text-slate-450">{exp.actual_expense_date || "-"}</td>
                    <td className="p-3.5 font-sans font-bold text-rose-600">{exp.category}</td>
                    <td className="p-3.5 truncate max-w-[280px] font-sans font-semibold text-slate-800" title={exp.title}>
                      {exp.title}
                    </td>
                    <td className="p-3.5 relative">
                      <div 
                        className={`flex flex-wrap gap-1 items-center min-h-[28px] rounded-xl px-2 py-1 transition-all ${
                          hasAdminAccess 
                            ? 'cursor-pointer hover:bg-slate-100/70 border border-transparent hover:border-slate-200/60' 
                            : ''
                        }`}
                        onClick={() => {
                          if (hasAdminAccess) {
                            setEditingExpenseId(editingExpenseId === exp.id ? null : exp.id);
                          }
                        }}
                        title={hasAdminAccess ? "클릭하여 태그 편집" : "지출 태그 목록"}
                      >
                        {parseTags(exp.memo).length === 0 ? (
                          hasAdminAccess ? (
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                              <Plus className="w-3 h-3" /> 태그 추가
                            </span>
                          ) : (
                            <span className="text-slate-350 font-bold">-</span>
                          )
                        ) : (
                          parseTags(exp.memo).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100"
                            >
                              #{tag}
                            </span>
                          ))
                        )}
                        {hasAdminAccess && parseTags(exp.memo).length > 0 && (
                          <span className="text-slate-350 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            <Edit className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* 🏷️ 인라인 태그 에디터 팝오버 */}
                      {editingExpenseId === exp.id && (
                        <div 
                          ref={popoverRef}
                          className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 w-64 animate-fade-in space-y-3 text-left font-sans text-xs"
                          style={{ top: "100%" }}
                        >
                          <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
                            <span className="font-black text-slate-800 text-[10.5px] flex items-center gap-1">
                              <Tags className="w-3.5 h-3.5 text-rose-500" />
                              지출 태그 빠른 편집
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExpenseId(null);
                                setNewTagInput("");
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5 hover:bg-slate-100 rounded-full border-none bg-transparent cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* 프리셋 태그 목록 */}
                          <div className="space-y-1.5">
                            <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">공식 태그</p>
                            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto pr-1">
                              {dbTags.map(tagObj => {
                                const isSelected = parseTags(exp.memo).includes(tagObj.name);
                                return (
                                  <button
                                    key={tagObj.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTag(exp, tagObj.name);
                                    }}
                                    disabled={isUpdatingTag === exp.id}
                                    className={`px-2 py-1 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer shadow-3xs flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/10'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    #{tagObj.name}
                                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 커스텀 태그 직접 입력 */}
                          <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                            <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">커스텀 태그 추가</p>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="태그 입력..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAddCustomTag(exp);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isUpdatingTag === exp.id}
                                className="flex-1 border border-slate-250 rounded-lg px-2.5 py-1 text-[10.5px] font-semibold outline-none bg-white text-slate-800 placeholder-slate-400 focus:border-rose-400"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddCustomTag(exp);
                                }}
                                disabled={isUpdatingTag === exp.id || !newTagInput.trim()}
                                className="px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10.5px] font-bold border-none cursor-pointer flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>

                          {isUpdatingTag === exp.id && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-2xl">
                              <RefreshCw className="w-5 h-5 text-rose-500 animate-spin" />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 truncate max-w-[120px] font-sans font-bold text-slate-700" title={payeeText}>
                      {payeeText}
                    </td>
                    <td className="p-3.5 font-sans font-bold text-slate-500">{exp.payment_method}</td>
                    <td className="p-3.5 font-sans text-slate-450 font-semibold">{exp.card_approval_no || "-"}</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {exp.amount.toLocaleString()}원
                    </td>
                    <td className="p-3.5 text-center sticky right-0 bg-white/95 border-l border-slate-50 z-10">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border-none bg-transparent"
                          title="상세 내역 인라인 수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border-none bg-transparent"
                          title="대장에서 완전 삭제"
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
      </div>

      {/* 페이지네이션 및 상태 바 */}
      {filteredExpenses.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3.5 border-t border-slate-100 font-sans text-xs">
          <div className="text-slate-455 font-bold">
            총 {filteredExpenses.length}건 중 {startIndex + 1}-{endIndex} 행 표시
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">페이지 크기:</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700 cursor-pointer shadow-3xs bg-white font-semibold text-xs"
              >
                <option value={10}>10개씩 보기</option>
                <option value={20}>20개씩 보기</option>
                <option value={50}>50개씩 보기</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-3xs transition-colors cursor-pointer text-[10px] font-black border-solid"
              >
                이전
              </button>
              <span className="px-3 text-slate-600 font-extrabold">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-3xs transition-colors cursor-pointer text-[10px] font-black border-solid"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
