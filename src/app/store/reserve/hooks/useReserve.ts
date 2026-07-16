"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { ReserveForm, ServiceItem } from "../types";

export const SERVICES: ServiceItem[] = [
  { id: "basic", name: "기본 상담", desc: "1:1 맞춤형 기본 상담" },
  { id: "premium", name: "프리미엄 케어", desc: "최고급 재료를 사용한 프라이빗 케어" },
  { id: "styling", name: "스타일링/디자인", desc: "전문가의 손길로 완성되는 스타일" },
  { id: "studio", name: "스튜디오 촬영", desc: "인생샷을 남겨드리는 스튜디오 예약" },
];

export function useReserve() {
  const [form, setForm] = useState<ReserveForm>({
    customerName: '',
    customerPhone: '',
    serviceName: '', // 초기에는 빈 값으로 두고 로드 완료 시 첫 번째 값으로 세팅
    reservationDate: '',
    reservationTime: '10:00'
  });
  
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // 🏢 상품관리AI의 '예약용' 상품 실시간 동적 로드
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await apiFetch('/api/products?status=ACTIVE');
        const json = await res.json();
        if (json.success && json.products) {
          const matched = json.products
            .filter((p: any) => p.category === '예약용')
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              desc: p.description || '상세 설명이 없습니다.',
              price: p.price,
              main_image_url: p.main_image_url || null
            }));
          
          setServices(matched);
          if (matched.length > 0) {
            setForm(prev => ({ ...prev, serviceName: matched[0].name }));
          }
        }
      } catch (err) {
        console.error('Failed to load reservation services:', err);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let i = 10; i <= 20; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      if (i !== 20) slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const updateForm = (key: keyof ReserveForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.reservationDate || !form.reservationTime) {
      alert("모든 필수 항목을 입력해주세요.");
      return;
    }

    // 선택된 서비스 품목의 가격 추출
    const selectedService = services.find(s => s.name === form.serviceName);
    let amount = '';
    if (selectedService && selectedService.price && selectedService.price !== '상담후결정') {
      amount = selectedService.price.replace(/[^0-9]/g, '');
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        alert("예약 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setForm({
      customerName: '',
      customerPhone: '',
      serviceName: services.length > 0 ? services[0].name : '',
      reservationDate: '',
      reservationTime: '10:00'
    });
  };

  return {
    form,
    services,
    loading,
    isSubmitting,
    success,
    generateTimeSlots,
    updateForm,
    submitReservation,
    resetForm
  };
}
