"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo } from "react";
import { Transaction } from "../types";
import { usePersistedState } from "@/hooks/usePersistedState";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeOrderId, setActiveOrderId, isActiveOrderIdRestored] = usePersistedState<string | null>("egdesk_transactions_activeOrderId", null);
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState("egdesk_transactions_searchQuery", "");
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState("egdesk_transactions_currentPage", 1);
  const [itemsPerPage, setItemsPerPage, isItemsPerPageRestored] = usePersistedState("egdesk_transactions_itemsPerPage", 10);

  // 신규 등록용 폼 상태
  const [newName, setNewName, isNewNameRestored] = usePersistedState("egdesk_transactions_newName", "");
  const [newPhone, setNewPhone, isNewPhoneRestored] = usePersistedState("egdesk_transactions_newPhone", "");
  const [newProduct, setNewProduct, isNewProductRestored] = usePersistedState("egdesk_transactions_newProduct", "");
  const [newAmount, setNewAmount, isNewAmountRestored] = usePersistedState("egdesk_transactions_newAmount", "");
  const [isSending, setIsSending] = useState(false);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveOrderIdRestored && isSearchQueryRestored && isCurrentPageRestored && isItemsPerPageRestored && isNewNameRestored && isNewPhoneRestored && isNewProductRestored && isNewAmountRestored;

  // 검색어 입력 시 페이지 번호 초기화 (단, 세션 복원이 모두 마쳐진 상태에서만 작동하도록 가드)
  useEffect(() => {
    if (isRestored) {
      setCurrentPage(1);
    }
  }, [searchQuery, isRestored]);

  useEffect(() => {
    if (isRestored) {
      fetchTransactions();
    }
  }, [isRestored]);

  const fetchTransactions = async () => {
    try {
      const res = await apiFetch("/api/transactions");
      const json = await res.json();
      if (json.success) {
        setTransactions(json.transactions || []);
      }
    } catch (e) {
      console.error("거래 내역 조회 에러:", e);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const query = searchQuery.toLowerCase();
      return (
        (t.customerName && t.customerName.toLowerCase().includes(query)) ||
        (t.customerPhone && t.customerPhone.toLowerCase().includes(query)) ||
        (t.productName && t.productName.toLowerCase().includes(query))
      );
    });
  }, [transactions, searchQuery]);

  // 페이지네이션 슬라이싱 로직
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTransactions.length / itemsPerPage);
  }, [filteredTransactions.length, itemsPerPage]);

  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage;
  }, [currentPage, itemsPerPage]);

  const endIndex = useMemo(() => {
    return startIndex + itemsPerPage;
  }, [startIndex, itemsPerPage]);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, startIndex, endIndex]);

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newProduct) {
      alert("이름, 연락처, 상품명은 필수입니다.");
      return;
    }
    
    try {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newName,
          customerPhone: newPhone,
          productName: newProduct,
          amount: newAmount,
          orderDate: new Date().toISOString().split("T")[0],
          status: "결제완료"
        })
      });
      const json = await res.json();
      if (json.success) {
        setNewName("");
        setNewPhone("");
        setNewProduct("");
        setNewAmount("");
        fetchTransactions();
      } else {
        alert("등록 실패: " + json.error);
      }
    } catch (e) {
      alert("등록 중 오류가 발생했습니다.");
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (e) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const sendOrderSms = async () => {
    if (selectedIds.size === 0) {
      alert("발송할 거래내역을 선택해주세요.");
      return;
    }

    const selectedTransactions = transactions.filter(t => selectedIds.has(t.id));
    setIsSending(true);

    for (let i = 0; i < selectedTransactions.length; i++) {
      const t = selectedTransactions[i];
      // 거래내역 자체를 기준으로 감사 문자 템플릿 발송
      const message = `[EGDesk] ${t.customerName}님, 주문하신 [${t.productName}]의 결제가 완료되었습니다. 감사합니다!`;
      
      try {
        await apiFetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: t.customerPhone,
            message: message,
            customerId: null
          })
        });
      } catch (e) {
        console.error("발송 실패", t.customerName);
      }

      if (i < selectedTransactions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setIsSending(false);
    alert("선택된 고객에게 주문 감사 문자가 발송되었습니다.");
  };

  return {
    transactions,
    selectedIds,
    activeOrderId,
    setActiveOrderId,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    newName,
    setNewName,
    newPhone,
    setNewPhone,
    newProduct,
    setNewProduct,
    newAmount,
    setNewAmount,
    isSending,
    filteredTransactions,
    totalPages,
    startIndex,
    endIndex,
    paginatedTransactions,
    addTransaction,
    deleteTransaction,
    toggleSelectAll,
    toggleSelect,
    sendOrderSms
  };
}
