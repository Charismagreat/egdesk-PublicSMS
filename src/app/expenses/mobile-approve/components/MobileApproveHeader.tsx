'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Coins } from 'lucide-react';

export default function MobileApproveHeader() {
  return (
    <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-40 flex items-center justify-between shadow-3xs">
      <div className="flex items-center gap-2">
        <Link href="/expenses" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center space-x-1.5">
          <Coins className="w-5 h-5 text-rose-500" />
          <h1 className="text-sm font-black text-slate-800 tracking-tight">대표자 모바일 ERP 관제</h1>
        </div>
      </div>
      <span className="text-[9px] bg-rose-50 text-rose-700 font-extrabold px-2 py-0.5 rounded-full border border-rose-100 animate-pulse flex items-center gap-1">
        👑 대표자 세션
      </span>
    </div>
  );
}
