import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Customer, CustomerHistory, PointHistoryItem, NewCustomerInput } from "../types";
import { usePersistedState } from "@/hooks/usePersistedState";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState('egdesk_customers_searchQuery', '');
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState('egdesk_customers_currentPage', 1);
  const [itemsPerPage, setItemsPerPage, isItemsPerPageRestored] = usePersistedState('egdesk_customers_itemsPerPage', 10);

  // History Modal states
  const [selectedCustomer, setSelectedCustomer, isSelectedCustomerRestored] = usePersistedState<Customer | null>('egdesk_customers_selectedCustomer', null);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab, isActiveHistoryTabRestored] = usePersistedState<'orders' | 'cancelled' | 'transactions' | 'deliveries' | 'points'>('egdesk_customers_activeHistoryTab', 'orders');
  const [showHistoryModal, setShowHistoryModal, isShowHistoryModalRestored] = usePersistedState('egdesk_customers_showHistoryModal', false);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isSearchQueryRestored && isCurrentPageRestored && isItemsPerPageRestored && isSelectedCustomerRestored && isActiveHistoryTabRestored && isShowHistoryModalRestored;

  // 검색어 입력 시 페이지 번호 초기화 (단, 세션 복원이 마쳐진 상태에서만 작동하도록 가드)
  useEffect(() => {
    if (isRestored) {
      setCurrentPage(1);
    }
  }, [searchQuery, isRestored]);

  // 포인트 시스템 전용 추가 상태
  const [pointBalance, setPointBalance] = useState<number>(0);
  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>([]);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerInput>({
    name: '',
    phone: '',
    tags: '',
    memo: '',
    address: '',
    shipping_address: '',
    recipient_name: '',
    recipient_phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/customers');
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data.rows || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isRestored) {
      fetchCustomers();
    }
  }, [isRestored]);

  const fetchCustomerHistory = async (customer: Customer) => {
    setIsLoadingHistory(true);
    try {
      // 1. 기존 거래 이력 조회
      const res = await apiFetch(`/api/customers/history?phone=${encodeURIComponent(customer.phone)}`);
      const json = await res.json();
      if (json.success) {
        setCustomerHistory(json.data);
      } else {
        alert("이력 조회 실패: " + json.error);
      }

      // 2. 포인트 잔액 및 이력 조회
      const pointRes = await apiFetch(`/api/points?customerId=${customer.id}`);
      const pointJson = await pointRes.json();
      if (pointJson.success) {
        setPointBalance(pointJson.balance);
        setPointHistory(pointJson.history || []);
      }
    } catch (e) {
      console.error("이력 조회 에러:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerHistory(null);
    setPointHistory([]);
    setPointBalance(0);
    setAdjustAmount('');
    setAdjustReason('');
    setActiveHistoryTab('orders');
    setShowHistoryModal(true);
    fetchCustomerHistory(customer);
  };

  // 점주 포인트 수동 증감 핸들러
  const handleAdjustPoints = async () => {
    if (!selectedCustomer) return;
    const amountNum = Number(adjustAmount);
    
    if (isNaN(amountNum) || amountNum === 0) {
      alert("올바른 조정 금액을 입력해 주세요. (지급은 양수, 차감은 음수 입력)");
      return;
    }
    
    if (!adjustReason.trim()) {
      alert("조정 사유를 입력해 주세요.");
      return;
    }
    
    setIsAdjusting(true);
    try {
      const res = await apiFetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: amountNum,
          reason: adjustReason.trim()
        })
      });
      const json = await res.json();
      if (json.success) {
        alert("포인트가 성공적으로 조정되었습니다.");
        setAdjustAmount('');
        setAdjustReason('');
        setPointBalance(json.newBalance);
        
        // 이력 재조회
        const pointRes = await apiFetch(`/api/points?customerId=${selectedCustomer.id}`);
        const pointJson = await pointRes.json();
        if (pointJson.success) {
          setPointHistory(pointJson.history || []);
        }
        
        // 전체 리스트 갱신
        fetchCustomers();
      } else {
        alert("포인트 조정 실패: " + json.error);
      }
    } catch (err) {
      alert("포인트 조정 요청 중 오류가 발생했습니다.");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("이름과 연락처는 필수 입력값입니다.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setNewCustomer({ name: '', phone: '', tags: '', memo: '', address: '', shipping_address: '', recipient_name: '', recipient_phone: '' });
        fetchCustomers();
      } else {
        alert("등록 실패: " + json.error);
      }
    } catch (e) {
      alert("요청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result;
        if (typeof text !== 'string') return;

        try {
          const res = await apiFetch('/api/customers/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csvText: text })
          });
          const json = await res.json();
          if (json.success) {
            alert(`CSV 업로드 완료: ${json.count}개의 새로운 연락처를 가져왔습니다.`);
            fetchCustomers();
          } else {
            alert("업로드 실패: " + json.error);
          }
        } catch (err) {
          alert("요청 중 오류가 발생했습니다.");
        } finally {
          setIsUploading(false);
          e.target.value = '';
        }
      };
      reader.readAsText(file, 'utf-8');
    } catch (e) {
      alert("파일 읽기 오류가 발생했습니다.");
      setIsUploading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      (c.tags && c.tags.toLowerCase().includes(query))
    );
  });

  // 페이지네이션 슬라이싱 로직
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  return {
    customers,
    isLoading,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    selectedCustomer,
    setSelectedCustomer,
    customerHistory,
    setCustomerHistory,
    isLoadingHistory,
    activeHistoryTab,
    setActiveHistoryTab,
    showHistoryModal,
    setShowHistoryModal,
    pointBalance,
    pointHistory,
    adjustAmount,
    setAdjustAmount,
    adjustReason,
    setAdjustReason,
    isAdjusting,
    showAddModal,
    setShowAddModal,
    newCustomer,
    setNewCustomer,
    isSubmitting,
    isUploading,
    handleRowClick,
    handleAdjustPoints,
    handleAddCustomer,
    handleCsvUpload,
    filteredCustomers,
    totalPages,
    startIndex,
    endIndex,
    paginatedCustomers,
  };
}
