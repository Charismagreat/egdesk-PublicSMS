"use client";

import React from "react";
import Link from "next/link";
import { Server, ShieldCheck, ArrowUp, Phone, Mail, MapPin } from "lucide-react";

export default function PromoFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* 기업 및 솔루션 소개 */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-indigo-950/40 border border-slate-700/60 shrink-0">
                <img src="/icon.svg" alt="EGDESK Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">EGDESK</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
                Server Edition
              </span>
            </div>
            <div className="space-y-2 max-w-lg">
              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                EGDESK는 중소기업을 위한 <strong>&apos;사내 AI 앱스토어 &amp; 데이터 플랫폼&apos;</strong>입니다.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                현업이 만든 수많은 실무 AI 툴을 개인 노트북에 묵혀두지 않고, <strong>안전한 사내 배포</strong>, <strong>역할별 권한·이력 관리</strong>, <strong>사내 데이터 안전 연동</strong>을 통해 전사로 안전하게 확산시키는 우리 회사만의 프라이빗 AI 공간입니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>100% 프라이빗 데이터 주권 &amp; 7종 감사 거버넌스 보증</span>
            </div>
          </div>

          {/* 솔루션 바로가기 */}
          <div className="space-y-3">
            <div className="text-sm font-bold text-white uppercase tracking-wider">주요 솔루션 &amp; 바로가기</div>
            <ul className="space-y-2 text-xs">
              <li><a href="https://egdesk.cloud/login" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold hover:text-white transition-colors">🔐 고객사 웹 로그인 (Cloud)</a></li>
              <li><Link href="/estimates" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">3초 AI Vision OCR 견적/발주</Link></li>
              <li><Link href="/expenses" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">법인카드 영수증 RPA</Link></li>
              <li><Link href="/snaptasks" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">전사 협업 스냅태스크</Link></li>
              <li><Link href="/knowledge-ai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">사내 RAG 지식관리 AI</Link></li>
              <li><Link href="/m" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">스마트 모바일 포털 (/m)</Link></li>
            </ul>
          </div>

          {/* 공식 회사 정보 ((주)쿠스) */}
          <div className="space-y-3">
            <div className="text-sm font-bold text-white uppercase tracking-wider">회사 정보 (Company)</div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="text-slate-200 font-bold">(주)쿠스 (QUUS AI)</div>
              <div>대표자: 차민수</div>
              <div>사업자등록번호: 731-81-02023</div>
              <div>주소: 경기도 시흥시 서울대학로 59-69 배곧테크노밸리 609호</div>
              <div className="pt-1 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>010-7216-5884 / 010-2412-7674</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>m8chaa@gmail.com</span>
              </div>
              <div className="pt-1">
                <a
                  href="https://www.quus.cloud/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
                >
                  공식 홈페이지: www.quus.cloud
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* 하단 카피라이트 & 맨 위로 가기 */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} (주)쿠스 (QUUS). All rights reserved. Powered by EGDesk Private Server.
          </div>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>맨 위로 이동</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
}
