"use client";

import React from "react";
import { QrCode, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

// 테이블 오더 보안 안내 전용 메인 페이지
export default function TableOrderEntryPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-slate-800/90 border border-slate-700/80 p-8 sm:p-10 rounded-3xl w-full max-w-md space-y-6 shadow-2xl backdrop-blur-md">
        
        {/* 중앙 아이콘 헤더 */}
        <div className="w-20 h-20 bg-indigo-600/20 border border-indigo-500/30 rounded-3xl flex items-center justify-center mx-auto text-indigo-400">
          <QrCode className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">
            테이블오더 서비스
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            매장 테이블에 비치된 <strong className="text-indigo-400">QR 코드를 스마트폰 카메라로 스캔</strong>하여 메뉴판에 접속해 주세요.
          </p>
        </div>

        {/* 보안 안내 뱃지 */}
        <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>암호화 보안 토큰 시스템 가동 중</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            타 테이블 무단 장난 주문 방지를 위해 각 테이블의 QR 코드에 포함된 전용 암호화 토큰 접속만 허용됩니다.
          </p>
        </div>

        {/* 관리자용 QR 인쇄 이동 퀵 링크 */}
        <div className="pt-2">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-400 transition-colors underline underline-offset-4"
          >
            <span>사장님(관리자) QR 인쇄 관리 페이지로 이동</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}

