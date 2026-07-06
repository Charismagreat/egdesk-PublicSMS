"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { PaymentItem, PaymentForm } from "../types";
import { usePersistedState } from "@/hooks/usePersistedState";

export function usePayments() {
  const [activeOrderId, setActiveOrderId, isActiveOrderIdRestored] = usePersistedState<string | null>('egdesk_payments_activeOrderId', null);
  const [data, setData] = useState<PaymentItem[]>([]);
  const [form, setForm, isFormRestored] = usePersistedState<PaymentForm>('egdesk_payments_form', {
    customerName: '',
    amount: '',
    paymentMethod: '카드결제',
    orderId: ''
  });
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState("egdesk_payments_searchQuery", "");
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState("egdesk_payments_currentPage", 1);
  const [itemsPerPage, setItemsPerPage, isItemsPerPageRestored] = usePersistedState("egdesk_payments_itemsPerPage", 10);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveOrderIdRestored && isFormRestored && isSearchQueryRestored && isCurrentPageRestored && isItemsPerPageRestored;

  // 검색어 입력 시 페이지 번호 초기화 (단, 세션 복원이 모두 마쳐진 상태에서만 작동하도록 가드)
  useEffect(() => {
    if (isRestored) {
      setCurrentPage(1);
    }
  }, [searchQuery, isRestored]);

  useEffect(() => {
    if (isRestored) {
      fetchData();
    }
  }, [isRestored]);

  const fetchData = async () => {
    try {
      const res = await apiFetch('/api/payments');
      const json = await res.json();
      if (json.success) {
        setData(json.payments || []);
      }
    } catch (e) {
      console.error("결제 목록 조회 에러:", e);
    }
  };

  const updateForm = (key: keyof PaymentForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.amount) {
      alert('필수 입력 누락');
      return;
    }
    try {
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.success) {
        setForm({
          customerName: '',
          amount: '',
          paymentMethod: '카드결제',
          orderId: ''
        });
        fetchData();
      }
    } catch (error) {
      alert("등록 중 오류가 발생했습니다.");
    }
  };

  const deleteData = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await apiFetch(`/api/payments?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 실시간 필터링
  const filteredData = data.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      (t.customer_name && t.customer_name.toLowerCase().includes(query)) ||
      (t.payment_method && t.payment_method.toLowerCase().includes(query)) ||
      (t.order_id && t.order_id.toLowerCase().includes(query))
    );
  });

  // 페이지네이션 슬라이싱 로직
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    activeOrderId,
    setActiveOrderId,
    data,
    form,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    updateForm,
    addData,
    deleteData
  };
}
