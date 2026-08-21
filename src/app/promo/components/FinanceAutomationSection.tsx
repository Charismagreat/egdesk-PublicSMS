"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Landmark, Receipt, CreditCard, FileSpreadsheet, Download, 
  CheckCircle2, ArrowRight, ShieldCheck, Zap, Coins 
} from "lucide-react";

export default function FinanceAutomationSection() {
  const financePillars = [
    {
      icon: Receipt,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
      title: "1. 국세청 홈택스 자동 연동",
      subtitle: "전자세금계산서 과세/면세 및 현금영수증",
      desc: "홈택스에서 내려받은 엑셀 파일이나 구글 시트를 올리면 매입·매출 공급가액과 부가세를 1초 만에 자동 분류 및 정산 대장에 적재합니다.",
      badge: "매입/매출 실시간 대조"
    },
    {
      icon: Landmark,
      iconColor: "text-blue-600 bg-blue-50 border-blue-100",
      title: "2. 인터넷뱅킹 법인 계좌 동기화",
      subtitle: "입출금 내역 자동 수집 & 잔액 실시간 일치",
      desc: "신한, 국민, 하나, 우리, 기업은행 등 주요 은행 엑셀과 구글 시트를 연동하여 거래처 입출금 내역을 자동 매칭하고 계좌 잔액을 즉시 동기화합니다.",
      badge: "중복 방지 MD5 해시 검증"
    },
    {
      icon: CreditCard,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
      title: "3. 신용카드 & 영수증 OCR 대조",
      subtitle: "법인카드 승인내역 + 스마트폰 영수증 촬영",
      desc: "카드사별 승인/취소 내역을 일괄 적재하고, 임직원이 스마트폰으로 찍어 올린 영수증 사진의 실물 금액을 OCR로 교차 검증하여 결재 승인합니다.",
      badge: "영수증 OCR 이중 가드"
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black shadow-3xs">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>3-Way Finance & Tax Automation</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            월말 3일 걸리던 경리·회계 대조 작업을 <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              단 3분 만에 끝내는 금융 관리 AI
            </span>
          </h2>

          <p className="text-base text-slate-600 font-medium">
            홈택스 세금계산서, 은행 통장 내역, 법인카드 영수증이 서로 따로 놀던 비효율을 끝냅니다. 3대 금융 데이터를 하나의 파이프라인으로 연결하여 실시간 자금 흐름을 완벽하게 관제합니다.
          </p>
        </div>

        {/* 3대 금융 기둥 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {financePillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="bg-slate-50/70 rounded-3xl p-7 border border-slate-200/80 hover:border-emerald-300 hover:bg-white transition-all space-y-4 shadow-3xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl border ${pillar.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 bg-white border border-slate-200/80 text-slate-700 rounded-full text-[10px] font-extrabold shadow-3xs">
                      {pillar.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">{pillar.title}</h3>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">{pillar.subtitle}</p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {pillar.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 엑셀 표준 서식 1초 다운로드 & 무손실 마이그레이션 배너 */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[11px] font-bold">
              <Download className="w-3.5 h-3.5" />
              <span>원터치 표준 엑셀 양식 제공</span>
            </div>
            <h4 className="text-xl font-black text-white tracking-tight">
              기존 더존, 이카운트, 엑셀 장부 데이터를 1초 만에 무손실 이관
            </h4>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              각 팝업창에서 표준 엑셀 서식을 즉시 내려받아 기존 데이터를 붙여넣기만 하면, AI가 헤더와 열 구조를 자동 판독하여 완벽하게 적재합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <div className="px-4 py-3 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 block">통장/카드 표준양식</span>
              <span className="text-xs font-bold text-emerald-400">.xlsx 즉시 다운로드</span>
            </div>
            <div className="px-4 py-3 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 block">데이터 마이그레이션</span>
              <span className="text-xs font-bold text-indigo-400">누락율 0% 보장</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
