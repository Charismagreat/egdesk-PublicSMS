"use client";

import React, { useState, useEffect } from "react";
import { X, ShoppingBag, Store, Package, MapPin, Truck, Coins, Trash2, Check, ChevronRight } from "lucide-react";
import { StoreProduct, OrderForm, AppliedCoupon } from "../types";
import { apiFetch } from "@/lib/api";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { product: StoreProduct; quantity: number }[];
  updateCartQuantity: (productId: string, newQty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  submitCartOrder: (
    e: React.FormEvent,
    cartForm: OrderForm,
    cartAppliedPoints: number,
    cartPointCustomerId: number | null,
    cartAppliedCoupon: AppliedCoupon | null
  ) => Promise<void>;
  getNumericPrice: (priceStr: string) => number;
  pointEarningRate: number;
}

export function CartModal({
  isOpen,
  onClose,
  cart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  submitCartOrder,
  getNumericPrice,
  pointEarningRate
}: CartModalProps) {
  const [form, setForm] = useState<OrderForm>({
    customerName: "",
    customerPhone: "",
    quantity: 1,
    deliveryMethod: "배송",
    shippingAddress: "",
    customerMemo: ""
  });

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 💳 계좌 정보 동적 로딩 상태
  const [bankInfo, setBankInfo] = useState({
    bankName: "국민은행",
    accountNumber: "123456-12-123456",
    accountHolder: "주식회사 이지데스크"
  });

  // 🪙 포인트 및 쿠폰 관련 상태
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [pointCustomerId, setPointCustomerId] = useState<number | null>(null);
  const [usePointsInput, setUsePointsInput] = useState("");
  const [appliedPoints, setAppliedPoints] = useState<number>(0);
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [pointError, setPointError] = useState("");
  const [pointInfo, setPointInfo] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState("");

  // 계좌 정보 비동기 로드
  useEffect(() => {
    if (!isOpen) return;
    async function loadBankInfo() {
      try {
        const res = await fetch("/api/settings?key=my_company_profile");
        const data = await res.json();
        if (data.success && data.value) {
          const parsed = JSON.parse(data.value);
          setBankInfo({
            bankName: parsed.bankName || "국민은행",
            accountNumber: parsed.accountNumber || "123456-12-123456",
            accountHolder: parsed.accountHolder || "주식회사 이지데스크"
          });
        }
      } catch (err) {
        console.warn("계좌 정보 로드 실패 (기본 폴백 적용):", err);
      }
    }
    loadBankInfo();
  }, [isOpen]);

  if (!isOpen) return null;

  // 장바구니 실물 가격 총합 계산
  const totalOriginalPrice = cart.reduce((sum, item) => {
    const p = getNumericPrice(item.product.price);
    return sum + (p * item.quantity);
  }, 0);

  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalPrice = Math.max(0, totalOriginalPrice - couponDiscount - appliedPoints);

  // 포인트 조회 핸들러
  const handleLookupPoints = async () => {
    if (!form.customerPhone) {
      setPointError("휴대폰 번호를 먼저 입력해주세요.");
      return;
    }
    setPointError("");
    setPointInfo("");
    setAppliedPoints(0);
    setIsOtpVerified(false);
    setIsOtpSent(false);

    try {
      const res = await apiFetch(`/api/points?phone=${encodeURIComponent(form.customerPhone)}`);
      const json = await res.json();
      if (json.success) {
        setPointBalance(json.balance);
        setPointCustomerId(json.customerId);
        setPointInfo(`조회 성공: 현재 보유 포인트 ${json.balance.toLocaleString()}p`);
      } else {
        // 단골 정보 자동 등록 가드
        const registerRes = await apiFetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.customerName || "장바구니고객",
            phone: form.customerPhone,
            tags: "스토어적립,장바구니"
          })
        });
        const registerJson = await registerRes.json();
        if (registerJson.success) {
          setPointBalance(0);
          setPointCustomerId(registerJson.id);
          setPointInfo("단골 등록 완료! 웰컴 0p 적립되었습니다.");
        } else {
          setPointError("적립 회원 조회 중 오류가 발생했습니다.");
        }
      }
    } catch (e) {
      setPointError("서버 연결 중 오류가 발생했습니다.");
    }
  };

  // 포인트 사용 인증 발송
  const handleRequestOtp = async () => {
    if (!form.customerPhone || !usePointsInput) return;
    setPointError("");
    setPointInfo("");
    
    const pointsToUse = Number(usePointsInput);
    if (isNaN(pointsToUse) || pointsToUse <= 0) {
      setPointError("올바른 포인트를 입력하세요.");
      return;
    }

    if (pointBalance === null || pointsToUse > pointBalance) {
      setPointError(`잔액이 부족합니다. (보유: ${pointBalance || 0}p)`);
      return;
    }

    if (pointsToUse < 1000) {
      setPointError("적립금은 최소 1,000p 이상부터 사용 가능합니다.");
      return;
    }

    setIsOtpSending(true);
    try {
      const res = await apiFetch("/api/points/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: form.customerPhone })
      });
      const json = await res.json();
      if (json.success) {
        setIsOtpSent(true);
        setPointInfo("인증번호(4자리)가 SMS로 정상 발송되었습니다.");
      } else {
        setPointError(json.error);
      }
    } catch (e) {
      setPointError("OTP 전송 중 오류가 발생했습니다.");
    } finally {
      setIsOtpSending(false);
    }
  };

  // OTP 인증 코드 승인
  const handleVerifyOtp = async () => {
    if (!form.customerPhone || !otpCode) return;
    setPointError("");
    setPointInfo("");

    setIsOtpVerifying(true);
    try {
      const res = await apiFetch("/api/points/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: form.customerPhone, code: otpCode })
      });
      const json = await res.json();
      if (json.success) {
        setIsOtpVerified(true);
        setAppliedPoints(Number(usePointsInput));
        setPointInfo(`인증 완료! -${Number(usePointsInput).toLocaleString()}원 할인이 적용됩니다.`);
      } else {
        setPointError(json.error);
      }
    } catch (e) {
      setPointError("OTP 검증 중 오류가 발생했습니다.");
    } finally {
      setIsOtpVerifying(false);
    }
  };

  // 할인 쿠폰 검증
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError("");
    
    if (totalOriginalPrice === 0) {
      setCouponError("가격이 정해지지 않은 상품에는 쿠폰을 쓸 수 없습니다.");
      return;
    }
    
    const cartItems = cart.map(item => ({
      product_id: item.product.id,
      category: item.product.category || "",
      menu_category: item.product.menu_category || "",
      quantity: item.quantity,
      unit_price: getNumericPrice(item.product.price)
    }));
    
    try {
      const res = await apiFetch("/api/coupons/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, orderAmount: totalOriginalPrice, cart_items: cartItems })
      });
      const json = await res.json();
      
      if (json.success) {
        setAppliedCoupon(json.coupon);
      } else {
        setAppliedCoupon(null);
        setCouponError(json.error);
      }
    } catch(e) {
      setCouponError("쿠폰 조회 중 오류가 발생했습니다.");
    }
  };

  // 통합 주문 전송 랩퍼
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(usePointsInput) > 0 && !isOtpVerified) {
      alert("포인트 결제 할인을 적용하기 위해 SMS OTP 인증을 완료해 주세요.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitCartOrder(e, form, appliedPoints, pointCustomerId, appliedCoupon);
      setOrderSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setOrderSuccess(false);
    setPointBalance(null);
    setAppliedPoints(0);
    setUsePointsInput("");
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setAppliedCoupon(null);
    setCouponCode("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleModalClose}></div>
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5.5 h-5.5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">장바구니 상품 주문</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.length}개 상품
            </span>
          </div>
          <button 
            onClick={handleModalClose} 
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body - 2 Columns on Desktop */}
        <div className="flex flex-col md:flex-row overflow-y-auto md:overflow-hidden flex-1">
          
          {/* Left Column: Cart List */}
          <div className="md:w-1/2 p-6 md:p-8 md:overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
            {orderSuccess ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">통합 주문 완료!</h3>
                <p className="text-slate-500 mb-6 text-sm">전체 상품의 주문이 접수되었습니다. 계좌 정보 확인 후 입금 부탁드립니다.</p>
                
                {/* 💳 동적 입금 안내 계좌 표출 */}
                <div className="bg-slate-50 rounded-2xl p-5 text-left w-full mb-6 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-2">무통장 입금 안내 (송금 결제)</h4>
                  <p className="text-xs text-slate-500 mb-3">아래 계좌로 총 입금액을 송금해 주시면 입금 확인 즉시 발송됩니다.</p>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="font-mono text-sm font-bold text-slate-800">
                      {bankInfo.bankName} {bankInfo.accountNumber}
                      <span className="block text-xs text-slate-500 mt-1">예금주: {bankInfo.accountHolder}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleModalClose} 
                  className="bg-slate-900 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-slate-800 transition-colors w-full border-none cursor-pointer"
                >
                  스토어로 돌아가기
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                <ShoppingBag className="w-16 h-16 text-slate-300 mb-4 animate-bounce" />
                <h4 className="text-slate-800 font-bold text-lg mb-1">장바구니가 비어 있습니다</h4>
                <p className="text-slate-500 text-sm mb-6">스토어에서 원하시는 상품을 골라 장바구니에 담아주세요.</p>
                <button onClick={onClose} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all border-none cursor-pointer">
                  상품 둘러보기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  🛒 담은 상품 목록
                </span>
                {cart.map((item) => {
                  const unitPrice = getNumericPrice(item.product.price);
                  return (
                    <div key={item.product.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        {item.product.main_image_url ? (
                          <img src={item.product.main_image_url} alt={item.product.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-inner" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-snug">{item.product.name}</h4>
                          <span className="text-xs text-blue-600 font-black mt-1 block">
                            {unitPrice > 0 ? `${unitPrice.toLocaleString()}원` : "가격 문의"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* 수량 조절 버튼 */}
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 h-8">
                          <button 
                            type="button" 
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold border-none cursor-pointer h-full"
                          >
                            -
                          </button>
                          <span className="px-3 font-bold text-xs text-slate-800 text-center select-none">
                            {item.quantity}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold border-none cursor-pointer h-full"
                          >
                            +
                          </button>
                        </div>

                        {/* 삭제 버튼 */}
                        <button 
                          type="button" 
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors border-none cursor-pointer"
                          title="품목 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-4 flex justify-between items-center text-xs text-slate-500 px-1">
                  <span>* 수량을 조절하거나 개별 삭제가 가능합니다.</span>
                  <button onClick={clearCart} className="text-slate-450 hover:text-red-500 hover:underline border-none bg-transparent cursor-pointer font-bold">
                    장바구니 비우기
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Info Form */}
          <div className="md:w-1/2 p-6 md:p-8 md:overflow-y-auto">
            {!orderSuccess && cart.length > 0 && (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  📝 배송 및 주문자 정보 입력
                </span>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">주문자 이름 *</label>
                  <input 
                    type="text" 
                    required 
                    value={form.customerName}
                    onChange={(e) => setForm({...form, customerName: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-semibold text-xs text-slate-800 placeholder:text-slate-400"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">연락처 *</label>
                  <input 
                    type="tel" 
                    required 
                    value={form.customerPhone}
                    onChange={(e) => setForm({...form, customerPhone: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-semibold text-xs text-slate-800 placeholder:text-slate-400"
                    placeholder="010-1234-5678"
                  />
                </div>
                
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">수령 방식</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {(() => {
                      const renderMethod = (methodName: string, Icon: any) => {
                        const isSelected = form.deliveryMethod === methodName;
                        return (
                          <label 
                            key={methodName} 
                            className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                              isSelected 
                                ? "border-blue-500 bg-blue-50 text-blue-700 cursor-pointer shadow-sm" 
                                : "border-slate-200 hover:border-blue-300 cursor-pointer bg-white"
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="deliveryMethod" 
                              value={methodName} 
                              checked={isSelected} 
                              onChange={(e) => setForm({...form, deliveryMethod: e.target.value})} 
                              className="sr-only" 
                            />
                            <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? "text-blue-500" : "text-slate-400"}`} />
                            <span className="font-bold text-xs">{methodName}</span>
                          </label>
                        );
                      };
                      return (
                        <>
                          {renderMethod("매장에서", Store)}
                          {renderMethod("가져가기", Package)}
                          {renderMethod("배달", MapPin)}
                          {renderMethod("배송", Truck)}
                        </>
                      );
                    })()}
                  </div>

                  {["배달", "배송"].includes(form.deliveryMethod) && (
                    <div className="animate-scale-up">
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        배송지 주소 *
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={form.shippingAddress}
                        onChange={(e) => setForm({...form, shippingAddress: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-semibold text-xs text-slate-800 placeholder:text-slate-400"
                        placeholder="배송받으실 주소를 상세히 입력해주세요"
                      />
                    </div>
                  )}
                </div>

                {/* Point discount Section */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center">
                    <Coins className="w-3.5 h-3.5 mr-1 text-blue-600 animate-spin" />
                    단골 적립금 포인트 할인 적용
                  </label>
                  
                  {pointBalance === null ? (
                    <button 
                      type="button" 
                      onClick={handleLookupPoints} 
                      disabled={!form.customerPhone}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer font-semibold"
                    >
                      위 휴대폰 번호로 단골 적립금 조회하기
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {!isOtpVerified ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              value={usePointsInput}
                              onChange={e => setUsePointsInput(e.target.value)}
                              placeholder={`사용할 포인트 (보유: ${pointBalance.toLocaleString()}p)`}
                              disabled={isOtpSent}
                              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold disabled:bg-slate-50 bg-white"
                            />
                            {!isOtpSent ? (
                              <button 
                                type="button" 
                                onClick={handleRequestOtp} 
                                disabled={isOtpSending}
                                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 border-none cursor-pointer"
                              >
                                {isOtpSending ? "발송 중.." : "인증번호 발송"}
                              </button>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => { setIsOtpSent(false); setOtpCode(""); }}
                                className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-250 border-none cursor-pointer"
                              >
                                재입력
                              </button>
                            )}
                          </div>

                          {isOtpSent && (
                            <div className="flex gap-2 animate-scale-up">
                              <input 
                                type="text" 
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value)}
                                placeholder="문자 4자리 입력" 
                                className="flex-1 border-2 border-orange-400 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 font-mono text-center text-xs font-black bg-white"
                              />
                              <button 
                                type="button" 
                                onClick={handleVerifyOtp} 
                                disabled={isOtpVerifying}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:opacity-95 border-none cursor-pointer"
                              >
                                {isOtpVerifying ? "확인 중.." : "인증 승인"}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-xs">
                          <div>
                            <span className="font-bold text-indigo-700 block">적립금 포인트 할인 적용 완료</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-indigo-700">-{appliedPoints.toLocaleString()}원</span>
                            <button 
                              type="button" 
                              onClick={() => { 
                                setAppliedPoints(0); 
                                setUsePointsInput(""); 
                                setIsOtpVerified(false); 
                                setIsOtpSent(false); 
                                setOtpCode(""); 
                              }} 
                              className="text-indigo-600 hover:bg-indigo-100 p-1 rounded-lg border-none bg-transparent cursor-pointer"
                            >
                              <X className="w-4 h-4"/>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold px-1">
                        <span>* 1,000p 이상부터 사용 가능</span>
                        <button 
                          type="button" 
                          onClick={() => { 
                            setPointBalance(null); 
                            setUsePointsInput("");
                            setAppliedPoints(0);
                            setIsOtpSent(false);
                            setIsOtpVerified(false);
                            setOtpCode("");
                            setPointError("");
                            setPointInfo("");
                          }}
                          className="text-slate-450 hover:underline border-none bg-transparent cursor-pointer"
                        >
                          조회 취소
                        </button>
                      </div>
                    </div>
                  )}
                  {pointError && <p className="text-red-500 text-xs mt-2 font-bold px-1">{pointError}</p>}
                  {pointInfo && <p className="text-indigo-600 text-xs mt-2 font-bold px-1">{pointInfo}</p>}
                </div>

                {/* Coupon Section */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-2">할인 쿠폰</label>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        placeholder="쿠폰 코드를 입력하세요" 
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono bg-white text-slate-800 text-xs font-semibold"
                      />
                      <button 
                        type="button" 
                        onClick={handleApplyCoupon} 
                        className="px-6 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 whitespace-nowrap border-none cursor-pointer"
                      >
                        적용
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 p-4 rounded-xl">
                      <div>
                        <span className="font-bold text-green-700 block text-xs">{appliedCoupon.name}</span>
                        <span className="text-xs text-green-605 font-mono mt-1 block">{appliedCoupon.code}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-green-700 text-xs">-{appliedCoupon.discountAmount.toLocaleString()}원</span>
                        <button 
                          type="button" 
                          onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} 
                          className="text-green-600 hover:bg-green-100 p-2 rounded-lg border-none bg-transparent cursor-pointer"
                        >
                          <X className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  )}
                  {couponError && <p className="text-red-500 text-xs mt-2 font-bold">{couponError}</p>}
                </div>

                {/* Totals & Submit */}
                <div className="pt-6 mt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-slate-550 font-bold text-sm">총 결제예정금액</span>
                  <div className="text-right">
                    {(appliedCoupon || appliedPoints > 0) && (
                      <div className="text-slate-400 line-through text-xs mb-1">
                        {totalOriginalPrice.toLocaleString()}원
                      </div>
                    )}
                    <span className="text-2xl font-black text-slate-900">
                      {finalPrice.toLocaleString()}원
                    </span>
                    
                    {/* 예상 적립금 뱃지 */}
                    {(() => {
                      const expectedPointsStore = Math.floor(finalPrice * (pointEarningRate / 100));
                      if (expectedPointsStore <= 0) return null;
                      return (
                        <div className="flex justify-end mt-1">
                          <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Coins className="w-2.5 h-2.5 text-slate-900 shrink-0 animate-spin" />
                            +{expectedPointsStore.toLocaleString()}p 적립 예정
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full py-4 font-bold text-lg text-white transition-all duration-300 flex justify-center items-center rounded-xl shadow-lg border border-transparent cursor-pointer ${
                    isSubmitting 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/50 active:scale-[0.98]"
                  }`}
                >
                  {isSubmitting ? "처리 중..." : "주문 접수하기"}
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              </form>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
