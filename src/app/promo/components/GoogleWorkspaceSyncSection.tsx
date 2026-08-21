"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  FileSpreadsheet, HardDrive, Mail, CheckCircle2, Sparkles 
} from "lucide-react";

export default function GoogleWorkspaceSyncSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white via-indigo-50/20 to-slate-50 relative overflow-hidden border-b border-slate-200/60">
      {/* 배경 장식 */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black shadow-3xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Google Workspace & Cloud Live Sync</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            기존에 쓰시던 구글 시트와 드라이브, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
              단 1%도 바꿀 필요가 없습니다.
            </span>
          </h2>

          <p className="text-base text-slate-600 font-medium">
            새로운 프로그램을 배우느라 고생하지 마세요. 사용 중이시던 구글 스프레드시트 한 권과 드라이브 폴더를 그대로 연결하면, 이지데스크 AI가 실시간으로 데이터를 분석하고 자동화합니다.
          </p>
        </div>

        {/* 메인 비주얼: 3대 구글 워크스페이스 연동 축 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. 구글 스프레드시트 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-[11px] font-extrabold">
                8대 핵심 업무 동기화
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900">구글 스프레드시트 원터치 연동</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              회사정보부터 거래처, 재고, 세금계산서, 은행 계좌, 법인카드까지 시트 URL 하나로 전사 업무 데이터를 무손실 자동 적재합니다.
            </p>
          </motion.div>

          {/* 2. 구글 드라이브 실시간 감시 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <HardDrive className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 bg-indigo-100/80 text-indigo-800 rounded-full text-[11px] font-extrabold">
                실시간 Drive Watch/Poll
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900">구글 드라이브 파일 실시간 감시</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              지정된 드라이브 폴더에 견적서나 도면, 계약서가 업로드되면 백그라운드에서 즉시 감지하여 사내 지식베이스로 자동 색인합니다.
            </p>
          </motion.div>

          {/* 3. G메일 스마트 아카이빙 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                <Mail className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 bg-rose-100/80 text-rose-800 rounded-full text-[11px] font-extrabold">
                첨부파일 자동 분류
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900">G메일 & 첨부파일 자동 파이프라인</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              거래처 수신 메일의 첨부파일(PDF 견적서, 영수증, 통관 서류)을 AI가 인식하여 클라우드 보관 및 담당자 업무로 자동 배정합니다.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
