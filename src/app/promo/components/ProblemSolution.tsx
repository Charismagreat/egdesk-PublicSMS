"use client";

import React from "react";
import { XCircle, CheckCircle2, Database, Building2, Clock, ShieldAlert } from "lucide-react";

export default function ProblemSolution() {
  const comparisons = [
    {
      title: "사내 데이터 파편화 & 지식 사일로",
      beforeText: "엑셀 장부, 카카오톡, PDF, 개인 PC에 데이터가 제각각 흩어져 있어 AI에 먹일 정제된 데이터가 전무하고 지식 사장화",
      afterText: "전사 정형/비정형 데이터를 단 하나의 '프라이빗 데이터 레이크'에 무손실 집결하여 환각 없는 사내 AI 지식 엔진으로 즉시 가동"
    },
    {
      title: "고비용 & 수기 입력 지옥의 기존 ERP/MES",
      beforeText: "유저당 비싼 월 구독료를 내면서도 견적서, 발주서, 영수증, 생산일지를 직원이 일일이 수기 타이핑하느라 오타 및 야근 반복",
      afterText: "3초 AI Vision OCR, 실물 검수 재고, 영수증 드래그 자동 전표 적재, 수주 연동 생산 간트차트로 수기 입력 0초 달성"
    },
    {
      title: "대표이사 경영 부재 시 의사결정 지연",
      beforeText: "대표가 외근이나 출장 중이면 결재가 멈추고, 단가와 재고 현황을 파악하지 못해 바이어 응대 및 납기 지연 발생",
      afterText: "대표이사 스마트폰 모바일 포털(/m)을 통해 이동 중 실시간 미결재 건 원터치 승인(Inbox Zero) 및 전사 현황 즉시 관제"
    },
    {
      title: "주먹구구식 현장 지시 & 완료 확인 누락",
      beforeText: "카카오톡이나 전화로 현장에 작업 지시를 내리다 보니 지시 사항이 묻히고, 작업 완료 여부와 현장 사진 보고가 누락되어 납기 지연 발생",
      afterText: "본사 작업 지시서·도면 전달부터 공장/현장의 완료 사진 보고까지 단일 타임라인 스냅태스크로 연결하여 100% 완벽한 업무 추적성 확보"
    }
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block border border-indigo-100 mb-3">
            Why EGDESK?
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            데이터 사일로와 수기 입력의 고통,<br />
            이제 <strong>EGDESK 단 하나</strong>로 끝내세요.
          </h3>
          <p className="mt-4 text-base text-slate-600">
            흩어진 엑셀, 비싸기만 한 ERP/MES, 수작업 서류 정리로 낭비되던 시간과 비용을 획기적으로 혁신합니다.
          </p>
        </div>

        {/* 비교 그리드 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {comparisons.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/80 rounded-3xl p-6 sm:p-8 border border-slate-200/80 hover:border-indigo-200 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  {item.title}
                </h4>

                {/* Before */}
                <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-100/80 mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700 mb-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>기존 방식의 고통 (Before)</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {item.beforeText}
                  </p>
                </div>

                {/* After */}
                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>EGDESK 도입 후 (After)</span>
                  </div>
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">
                    {item.afterText}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
