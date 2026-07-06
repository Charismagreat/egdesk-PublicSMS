"use client";

import React from "react";
import { Coins, X } from "lucide-react";

interface PointGuideModalProps {
  pointEarningRate: number;
  onClose: () => void;
}

export function PointGuideModal({ pointEarningRate, onClose }: PointGuideModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col p-6 sm:p-8 animate-scale-up border border-slate-100/50">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6">
            <Coins className="w-8 h-8 text-slate-900 animate-bounce" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">3초 단골 적립 서비스 안내</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            이지데스크 평생 무료 SMS와 연계되어 점주님의 마진을 지키고 고객님께는 보상을 드리는 프리미엄 적립 시스템입니다.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50 text-left">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 text-orange-600 font-bold text-xs">01</div>
            <div>
              <h4 className="text-xs font-black text-slate-800 mb-1">번호 입력으로 즉석 자동 가입</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">복잡한 회원 가입 없이 휴대전화번호만 적으면 1초 만에 임시 단골회원으로 등록되어 즉시 적립됩니다.</p>
            </div>
          </div>
          
          <div className="flex gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50 text-left">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 text-amber-600 font-bold text-xs">02</div>
            <div>
              <h4 className="text-xs font-black text-slate-800 mb-1">
                {pointEarningRate > 0 ? `결제액의 ${pointEarningRate}% 실시간 적립` : '포인트 적립 일시 정지'}
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                {pointEarningRate > 0 
                  ? '이번 결제가 완료되는 즉시 예상 적립금 포인트가 휴대폰 번호에 영구적으로 안전하게 누적됩니다.' 
                  : '현재 단골 포인트 적립 서비스가 제공되지 않고 있습니다. 점주에게 문의해 주세요.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50 text-left">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 text-blue-600 font-bold text-xs">03</div>
            <div>
              <h4 className="text-xs font-black text-slate-800 mb-1">무료 SMS 2차 OTP 보안 사용</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">쌓인 적립금(1,000p 이상) 사용 시 본인 폰으로 전송되는 4자리 일회용 승인번호를 입력하여 도용 없이 안전하게 차감 결제합니다.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="mt-6 w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all border-0 shadow-md shadow-slate-900/10 cursor-pointer"
        >
          확인 및 닫기
        </button>
      </div>
    </div>
  );
}
