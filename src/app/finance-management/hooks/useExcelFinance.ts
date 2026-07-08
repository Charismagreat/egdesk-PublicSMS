"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";

import {
  getFormattedDate,
  getStartDateForBank,
  getStartDateForHometax,
  getCategoryHierarchy,
} from "../utils";
import {
  Account,
  Transaction,
  CardTransaction,
  HometaxInvoice,
  HometaxCash,
  DbExpenseCategory,
  DbExpenseTag,
  SyncLog,
} from "../types";

export interface RecommendedOption {
  category: string;     
  tags: string[];       
  percentage: number;   
  count: number;        
}

const bankNames: Record<string, string> = {
  "shinhan-card": "신한카드",
  "kb-card": "KB국민카드",
  "nh-card": "NH농협카드",
  "bc-card": "BC카드",
  "hana-card": "하나카드",
  "samsung-card": "삼성카드",
  "hyundai-card": "현대카드",
  "lotte-card": "롯데카드"
};

export function useExcelFinance() {
  const [activeTab, setActiveTab, isActiveTabRestored] = usePersistedState<"accounts" | "cards" | "hometax" | "sync" | "matching">("excel_finance_activeTab", "accounts");
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHometaxModalOpen, setIsHometaxModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [editingCardTxId, setEditingCardTxId] = useState<string | null>(null);
  const [editingBankTxId, setEditingBankTxId] = useState<string | null>(null);
  const [editingHometaxTxId, setEditingHometaxTxId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"category" | "memo" | null>(null);
  const [tempCategory, setTempCategory] = useState<string>("");
  const [tempMemo, setTempMemo] = useState<string>("");
  const [categorySearchTerm, setCategorySearchTerm] = useState<string>("");
  const [rulesList, setRulesList] = useState<any[]>([]);
  const [newRuleText, setNewRuleText] = useState<string>("");
  const [isAddingRule, setIsAddingRule] = useState<boolean>(false);
  const [isUpdatingCardTx, setIsUpdatingCardTx] = useState<boolean>(false);
  const [isUpdatingBankTx, setIsUpdatingBankTx] = useState<boolean>(false);
  const [isUpdatingHometaxTx, setIsUpdatingHometaxTx] = useState<boolean>(false);
  const [dbTags, setDbTags] = useState<DbExpenseTag[]>([]);
  
  const [previewList, setPreviewList] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const [hometaxSubTab, setHometaxSubTab, isHometaxSubTabRestored] = usePersistedState<"invoice" | "exempt" | "cash">("excel_finance_hometaxSubTab", "invoice");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<any>({ totalBalance: 0, activeAccounts: 0 });
  
  const [summaryData, setSummaryData] = useState<any>({
    months: ["", "", ""],
    cardSummary: [],
    hometaxSummary: {
      sales: { m0: 0, m1: 0, m2: 0, yTotal: 0 },
      purchase: { m0: 0, m1: 0, m2: 0, yTotal: 0 }
    }
  });

  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [cardTxList, setCardTxList] = useState<CardTransaction[]>([]);
  const [taxInvoiceList, setTaxInvoiceList] = useState<HometaxInvoice[]>([]);
  const [taxExemptList, setTaxExemptList] = useState<HometaxInvoice[]>([]);
  const [cashReceiptList, setCashReceiptList] = useState<HometaxCash[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [hometaxSync, setHometaxSync] = useState<any[]>([]);
  const [hometaxConnections, setHometaxConnections] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<DbExpenseCategory[]>([]);
  
  const [matchingList, setMatchingList] = useState<any[]>([]);
  const [matchingStatus, setMatchingStatus, isMatchingStatusRestored] = usePersistedState<"all" | "matched" | "unmatched">("excel_finance_matchingStatus", "all");

  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState("excel_finance_currentPage", 1);
  const [pageSize, setPageSize, isPageSizeRestored] = usePersistedState("excel_finance_pageSize", 10);
  const [searchText, setSearchText, isSearchTextRestored] = usePersistedState("excel_finance_searchText", "");
  const [invoiceType, setInvoiceType, isInvoiceTypeRestored] = usePersistedState<"all" | "sales" | "purchase">("excel_finance_invoiceType", "all");
  const [selectedCardCompanyId, setSelectedCardCompanyId, isCardCompanyRestored] = usePersistedState<string>("excel_finance_selectedCardCompanyId", "all");
  const [selectedCardNumber, setSelectedCardNumber, isCardNumberRestored] = usePersistedState<string>("excel_finance_selectedCardNumber", "all");
  const [selectedCashPurpose, setSelectedCashPurpose, isCashPurposeRestored] = usePersistedState<string>("excel_finance_selectedCashPurpose", "all");
  const [selectedBankId, setSelectedBankId, isBankIdRestored] = usePersistedState<string>("excel_finance_selectedBankId", "all");
  const [selectedAccountId, setSelectedAccountId, isAccountIdRestored] = usePersistedState<string>("excel_finance_selectedAccountId", "all");

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptSelectedTxId, setReceiptSelectedTxId] = useState<string>("");
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  const [startDate, setStartDate, isStartDateRestored] = usePersistedState("excel_finance_startDate", getStartDateForBank());
  const [endDate, setEndDate, isEndDateRestored] = usePersistedState("excel_finance_endDate", getFormattedDate(new Date()));
  const [isDateManuallySet, setIsDateManuallySet, isDateManuallySetRestored] = usePersistedState("excel_finance_isDateManuallySet", false);
  const [selectedPeriod, setSelectedPeriod, isSelectedPeriodRestored] = usePersistedState<string>("excel_finance_selectedPeriod", "default");

  // 🛡️ 브라우저 저장소 하이드레이션 복구 완료 확인 플래그 (이중 API 쿼리 가드)
  const isAllRestored = useMemo(() => {
    return isActiveTabRestored && 
      isHometaxSubTabRestored && 
      isCurrentPageRestored && 
      isPageSizeRestored && 
      isSearchTextRestored && 
      isInvoiceTypeRestored && 
      isCardCompanyRestored && 
      isCardNumberRestored && 
      isCashPurposeRestored && 
      isBankIdRestored && 
      isAccountIdRestored && 
      isMatchingStatusRestored && 
      isStartDateRestored && 
      isEndDateRestored && 
      isDateManuallySetRestored && 
      isSelectedPeriodRestored;
  }, [
    isActiveTabRestored, isHometaxSubTabRestored, isCurrentPageRestored, 
    isPageSizeRestored, isSearchTextRestored, isInvoiceTypeRestored, 
    isCardCompanyRestored, isCardNumberRestored, isCashPurposeRestored, 
    isBankIdRestored, isAccountIdRestored, isMatchingStatusRestored, 
    isStartDateRestored, isEndDateRestored, isDateManuallySetRestored, 
    isSelectedPeriodRestored
  ]);

  useEffect(() => {
    if (!isAllRestored) return;

    if (!isDateManuallySet) {
      if (activeTab === "hometax") {
        setStartDate(getStartDateForHometax());
      } else {
        setStartDate(getStartDateForBank());
      }
      setEndDate(getFormattedDate(new Date()));
    }
  }, [activeTab, isDateManuallySet, isAllRestored]);

  useEffect(() => {
    if (!isAllRestored) return;
    setCurrentPage(1);
  }, [activeTab, hometaxSubTab, searchText, invoiceType, startDate, endDate, pageSize, selectedCardCompanyId, selectedCardNumber, selectedCashPurpose, selectedBankId, selectedAccountId, matchingStatus, isAllRestored]);

  const fetchRulesList = useCallback(async () => {
    try {
      const res = await apiFetch("/api/finance-excel/rules");
      const data = await res.json();
      if (data.success) {
        setRulesList(data.rules || []);
      }
    } catch (e) {
      console.error("Rules fetch failed:", e);
    }
  }, []);

  useEffect(() => {
    fetchRulesList();
  }, [fetchRulesList]);

  const fetchFinanceData = useCallback(async () => {
    if (!isAllRestored) return; // 🛡️ 가드 기동: 하이드레이션 복원 대기

    setLoading(true);
    try {
      const [accountsRes, summaryRes] = await Promise.all([
        apiFetch("/api/finance-excel?tab=accounts").then((res) => res.json()),
        apiFetch("/api/finance-excel?tab=summary").then((res) => res.json())
      ]);

      if (accountsRes.success) {
        setAccounts(accountsRes.data.accounts || []);
        setStats(accountsRes.data.stats || { totalBalance: 0, activeAccounts: 0 });
      }
      if (summaryRes.success) {
        setSummaryData(summaryRes.data);
      }

      const offset = (currentPage - 1) * pageSize;
      const dateParams = `&startDate=${startDate}&endDate=${endDate}`;
      const searchParam = searchText ? `&searchText=${encodeURIComponent(searchText)}` : "";
      const invTypeParam = invoiceType !== "all" ? `&invoiceType=${invoiceType}` : "";
      const cardParams = `&cardCompanyId=${selectedCardCompanyId}&cardNumber=${selectedCardNumber}`;
      const bankParams = `&bankId=${selectedBankId}&accountId=${selectedAccountId}`;
      const cashParams = `&cashPurpose=${selectedCashPurpose}`;
      const paginationParams = `&limit=${pageSize}&offset=${offset}`;

      if (activeTab === "accounts") {
        const txRes = await apiFetch(`/api/finance-excel?tab=transactions${dateParams}${searchParam}${bankParams}${paginationParams}`).then((res) => res.json());
        if (txRes.success) {
          setTransactionList(txRes.data.list || []);
          setTotalCount(txRes.data.total || 0);
        }
      } else if (activeTab === "cards") {
        const cardRes = await apiFetch(`/api/finance-excel?tab=cards${dateParams}${searchParam}${cardParams}${paginationParams}`).then((res) => res.json());
        if (cardRes.success) {
          setCardTxList(cardRes.data.list || []);
          setTotalCount(cardRes.data.total || 0);
        }
      } else if (activeTab === "hometax") {
        if (hometaxSubTab === "invoice") {
          const invRes = await apiFetch(`/api/finance-excel?tab=hometax-invoice${dateParams}${searchParam}${invTypeParam}${paginationParams}`).then((res) => res.json());
          if (invRes.success) {
            setTaxInvoiceList(invRes.data.list || []);
            setTotalCount(invRes.data.total || 0);
          }
        } else if (hometaxSubTab === "exempt") {
          const exemptRes = await apiFetch(`/api/finance-excel?tab=hometax-exempt${dateParams}${searchParam}${invTypeParam}${paginationParams}`).then((res) => res.json());
          if (exemptRes.success) {
            setTaxExemptList(exemptRes.data.list || []);
            setTotalCount(exemptRes.data.total || 0);
          }
        } else if (hometaxSubTab === "cash") {
          const cashRes = await apiFetch(`/api/finance-excel?tab=hometax-cash${dateParams}${searchParam}${cashParams}${paginationParams}`).then((res) => res.json());
          if (cashRes.success) {
            setCashReceiptList(cashRes.data.list || []);
            setTotalCount(cashRes.data.total || 0);
          }
        }
      } else if (activeTab === "sync") {
        const syncRes = await apiFetch("/api/finance-excel?tab=sync").then((res) => res.json());
        if (syncRes.success) {
          setSyncHistory(syncRes.data.syncHistory || []);
          setHometaxSync(syncRes.data.hometaxSync || []);
          setHometaxConnections(syncRes.data.hometaxConnections || []);
        }
      } else if (activeTab === "matching") {
        const matchingRes = await apiFetch(`/api/finance-excel?tab=matching${dateParams}${searchParam}&status=${matchingStatus}${invTypeParam}${paginationParams}`).then((res) => res.json());
        if (matchingRes.success) {
          setMatchingList(matchingRes.data.list || []);
          setTotalCount(matchingRes.data.total || 0);
        }
      }
    } catch (e) {
      console.error("데이터 패칭 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, hometaxSubTab, currentPage, pageSize, startDate, endDate, searchText, invoiceType, selectedCardCompanyId, selectedCardNumber, selectedCashPurpose, selectedBankId, selectedAccountId, matchingStatus, isAllRestored]);

  const handleAddRule = async (text: string, force: boolean = false) => {
    if (!text || !text.trim()) return;
    setIsAddingRule(true);
    try {
      const res = await apiFetch("/api/finance-excel/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalText: text, force })
      });
      const data = await res.json();
      if (data.success) {
        if (data.conflict) {
          const confirmForce = confirm(data.error);
          if (confirmForce) {
            await handleAddRule(text, true);
          }
        } else {
          alert(data.message);
          setNewRuleText("");
          fetchRulesList();
          fetchFinanceData();
        }
      } else {
        alert(data.error || "규칙 등록에 실패했습니다.");
      }
    } catch (e: any) {
      alert("오류가 발생했습니다: " + e.message);
    } finally {
      setIsAddingRule(false);
    }
  };

  const handlePreviewRule = async (text: string) => {
    if (!text || !text.trim()) return;
    setIsPreviewLoading(true);
    setPreviewList([]);
    try {
      const res = await apiFetch("/api/finance-excel/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalText: text, previewOnly: true })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewList(data.previewList || []);
        setIsPreviewOpen(true);
      } else {
        alert(data.error || "영향을 받는 건 분석에 실패했습니다.");
      }
    } catch (e: any) {
      alert("오류가 발생했습니다: " + e.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleToggleRule = async (id: string, isActive: boolean) => {
    try {
      const res = await apiFetch("/api/finance-excel/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive })
      });
      const data = await res.json();
      if (data.success) {
        fetchRulesList();
        fetchFinanceData();
      } else {
        alert(data.error || "규칙 상태 변경 실패");
      }
    } catch (e: any) {
      alert("오류: " + e.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("이 자연어 규칙을 삭제하시겠습니까? 관련하여 자동 정산된 내역들도 초기화됩니다.")) return;
    try {
      const res = await apiFetch(`/api/finance-excel/rules?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        fetchRulesList();
        fetchFinanceData();
      } else {
        alert(data.error || "규칙 삭제 실패");
      }
    } catch (e: any) {
      alert("오류: " + e.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFinanceData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAllRestored) {
      fetchFinanceData();
    }
  }, [fetchFinanceData, isAllRestored]);

  useEffect(() => {
    apiFetch("/api/expenses/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDbCategories(json.categories || []);
        }
      })
      .catch((e) => console.error("계정과목 로드 에러:", e));
  }, []);

  useEffect(() => {
    apiFetch("/api/expenses/tags")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDbTags(json.tags || []);
        }
      })
      .catch((e) => console.error("태그 로드 에러:", e));
  }, []);

  const handleTagToggle = (tagName: string) => {
    const currentTags = tempMemo.split(",")
      .map(t => t.trim())
      .filter(Boolean);
    
    let nextTags: string[];
    if (currentTags.includes(tagName)) {
      nextTags = currentTags.filter(t => t !== tagName);
    } else {
      nextTags = [...currentTags, tagName];
    }
    
    setTempMemo(nextTags.join(", "));
  };

  const hasAdminAccess = useMemo(() => {
    if (!userRole) return false;
    const role = userRole.toUpperCase();
    return role === "SUPER_ADMIN" || role === "PRESIDENT";
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

  const jointProbabilityMap = useMemo(() => {
    const map: Record<string, Record<string, { count: number; category: string; tags: string[] }>> = {};
    const confirmedTxs = cardTxList.filter(tx => tx.category && tx.category.trim() !== "");
    
    confirmedTxs.forEach((tx) => {
      const merchant = tx.merchantName?.trim() || "";
      if (!merchant) return;
      
      const cat = tx.category!.trim();
      const rawMemo = tx.memo || "";
      const tags = rawMemo.split(",").map(t => t.trim()).filter(Boolean);
      const tagKey = [...tags].sort().join(",");
      
      if (!map[merchant]) {
        map[merchant] = {};
      }
      
      const patternKey = `${cat}|||${tagKey}`;
      if (!map[merchant][patternKey]) {
        map[merchant][patternKey] = {
          count: 0,
          category: cat,
          tags: tags
        };
      }
      map[merchant][patternKey].count += 1;
    });
    
    return map;
  }, [cardTxList]);

  const getDynamicRecommendations = useCallback((merchantName: string, currentMemo: string): RecommendedOption[] => {
    const merchant = merchantName?.replace(/[\r\n\t]/g, "").trim() || "";
    if (!merchant) return [];
    
    const currentTags = currentMemo.split(",").map(t => t.trim()).filter(Boolean);
    const lowerMerchant = merchant.toLowerCase();
    
    const candidates: { category: string; tags: string[]; baseWeight: number; isFallback: boolean }[] = [];
    
    const merchantPatterns = jointProbabilityMap[merchant];
    if (merchantPatterns && Object.keys(merchantPatterns).length > 0) {
      Object.values(merchantPatterns).forEach((p) => {
        candidates.push({
          category: p.category,
          tags: p.tags,
          baseWeight: p.count * 10,
          isFallback: false
        });
      });
    }
    
    const fallbacks: { category: string; tags: string[]; percentage: number }[] = [];
    if (["식당", "횟집", "고기", "푸드", "한식", "일식", "중식", "커피", "다과", "스타벅스", "카페", "투썸", "바다사남", "어시장"].some(k => lowerMerchant.includes(k))) {
      fallbacks.push({ category: "직원식대", tags: ["복지지원", "소액결제"], percentage: 80 });
      fallbacks.push({ category: "거래처식사비", tags: ["거래처접대"], percentage: 20 });
    } else if (["택시", "ktx", "철도", "항공", "주차", "톨게이트", "카카오t", "교통", "요금"].some(k => lowerMerchant.includes(k))) {
      fallbacks.push({ category: "시내교통비", tags: ["긴급비용", "복지지원"], percentage: 90 });
    } else if (["마트", "문구", "인쇄", "다이소", "알파문구"].some(k => lowerMerchant.includes(k))) {
      fallbacks.push({ category: "사무용품비", tags: ["비품구매", "소액결제"], percentage: 95 });
    } else if (["aws", "google cloud", "클라우드", "호스팅", "cafe24", "github", "hosting"].some(k => lowerMerchant.includes(k))) {
      fallbacks.push({ category: "전산소모품비", tags: ["인프라유지", "정기지출"], percentage: 100 });
    }
    
    if (candidates.length === 0 && fallbacks.length === 0) {
      fallbacks.push({
        category: "기타소분류",
        tags: ["소액결제"],
        percentage: 100
      });
    }
    
    fallbacks.forEach((f) => {
      if (!candidates.some(c => c.category === f.category)) {
        candidates.push({
          category: f.category,
          tags: f.tags,
          baseWeight: f.percentage,
          isFallback: true
        });
      }
    });
    
    const scoredCandidates = candidates.map((c) => {
      let finalWeight = c.baseWeight;
      if (currentTags.length > 0 && c.tags.length > 0) {
        const intersection = c.tags.filter(t => currentTags.includes(t));
        if (intersection.length > 0) {
          finalWeight += intersection.length * 1000;
        }
      }
      return {
        category: c.category,
        tags: c.tags,
        weight: finalWeight,
        isFallback: c.isFallback
      };
    });
    
    const totalWeight = scoredCandidates.reduce((sum, c) => sum + c.weight, 0);
    
    return scoredCandidates
      .map((c) => ({
        category: c.category,
        tags: c.tags,
        percentage: totalWeight > 0 ? Math.round((c.weight / totalWeight) * 100) : 0,
        count: c.isFallback ? 1 : Math.round(c.weight / 10)
      }))
      .sort((a, b) => b.percentage - a.percentage || b.count - a.count)
      .slice(0, 3);
  }, [jointProbabilityMap]);

  const handleUpdateCardTransaction = async (txId: string, updates: { category?: string; memo?: string }) => {
    setIsUpdatingCardTx(true);
    try {
      const res = await apiFetch("/api/finance-excel?tab=card-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txId, ...updates })
      });
      const data = await res.json();
      if (data.success) {
        setCardTxList((prev) =>
          prev.map((tx) => (tx.id === txId ? { ...tx, ...updates } : tx))
        );
        setEditingCardTxId(null);
        setEditingField(null);
      } else {
        alert(data.error || "수정에 실패했습니다.");
      }
    } catch (e: any) {
      console.error("Card transaction update failed", e);
      alert("오류가 발생했습니다: " + e.message);
    } finally {
      setIsUpdatingCardTx(false);
    }
  };

  const handleUpdateBankTransaction = async (txId: string, updates: { category?: string; memo?: string }) => {
    setIsUpdatingBankTx(true);
    try {
      const res = await apiFetch("/api/finance-excel?tab=bank-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txId, ...updates })
      });
      const data = await res.json();
      if (data.success) {
        setTransactionList((prev) =>
          prev.map((tx) => (tx.id === txId ? { ...tx, ...updates } : tx))
        );
        setEditingBankTxId(null);
        setEditingField(null);
      } else {
        alert(data.error || "수정에 실패했습니다.");
      }
    } catch (e: any) {
      console.error("Bank transaction update failed", e);
      alert("오류가 발생했습니다: " + e.message);
    } finally {
      setIsUpdatingBankTx(false);
    }
  };

  const handleUpdateHometaxTransaction = async (txId: string, type: "invoice" | "exempt" | "cash", updates: { memo?: string }) => {
    setIsUpdatingHometaxTx(true);
    try {
      const res = await apiFetch("/api/finance-excel?tab=hometax-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txId, type, ...updates })
      });
      const data = await res.json();
      if (data.success) {
        if (type === "invoice") {
          setTaxInvoiceList((prev) =>
            prev.map((tx) => (tx.id === txId ? { ...tx, ...updates } : tx))
          );
        } else if (type === "exempt") {
          setTaxExemptList((prev) =>
            prev.map((tx) => (tx.id === txId ? { ...tx, ...updates } : tx))
          );
        } else if (type === "cash") {
          setCashReceiptList((prev) =>
            prev.map((tx) => (tx.id === txId ? { ...tx, ...updates } : tx))
          );
        }
        setEditingHometaxTxId(null);
        setEditingField(null);
      } else {
        alert(data.error || "수정에 실패했습니다.");
      }
    } catch (e: any) {
      console.error("Hometax transaction update failed", e);
      alert("오류가 발생했습니다: " + e.message);
    } finally {
      setIsUpdatingHometaxTx(false);
    }
  };

  useEffect(() => {
    if (!editingCardTxId || editingField !== "memo") return;
    
    const tags = tempMemo.split(",")
      .map(t => t.trim())
      .filter(Boolean);
      
    if (tags.includes("거래처접대")) {
      const tx = cardTxList.find(t => t.id === editingCardTxId);
      if (tx) {
        const isMemoChanged = (tx.memo || "") !== tempMemo;
        if (!isMemoChanged) return;

        const recs = getDynamicRecommendations(tx.merchantName, tempMemo);
        if (recs && recs.length > 0) {
          const bestRec = recs[0];
          if (!isUpdatingCardTx) {
            handleUpdateCardTransaction(tx.id, {
              category: bestRec.category,
              memo: tempMemo
            });
          }
        }
      }
    }
  }, [tempMemo, editingCardTxId, editingField, cardTxList, getDynamicRecommendations, isUpdatingCardTx]);

  const handleQuickPeriod = (days: number | "year") => {
    setIsDateManuallySet(true);
    setSelectedPeriod(String(days));
    const end = new Date();
    const start = new Date();
    if (days === "year") {
      start.setMonth(0);
      start.setDate(1);
    } else {
      start.setDate(end.getDate() - days);
    }
    setStartDate(getFormattedDate(start));
    setEndDate(getFormattedDate(end));
  };

  const handleResetPeriod = () => {
    setIsDateManuallySet(false);
    setSelectedPeriod("default");
    if (activeTab === "hometax") {
      setStartDate(getStartDateForHometax());
    } else {
      setStartDate(getStartDateForBank());
    }
    setEndDate(getFormattedDate(new Date()));
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const hometaxStats = useMemo(() => {
    const invoiceTotal = taxInvoiceList.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const exemptTotal = taxExemptList.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const cashTotal = cashReceiptList.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const salesTotal = 
      taxInvoiceList.filter(i => i.invoiceType === "sales" || i.invoiceType === "매출").reduce((acc, curr) => acc + curr.totalAmount, 0) +
      taxExemptList.filter(i => i.invoiceType === "sales" || i.invoiceType === "매출").reduce((acc, curr) => acc + curr.totalAmount, 0) +
      cashTotal;

    const purchaseTotal =
      taxInvoiceList.filter(i => i.invoiceType === "purchase" || i.invoiceType === "매입").reduce((acc, curr) => acc + curr.totalAmount, 0) +
      taxExemptList.filter(i => i.invoiceType === "purchase" || i.invoiceType === "매입").reduce((acc, curr) => acc + curr.totalAmount, 0);

    return { invoiceTotal, exemptTotal, cashTotal, salesTotal, purchaseTotal };
  }, [taxInvoiceList, taxExemptList, cashReceiptList]);
  
  const totalCardAmount = useMemo(() => {
    return cardTxList
      .filter(tx => tx.status !== "취소")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [cardTxList]);

  const groupedCards = useMemo(() => {
    return (summaryData.cardSummary || []).reduce((acc: any[], curr: any) => {
      const existing = acc.find(item => item.cardCompanyName === curr.cardCompanyName);
      if (existing) {
        existing.m0 += curr.m0 || 0;
        existing.m1 += curr.m1 || 0;
        existing.m2 += curr.m2 || 0;
        existing.yTotal += curr.yTotal || 0;
        existing.cardCount += 1;
        
        const existingDateTime = existing.lastTxDate ? `${existing.lastTxDate} ${existing.lastTxTime}` : "";
        const currDateTime = curr.lastTxDate ? `${curr.lastTxDate} ${curr.lastTxTime}` : "";
        if (currDateTime > existingDateTime) {
          existing.lastTxDate = curr.lastTxDate;
          existing.lastTxTime = curr.lastTxTime;
        }
      } else {
        acc.push({
          cardCompanyName: curr.cardCompanyName,
          cardCount: 1,
          m0: curr.m0 || 0,
          m1: curr.m1 || 0,
          m2: curr.m2 || 0,
          yTotal: curr.yTotal || 0,
          lastTxDate: curr.lastTxDate || "",
          lastTxTime: curr.lastTxTime || ""
        });
      }
      return acc;
    }, []);
  }, [summaryData.cardSummary]);

  return {
    activeTab,
    setActiveTab,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isHometaxModalOpen,
    setIsHometaxModalOpen,
    isCardModalOpen,
    setIsCardModalOpen,
    userRole,
    setUserRole,
    editingCardTxId,
    setEditingCardTxId,
    editingBankTxId,
    setEditingBankTxId,
    editingHometaxTxId,
    setEditingHometaxTxId,
    editingField,
    setEditingField,
    tempCategory,
    setTempCategory,
    tempMemo,
    setTempMemo,
    categorySearchTerm,
    setCategorySearchTerm,
    rulesList,
    setRulesList,
    newRuleText,
    setNewRuleText,
    isAddingRule,
    setIsAddingRule,
    isUpdatingCardTx,
    setIsUpdatingCardTx,
    isUpdatingBankTx,
    setIsUpdatingBankTx,
    isUpdatingHometaxTx,
    setIsUpdatingHometaxTx,
    dbTags,
    setDbTags,
    previewList,
    setPreviewList,
    isPreviewLoading,
    setIsPreviewLoading,
    isPreviewOpen,
    setIsPreviewOpen,
    hometaxSubTab,
    setHometaxSubTab,
    loading,
    setLoading,
    refreshing,
    setRefreshing,
    accounts,
    setAccounts,
    stats,
    setStats,
    summaryData,
    setSummaryData,
    transactionList,
    setTransactionList,
    cardTxList,
    setCardTxList,
    taxInvoiceList,
    setTaxInvoiceList,
    taxExemptList,
    setTaxExemptList,
    cashReceiptList,
    setCashReceiptList,
    syncHistory,
    setSyncHistory,
    hometaxSync,
    setHometaxSync,
    hometaxConnections,
    setHometaxConnections,
    dbCategories,
    setDbCategories,
    matchingList,
    setMatchingList,
    matchingStatus,
    setMatchingStatus,
    totalCount,
    setTotalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchText,
    setSearchText,
    invoiceType,
    setInvoiceType,
    selectedCardCompanyId,
    setSelectedCardCompanyId,
    selectedCardNumber,
    setSelectedCardNumber,
    selectedCashPurpose,
    setSelectedCashPurpose,
    selectedBankId,
    setSelectedBankId,
    selectedAccountId,
    setSelectedAccountId,
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    receiptSelectedTxId,
    setReceiptSelectedTxId,
    viewingReceiptUrl,
    setViewingReceiptUrl,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isDateManuallySet,
    setIsDateManuallySet,
    selectedPeriod,
    setSelectedPeriod,
    
    // 파생 연산 데이터
    hasAdminAccess,
    totalPages,
    hometaxStats,
    totalCardAmount,
    groupedCards,

    // 동작 함수
    fetchRulesList,
    handleAddRule,
    handlePreviewRule,
    handleToggleRule,
    handleDeleteRule,
    fetchFinanceData,
    handleRefresh,
    handleTagToggle,
    handleUpdateCardTransaction,
    handleUpdateBankTransaction,
    handleUpdateHometaxTransaction,
    getDynamicRecommendations,
    handleQuickPeriod,
    handleResetPeriod,
  };
}
