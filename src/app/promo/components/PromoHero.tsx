"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Zap, DollarSign, CheckCircle2, Server, Smartphone, ScanLine, Bot, Building2 } from "lucide-react";

export default function PromoHero() {
  const scrollToInquiry = () => {
    const el = document.getElementById("inquiry");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      {/* 배경 장식 원형 그라디언트 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-200/30 via-blue-200/20 to-purple-200/20 blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 상단 뱃지 */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-indigo-100 shadow-sm text-xs md:text-sm font-bold text-indigo-700">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
            <span>중소기업을 위한 프라이빗 사내 AI 앱스토어 &amp; 데이터 플랫폼</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-indigo-500" />
              EGDESK Server
            </span>
          </div>
        </div>

        {/* 메인 타이틀 & 카피 */}
        <div className="mt-8 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] sm:leading-[1.15]">
            우리 회사만의 안전한 사내 AI 시스템, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700">
              EGDESK
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto">
            직원들이 만든 수많은 실무 AI 툴, <strong>개인 노트북에 묵혀두지 말고 전사로 확산시키세요.</strong><br className="hidden sm:inline" />
            외부 유출 없는 <strong>안전한 사내 배포</strong>, <strong>권한·이력 관리</strong>, <strong>사내 데이터 안전 연동</strong>까지 단 하나의 프라이빗 서버로 완성됩니다.
          </p>

          {/* CTA 버튼 그룹 */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToInquiry}
              className="w-full sm:w-auto px-8 py-4 text-base font-extrabold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>맞춤 도입 상담 & 데모 신청</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-7 py-4 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>CEO 관제 대시보드 바로 체험</span>
            </Link>

            <Link
              href="/m"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 text-base font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-5 h-5 text-indigo-600" />
              <span>모바일 포털 (/m)</span>
            </Link>
          </div>

          {/* 서브 안심 문구 */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-700 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>1분 간편 셋업 (자가치유 DB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>데이터 100% 프라이빗 보관</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>약정/구독료 부담 제로</span>
            </div>
          </div>
        </div>

        {/* 3대 핵심 성과 카드 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">안전한 사내 배포</div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              사내 인증된 구성원만 접근 가능한 프라이빗 격리 환경으로, 외부 유출 위험 없이 직원의 AI 툴을 사내 배포합니다.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">권한 &amp; 7종 감사 이력</div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              IT팀이 없어도 직급·부서별 권한 분기와 전사 7종 감사 이력(Audit Trail)이 자동으로 체계화됩니다.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">사내 데이터 안전 연동</div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              사내 실물 데이터(견적·재고·영수증)와 안전하게 연결되어 권한에 맞는 데이터만 AI 앱에 공급합니다.
            </p>
          </div>
        </div>

        {/* 인터랙티브 그래픽 프리뷰 목업 */}
        <div className="mt-16 relative max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 bg-slate-900">
          <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-slate-300">EGDESK Server Control Tower - Live Dashboard</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                서버 엔진 정상 가동 (Self-Healing Active)
              </span>
              <span className="text-slate-400">포트 :4005</span>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 위젯 1: 무료 문자 발송 멀티허브 */}
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/70">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>FreeSMS 멀티허브</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">로드밸런싱 ON</span>
                </div>
                <div className="mt-3 text-2xl font-black text-white">4대 기기 연동</div>
                <div className="mt-1 text-xs text-slate-400">오늘 무료 잔여 한도: <strong className="text-blue-400">1,240건</strong></div>
                <div className="mt-3 w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-2/3 rounded-full" />
                </div>
              </div>

              {/* 위젯 2: AI 비전 견적서 OCR */}
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/70">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Inbound 견적 AI OCR</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">3초 판독 완료</span>
                </div>
                <div className="mt-3 text-2xl font-black text-white">12개 품목 파싱</div>
                <div className="mt-1 text-xs text-slate-400">실재고 자동 연동: <strong className="text-emerald-400">오차 0건</strong></div>
                <div className="mt-3 text-xs text-indigo-300 font-semibold flex items-center gap-1">
                  <ScanLine className="w-3.5 h-3.5" /> 원클릭 발주서 전환 대기
                </div>
              </div>

              {/* 위젯 3: 법인카드 영수증 RPA */}
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/70">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>지출관리 영수증 RPA</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">자동 승인</span>
                </div>
                <div className="mt-3 text-2xl font-black text-white">₩ 3,450,000</div>
                <div className="mt-1 text-xs text-slate-400">판관비/식대 계정과목 자동 뱃지</div>
                <div className="mt-3 text-xs text-amber-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 영수증 풀칠 불필요 (100% 디지털)
                </div>
              </div>

              {/* 위젯 4: 사내 RAG 지식관리 AI */}
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/70">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>이지봇 자율 규칙 AI</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">RAG 활성</span>
                </div>
                <div className="mt-3 text-2xl font-black text-white">18건 사내 규정</div>
                <div className="mt-1 text-xs text-slate-400">취업규칙·단가표 자동 답변 대행</div>
                <div className="mt-3 text-xs text-purple-300 font-semibold flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> 실시간 영향도 시뮬레이션
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
