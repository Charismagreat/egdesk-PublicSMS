'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, Sparkles } from 'lucide-react';

interface StatsGridProps {
  isConnected: boolean;
  displayAccountStatus: string;
  accountSubtext: string;
  avgViews: number;
  viewsSubtext: string;
  uploadedCount: number;
  totalCount: number;
  uploadSubtext: string;
  successRate: number;
  successSubtext: string;
}

export default function StatsGrid({
  isConnected,
  displayAccountStatus,
  accountSubtext,
  avgViews,
  viewsSubtext,
  uploadedCount,
  totalCount,
  uploadSubtext,
  successRate,
  successSubtext
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
      
      {/* 계정 연동 상태 카드 */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/20 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">계정 연동 상태</p>
            <h3 className={`text-2xl font-black mt-2 transition-colors ${isConnected ? 'text-emerald-650' : 'text-slate-450'}`}>
              {displayAccountStatus}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50/80 text-emerald-600 rounded-2xl border border-emerald-100 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-450 mt-4 truncate font-medium">{accountSubtext}</p>
      </motion.div>

      {/* 평균 블로그 조회수 카드 */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50/20 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">평균 블로그 조회수</p>
            <h3 className="text-2xl font-black mt-2 text-slate-800">
              {avgViews.toLocaleString()} <span className="text-xs text-slate-400 font-semibold ml-0.5">회/글</span>
            </h3>
          </div>
          <div className="p-3 bg-teal-50/80 text-teal-600 rounded-2xl border border-teal-100 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-450 mt-4 font-medium">{viewsSubtext}</p>
      </motion.div>

      {/* 누적 발행 완료 카드 */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/20 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">누적 발행 완료</p>
            <h3 className="text-2xl font-black mt-2 text-slate-800">
              {uploadedCount}개 <span className="text-xs text-slate-400 font-bold ml-1.5">총 {totalCount}개</span>
            </h3>
          </div>
          <div className="p-3 bg-sky-50/80 text-sky-600 rounded-2xl border border-sky-100 shadow-xs">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-450 mt-4 font-medium">{uploadSubtext}</p>
      </motion.div>

      {/* 자동 발행 정합성 카드 */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="p-6 rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/20 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">자동 발행 정합성</p>
            <h3 className="text-2xl font-black mt-2 text-slate-800">
              {successRate}%
            </h3>
          </div>
          <div className="p-3 bg-amber-50/80 text-amber-600 rounded-2xl border border-amber-100 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-450 mt-4 font-medium">{successSubtext}</p>
      </motion.div>

    </div>
  );
}
