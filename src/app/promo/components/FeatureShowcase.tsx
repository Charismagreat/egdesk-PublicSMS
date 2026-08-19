"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Database, Building2, ScanLine, Camera, Sparkles, ArrowRight, CheckCircle2, Bot, Layers, Zap, ShieldCheck } from "lucide-react";

export default function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState(0);

  const pillars = [
    {
      id: "data-lake",
      title: "프라이빗 데이터 레이크",
      subtitle: "흩어진 엑셀·PDF·영수증을 단 하나의 사내 데이터 허브로",
      icon: <Database className="w-5 h-5" />,
      color: "from-blue-600 to-indigo-600",
      lightColor: "bg-blue-50 text-blue-700 border-blue-100",
      description: "직원 개인 PC, 엑셀, 카카오톡, 종이 서류에 파편화되어 있던 전사 정형/비정형 데이터를 단 하나의 프라이빗 데이터 레이크에 안전하게 집결하여 사내 AI의 든든한 지식 원천(Ground Truth)으로 가동합니다.",
      bullets: [
        "사내 데이터 사일로(Data Silo) 완전 해소 및 100% 프라이빗 보관",
        "엑셀, PDF 서류, 영수증, 녹취 파일 드래그앤드롭 무손실 적재",
        "사내 실데이터 기반 환각(Hallucination) 없는 AI 경영 분석"
      ],
      demoLink: "/my-db",
      demoText: "데이터 레이크 관제탑 둘러보기"
    },
    {
      id: "erp-mes",
      title: "차세대 AI ERP & 스마트 MES",
      subtitle: "고비용·수기 입력 지옥 탈출, 영업·회계·생산 단일화",
      icon: <Building2 className="w-5 h-5" />,
      color: "from-indigo-600 to-purple-600",
      lightColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
      description: "수천만 원의 도입비와 수기 입력 부담을 없애고, 견적 OCR부터 실재고 연동, 수주 연동 생산계획 간트차트, 모바일 결재까지 단일 시스템으로 운영하여 업무 시간을 90% 단축합니다.",
      bullets: [
        "지면/PDF 견적서 3초 AI OCR & 원클릭 수주·발주서 전환",
        "수주 확정 시 라인별 생산 일정 간트차트 및 작업 지시서 자동 발행",
        "영수증 사진 드래그 즉시 전표 자동 생성 & 대표이사 모바일 결재"
      ],
      demoLink: "/estimates",
      demoText: "AI ERP & MES 둘러보기"
    },
    {
      id: "scm",
      title: "3초 AI Vision OCR & 무서류 SCM",
      subtitle: "견적서 스캔부터 실재고·발주 연동까지 원터치",
      icon: <ScanLine className="w-5 h-5" />,
      color: "from-emerald-600 to-teal-600",
      lightColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      description: "거래처가 전달한 PDF/지면 견적서를 업로드하면 Gemini Vision OCR이 3초 만에 품목, 단가, 수량을 전산에 적재하고 원클릭으로 정식 발주서 및 실재고(inventory_logs)와 연동합니다.",
      bullets: [
        "지면/이미지/PDF 견적서 실물 수치 3초 고정밀 판독 및 자동 검증",
        "원클릭 SCM 발주서(PENDING_INBOUND) 전환 및 공급사 자동 발송",
        "실물 입고 검수 기반 바코드(INV-ID) 영구 이력 일원화 관리"
      ],
      demoLink: "/estimates",
      demoText: "SCM 무역 관리 둘러보기"
    },
    {
      id: "snaptask",
      title: "스냅태스크 & 현장 작업 지시 관제",
      subtitle: "본사 지시부터 현장 완료 사진 보고까지 단일 타임라인",
      icon: <Camera className="w-5 h-5" />,
      color: "from-purple-600 to-pink-600",
      lightColor: "bg-purple-50 text-purple-700 border-purple-100",
      description: "주먹구구식 카카오톡/전화 지시를 걷어내고, 본사의 작업 지시서·도면 전달부터 공장/현장의 작업 완료 사진 보고까지 단일 타임라인 피드로 연결하여 누락과 소통 오류를 100% 차단합니다.",
      bullets: [
        "도면·지시서 첨부 기반 실시간 모바일 작업 지시 발령",
        "현장 작업 완료 사진 및 특이사항 타임스탬프 피드 보고",
        "부서별 작업 진행 상태 및 납기 일정 실시간 동기화"
      ],
      demoLink: "/snaptasks",
      demoText: "스냅태스크 둘러보기"
    },
    {
      id: "knowledge",
      title: "사내 RAG 지식 AI & 이지봇",
      subtitle: "회사 규정 기반 자율 응대 & 규칙 시뮬레이션",
      icon: <Bot className="w-5 h-5" />,
      color: "from-violet-600 to-indigo-600",
      lightColor: "bg-violet-50 text-violet-700 border-violet-100",
      description: "사내 취업규칙, 제품 매뉴얼, FAQ 문서를 등록하면 이지봇이 지침을 철저히 준수하며 임직원/고객에게 답변하고, 규칙 변경 시 영향도를 사전에 시뮬레이션합니다.",
      bullets: [
        "사내 문서 기반 고정밀 RAG 지식 검색 및 자율 응대 대행",
        "규칙 변경 시 DB 영향 범위 사전 시뮬레이션 (Impact Analyzer)",
        "대행 불가 상황 시 관리자에게 안전 경보 스냅태스크 자동 할당"
      ],
      demoLink: "/knowledge-ai",
      demoText: "지식 관리 AI 둘러보기"
    }
  ];

  const current = pillars[activeTab];

  return (
    <section id="features" className="scroll-mt-20 py-20 md:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block border border-indigo-100 mb-3">
            Core Pillars
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            중소기업 성장을 견인하는 <strong>5대 핵심 솔루션</strong>
          </h3>
          <p className="mt-4 text-base text-slate-600">
            사내 데이터 통합부터 차세대 ERP·MES, SCM, 협업, RAG 지식관리까지 하나로 완성합니다.
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl max-w-5xl mx-auto">
          {pillars.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === idx
                  ? "bg-white text-slate-900 shadow-sm scale-100"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <span className={activeTab === idx ? "text-indigo-600" : "text-slate-400"}>
                {item.icon}
              </span>
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 쇼케이스 카드 */}
        <div className="mt-10 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-md max-w-5xl mx-auto transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* 좌측 설명 영역 */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>핵심 솔루션 #{activeTab + 1}</span>
              </div>

              <div>
                <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {current.title}
                </h4>
                <p className="mt-2 text-base font-semibold text-indigo-600">
                  {current.subtitle}
                </p>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {current.description}
              </p>

              {/* 불릿 포인트 */}
              <div className="space-y-3 pt-2">
                {current.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              {/* 데모 링크 버튼 (새 탭에서 열림) */}
              <div className="pt-4 flex items-center gap-4">
                <Link
                  href={current.demoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all group cursor-pointer"
                >
                  <span>{current.demoText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <span className="text-xs text-slate-500 font-medium">
                  * 라이브 데모 환경에서 바로 테스트 가능 (새 탭)
                </span>
              </div>
            </div>

            {/* 우측 그래픽 위젯 영역 */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>LIVE SYSTEM MODULE</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60">
                    Active
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <div className="text-xs text-slate-400 font-semibold mb-1">상태 (State)</div>
                    <div className="text-base font-bold text-emerald-300 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      실시간 프라이빗 연동 가동 중
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <div className="text-xs text-slate-400 font-semibold mb-1">도입 기대 효과</div>
                    <div className="text-2xl font-black text-white">
                      {activeTab === 0 && "전사 데이터 사일로 100% 해소"}
                      {activeTab === 1 && "ERP/MES 도입·구독료 0원화"}
                      {activeTab === 2 && "서류 입력 시간 90% 단축"}
                      {activeTab === 3 && "회의록 정리 시간 95% 단축"}
                      {activeTab === 4 && "반복 사내 문의 90% 감소"}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <div className="text-xs text-slate-400 font-semibold mb-1">보안 및 감사 아키텍처</div>
                    <div className="text-xs font-mono text-slate-300">
                      7종 감사 이력(Audit Trail) &amp; Zero-Leak 프라이빗 보존
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
