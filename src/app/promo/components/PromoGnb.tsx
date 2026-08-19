"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Server, 
  Sparkles, 
  ArrowRight, 
  Menu, 
  X, 
  Smartphone, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown,
  Boxes, 
  LogIn,
  Building2,
  Database,
  Layers,
  HelpCircle,
  Calculator,
  ExternalLink,
  Flame
} from "lucide-react";

export default function PromoGnb() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [infraOpen, setInfraOpen] = useState(false);

  const solutionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const infraTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setSolutionsOpen(false);
    setInfraOpen(false);
    
    // 약간의 틱(tick)을 두어 드롭다운 닫힘 후 안정적으로 스크롤
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // Fallback: hash navigation
        window.location.hash = id;
      }
    }, 50);
  };

  const handleSolutionsEnter = () => {
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    setSolutionsOpen(true);
  };
  const handleSolutionsLeave = () => {
    solutionsTimeoutRef.current = setTimeout(() => {
      setSolutionsOpen(false);
    }, 150);
  };

  const handleInfraEnter = () => {
    if (infraTimeoutRef.current) clearTimeout(infraTimeoutRef.current);
    setInfraOpen(true);
  };
  const handleInfraLeave = () => {
    infraTimeoutRef.current = setTimeout(() => {
      setInfraOpen(false);
    }, 150);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-3"
          : "bg-white/90 backdrop-blur-sm border-b border-slate-100 py-3.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* 로고 영역 (절대 줄바꿈 방지) */}
        <Link href="/promo" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-md shadow-indigo-950/20 group-hover:scale-105 transition-transform shrink-0 border border-slate-700/20">
            <img src="/icon.svg" alt="EGDESK Logo" className="w-full h-full object-cover" />
          </div>
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">EGDESK</span>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                Server Edition
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 hidden xl:block">
              우리 회사만의 안전한 사내 AI 시스템
            </p>
          </div>
        </Link>

        {/* 데스크톱 정예 3대 메뉴 (초슬림 & 직관적 그룹화) */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs xl:text-sm font-bold text-slate-600 whitespace-nowrap">
          
          {/* 그룹 1: 솔루션 & AI 앱 드롭다운 */}
          <div 
            className="relative"
            onMouseEnter={handleSolutionsEnter}
            onMouseLeave={handleSolutionsLeave}
          >
            <button
              onClick={() => setSolutionsOpen(!solutionsOpen)}
              className={`flex items-center gap-1.5 py-2 hover:text-indigo-600 transition-colors cursor-pointer ${
                solutionsOpen ? "text-indigo-600 font-extrabold" : ""
              }`}
            >
              <Boxes className="w-4 h-4 text-indigo-500" />
              <span>솔루션 &amp; AI 앱</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${solutionsOpen ? "rotate-180 text-indigo-600" : "text-slate-400"}`} />
            </button>

            {/* 솔루션 메가 드롭다운 */}
            {solutionsOpen && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <button
                  onClick={() => scrollToSection("ai-app-store-story")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 transition-colors flex items-start gap-3 group/item cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-105 transition-transform">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover/item:text-indigo-600 flex items-center gap-1.5">
                      <span>사내 AI 앱스토어</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold">CORE</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      사내 배포, 권한·이력 관리 &amp; 데이터 연동
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => scrollToSection("erp-mes-replacement")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 transition-colors flex items-start gap-3 group/item cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover/item:text-indigo-600">
                      차세대 AI ERP &amp; 스마트 MES
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      수기 입력 0초, 견적·재고·생산·결재 통합
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => scrollToSection("features")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 transition-colors flex items-start gap-3 group/item cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-105 transition-transform">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover/item:text-indigo-600">
                      프라이빗 데이터 레이크
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      흩어진 엑셀·PDF·영수증 단일 집결 &amp; RAG
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => scrollToSection("feature-matrix")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 transition-colors flex items-start gap-3 group/item cursor-pointer border-t border-slate-100 pt-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover/item:text-indigo-600 flex items-center gap-1">
                      <span>전체 AI 앱 카탈로그 (30+)</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      마케팅, SCM, 회계, 인사, 특화 AI 전수 탐색
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 그룹 2: FDE 파견 & 파트너 */}
          <button
            onClick={() => scrollToSection("fde-program")}
            className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1.5 py-2 font-bold text-slate-700"
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>FDE 파견 &amp; 파트너</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-extrabold border border-amber-200">
              NEW
            </span>
          </button>

          {/* 그룹 3: 인프라 & 도입 안내 드롭다운 */}
          <div 
            className="relative"
            onMouseEnter={handleInfraEnter}
            onMouseLeave={handleInfraLeave}
          >
            <button
              onClick={() => setInfraOpen(!infraOpen)}
              className={`flex items-center gap-1.5 py-2 hover:text-indigo-600 transition-colors cursor-pointer ${
                infraOpen ? "text-indigo-600 font-extrabold" : ""
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>인프라 &amp; 도입 안내</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${infraOpen ? "rotate-180 text-indigo-600" : "text-slate-400"}`} />
            </button>

            {infraOpen && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <button
                  onClick={() => scrollToSection("egdesk-server")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-105 transition-transform">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover/item:text-indigo-600">
                      프라이빗 서버 &amp; 보안
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      100% 데이터 주권 &amp; 7종 감사 거버넌스
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => scrollToSection("roi-calculator")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-105 transition-transform">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover/item:text-indigo-600">
                      도입 절감액 계산기
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      기업 규모별 비용·시간 절감 시뮬레이터
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => scrollToSection("faq")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group/item cursor-pointer border-t border-slate-100 pt-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-105 transition-transform">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover/item:text-indigo-600">
                      자주 묻는 질문 (FAQ)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      ERP/MES 대체, 보안 및 도입 Q&amp;A
                    </p>
                  </div>
                </button>

                <a
                  href="https://www.quus.cloud/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-xs font-bold text-slate-600 hover:text-indigo-600"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>(주)쿠스 회사 소개</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            )}
          </div>

        </nav>

        {/* 데스크톱 액션 버튼 (정돈된 3대 액션) */}
        <div className="hidden sm:flex items-center gap-2 xl:gap-2.5 shrink-0 whitespace-nowrap">
          <a
            href="https://egdesk.cloud/login"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs xl:text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5 border border-slate-200/80 shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-500" />
            <span>로그인</span>
          </a>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs xl:text-sm font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>라이브 데모</span>
          </Link>

          <button
            onClick={() => scrollToSection("inquiry")}
            className="px-4 xl:px-5 py-2 xl:py-2.5 text-xs xl:text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>도입 상담 신청</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 모바일 햄버거 버튼 */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => scrollToSection("inquiry")}
            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg shadow-sm"
          >
            도입 문의
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 (체계적 그룹화) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
          
          {/* 모바일 그룹 1: 솔루션 & 플랫폼 */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
              <Boxes className="w-3 h-3 text-indigo-500" />
              <span>솔루션 &amp; AI 앱</span>
            </div>
            <button
              onClick={() => scrollToSection("ai-app-store-story")}
              className="w-full text-left py-2 px-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center justify-between"
            >
              <span>사내 AI 앱스토어 스토리</span>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </button>
            <button
              onClick={() => scrollToSection("erp-mes-replacement")}
              className="w-full text-left py-2 px-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>차세대 AI ERP &amp; 스마트 MES</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="w-full text-left py-2 px-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>프라이빗 데이터 레이크</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => scrollToSection("feature-matrix")}
              className="w-full text-left py-2 px-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>전체 AI 앱 카탈로그 (30+)</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 모바일 그룹 2: FDE & 인프라 */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>FDE &amp; 인프라 안내</span>
            </div>
            <button
              onClick={() => scrollToSection("fde-program")}
              className="w-full text-left py-2 px-2 text-sm font-bold text-purple-600 bg-purple-50/50 hover:bg-purple-50 rounded-lg flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>FDE 파견 &amp; 파트너 모집</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-bold">NEW</span>
            </button>
            <button
              onClick={() => scrollToSection("egdesk-server")}
              className="w-full text-left py-2 px-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>프라이빗 서버 인프라 &amp; 보안</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => scrollToSection("roi-calculator")}
              className="w-full text-left py-2 px-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>도입 절감액 시뮬레이터</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="w-full text-left py-2 px-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>자주 묻는 질문 (FAQ)</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 모바일 하단 바로가기 버튼군 */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <a
              href="https://egdesk.cloud/login"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4 text-slate-600" />
              <span>고객사 웹 로그인 (Cloud)</span>
            </a>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>어드민 라이브 데모 바로가기</span>
            </Link>
            <Link
              href="/m"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center text-sm font-bold text-slate-700 bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span>모바일 포털 체험 (/m)</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
