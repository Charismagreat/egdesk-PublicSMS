"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  attachment_url?: string;
  ai_analysis?: string;
  memo?: string;
  actual_expense_date?: string | null;
  deduction_amount?: number;
  transfer_fee?: number;
  created_at: string;
  card_approval_no?: string | null;
}

export interface ExpenseSettings {
  monthly_budget: number;
  is_alert_enabled: number;
  alert_threshold_percent: number;
  alert_sms_template: string;
  alert_phone: string;
}

export interface ExpenseStats {
  currentMonth: string;
  currentMonthTotal: number;
  monthlyBudget: number;
  budgetConsumptionRate: number;
  categoryStats: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface DbExpenseCategory {
  id: string;
  main_category: string;
  mid_category: string;
  sub_category: string;
  created_at: string;
}

export interface DbExpenseTag {
  id: string;
  name: string;
  scope?: string;
  created_at: string;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [settings, setSettings] = useState<ExpenseSettings>({
    monthly_budget: 3000000,
    is_alert_enabled: 1,
    alert_threshold_percent: 90,
    alert_sms_template: "",
    alert_phone: ""
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);

  // 필터 및 검색
  const [activeCategoryFilter, setActiveCategoryFilter, isActiveCategoryFilterRestored] = usePersistedState<string>("egdesk_expenses_activeCategoryFilter", "ALL");
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState<string>("egdesk_expenses_searchQuery", "");

  // 페이지네이션
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState<number>("egdesk_expenses_currentPage", 1);
  const [itemsPerPage, setItemsPerPage, isItemsPerPageRestored] = usePersistedState<number>("egdesk_expenses_itemsPerPage", 10);

  // ⚡ 다중 선택 상태 추가 (거래 관리 AI 연동 스펙)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 📅 기간 조회 상태 탑재 (시작일자, 종료일자)
  const [startDate, setStartDate, isStartDateRestored] = usePersistedState<string>("egdesk_expenses_startDate", "");
  const [endDate, setEndDate, isEndDateRestored] = usePersistedState<string>("egdesk_expenses_endDate", "");

  // ⚡ 퀵 기간 피커 프리셋 계산 함수
  const setQuickRange = (rangeType: 'today' | 'week' | 'month' | '3month' | 'clear') => {
    const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = kstToday.toISOString().slice(0, 10);
    
    if (rangeType === 'clear') {
      setStartDate("");
      setEndDate("");
      return;
    }
    
    setEndDate(todayStr);
    
    const pastDate = new Date(kstToday);
    if (rangeType === 'today') {
      setStartDate(todayStr);
    } else if (rangeType === 'week') {
      pastDate.setDate(kstToday.getDate() - 7);
      setStartDate(pastDate.toISOString().slice(0, 10));
    } else if (rangeType === 'month') {
      pastDate.setMonth(kstToday.getMonth() - 1);
      setStartDate(pastDate.toISOString().slice(0, 10));
    } else if (rangeType === '3month') {
      pastDate.setMonth(kstToday.getMonth() - 3);
      setStartDate(pastDate.toISOString().slice(0, 10));
    }
  };

  // 신규 등록 폼 (사장님의 지출결의서 실물 양식 필드 탑재 - 품의일자 일원화)
  const [newExpense, setNewExpense, isNewExpenseRestored] = usePersistedState('egdesk_expenses_newExpense', {
    title: "",
    category: "직원야근식대",
    amount: "",
    expense_date: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
    payment_method: "법인카드",
    memo: "",
    attachment_url: "",
    ai_analysis: "",
    payee: "", // ✍️ 영수인/가맹점명/거래처명
    requisition_date: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), // ✍️ 품의 일자
    actual_expense_date: "",
    deduction_amount: 0,
    transfer_fee: 0,
    card_approval_no: "",
  });

  const [dbCategories, setDbCategories] = useState<DbExpenseCategory[]>([]);
  const [dbTags, setDbTags] = useState<DbExpenseTag[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  const [autocompleteData, setAutocompleteData] = useState<{
    partners: string[];
    staff: string[];
    departments: string[];
    projects: string[];
  }>({ partners: [], staff: [], departments: [], projects: [] });
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);

  const [dbDepartments, setDbDepartments] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [dbEmployees, setDbEmployees] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [dbProjects, setDbProjects] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);

  // 🏢 1. 부서 CRUD
  const fetchDepartments = async () => {
    try {
      const res = await apiFetch("/api/expenses/departments");
      const json = await res.json();
      if (json.success) setDbDepartments(json.departments);
    } catch (e) { console.error("부서 로드 에러:", e); }
  };

  const handleAddDepartment = async (name: string) => {
    try {
      const res = await apiFetch("/api/expenses/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const json = await res.json();
      if (json.success) {
        await fetchDepartments();
        await fetchAutocompleteData();
        return { success: true };
      }
      return { success: false, error: json.error };
    } catch (e) { return { success: false, error: "서버 통신 중 에러가 발생했습니다." }; }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("선택하신 부서를 조직도에서 영구 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/expenses/departments?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await fetchDepartments();
        await fetchAutocompleteData();
      } else {
        alert("부서 삭제 실패: " + json.error);
      }
    } catch (e) { alert("부서 삭제 중 통신 에러가 발생했습니다."); }
  };

  // 👥 2. 임직원 CRUD
  const fetchEmployees = async () => {
    try {
      const res = await apiFetch("/api/expenses/employees");
      const json = await res.json();
      if (json.success) setDbEmployees(json.employees);
    } catch (e) { console.error("임직원 로드 에러:", e); }
  };

  const handleAddEmployee = async (name: string) => {
    try {
      const res = await apiFetch("/api/expenses/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const json = await res.json();
      if (json.success) {
        await fetchEmployees();
        await fetchAutocompleteData();
        return { success: true };
      }
      return { success: false, error: json.error };
    } catch (e) { return { success: false, error: "서버 통신 중 에러가 발생했습니다." }; }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("선택하신 임직원을 명단에서 영구 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/expenses/employees?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await fetchEmployees();
        await fetchAutocompleteData();
      } else {
        alert("임직원 삭제 실패: " + json.error);
      }
    } catch (e) { alert("임직원 삭제 중 통신 에러가 발생했습니다."); }
  };

  // 🚀 3. 프로젝트 CRUD
  const fetchProjects = async () => {
    try {
      const res = await apiFetch("/api/expenses/projects");
      const json = await res.json();
      if (json.success) setDbProjects(json.projects);
    } catch (e) { console.error("프로젝트 로드 에러:", e); }
  };

  const handleAddProject = async (name: string) => {
    try {
      const res = await apiFetch("/api/expenses/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const json = await res.json();
      if (json.success) {
        await fetchProjects();
        await fetchAutocompleteData();
        return { success: true };
      }
      return { success: false, error: json.error };
    } catch (e) { return { success: false, error: "서버 통신 중 에러가 발생했습니다." }; }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("선택하신 프로젝트를 사업 명단에서 영구 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/expenses/projects?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await fetchProjects();
        await fetchAutocompleteData();
      } else {
        alert("프로젝트 삭제 실패: " + json.error);
      }
    } catch (e) { alert("프로젝트 삭제 중 통신 에러가 발생했습니다."); }
  };

  const fetchAutocompleteData = async () => {
    setIsLoadingAutocomplete(true);
    try {
      const res = await apiFetch("/api/expenses/autocomplete");
      const json = await res.json();
      if (json.success) {
        setAutocompleteData(json.data);
      }
    } catch (e) {
      console.error("자동완성 데이터 로드 오류:", e);
    } finally {
      setIsLoadingAutocomplete(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await apiFetch("/api/expenses/categories");
      const json = await res.json();
      if (json.success) {
        setDbCategories(json.categories);
      }
    } catch (e) {
      console.error("계정과목 로드 오류:", e);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchTags = async () => {
    setIsLoadingTags(true);
    try {
      const res = await apiFetch("/api/expenses/tags");
      const json = await res.json();
      if (json.success) {
        setDbTags(json.tags);
      }
    } catch (e) {
      console.error("지출 태그 로드 오류:", e);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleAddCategory = async (main_category: string, mid_category: string, sub_category: string) => {
    try {
      const res = await apiFetch("/api/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main_category, mid_category, sub_category })
      });
      const json = await res.json();
      if (json.success) {
        await fetchCategories();
        return { success: true };
      } else {
        return { success: false, error: json.error };
      }
    } catch (e: any) {
      return { success: false, error: "서버 통신 에러가 발생했습니다." };
    }
  };

  const handleBulkAddCategories = async (categories: Array<{ main_category: string; mid_category: string; sub_category: string; }>) => {
    try {
      if (!categories || categories.length === 0) {
        return { success: false, error: "등록할 데이터가 없습니다." };
      }
      const res = await apiFetch("/api/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories })
      });
      const json = await res.json();
      if (json.success) {
        await fetchCategories();
        return { success: true, addedCount: json.addedCount, message: json.message };
      } else {
        return { success: false, error: json.error };
      }
    } catch (e: any) {
      return { success: false, error: "서버 통신 중 에러가 발생했습니다." };
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("선택하신 계정 과목을 영구 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/expenses/categories?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await fetchCategories();
      } else {
        alert("계정 과목 삭제 실패: " + json.error);
      }
    } catch (e) {
      alert("계정 과목 삭제 중 통신 에러가 발생했습니다.");
    }
  };

  const handleAddTag = async (name: string, scope?: string) => {
    try {
      const res = await apiFetch("/api/expenses/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scope: scope || 'global' })
      });
      const json = await res.json();
      if (json.success) {
        await fetchTags();
        return { success: true };
      } else {
        return { success: false, error: json.error };
      }
    } catch (e: any) {
      return { success: false, error: "서버 통신 에러가 발생했습니다." };
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm("선택하신 태그 종류를 영구 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/expenses/tags?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await fetchTags();
      } else {
        alert("태그 삭제 실패: " + json.error);
      }
    } catch (e) {
      alert("태그 삭제 중 통신 에러가 발생했습니다.");
    }
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/expenses");
      const json = await res.json();
      if (json.success) {
        setExpenses(json.expenses);
        setStats(json.stats);
        if (json.settings) {
          setSettings(json.settings);
        }
      }
    } catch (e) {
      console.error("지출 내역 로드 오류:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveCategoryFilterRestored && isSearchQueryRestored && isCurrentPageRestored && isItemsPerPageRestored && isStartDateRestored && isEndDateRestored && isNewExpenseRestored;

  useEffect(() => {
    if (isRestored) {
      fetchExpenses();
      fetchCategories();
      fetchTags();
      fetchAutocompleteData();
      fetchDepartments();
      fetchEmployees();
      fetchProjects();
    }
  }, [isRestored]);

  // 검색/필터/기간 변경 시 페이지 및 선택 상태 초기화 (세션 복원 가드 추가)
  useEffect(() => {
    if (isRestored) {
      setCurrentPage(1);
      setSelectedIds(new Set());
    }
  }, [searchQuery, activeCategoryFilter, startDate, endDate, isRestored]);

  // 설정 저장
  const handleSaveSettings = async (updatedSettings: ExpenseSettings) => {
    setIsSavingSettings(true);
    try {
      const res = await apiFetch("/api/expenses/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      });
      const json = await res.json();
      if (json.success) {
        setSettings(updatedSettings);
        alert("예산 및 알림 설정이 안전하게 업데이트되었습니다.");
        fetchExpenses(); // 집계 갱신
      } else {
        alert("설정 저장 실패: " + json.error);
      }
    } catch (err) {
      alert("설정 저장 중 통신 에러가 발생했습니다.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 지출 등록
  const handleRegisterExpense = async () => {
    if (!newExpense.title || !newExpense.amount || !newExpense.expense_date || !newExpense.payment_method) {
      alert("필수 항목(적요, 금액, 품의일자, 결제수단)을 모두 입력해 주세요.");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      // 실물 지출결의서 추가 메타 정보 (영수인/가맹점명/거래처명, 품의일자)를 ai_analysis에 안전하게 백필 병합
      const payee = newExpense.payee || "";
      const requisition_date = newExpense.requisition_date || newExpense.expense_date;

      let parsedAiAnalysis = {};
      try {
        parsedAiAnalysis = JSON.parse(newExpense.ai_analysis || "{}");
      } catch (e) {
        parsedAiAnalysis = {};
      }

      const payload = {
        ...newExpense,
        amount: Number(newExpense.amount),
        deduction_amount: Number(newExpense.deduction_amount) || 0,
        transfer_fee: Number(newExpense.transfer_fee) || 0,
        actual_expense_date: newExpense.actual_expense_date || null,
        // 품재일자, 결재일자, 지출일자를 품의일자 단 하나로 안전 동기화 이식
        expense_date: requisition_date, 
        ai_analysis: JSON.stringify({
          ...parsedAiAnalysis,
          payee,
          requisition_date,
          approval_date: requisition_date 
        })
      };

      const res = await apiFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        alert("지출결의서 양식의 장부 내역이 정상적으로 등록되었습니다.");
        resetExpenseForm();
        fetchExpenses(); // 데이터 및 예산 추이 즉시 갱신
      } else {
        alert("지출 등록 실패: " + json.error);
      }
    } catch (err) {
      alert("지출 등록 요청 중 통신 에러가 발생했습니다.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // 지출 삭제
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("선택하신 지출 내역을 장부에서 영구적으로 제외(삭제)하시겠습니까?")) return;

    try {
      const res = await apiFetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
        fetchExpenses();
      } else {
        alert("지출 내역 삭제 실패: " + json.error);
      }
    } catch (err) {
      alert("지출 삭제 요청 중 통신 에러가 발생했습니다.");
    }
  };

  // 지출 수정
  const handleUpdateExpense = async (id: string, updatedExpense: any) => {
    try {
      const res = await apiFetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedExpense })
      });
      const json = await res.json();
      if (json.success) {
        await fetchExpenses();
        return { success: true };
      } else {
        return { success: false, error: json.error };
      }
    } catch (e) {
      return { success: false, error: "서버 통신 중 에러가 발생했습니다." };
    }
  };

  // 지출 결재 처리 (대표자/최고관리자 권한)
  const handleApproveExpense = async (id: string, status: 'APPROVED' | 'REJECTED' | 'HOLD', memo: string = "") => {
    try {
      const res = await apiFetch("/api/expenses/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, memo })
      });
      const json = await res.json();
      if (json.success) {
        await fetchExpenses();
        return { success: true };
      } else {
        return { success: false, error: json.error };
      }
    } catch (e) {
      return { success: false, error: "서버 통신 중 에러가 발생했습니다." };
    }
  };

  // ⚡ 다중 선택 관리 함수 마운트 (거래 관리 AI 매핑)
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredExpenses.map(exp => exp.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // ⚡ 일괄 선택 삭제 핸들러 신설
  const handleDeleteSelectedExpenses = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택하신 ${selectedIds.size}건의 지출 내역을 장부에서 일괄 삭제하시겠습니까?`)) return;

    try {
      const idsArray = Array.from(selectedIds).join(",");
      const res = await apiFetch(`/api/expenses?ids=${idsArray}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        alert("선택한 지출 내역이 성공적으로 일괄 삭제되었습니다.");
        setSelectedIds(new Set());
        fetchExpenses();
      } else {
        alert("일괄 삭제 실패: " + json.error);
      }
    } catch (err) {
      alert("일괄 삭제 처리 중 네트워크 통신 오류가 발생했습니다.");
    }
  };

  // 영수증 이미지/PDF 파일 업로드 & OCR API 연동
  const handleFileUpload = (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      alert("지원하지 않는 파일 형식입니다. 영수증 이미지(png, jpg, webp) 또는 전자영수증 PDF 파일을 올려주세요.");
      return;
    }

    setIsAnalyzingReceipt(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (!base64) {
        setIsAnalyzingReceipt(false);
        return;
      }

      try {
        const res = await apiFetch("/api/expenses/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            filename: file.name,
            mimeType: file.type
          })
        });
        const json = await res.json();
        
        if (json.success) {
          // AI OCR 분석 결과(중분류)를 실제 DB의 소분류(sub_category)로 변환하는 지능형 매핑 로직
          let mappedCategory = "직원식대"; // 기본 fallback 값
          
          if (json.category) {
            // OCR 비목명과 DB 중분류명 매칭 사전
            const OCR_MID_CAT_MAP: Record<string, string> = {
              "복리후생비": "복리후생비",
              "여비교통비": "여비교통비",
              "소모품비": "소모품비",
              "접대비": "접대비(기업업무추진비)",
              "임차료": "지급임차료",
              "세금공과금": "세금과공과",
              "기타": "지급수수료"
            };

            const targetMidCat = OCR_MID_CAT_MAP[json.category] || json.category;
            const matchedCats = dbCategories.filter(cat => cat.mid_category === targetMidCat);

            if (matchedCats.length > 0) {
              const titleLower = (json.title || "").toLowerCase();
              let subCat = matchedCats[0].sub_category; // 기본값은 해당 중분류의 첫 번째 소분류
              
              if (targetMidCat === "복리후생비") {
                if (titleLower.includes("음료") || titleLower.includes("커피") || titleLower.includes("간식") || titleLower.includes("과자") || titleLower.includes("물") || titleLower.includes("라떼")) {
                  const found = matchedCats.find(c => c.sub_category === "음료및간식비");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("야식") || titleLower.includes("야근") || titleLower.includes("특근")) {
                  const found = matchedCats.find(c => c.sub_category === "직원야근식대");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("식대") || titleLower.includes("식사") || titleLower.includes("밥")) {
                  const found = matchedCats.find(c => c.sub_category === "직원식대");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("경조") || titleLower.includes("화환") || titleLower.includes("축하")) {
                  const found = matchedCats.find(c => c.sub_category === "경조사비");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("교육") || titleLower.includes("세미나") || titleLower.includes("강의")) {
                  const found = matchedCats.find(c => c.sub_category === "직원교육비");
                  if (found) subCat = found.sub_category;
                }
              } else if (targetMidCat === "여비교통비") {
                if (titleLower.includes("택시")) {
                  const found = matchedCats.find(c => c.sub_category === "택시비");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("KTX") || titleLower.includes("항공") || titleLower.includes("기차") || titleLower.includes("철도") || titleLower.includes("비행기")) {
                  const found = matchedCats.find(c => c.sub_category === "KTX/항공료");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("주차")) {
                  const found = matchedCats.find(c => c.sub_category === "주차요금");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("유류") || titleLower.includes("주유") || titleLower.includes("가솔린") || titleLower.includes("디젤")) {
                  const found = matchedCats.find(c => c.sub_category === "유류비");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("톨게이트") || titleLower.includes("하이패스") || titleLower.includes("통행료")) {
                  const found = matchedCats.find(c => c.sub_category === "톨게이트비");
                  if (found) subCat = found.sub_category;
                }
              } else if (targetMidCat === "소모품비") {
                if (titleLower.includes("비품") || titleLower.includes("의자") || titleLower.includes("책상") || titleLower.includes("가구")) {
                  const found = matchedCats.find(c => c.sub_category === "사무비품비");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("전산") || titleLower.includes("마우스") || titleLower.includes("키보드") || titleLower.includes("토너") || titleLower.includes("잉크")) {
                  const found = matchedCats.find(c => c.sub_category === "전산소모품비");
                  if (found) subCat = found.sub_category;
                } else {
                  const found = matchedCats.find(c => c.sub_category === "사무용품비");
                  if (found) subCat = found.sub_category;
                }
              } else if (targetMidCat === "접대비(기업업무추진비)") {
                if (titleLower.includes("선물") || titleLower.includes("기프트")) {
                  const found = matchedCats.find(c => c.sub_category === "거래처선물비");
                  if (found) subCat = found.sub_category;
                } else if (titleLower.includes("경조") || titleLower.includes("화환") || titleLower.includes("부조")) {
                  const found = matchedCats.find(c => c.sub_category === "거래처경조사비");
                  if (found) subCat = found.sub_category;
                } else {
                  const found = matchedCats.find(c => c.sub_category === "거래처식사비");
                  if (found) subCat = found.sub_category;
                }
              }
              
              mappedCategory = subCat;
            } else {
              // 중분류 매칭 실패 시 소분류 직접 일치 확인
              const matchedSub = dbCategories.find(cat => cat.sub_category === json.category);
              if (matchedSub) {
                mappedCategory = matchedSub.sub_category;
              } else if (dbCategories.length > 0) {
                mappedCategory = dbCategories[0].sub_category;
              }
            }
          }

          // AI OCR 분석 결과 폼 자동 채우기
          setNewExpense({
            title: json.title || "",
            category: mappedCategory,
            amount: String(json.amount) || "",
            expense_date: json.expense_date || new Date().toISOString().slice(0, 10),
            payment_method: json.payment_method || "법인카드",
            memo: json.memo || "",
            attachment_url: base64.slice(0, 100), // 프론트 데모용으로 축약 저장
            ai_analysis: JSON.stringify({ ocrParsed: true, filename: file.name, method: json.method }),
            payee: json.payee || json.merchant || "", // AI가 영수인/가맹점명/거래처명 자동 맵핑
            requisition_date: json.expense_date || new Date().toISOString().slice(0, 10),
            actual_expense_date: "",
            deduction_amount: 0,
            transfer_fee: 0,
            card_approval_no: json.card_approval_no || "",
          });
          
          alert("✨ AI 영수증 자율 스캔 및 분석이 완료되었습니다! 검수 후 [지출 등록하기]를 눌러 장부에 적재하세요.");
        } else {
          alert("AI 영수증 분석 오류: " + json.error);
        }
      } catch (err) {
        alert("AI OCR 연동 중 네트워크 오류가 발생했습니다.");
      } finally {
        setIsAnalyzingReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetExpenseForm = () => {
    setNewExpense({
      title: "",
      category: "직원야근식대",
      amount: "",
      expense_date: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
      payment_method: "법인카드",
      memo: "",
      attachment_url: "",
      ai_analysis: "",
      payee: "",
      requisition_date: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
      actual_expense_date: "",
      deduction_amount: 0,
      transfer_fee: 0,
      card_approval_no: "",
    });
  };

  // 검색 및 필터링 적용 목록
  const filteredExpenses = expenses.filter(exp => {
    const matchesCategory = activeCategoryFilter === "ALL" || exp.category === activeCategoryFilter;
    
    // 기간 조회 필터 매칭
    const matchesStartDate = !startDate || exp.expense_date >= startDate;
    const matchesEndDate = !endDate || exp.expense_date <= endDate;
    
    const lowerQuery = searchQuery.toLowerCase().trim();
    
    // AI 분석 거래처명 추출
    let payeeText = "";
    try {
      if (exp.ai_analysis) {
        const parsed = JSON.parse(exp.ai_analysis);
        if (parsed.payee) {
          payeeText = parsed.payee.toLowerCase();
        }
      }
    } catch (e) {}

    const matchesSearch = 
      // 1. 적요 본문 및 @태그 매칭
      exp.title.toLowerCase().includes(lowerQuery) || 
      // 2. 등록된 지출 태그(memo) 매칭
      (exp.memo && exp.memo.toLowerCase().includes(lowerQuery)) ||
      // 3. AI 분석 거래처 매칭
      payeeText.includes(lowerQuery) ||
      // 4. 결제 수단(법인카드, 계좌이체 등) 매칭
      (exp.payment_method && exp.payment_method.toLowerCase().includes(lowerQuery)) ||
      // 5. 계정과목(소분류) 매칭
      (exp.category && exp.category.toLowerCase().includes(lowerQuery));
      
    return matchesCategory && matchesStartDate && matchesEndDate && matchesSearch;
  });

  // 장부 페이지네이션 연산
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  return {
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
    totalPages,
    startIndex,
    endIndex,
    paginatedExpenses,
    selectedIds,
    setSelectedIds,
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
    isLoadingCategories,
    isLoadingTags,
    fetchCategories,
    fetchTags,
    handleAddCategory,
    handleBulkAddCategories,
    handleDeleteCategory,
    handleAddTag,
    handleDeleteTag,
    autocompleteData,
    fetchAutocompleteData,
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
    handleApproveExpense
  };
}
