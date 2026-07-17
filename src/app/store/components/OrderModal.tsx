import React from "react";
import { X, ShoppingBag, Store, Package, MapPin, Truck, Coins, UploadCloud, Loader2 } from "lucide-react";
import { StoreProduct, OrderForm, AppliedCoupon } from "../types";
import { apiFetch } from "@/lib/api";

interface OrderModalProps {
  selectedProduct: StoreProduct | null;
  closeModal: () => void;
  form: OrderForm;
  setForm: React.Dispatch<React.SetStateAction<OrderForm>>;
  isSubmitting: boolean;
  orderSuccess: boolean;
  couponCode: string;
  setCouponCode: (val: string) => void;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (val: AppliedCoupon | null) => void;
  couponError: string;
  pointBalance: number | null;
  setPointBalance: (val: number | null) => void;
  usePointsInput: string;
  setUsePointsInput: (val: string) => void;
  appliedPoints: number;
  setAppliedPoints: (val: number) => void;
  otpCode: string;
  setOtpCode: (val: string) => void;
  isOtpSent: boolean;
  setIsOtpSent: (val: boolean) => void;
  isOtpVerified: boolean;
  setIsOtpVerified: (val: boolean) => void;
  pointError: string;
  setPointError: (val: string) => void;
  pointInfo: string;
  setPointInfo: (val: string) => void;
  isOtpSending: boolean;
  isOtpVerifying: boolean;
  setShowPointGuide: (val: boolean) => void;
  pointEarningRate: number;
  handleLookupPoints: () => Promise<void>;
  handleRequestOtp: () => Promise<void>;
  handleVerifyOtp: () => Promise<void>;
  handleApplyCoupon: () => Promise<void>;
  submitOrder: (e: React.FormEvent) => Promise<void>;
  getNumericPrice: (priceStr: string) => number;
  onAddToCart: (product: StoreProduct, qty: number) => void;
  isNewPartnerOrder?: boolean;
  successOrderId?: string | null;
  attachmentFilename?: string;
  isOcrLoading?: boolean;
  ocrParsedTotalAmount?: number | null;
  ocrParsedTotalQty?: number | null;
  handleOcrUpload?: (file: File) => Promise<void>;
}

export function OrderModal({
  selectedProduct,
  onAddToCart,
  closeModal,
  form,
  setForm,
  isSubmitting,
  orderSuccess,
  couponCode,
  setCouponCode,
  appliedCoupon,
  setAppliedCoupon,
  couponError,
  pointBalance,
  setPointBalance,
  usePointsInput,
  setUsePointsInput,
  appliedPoints,
  setAppliedPoints,
  otpCode,
  setOtpCode,
  isOtpSent,
  setIsOtpSent,
  isOtpVerified,
  setIsOtpVerified,
  pointError,
  setPointError,
  pointInfo,
  setPointInfo,
  isOtpSending,
  isOtpVerifying,
  setShowPointGuide,
  pointEarningRate,
  handleLookupPoints,
  handleRequestOtp,
  handleVerifyOtp,
  handleApplyCoupon,
  submitOrder,
  getNumericPrice,
  isNewPartnerOrder = false,
  successOrderId = null,
  attachmentFilename = '',
  isOcrLoading = false,
  ocrParsedTotalAmount = null,
  ocrParsedTotalQty = null,
  handleOcrUpload
}: OrderModalProps) {
  const [bankInfo, setBankInfo] = React.useState({
    bankName: "국민은행",
    accountNumber: "123456-12-123456",
    accountHolder: "주식회사 이지데스크"
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const currentTotal = getNumericPrice(selectedProduct.price) * form.quantity;
    if (ocrParsedTotalAmount !== null && ocrParsedTotalAmount !== currentTotal) {
      if (!window.confirm(`⚠️ 경고: 업로드하신 실물 발주서 총액(${ocrParsedTotalAmount.toLocaleString()}원)과 현재 계산된 스토어 주문 총액(${currentTotal.toLocaleString()}원)이 일치하지 않습니다. 그래도 주문을 진행하시겠습니까?`)) {
        return;
      }
    }
    await submitOrder(e);
  };

  React.useEffect(() => {
    async function loadBankInfo() {
      try {
        const res = await apiFetch('/api/settings?key=my_company_profile');
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
        console.warn('계좌 정보 로드 실패 (기본 폴백 적용):', err);
      }
    }
    loadBankInfo();
  }, []);

  // 🏢 사업자등록번호 감지 후 기존 B2B 거래처 정보 자동 입력 (Autofill)
  React.useEffect(() => {
    if (!form.isTaxRequested) return;
    const cleanNumber = (form.businessNumber || '').replace(/[^0-9]/g, '');
    if (cleanNumber.length === 10) {
      async function autoFillBusiness() {
        try {
          const res = await fetch(`/api/partners?action=check-biz&business_number=${cleanNumber}`);
          const data = await res.json();
          if (data.success && data.exists && data.partner) {
            const p = data.partner;
            setForm(prev => ({
              ...prev,
              companyName: p.company_name || prev.companyName,
              representativeName: p.representative || p.manager_name || prev.representativeName,
              taxEmail: p.email || p.manager_email || prev.taxEmail
            }));
          }
        } catch (err) {
          console.warn('기존 B2B 거래처 실시간 조회 실패:', err);
        }
      }
      autoFillBusiness();
    }
  }, [form.businessNumber, form.isTaxRequested, setForm]);

  if (!selectedProduct) return null;

  const unitPrice = getNumericPrice(selectedProduct.price);
  const isTbd = selectedProduct.price === '상담후결정';
  const originalPrice = unitPrice * form.quantity;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount - appliedPoints);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">상품 상세 및 주문하기</h3>
          <button 
            onClick={closeModal} 
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Modal Body - 2 Columns on Desktop */}
        <div className="flex flex-col md:flex-row overflow-y-auto md:overflow-hidden flex-1">
          {/* Left Column: Product Info & Detail Image */}
          <div className="md:w-1/2 p-6 md:p-8 md:overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
            <div className="w-full bg-white rounded-2xl shadow-sm overflow-hidden mb-6 border border-slate-100">
              {selectedProduct.detail_image_url ? (
                <img src={selectedProduct.detail_image_url} alt={selectedProduct.name} className="w-full object-cover" />
              ) : selectedProduct.main_image_url ? (
                <img src={selectedProduct.main_image_url} alt={selectedProduct.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-slate-200 bg-slate-50">
                  <ShoppingBag className="w-16 h-16" />
                </div>
              )}
            </div>
            <h4 className="font-extrabold text-slate-800 text-2xl md:text-3xl mb-3">{selectedProduct.name}</h4>
            <p className="text-blue-600 font-black text-2xl mb-6">
              {selectedProduct.price === '상담후결정' ? '상담 후 결정' : (unitPrice > 0 ? `${unitPrice.toLocaleString()}원` : '가격 문의')}
            </p>
            <div className="text-slate-600 leading-relaxed whitespace-pre-line bg-white p-6 rounded-2xl border border-slate-100">
              {selectedProduct.description || '상세 설명이 등록되지 않았습니다.'}
            </div>
          </div>

          {/* Right Column: Order Form */}
          <div className="md:w-1/2 p-6 md:p-8 md:overflow-y-auto">
            {orderSuccess ? (
              isNewPartnerOrder ? (
                <div className="text-center py-12 flex flex-col items-center justify-center h-full animate-scale-up">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-3xs border border-blue-200">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">첫 주문을 남겨주셔서 깊이 감사드립니다!</h3>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed max-w-md mx-auto">
                    보내주신 발주서 파일과 주문 상세 내역을 AI가 성공적으로 접수했습니다.<br/>
                    담당자 검토 후 거래처 승인 및 주문 확정 안내 문자가 영업일 내 즉시 발송됩니다.
                  </p>
                  
                  
                  {successOrderId && (
                    <button 
                      type="button"
                      onClick={() => window.open(`/store/print-order?id=${successOrderId}`, '_blank', 'width=800,height=900')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md active:scale-95 border-none cursor-pointer w-full max-w-xs flex items-center justify-center gap-2 mb-3"
                    >
                      🖨️ 주문 확인증 출력
                    </button>
                  )}

                  <button 
                    onClick={closeModal} 
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3.5 px-8 rounded-xl transition-all shadow-sm active:scale-95 border-none cursor-pointer w-full max-w-xs"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">주문이 완료되었습니다!</h3>
                  <p className="text-slate-500 mb-6">주문 내역과 결제 안내 문자가 곧 발송됩니다.</p>
                  
                  <div className="bg-slate-50 rounded-2xl p-5 text-left w-full mb-6 border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-2">무통장 입금 안내 (송금 결제)</h4>
                    <p className="text-xs text-slate-500 mb-3">현재 결제는 계좌 송금 방식으로만 진행됩니다. 아래 계좌로 입금해 주세요.</p>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="font-mono text-sm font-bold text-slate-800">
                        {bankInfo.bankName} {bankInfo.accountNumber}
                        <span className="block text-xs text-slate-500 mt-1">예금주: {bankInfo.accountHolder}</span>
                      </div>
                    </div>
                  </div>

                  {successOrderId && (
                    <button 
                      type="button"
                      onClick={() => window.open(`/store/print-order?id=${successOrderId}`, '_blank', 'width=800,height=900')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md active:scale-95 border-none cursor-pointer w-full max-w-xs flex items-center justify-center gap-2 mb-3"
                    >
                      🖨️ 주문 확인증 출력
                    </button>
                  )}

                  <button 
                    onClick={closeModal} 
                    className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-colors w-full border-none cursor-pointer max-w-xs"
                  >
                    확인
                  </button>
                </div>
              )
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">주문자 이름 *</label>
                  <input 
                    type="text" 
                    required 
                    value={form.customerName}
                    onChange={(e) => setForm({...form, customerName: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-semibold text-xs text-slate-800"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">연락처 *</label>
                  <input 
                    type="tel" 
                    required 
                    value={form.customerPhone}
                    onChange={(e) => setForm({...form, customerPhone: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-semibold text-xs text-slate-800"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">수량</label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden w-32 bg-white">
                    <button 
                      type="button" 
                      onClick={() => setForm({...form, quantity: Math.max(1, form.quantity - 1)})} 
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border-none cursor-pointer"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      min="1" 
                      value={form.quantity}
                      onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 1})}
                      className="w-full text-center py-3 outline-none appearance-none border-none bg-white font-bold"
                    />
                    <button 
                      type="button" 
                      onClick={() => setForm({...form, quantity: form.quantity + 1})} 
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-3">수령 방식</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {(() => {
                      let allowed = ['매장에서', '가져가기', '배달', '배송'];
                      if (selectedProduct.available_methods) {
                        allowed = selectedProduct.available_methods.split(',');
                      }
                      const renderMethod = (methodName: string, Icon: any) => {
                        const isAllowed = allowed.includes(methodName);
                        const isSelected = form.deliveryMethod === methodName;
                        return (
                          <label 
                            key={methodName} 
                            className={`flex flex-col items-center justify-center p-3 sm:p-4 border rounded-xl transition-all ${
                              !isAllowed 
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100' 
                                : isSelected 
                                ? 'border-blue-500 bg-blue-50 text-blue-700 cursor-pointer shadow-sm' 
                                : 'border-slate-200 hover:border-blue-300 cursor-pointer bg-white'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="deliveryMethod" 
                              value={methodName} 
                              disabled={!isAllowed} 
                              checked={isSelected} 
                              onChange={(e) => setForm({...form, deliveryMethod: e.target.value})} 
                              className="sr-only" 
                            />
                            <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                            <span className="font-bold text-sm">{methodName}</span>
                          </label>
                        );
                      };
                      return (
                        <>
                          {renderMethod('매장에서', Store)}
                          {renderMethod('가져가기', Package)}
                          {renderMethod('배달', MapPin)}
                          {renderMethod('배송', Truck)}
                        </>
                      );
                    })()}
                  </div>

                  {['배달', '배송'].includes(form.deliveryMethod) && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center">
                        <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                        배송지 주소 *
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={form.shippingAddress}
                        onChange={(e) => setForm({...form, shippingAddress: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white font-semibold text-xs text-slate-800"
                        placeholder="주소를 상세히 입력해주세요"
                      />
                    </div>
                  )}
                </div>

                {/* 🏢 사업자 증빙 (세금계산서 신청) */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={form.isTaxRequested || false} 
                      onChange={(e) => setForm({...form, isTaxRequested: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-bold text-slate-700">사업자 증빙 (세금계산서 신청)</span>
                  </label>
                  
                  {form.isTaxRequested && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 animate-scale-up">
                      {/* 📂 AI OCR 발주서 업로드 안내 라벨 */}
                      {attachmentFilename && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100/50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          </div>
                          <div className="text-left overflow-hidden">
                            <span className="text-[10px] font-black text-blue-600 block">AI 판독 발주서 문서가 연결되었습니다</span>
                            <span className="text-[10px] text-slate-500 font-extrabold truncate max-w-[200px] block">{attachmentFilename}</span>
                          </div>
                        </div>
                      )}

                      {/* ⚖️ OCR 실물 수치 대조 및 이중 가드 시각화 */}
                      {ocrParsedTotalAmount !== null && (
                        <div className="bg-white p-3 rounded-xl border border-slate-150 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-500">실물 발주서 총액:</span>
                            <span className="font-mono text-slate-800">{ocrParsedTotalAmount.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-500">현재 주문 총액:</span>
                            <span className="font-mono text-slate-800">
                              {(getNumericPrice(selectedProduct.price) * form.quantity).toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-end pt-1.5 border-t border-slate-100">
                            {ocrParsedTotalAmount === (getNumericPrice(selectedProduct.price) * form.quantity) ? (
                              <span className="inline-flex items-center bg-green-50 text-green-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-green-200">
                                ✓ 실물 금액 일치
                              </span>
                            ) : (
                              <span className="inline-flex items-center bg-amber-50 text-amber-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                                ⚠️ 금액 불일치 (재확인 권장)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">사업자등록번호 *</label>
                        <input 
                          type="text" 
                          required={form.isTaxRequested}
                          value={form.businessNumber || ''}
                          onChange={(e) => setForm({...form, businessNumber: e.target.value})}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold bg-white text-slate-800"
                          placeholder="000-00-00000"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-650 mb-1">상호명 (회사명) *</label>
                          <input 
                            type="text" 
                            required={form.isTaxRequested}
                            value={form.companyName || ''}
                            onChange={(e) => setForm({...form, companyName: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold bg-white text-slate-800"
                            placeholder="이지데스크"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-650 mb-1">대표자명 *</label>
                          <input 
                            type="text" 
                            required={form.isTaxRequested}
                            value={form.representativeName || ''}
                            onChange={(e) => setForm({...form, representativeName: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold bg-white text-slate-800"
                            placeholder="홍길동"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">세금계산서 수신 이메일 *</label>
                        <input 
                          type="email" 
                          required={form.isTaxRequested}
                          value={form.taxEmail || ''}
                          onChange={(e) => setForm({...form, taxEmail: e.target.value})}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold bg-white text-slate-800"
                          placeholder="tax@egdesk.com"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Point & OTP Section */}
                {!isTbd && (
                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                      <Coins className="w-4 h-4 mr-1 text-blue-600 animate-spin" />
                      단골 적립금 포인트 할인 적용
                    </label>
                    
                    {pointBalance === null ? (
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={handleLookupPoints} 
                          disabled={!form.customerPhone}
                          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer"
                        >
                          위 휴대폰 번호로 단골 적립금 조회하기
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!isOtpVerified ? (
                          <div className="space-y-2 animate-scale-up">
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
                                  {isOtpSending ? '발송 중..' : '인증번호 발송'}
                                </button>
                              ) : (
                                <button 
                                  type="button" 
                                  onClick={() => { setIsOtpSent(false); setOtpCode(''); }}
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
                                  placeholder="문자로 수신된 4자리 입력" 
                                  className="flex-1 border-2 border-orange-400 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 font-mono text-center text-xs font-black bg-white"
                                />
                                <button 
                                  type="button" 
                                  onClick={handleVerifyOtp} 
                                  disabled={isOtpVerifying}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:opacity-95 border-none cursor-pointer"
                                >
                                  {isOtpVerifying ? '확인 중..' : '인증 승인'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-xs">
                            <div>
                              <span className="font-bold text-indigo-700 block">적립금 포인트 할인 적용</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-indigo-700">-{appliedPoints.toLocaleString()}원</span>
                              <button 
                                type="button" 
                                onClick={() => { 
                                  setAppliedPoints(0); 
                                  setUsePointsInput(''); 
                                  setIsOtpVerified(false); 
                                  setIsOtpSent(false); 
                                  setOtpCode(''); 
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
                              setUsePointsInput('');
                              setAppliedPoints(0);
                              setIsOtpSent(false);
                              setIsOtpVerified(false);
                              setOtpCode('');
                              setPointError('');
                              setPointInfo('');
                            }}
                            className="text-slate-450 hover:underline border-none bg-transparent cursor-pointer"
                          >
                            취소 및 닫기
                          </button>
                        </div>
                      </div>
                    )}
                    {pointError && <p className="text-red-500 text-xs mt-2 font-bold px-1">{pointError}</p>}
                    {pointInfo && <p className="text-indigo-600 text-xs mt-2 font-bold px-1">{pointInfo}</p>}
                  </div>
                )}

                {/* Coupon Section */}
                {!isTbd && (
                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">할인 쿠폰</label>
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
                          <span className="font-bold text-green-700 block">{appliedCoupon.name}</span>
                          <span className="text-xs text-green-600 font-mono mt-1">{appliedCoupon.code}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-green-700">-{appliedCoupon.discountAmount.toLocaleString()}원</span>
                          <button 
                            type="button" 
                            onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} 
                            className="text-green-600 hover:bg-green-100 p-2 rounded-lg border-none bg-transparent cursor-pointer"
                          >
                            <X className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    )}
                    {couponError && <p className="text-red-500 text-xs mt-2 font-bold">{couponError}</p>}
                  </div>
                )}

                <div className="pt-6 mt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-slate-500 font-medium">총 결제금액</span>
                  <div className="text-right">
                    {(appliedCoupon || appliedPoints > 0) && !isTbd && (
                      <div className="text-slate-400 line-through text-sm mb-1">
                        {(unitPrice * form.quantity).toLocaleString()}원
                      </div>
                    )}
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {isTbd 
                        ? '안내원 상담 후 결정' 
                        : (unitPrice > 0 
                            ? `${finalPrice.toLocaleString()}원` 
                            : '안내원 상담 후 결정')}
                    </span>
                    
                    {/* 동적 예상 적립금 뱃지 아이콘 탑재 */}
                    {(() => {
                      const expectedPointsStore = !isTbd ? Math.floor(finalPrice * (pointEarningRate / 100)) : 0;
                      if (expectedPointsStore <= 0) return null;
                      return (
                        <div className="flex justify-end mt-1">
                          <span 
                            onClick={(e) => { e.stopPropagation(); setShowPointGuide(true); }}
                            className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md animate-pulse select-none inline-flex"
                            title="적립 혜택 자세히 보기"
                          >
                            <Coins className="w-3 h-3 text-slate-900 shrink-0" />
                            +{expectedPointsStore.toLocaleString()}p 적립 예정 💡
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => onAddToCart(selectedProduct, form.quantity)}
                    disabled={isSubmitting || isTbd}
                    className={`w-1/2 py-4 font-bold text-lg rounded-xl border border-slate-200 transition-all duration-300 flex justify-center items-center gap-2 shadow-sm ${
                      isSubmitting || isTbd
                        ? 'bg-slate-50 text-slate-350 cursor-not-allowed border-slate-100 shadow-none'
                        : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 shrink-0" />
                    장바구니 담기
                  </button>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-1/2 py-4 font-bold text-lg text-white transition-all duration-300 flex justify-center items-center rounded-xl shadow-lg border border-transparent cursor-pointer ${
                      isSubmitting 
                        ? 'bg-slate-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/50 active:scale-[0.98]'
                    }`}
                  >
                    {isSubmitting ? '처리 중...' : (isTbd ? '상담/견적 요청하기' : '바로 주문하기')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
