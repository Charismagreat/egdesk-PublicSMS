"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { BookingProduct, BookingForm, AppliedCoupon } from "../types";

export function useBooking() {
  const [products, setProducts] = useState<BookingProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedService, setSelectedService] = useState<BookingProduct | null>(null);
  const [form, setForm] = useState<BookingForm>({
    customerName: '',
    customerPhone: '',
    reservationDate: '',
    reservationTime: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/api/products');
      const json = await res.json();
      if (json.success) {
        // Filter only '예약용' or '예약상품'
        const bookingProducts = (json.products || []).filter(
          (p: any) => p.category === '예약용' || p.category === '예약상품'
        );
        setProducts(bookingProducts);
      }
    } catch (e) {
      console.error("예약 상품 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (service: BookingProduct) => {
    setSelectedService(service);
    setForm({
      customerName: '',
      customerPhone: '',
      reservationDate: '',
      reservationTime: ''
    });
    setOrderSuccess(false);
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
  };

  const closeModal = () => {
    setSelectedService(null);
  };

  const getNumericPrice = (priceStr: string) => {
    if (!priceStr) return 0;
    const num = Number(priceStr.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.reservationDate || !form.reservationTime) {
      alert("모든 정보를 입력해주세요.");
      return;
    }
    if (!selectedService) return;

    setIsSubmitting(true);
    
    let finalServiceName = selectedService.name;
    if (appliedCoupon) {
      finalServiceName += ` [쿠폰사용: ${appliedCoupon.code} (-${appliedCoupon.discountAmount.toLocaleString()}원)]`;
    }

    const unitPrice = getNumericPrice(selectedService.price || '0');
    const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    const finalAmount = Math.max(0, unitPrice - discount);
    
    try {
      const res = await apiFetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          serviceName: finalServiceName,
          reservationDate: form.reservationDate,
          reservationTime: form.reservationTime,
          status: '예약접수',
          amount: finalAmount
        })
      });
      const json = await res.json();
      if (json.success) {
        setOrderSuccess(true);
      } else {
        alert("예약 접수 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode || !selectedService) return;
    setCouponError('');
    const unitPrice = getNumericPrice(selectedService.price || '');
    if (unitPrice === 0) {
      setCouponError('금액이 정해지지 않은 예약에는 쿠폰을 쓸 수 없습니다.');
      return;
    }
    
    const cartItems = [
      {
        product_id: selectedService.id,
        category: selectedService.category || '',
        menu_category: selectedService.menu_category || '',
        quantity: 1,
        unit_price: unitPrice
      }
    ];

    try {
      const res = await apiFetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderAmount: unitPrice, cart_items: cartItems })
      });
      const json = await res.json();
      
      if (json.success) {
        setAppliedCoupon(json.coupon);
      } else {
        setAppliedCoupon(null);
        setCouponError(json.error);
      }
    } catch (e) {
      setCouponError('쿠폰 조회 중 오류가 발생했습니다.');
    }
  };

  const filteredProducts = products.filter((p: BookingProduct) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return {
    products,
    searchTerm, setSearchTerm,
    loading,
    selectedService, setSelectedService,
    form, setForm,
    isSubmitting,
    orderSuccess,
    couponCode, setCouponCode,
    appliedCoupon, setAppliedCoupon,
    couponError,
    openModal,
    closeModal,
    submitReservation,
    getNumericPrice,
    handleApplyCoupon,
    filteredProducts
  };
}
