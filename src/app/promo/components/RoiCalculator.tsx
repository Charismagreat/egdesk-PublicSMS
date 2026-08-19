"use client";

import React, { useState, useMemo } from "react";
import { Calculator, DollarSign, Clock, Sparkles, ArrowRight, CheckCircle2, TrendingUp, Database, Building2 } from "lucide-react";

export default function RoiCalculator() {
  const [employeeCount, setEmployeeCount] = useState<number>(15);
  const [monthlyDocs, setMonthlyDocs] = useState<number>(400);
  const [legacyErpCost, setLegacyErpCost] = useState<number>(80);

  // 실시간 계산 로직
  const calculations = useMemo(() => {
    // 1. 기존 ERP/MES 및 개별 소프트웨어 구독료 절감 (월 비용 * 12개월)
    const annualErpSaving = legacyErpCost * 10000 * 12;

    // 2. 견적서·영수증·서류 수기 입력 및 데이터 탐색 시간 절약 (임직원당 월 15시간 절약, 시간당 15,000원 기준)
    const monthlyHoursSaved = employeeCount * 15;
    const annualLaborSaving = monthlyHoursSaved * 15000 * 12;

    // 3. 서류 OCR 및 자동 적재로 인한 오타/오류 손실 방지 비용 환산 (월 30만 원 상당)
    const annualErrorSaving = 300000 * 12;

    // 총 연간 절감액
    const totalAnnualSaving = annualErpSaving + annualLaborSaving + annualErrorSaving;

    return {
      annualErpSaving,
      monthlyHoursSaved,
      annualLaborSaving,
      annualErrorSaving,
      totalAnnualSaving
    };
  }, [employeeCount, monthlyDocs, legacyErpCost]);

  return (
    <section id="roi-calculator" className="scroll-mt-20 py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-3">
            <Calculator className="w-3.5 h-3.5" />
            <span>INTERACTIVE ROI SIMULATOR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            우리 회사의 <strong>예상 도입 효과 &amp; 비용 절감액</strong> 계산
          </h2>
          <p className="mt-4 text-base text-slate-600">
            현재 귀사의 규모와 ERP 지출을 조절해 보세요. 연간 절감되는 비용과 소중한 업무 시간을 실시간으로 산출해 드립니다.
          </p>
        </div>

        {/* 계산기 인터페이스 */}
        <div className="mt-14 max-w-5xl mx-auto bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* 좌측 슬라이더 컨트롤러 */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* 슬라이더 1: 임직원 수 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>전체 임직원 수 (사내 AI 활용 인원)</span>
                  </label>
                  <span className="text-base font-black text-indigo-600 bg-white px-3 py-1 rounded-xl border border-indigo-100 shadow-sm">
                    {employeeCount} 명
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="100"
                  step="1"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] text-slate-700 mt-1">
                  <span>3명</span>
                  <span>50명</span>
                  <span>100명</span>
                </div>
              </div>

              {/* 슬라이더 2: 월간 처리 수발주, 영업 및 생산 관련 보고서 작성 건수 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>월간 처리 수발주, 영업 및 생산 관련 보고서 작성 건수</span>
                  </label>
                  <span className="text-base font-black text-indigo-600 bg-white px-3 py-1 rounded-xl border border-indigo-100 shadow-sm">
                    {monthlyDocs.toLocaleString()} 건
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={monthlyDocs}
                  onChange={(e) => setMonthlyDocs(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] text-slate-700 mt-1">
                  <span>50건</span>
                  <span>1,000건</span>
                  <span>2,000건</span>
                </div>
              </div>

              {/* 슬라이더 3: 현재 지출 중인 기존 ERP/소프트웨어 월 비용 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>기존 ERP / MES / 소프트웨어 월 지출액</span>
                  </label>
                  <span className="text-base font-black text-indigo-600 bg-white px-3 py-1 rounded-xl border border-indigo-100 shadow-sm">
                    월 {legacyErpCost} 만 원
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={legacyErpCost}
                  onChange={(e) => setLegacyErpCost(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] text-slate-700 mt-1">
                  <span>월 20만 원</span>
                  <span>월 150만 원</span>
                  <span>월 300만 원</span>
                </div>
              </div>

            </div>

            {/* 우측 실시간 절감 리포트 카드 */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-8 rounded-3xl text-white shadow-xl border border-indigo-700/50">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>연간 예상 총 절감 효과</span>
                </div>

                {/* 총 연간 절감액 대형 텍스트 */}
                <div className="mt-4">
                  <div className="text-xs text-slate-400">연간 예상 총 절감 가치</div>
                  <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 tracking-tight mt-1">
                    ₩ {Math.round(calculations.totalAnnualSaving / 10000).toLocaleString()} 만 원
                  </div>
                </div>

                {/* 절약되는 월간 시간 */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    전사 월간 단축 업무 시간
                  </span>
                  <span className="text-lg font-black text-emerald-400">
                    약 {calculations.monthlyHoursSaved.toLocaleString()} 시간
                  </span>
                </div>

                {/* 세부 내역 분해 */}
                <div className="mt-6 space-y-2 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">• 기존 ERP/MES 구독료 대체 절감</span>
                    <span className="font-bold">연 ₩ {(calculations.annualErpSaving / 10000).toLocaleString()}만</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">• 수기 입력 &amp; 데이터 탐색 인건비 절약</span>
                    <span className="font-bold">연 ₩ {(calculations.annualLaborSaving / 10000).toLocaleString()}만</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">• 수작업 오류/오타 손실 방지 가치</span>
                    <span className="font-bold">연 ₩ {(calculations.annualErrorSaving / 10000).toLocaleString()}만</span>
                  </div>
                </div>

                {/* 상담 유도 버튼 */}
                <button
                  onClick={() => {
                    const el = document.getElementById("inquiry");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="mt-6 w-full py-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>이 조건으로 맞춤 도입 상담 받기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
