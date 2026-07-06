"use client";

import React from "react";
import { ShoppingCart, Coins, X } from "lucide-react";
import { AppliedCoupon } from "../types";

interface CartFloatingBarProps {
  cartItemsCount: number;
  cartTotalAmount: number;
  finalEarningBasis: number;
  expectedPoints: number;
  couponCode: string;
  setCouponCode: (val: string) => void;
  appliedCoupon: AppliedCoupon | null;
  onRemoveCoupon: () => void;
  couponError: string;
  onApplyCoupon: () => void;
  phoneForPoints: string;
  setPhoneForPoints: (val: string) => void;
  pointBalance: number | null;
  usePointsInput: string;
  setUsePointsInput: (val: string) => void;
  appliedPoints: number;
  otpCode: string;
  setOtpCode: (val: string) => void;
  isOtpSent: boolean;
  isOtpVerified: boolean;
  pointError: string;
  pointInfo: string;
  isOtpSending: boolean;
  isOtpVerifying: boolean;
  onLookupPoints: () => void;
  onRequestOtp: () => void;
  onVerifyOtp: () => void;
  onResetPoints: () => void;
  setShowPointGuide: (val: boolean) => void;
  onSubmitOrder: () => void;
  isSubmitting: boolean;
}

export function CartFloatingBar({
  cartItemsCount,
  cartTotalAmount,
  finalEarningBasis,
  expectedPoints,
  couponCode,
  setCouponCode,
  appliedCoupon,
  onRemoveCoupon,
  couponError,
  onApplyCoupon,
  phoneForPoints,
  setPhoneForPoints,
  pointBalance,
  usePointsInput,
  setUsePointsInput,
  appliedPoints,
  otpCode,
  setOtpCode,
  isOtpSent,
  isOtpVerified,
  pointError,
  pointInfo,
  isOtpSending,
  isOtpVerifying,
  onLookupPoints,
  onRequestOtp,
  onVerifyOtp,
  onResetPoints,
  setShowPointGuide,
  onSubmitOrder,
  isSubmitting
}: CartFloatingBarProps) {
  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-auto sm:w-[400px] sm:mx-auto z-50">
      
      {/* 할인 & 적립금 적용 래퍼 패널 */}
      <div className="bg-white rounded-2xl shadow-2xl p-4 mb-2 border border-slate-100 flex flex-col gap-3">
        
        {/* 1. 쿠폰 영역 */}
        <div className="border-b border-slate-100 pb-2">
          <p className="text-[10px] font-bold text-slate-400 mb-1">사용 가능한 쿠폰 코드</p>
          {!appliedCoupon ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                placeholder="쿠폰 번호를 입력하세요" 
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 uppercase font-mono text-xs text-slate-800 font-bold"
              />
              <button 
                type="button" 
                onClick={onApplyCoupon} 
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-850 whitespace-nowrap text-xs border-0 cursor-pointer"
              >
                적용
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 px-4 py-2 rounded-xl text-xs">
              <div>
                <span className="font-bold text-green-700 block">{appliedCoupon.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-green-700">-{appliedCoupon.discountAmount.toLocaleString()}원</span>
                <button 
                  type="button" 
                  onClick={onRemoveCoupon} 
                  className="text-green-600 hover:bg-green-150 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>
            </div>
          )}
          {couponError && <p className="text-red-500 text-[10px] font-bold px-1 mt-1">{couponError}</p>}
        </div>

        {/* 2. 포인트 적립 및 사용 영역 (OTP 보안 탑재) */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center">
            <Coins className="w-3.5 h-3.5 mr-1 text-orange-500 animate-spin" />
            단골 적립금 (휴대전화번호 입력)
          </p>
          
          {/* 번호 조회 입력부 */}
          {pointBalance === null ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={phoneForPoints}
                onChange={e => setPhoneForPoints(e.target.value)}
                placeholder="예: 010-1234-5678" 
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs text-slate-800 font-bold"
              />
              <button 
                type="button" 
                onClick={onLookupPoints} 
                className="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 whitespace-nowrap text-xs border-0 cursor-pointer"
              >
                단골 조회
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 포인트 금액 입력 및 OTP 발송 */}
              {!isOtpVerified ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={usePointsInput}
                      onChange={e => setUsePointsInput(e.target.value)}
                      placeholder={`사용할 포인트 입력 (최대 ${pointBalance}p)`} 
                      disabled={isOtpSent}
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 text-xs font-bold disabled:bg-slate-50 text-slate-800"
                    />
                    {!isOtpSent ? (
                      <button 
                        type="button" 
                        onClick={onRequestOtp} 
                        disabled={isOtpSending}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-850 whitespace-nowrap text-xs border-0 cursor-pointer"
                      >
                        {isOtpSending ? '발송 중..' : '인증번호 발송'}
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={onResetPoints}
                        className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-300 border-0 cursor-pointer"
                      >
                        번호 재입력
                      </button>
                    )}
                  </div>
                  
                  {/* OTP 입력 및 검증 */}
                  {isOtpSent && (
                    <div className="flex gap-2 animate-scale-up">
                      <input 
                        type="text" 
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        placeholder="문자로 수신된 4자리 입력" 
                        className="flex-1 border-2 border-orange-400 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 font-mono text-center text-xs font-black text-slate-800"
                      />
                      <button 
                        type="button" 
                        onClick={onVerifyOtp} 
                        disabled={isOtpVerifying}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-95 whitespace-nowrap text-xs border-0 cursor-pointer"
                      >
                        {isOtpVerifying ? '확인 중..' : '인증 승인'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* 인증 성공 시 표출 */
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-indigo-700 block">단골 적립금 포인트 할인</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-indigo-700">-{appliedPoints.toLocaleString()}원</span>
                    <button 
                      type="button" 
                      onClick={onResetPoints} 
                      className="text-indigo-600 hover:bg-indigo-150 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
                    >
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              )}
              
              {/* 정보 리셋 버튼 */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold px-1">
                <span>* 1,000p 이상부터 10원 단위로 사용 가능</span>
                <button 
                  type="button" 
                  onClick={onResetPoints}
                  className="text-slate-450 hover:underline border-0 bg-transparent cursor-pointer font-bold"
                >
                  다른 휴대폰 번호로 변경
                </button>
              </div>

            </div>
          )}
          {pointError && <p className="text-red-500 text-[10px] font-bold px-1 mt-1">{pointError}</p>}
          {pointInfo && <p className="text-indigo-600 text-[10px] font-bold px-1 mt-1">{pointInfo}</p>}
        </div>

      </div>

      <button 
        onClick={onSubmitOrder}
        disabled={isSubmitting}
        className="w-full bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-650/30 p-4 flex items-center justify-between hover:bg-orange-700 transition-colors border-0 cursor-pointer group disabled:bg-slate-400 disabled:shadow-none"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-orange-100 text-sm font-medium">총 {cartItemsCount}개 담음</div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {(appliedCoupon || appliedPoints > 0) && (
                <span className="text-white/60 line-through text-sm">
                  {cartTotalAmount.toLocaleString()}원
                </span>
              )}
              <span className="text-white font-black text-xl">
                {finalEarningBasis.toLocaleString()}원
              </span>
              
              {/* 동적 예상 적립금 뱃지 */}
              {expectedPoints > 0 && (
                <span 
                  onClick={(e) => { e.stopPropagation(); setShowPointGuide(true); }}
                  className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md ml-1.5 animate-pulse select-none"
                  title="적립 혜택 자세히 보기"
                >
                  <Coins className="w-3 h-3 text-slate-900 shrink-0" />
                  +{expectedPoints.toLocaleString()}p 적립 예정 💡
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="font-bold text-lg flex items-center bg-white/10 px-5 py-3 rounded-xl group-hover:bg-white/20 transition-colors">
          주문하기
        </div>
      </button>
    </div>
  );
}
