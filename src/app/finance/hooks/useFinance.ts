"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";

import {
  getFormattedDate,
  getStartDateForBank,
  getStartDateForHometax,
  getCategoryHierarchy,
  downloadPreviewExcel,
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
  category: string;     // 소분류 계정과목
  tags: string[];       // 쉼표로 쪼갠 태그 목록
  percentage: number;   // 확률 %
  count: number;        // 빈도수
}

export function useFinance() {
  // 메인 탭 상태: accounts (은행 계좌 & 거래), cards (신용카드), hometax (국세청 자료), sync (동기화 역사), matching (수금/지급 대조 AI)
  const [activeTab, setActiveTab, isTabRestored] = usePersistedState<"accounts" | "cards" | "hometax" | "sync" | "matching">("finance_activeTab", "accounts");
  
  // 엑셀 수동 업로드 모달 관련 상태
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // 홈택스 엑셀 수동 업로드 모달 관련 상태
  const [isHometaxModalOpen, setIsHometaxModalOpen] = useState(false);

  // 카드 엑셀 수동 업로드 모달 관련 상태
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // 최고관리자 권한 및 신용카드 거래내역 인라인 편집 상태 선언
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
  
  // [경합/충돌 예방] 자연어 규칙 영향 건 실시간 미리보기 및 로딩 상태 변수
  const [previewList, setPreviewList] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // 국세청 서브 탭: invoice (세금계산서), exempt (계산서/면세), cash (현금영수증)
  const [hometaxSubTab, setHometaxSubTab] = usePersistedState<"invoice" | "exempt" | "cash">("finance_hometaxSubTab", "invoice");

  // 데이터 로딩 상태들
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 로드된 실제 데이터들
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<any>({ totalBalance: 0, activeAccounts: 0 });
  
  // 통계 요약 데이터 추가 (금월, 전월, 전전월 및 금년 누적 통계)
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
  
  // 수금/지급 대조 AI 관련 상태 추가
  const [matchingList, setMatchingList] = useState<any[]>([]);
  const [matchingStatus, setMatchingStatus] = usePersistedState<"all" | "matched" | "unmatched">("finance_matchingStatus", "all");

  // 페이징 & 필터 상태
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = usePersistedState("finance_currentPage", 1);
  const [pageSize, setPageSize] = usePersistedState("finance_pageSize", 10);
  const [searchText, setSearchText] = usePersistedState("finance_searchText", "");
  const [invoiceType, setInvoiceType] = usePersistedState<"all" | "sales" | "purchase">("finance_invoiceType", "all");
  const [selectedCardCompanyId, setSelectedCardCompanyId] = usePersistedState<string>("finance_selectedCardCompanyId", "all");
  const [selectedCardNumber, setSelectedCardNumber] = usePersistedState<string>("finance_selectedCardNumber", "all");
  const [selectedCashPurpose, setSelectedCashPurpose] = usePersistedState<string>("finance_selectedCashPurpose", "all");
  const [selectedBankId, setSelectedBankId] = usePersistedState<string>("finance_selectedBankId", "all");
  const [selectedAccountId, setSelectedAccountId] = usePersistedState<string>("finance_selectedAccountId", "all");

  // 카드 영수증 연동 및 뷰어 관련 상태
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptSelectedTxId, setReceiptSelectedTxId] = useState<string>("");
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  const [startDate, setStartDate] = usePersistedState("finance_startDate", getStartDateForBank());
  const [endDate, setEndDate] = usePersistedState("finance_endDate", getFormattedDate(new Date()));

  // 사용자가 수동으로 선택한 날짜 기록이 있는지 추적
  const [isDateManuallySet, setIsDateManuallySet] = usePersistedState("finance_isDateManuallySet", false);

  // 선택된 기간 단축 배지 종류 저장용 상태 (7 | 30 | 90 | year | default | custom)
  const [selectedPeriod, setSelectedPeriod] = usePersistedState<string>("finance_selectedPeriod", "default");

  // 탭 전환 시 기획된 기본 조회 기간 스위칭 정책 적용
  useEffect(() => {
    if (!isTabRestored) return;

    if (!isDateManuallySet) {
      if (activeTab === "hometax") {
        setStartDate(getStartDateForHometax());
      } else {
        setStartDate(getStartDateForBank());
      }
      setEndDate(getFormattedDate(new Date()));
    }
  }, [activeTab, isDateManuallySet, isTabRestored]);

  // 페이지 및 검색 텍스트 초기화 방지용 디바운싱 효과
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, hometaxSubTab, searchText, invoiceType, startDate, endDate, pageSize, selectedCardCompanyId, selectedCardNumber, selectedCashPurpose, selectedBankId, selectedAccountId, matchingStatus]);

  // 자연어 규칙 목록 조회 API 연동
  const fetchRulesList = useCallback(async () => {
    try {
      const res = await apiFetch("/api/finance/rules");
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

  // 통합 데이터 패치를 담당하는 헬퍼 함수
  const fetchFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsRes, summaryRes] = await Promise.all([
        apiFetch("/api/finance?tab=accounts").then((res) => res.json()),
        apiFetch("/api/finance?tab=summary").then((res) => res.json())
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
        const txRes = await apiFetch(`/api/finance?tab=transactions${dateParams}${searchParam}${bankParams}${paginationParams}`).then((res) => res.json());
        if (txRes.success) {
          setTransactionList(txRes.data.list || []);
          setTotalCount(txRes.data.total || 0);
        }
      } else if (activeTab === "cards") {
        const cardRes = await apiFetch(`/api/finance?tab=cards${dateParams}${searchParam}${cardParams}${paginationParams}`).then((res) => res.json());
        if (cardRes.success) {
          setCardTxList(cardRes.data.list || []);
          setTotalCount(cardRes.data.total || 0);
        }
      } else if (activeTab === "hometax") {
        if (hometaxSubTab === "invoice") {
          const invRes = await apiFetch(`/api/finance?tab=hometax-invoice${dateParams}${searchParam}${invTypeParam}${paginationParams}`).then((res) => res.json());
          if (invRes.success) {
            setTaxInvoiceList(invRes.data.list || []);
            setTotalCount(invRes.data.total || 0);
          }
        } else if (hometaxSubTab === "exempt") {
          const exemptRes = await apiFetch(`/api/finance?tab=hometax-exempt${dateParams}${searchParam}${invTypeParam}${paginationParams}`).then((res) => res.json());
          if (exemptRes.success) {
            setTaxExemptList(exemptRes.data.list || []);
            setTotalCount(exemptRes.data.total || 0);
          }
        } else if (hometaxSubTab === "cash") {
          const cashRes = await apiFetch(`/api/finance?tab=hometax-cash${dateParams}${searchParam}${cashParams}${paginationParams}`).then((res) => res.json());
          if (cashRes.success) {
            setCashReceiptList(cashRes.data.list || []);
            setTotalCount(cashRes.data.total || 0);
          }
        }
      } else if (activeTab === "sync") {
        const syncRes = await apiFetch("/api/finance?tab=sync").then((res) => res.json());
        if (syncRes.success) {
          setSyncHistory(syncRes.data.syncHistory || []);
          setHometaxSync(syncRes.data.hometaxSync || []);
          setHometaxConnections(syncRes.data.hometaxConnections || []);
        }
      } else if (activeTab === "matching") {
        const matchingRes = await apiFetch(`/api/finance?tab=matching${dateParams}${searchParam}&status=${matchingStatus}${invTypeParam}${paginationParams}`).then((res) => res.json());
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
  }, [activeTab, hometaxSubTab, currentPage, pageSize, startDate, endDate, searchText, invoiceType, selectedCardCompanyId, selectedCardNumber, selectedCashPurpose, selectedBankId, selectedAccountId, matchingStatus]);

  // 자연어 규칙 등록 API 연동
  const handleAddRule = async (text: string, force: boolean = false) => {
    if (!text || !text.trim()) return;
    setIsAddingRule(true);
    try {
      const res = await apiFetch("/api/finance/rules", {
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

  // 자연어 규칙 영향 건 실시간 미리보기 API 연동
  const handlePreviewRule = async (text: string) => {
    if (!text || !text.trim()) return;
    setIsPreviewLoading(true);
    setPreviewList([]);
    try {
      const res = await apiFetch("/api/finance/rules", {
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

  // 자연어 규칙 활성화 여부 토글 API 연동
  const handleToggleRule = async (id: string, isActive: boolean) => {
    try {
      const res = await apiFetch("/api/finance/rules", {
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

  // 자연어 규칙 삭제 API 연동
  const handleDeleteRule = async (id: string) => {
    if (!confirm("이 자연어 규칙을 삭제하시겠습니까? 관련하여 자동 정산된 미확정 내역들도 초기화됩니다.")) return;
    try {
      const res = await apiFetch(`/api/finance/rules?id=${id}`, {
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

  // 실시간 동기화 강제 새로고침 시 트리거
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFinanceData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  // 지출 계정과목(대/중/소 체계) 실시간 로드
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

  // 태그 프리셋 실시간 로드
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

  // 태그 토글(인라인 조합) 헬퍼 핸들러
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

  // 최고관리자(SUPER_ADMIN) 또는 대표자(PRESIDENT) 권한이 있는지 확인하는 헬퍼 변수
  const hasAdminAccess = useMemo(() => {
    if (!userRole) return false;
    const role = userRole.toUpperCase();
    return role === "SUPER_ADMIN" || role === "PRESIDENT";
  }, [userRole]);

  // 최고관리자 권한 조회
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

  // 가맹점명 + 태그(비고)의 다차원 결합 확률 사전 실시간 빌드
  const jointProbabilityMap = useMemo(() => {
    const map: Record<string, Record<string, { count: number; category: string; tags: string[] }>> = {};
    
    // 확정된 카드 거래 내역 필터링
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

  // 실시간 동적 베이지안 확률 추론 엔진 (하이브리드 교차 추천 알고리즘)
  const getDynamicRecommendations = useCallback((merchantName: string, currentMemo: string): RecommendedOption[] => {
    const merchant = merchantName?.replace(/[\r\n\t]/g, "").trim() || "";
    if (!merchant) return [];
    
    const currentTags = currentMemo.split(",").map(t => t.trim()).filter(Boolean);
    const lowerMerchant = merchant.toLowerCase();
    
    const candidates: { category: string; tags: string[]; baseWeight: number; isFallback: boolean }[] = [];
    
    // (A) 과거 학습 이력 패턴 추가
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
    
    // (B) NLP 맥락 기반 정적 룰 폴백 패턴 추가
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
    
    // 동적 베이지안 확률 연산 기동
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

  // 신용카드 거래 내역(계정과목, 비고) 수정 핸들러
  const handleUpdateCardTransaction = async (txId: string, updates: { category?: string; memo?: string }) => {
    setIsUpdatingCardTx(true);
    try {
      const res = await apiFetch("/api/finance/card-transaction", {
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

  // 은행 거래 내역(계정과목, 비고) 수정 핸들러
  const handleUpdateBankTransaction = async (txId: string, updates: { category?: string; memo?: string }) => {
    setIsUpdatingBankTx(true);
    try {
      const res = await apiFetch("/api/finance/bank-transaction", {
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

  // 국세청 거래 내역(비고/태그) 수정 핸들러
  const handleUpdateHometaxTransaction = async (txId: string, type: "invoice" | "exempt" | "cash", updates: { memo?: string }) => {
    setIsUpdatingHometaxTx(true);
    try {
      const res = await apiFetch("/api/finance/hometax-transaction", {
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

  // 비고란의 태그가 '#거래처접대'인 경우 계정과목 자동 적용 리액티브 트리거
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

  // 빠른 기간 설정 헬퍼
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

  // 총 페이지 계산
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // 통계 계산 가상 연산
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
  
  // 당월 카드 총액 합산
  const totalCardAmount = useMemo(() => {
    return cardTxList
      .filter(tx => tx.status !== "취소")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [cardTxList]);

  // 카드사별 요약 정보 그룹화
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
