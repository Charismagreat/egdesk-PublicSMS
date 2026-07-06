"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo } from "react";
import { Coins, Sparkles, RefreshCw, CheckCircle, ShieldAlert, AlertTriangle } from "lucide-react";

// 커스텀 훅 임포트
import { useExpenses } from "@/hooks/useExpenses";

// 서브 컴포넌트 임포트
import ReceiptScanCard from "./components/ReceiptScanCard";
import ExpenseConfigCenter from "./components/ExpenseConfigCenter";
import ExpenseLedgerTable from "./components/ExpenseLedgerTable";
import ExpenseEditModal from "./components/ExpenseEditModal";

export default function ExpenseManagementAiPage() {
  const {
    expenses,
    stats,
    settings,
    isLoading,
    isSavingSettings,
    isSubmittingExpense,
    isAnalyzingReceipt,
    activeCategoryFilter,
    setActiveCategoryFilter,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    newExpense,
    setNewExpense,
    fetchExpenses,
    handleSaveSettings,
    handleRegisterExpense,
    handleDeleteExpense,
    handleFileUpload,
    resetExpenseForm,
    filteredExpenses,
    paginatedExpenses,
    selectedIds,
    toggleSelectAll,
    toggleSelect,
    handleDeleteSelectedExpenses,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    setQuickRange,
    dbCategories,
    dbTags,
    handleAddCategory,
    handleBulkAddCategories,
    handleDeleteCategory,
    handleAddTag,
    handleDeleteTag,
    autocompleteData,
    dbDepartments,
    dbEmployees,
    dbProjects,
    handleAddDepartment,
    handleDeleteDepartment,
    handleAddEmployee,
    handleDeleteEmployee,
    handleAddProject,
    handleDeleteProject,
    handleUpdateExpense,
    handleApproveExpense,
  } = useExpenses();

  // 🔑 최고관리자 권한 상태 선언
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [editExpense, setEditExpense] = useState<any | null>(null); // 수정 모달 제어용
  
  // 🛎️ 토스트 알림 상태 선언
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warn" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warn" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 🔑 최고관리자(SUPER_ADMIN) 또는 대표자(PRESIDENT) 권한이 있는지 확인하는 헬퍼 변수
  const hasAdminAccess = useMemo(() => {
    if (!userRole) return false;
    const role = userRole.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'PRESIDENT';
  }, [userRole]);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.role) {
          setUserRole(data.role);
        }
      } catch (e) {
        console.error("Failed to fetch user session on client", e);
      }
    };
    fetchUserRole();
  }, []);

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800 animate-fade-in text-left">
      
      {/* 🛎️ 알림 토스트 컴포넌트 */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-650" />}
          {toast.type === 'error' && <ShieldAlert className="w-5 h-5 text-red-655" />}
          {toast.type === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-650" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* 타이틀 및 헤더 영역 (PC용 1행 통일 스타일) */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center tracking-tight">
          <Coins className="w-8 h-8 text-rose-500 mr-3 animate-pulse" />
          지출 관리 AI
        </h1>
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-xs font-black flex items-center shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-rose-500 animate-bounce" />
          AI 경리 자율 자동화 구동 중
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="font-extrabold text-slate-500 text-sm">지출 대장 및 AI 통계 정보를 계산하는 중입니다...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 상단 2열 배치 (AI 스캔 영역 & 설정 및 누적 예산 현황) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* 좌측 열: AI 영수증 자율 스캔 및 검수 */}
            <ReceiptScanCard
              isAnalyzingReceipt={isAnalyzingReceipt}
              isSubmittingExpense={isSubmittingExpense}
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              handleFileUpload={handleFileUpload}
              handleRegisterExpense={handleRegisterExpense}
              resetExpenseForm={resetExpenseForm}
              dbCategories={dbCategories}
              dbTags={dbTags}
              autocompleteData={autocompleteData}
            />

            {/* 우측 열: 누적 예산 & 지출 환경 설정 */}
            <div className="space-y-6">
              
              {/* 월간 예산 소모 현황 전광판 */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden border border-slate-800 text-left">
                <div className="relative z-10 flex justify-between items-center mb-4">
                  <div>
                    <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">이달의 누적 지출 현황 ({stats?.currentMonth}월)</p>
                    <h3 className="text-3xl font-black mt-1 font-mono tracking-tight text-white">
                      {stats?.currentMonthTotal.toLocaleString()} <span className="text-sm font-bold text-slate-350">원</span>
                    </h3>
                  </div>
                  
                  <div className={`px-3.5 py-1.5 rounded-full font-black text-xs shadow-md ${
                    (stats?.budgetConsumptionRate || 0) >= 90 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' 
                      : (stats?.budgetConsumptionRate || 0) >= 70
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    소모율 {stats?.budgetConsumptionRate}%
                  </div>
                </div>

                <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner mb-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      (stats?.budgetConsumptionRate || 0) >= 90
                        ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                        : (stats?.budgetConsumptionRate || 0) >= 70
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                    style={{ width: `${Math.min(stats?.budgetConsumptionRate || 0, 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                  <span>예산 한도: {stats?.monthlyBudget.toLocaleString()}원</span>
                  <span>잔여 가능 예산: {Math.max((stats?.monthlyBudget || 0) - (stats?.currentMonthTotal || 0), 0).toLocaleString()}원</span>
                </div>
              </div>

              {/* 지출 환경 설정 센터 */}
              <ExpenseConfigCenter
                settings={settings}
                handleSaveSettings={handleSaveSettings}
                isSavingSettings={isSavingSettings}
                dbCategories={dbCategories}
                handleAddCategory={handleAddCategory}
                handleBulkAddCategories={handleBulkAddCategories}
                handleDeleteCategory={handleDeleteCategory}
                dbTags={dbTags}
                handleAddTag={handleAddTag}
                handleDeleteTag={handleDeleteTag}
                dbDepartments={dbDepartments}
                dbEmployees={dbEmployees}
                dbProjects={dbProjects}
                handleAddDepartment={handleAddDepartment}
                handleDeleteDepartment={handleDeleteDepartment}
                handleAddEmployee={handleAddEmployee}
                handleDeleteEmployee={handleDeleteEmployee}
                handleAddProject={handleAddProject}
                handleDeleteProject={handleDeleteProject}
              />
            </div>
          </div>

          {/* 하단 영역: 통합 지출 결의서 대장 */}
          <ExpenseLedgerTable
            filteredExpenses={filteredExpenses}
            paginatedExpenses={paginatedExpenses}
            activeCategoryFilter={activeCategoryFilter}
            setActiveCategoryFilter={setActiveCategoryFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            selectedIds={selectedIds}
            toggleSelectAll={toggleSelectAll}
            toggleSelect={toggleSelect}
            handleDeleteSelectedExpenses={handleDeleteSelectedExpenses}
            handleDeleteExpense={handleDeleteExpense}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            setQuickRange={setQuickRange}
            userRole={userRole}
            hasAdminAccess={hasAdminAccess}
            setEditExpense={setEditExpense}
            dbTags={dbTags}
            handleUpdateExpense={handleUpdateExpense}
          />
        </div>
      )}

      {/* 지출 내역 인라인 상세 수정 모달 */}
      <ExpenseEditModal
        editExpense={editExpense}
        setEditExpense={setEditExpense}
        handleUpdateExpense={handleUpdateExpense}
        handleApproveExpense={handleApproveExpense}
        userRole={userRole}
        hasAdminAccess={hasAdminAccess}
        fetchExpenses={fetchExpenses}
        showToast={showToast}
      />

    </div>
  );
}
