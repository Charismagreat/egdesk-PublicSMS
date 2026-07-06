import React from "react";
import { X, CalendarDays, Check, Clock } from "lucide-react";
import { BookingProduct, BookingForm, AppliedCoupon } from "../types";

interface BookingModalProps {
  selectedService: BookingProduct | null;
  onClose: () => void;
  form: BookingForm;
  setForm: React.Dispatch<React.SetStateAction<BookingForm>>;
  isSubmitting: boolean;
  orderSuccess: boolean;
  couponCode: string;
  setCouponCode: (val: string) => void;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: React.Dispatch<React.SetStateAction<AppliedCoupon | null>>;
  couponError: string;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  getNumericPrice: (priceStr: string) => number;
  handleApplyCoupon: () => Promise<void>;
}

export function BookingModal({
  selectedService,
  onClose,
  form,
  setForm,
  isSubmitting,
  orderSuccess,
  couponCode,
  setCouponCode,
  appliedCoupon,
  setAppliedCoupon,
  couponError,
  onSubmit,
  getNumericPrice,
  handleApplyCoupon
}: BookingModalProps) {
  if (!selectedService) return null;

  const unitPrice = getNumericPrice(selectedService.price || '0');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose}
      ></div>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header Image */}
        <div className="relative h-48 bg-gray-100 shrink-0">
          {selectedService.main_image_url ? (
            <img 
              src={selectedService.main_image_url} 
              alt={selectedService.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <CalendarDays className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white hover:text-gray-200 p-2 bg-black/20 rounded-full backdrop-blur-md transition-colors border-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <h3 className="text-2xl font-bold text-white leading-tight">{selectedService.name}</h3>
            <p className="text-white/80 text-sm font-semibold mt-1">
              {selectedService.price === '상담후결정' 
                ? '상담 후 결정' 
                : (unitPrice > 0 ? `${unitPrice.toLocaleString()}원` : '가격 문의')}
            </p>
          </div>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {orderSuccess ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-[#F4F4F5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Check className="w-10 h-10 text-slate-800" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">예약 접수 완료</h3>
              <p className="text-slate-500 mb-6 font-light">입력하신 연락처로 예약 확정 문자가 발송됩니다.</p>
              
              <div className="bg-slate-50 rounded-2xl p-5 text-left w-full mb-6 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-2">무통장 입금 안내 (예약금)</h4>
                <p className="text-xs text-slate-500 mb-3">예약 확정을 위해 아래 계좌로 금액을 송금해 주세요.</p>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="font-mono text-sm font-bold text-slate-800">
                    국민은행 123456-12-123456
                    <span className="block text-xs text-slate-500 mt-1">예금주: 주식회사 이지데스크</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose} 
                className="bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl hover:bg-slate-800 transition-colors w-full border-0 cursor-pointer shadow-md"
              >
                닫기
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center">
                    <CalendarDays className="w-3.5 h-3.5 mr-1 text-slate-400"/> 예약 날짜
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={form.reservationDate}
                    onChange={(e) => setForm({ ...form, reservationDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-gray-50 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400"/> 예약 시간
                  </label>
                  <input 
                    type="time" 
                    required 
                    value={form.reservationTime}
                    onChange={(e) => setForm({ ...form, reservationTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-gray-50 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">예약자 성함</label>
                <input 
                  type="text" 
                  required 
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-gray-50 text-xs font-semibold text-slate-850 placeholder:text-slate-400"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">연락처</label>
                <input 
                  type="tel" 
                  required 
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all bg-gray-50 text-xs font-semibold text-slate-850 placeholder:text-slate-400"
                  placeholder="010-1234-5678"
                />
              </div>

              {/* Coupon Section */}
              {selectedService.price !== '상담후결정' && unitPrice > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">할인 쿠폰</label>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        placeholder="쿠폰 코드" 
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 uppercase font-mono bg-gray-50 text-xs font-bold text-slate-800 placeholder:text-slate-400"
                      />
                      <button 
                        type="button" 
                        onClick={handleApplyCoupon} 
                        className="px-5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 whitespace-nowrap text-xs transition-colors border-0 cursor-pointer"
                      >
                        적용
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                      <div>
                        <span className="font-bold text-green-700 block text-xs">{appliedCoupon.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-green-700 text-xs">-{appliedCoupon.discountAmount.toLocaleString()}원</span>
                        <button 
                          type="button" 
                          onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} 
                          className="text-green-600 hover:bg-green-150 p-1 rounded-lg border-0 cursor-pointer bg-transparent"
                        >
                          <X className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  )}
                  {couponError && <p className="text-red-500 text-[10px] mt-2 font-bold">{couponError}</p>}
                  
                  {appliedCoupon && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-slate-550 font-semibold text-xs">최종 결제 예정 금액</span>
                      <span className="text-lg font-black text-slate-900">
                        {Math.max(0, unitPrice - appliedCoupon.discountAmount).toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-sm text-white transition-all mt-4 border-0 cursor-pointer ${
                  isSubmitting 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-950/10'
                }`}
              >
                {isSubmitting ? '처리 중...' : '예약 접수하기'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
