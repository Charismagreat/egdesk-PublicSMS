"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Coupon, CouponForm, CouponRestriction, IssueType } from "../types";

export function useCoupons() {
  const [data, setData] = useState<Coupon[]>([]);
  const [issueType, setIssueType] = useState<IssueType>('single');
  const [form, setForm] = useState<CouponForm>({ 
    code: '', 
    prefix: '',
    count: '100',
    name: '', 
    discount_type: 'amount', 
    discount_value: '', 
    min_order_amount: '',
    expires_at: ''
  });
  const [loading, setLoading] = useState(false);
  const [restrictions, setRestrictions] = useState<CouponRestriction[]>([]);
  const [currentRestriction, setCurrentRestriction] = useState<CouponRestriction>({
    restriction_type: 'EXCLUDE',
    target_type: 'PRODUCT',
    target_value: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 검색어 입력 시 페이지 번호 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiFetch('/api/coupons');
      const json = await res.json();
      if (json.success) {
        setData(json.coupons || []);
      }
    } catch (e) {
      console.error("쿠폰 데이터 로드 오류:", e);
    }
  };

  const addRestriction = () => {
    if (!currentRestriction.target_value.trim()) {
      return alert('제한 대상 식별 값을 입력해 주세요. (예: 상품 ID 또는 카테고리명)');
    }
    
    const isDup = restrictions.some(
      r => r.restriction_type === currentRestriction.restriction_type &&
           r.target_type === currentRestriction.target_type &&
           r.target_value.trim().toUpperCase() === currentRestriction.target_value.trim().toUpperCase()
    );
    if (isDup) return alert('이미 추가된 제한 조건입니다.');
    
    setRestrictions([...restrictions, { 
      restriction_type: currentRestriction.restriction_type,
      target_type: currentRestriction.target_type,
      target_value: currentRestriction.target_value.trim()
    }]);
    setCurrentRestriction({ ...currentRestriction, target_value: '' });
  };

  const removeRestriction = (index: number) => {
    setRestrictions(restrictions.filter((_, i) => i !== index));
  };

  const addData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issueType === 'single' && !form.code) {
      return alert('쿠폰 코드를 입력해주세요.');
    }
    if (issueType === 'bulk' && (!form.count || Number(form.count) < 2)) {
      return alert('발행할 수량을 2개 이상 입력해주세요.');
    }
    if (!form.name || !form.discount_value) {
      return alert('쿠폰명과 할인값은 필수입니다.');
    }
    
    setLoading(true);
    const payload = {
      ...form,
      count: issueType === 'bulk' ? Number(form.count) : 1,
      restrictions
    };

    try {
      const res = await apiFetch('/api/coupons', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      });
      
      const json = await res.json();
      if (json.success) { 
        setForm({ ...form, code: '', prefix: '', expires_at: '' }); 
        setRestrictions([]);
        fetchData(); 
        if (issueType === 'bulk') {
          alert(`${json.count}개의 쿠폰이 성공적으로 발행되었습니다!`);
        } else {
          alert("쿠폰이 발행되었습니다!");
        }
      } else {
        alert("등록 실패: " + json.error);
      }
    } catch (err) {
      alert("네트워크 통신 중 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async (id: string) => {
    if(!confirm('정말 삭제하시겠습니까? (이미 발행된 쿠폰이 비활성화됩니다)')) return;
    try {
      const res = await apiFetch('/api/coupons?id=' + id, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchData();
    } catch (e) {
      console.error("쿠폰 삭제 오류:", e);
    }
  };

  const formatDiscount = (type: string, value: number) => {
    return type === 'percent' ? `${value}% 할인` : `${value.toLocaleString()}원 할인`;
  };

  const filteredData = data.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      (t.code && t.code.toLowerCase().includes(query)) ||
      (t.name && t.name.toLowerCase().includes(query))
    );
  });

  // 페이지네이션 슬라이싱 로직
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    data,
    issueType, setIssueType,
    form, setForm,
    loading,
    restrictions,
    currentRestriction, setCurrentRestriction,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    fetchData,
    addRestriction,
    removeRestriction,
    addData,
    deleteData,
    formatDiscount,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData
  };
}
