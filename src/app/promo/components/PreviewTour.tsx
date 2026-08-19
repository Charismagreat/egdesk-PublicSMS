"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Monitor, Smartphone, FileText, ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";

export default function PreviewTour() {
  const [activeScreen, setActiveScreen] = useState<"desktop" | "mobile" | "ocr">("desktop");

  return (
    <section className="py-20 md:py-28 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LIVE INTERACTIVE TOUR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            PC 관제탑부터 스마트폰 모바일 포털까지
          </h2>
          <p className="mt-4 text-base text-slate-600">
            사무실 컴퓨터와 현장 스마트폰이 실시간으로 동기화되어 언제 어디서나 빈틈없이 경영을 통제합니다.
          </p>
        </div>

        {/* 탭 셀렉터 */}
        <div className="mt-10 flex justify-center gap-3">
          <button
            onClick={() => setActiveScreen("desktop")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeScreen === "desktop"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>PC CEO 관제 대시보드</span>
          </button>

          <button
            onClick={() => setActiveScreen("mobile")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeScreen === "mobile"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>스마트 모바일 포털 (/m)</span>
          </button>

          <button
            onClick={() => setActiveScreen("ocr")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeScreen === "ocr"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>AI 비전 서류 판독 뷰어</span>
          </button>
        </div>

        {/* 인터랙티브 쇼케이스 프레임 */}
        <div className="mt-10 max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-lg">
          {activeScreen === "desktop" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-xl font-black text-slate-900">
                    전사 경영 관제탑 — 실시간 통합 대시보드
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    FreeSMS 발송 상태, 오늘 수/발주 현황, 실재고 경보, 지출 결재를 단일 뷰에서 실시간 모니터링
                  </p>
                </div>
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>실제 PC 화면 접속</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 목업 그래픽 */}
              <div className="rounded-2xl bg-slate-900 p-6 text-white space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="text-xs text-slate-400">데이터 레이크 적재율</div>
                    <div className="text-2xl font-black text-blue-400 mt-1">100 %</div>
                    <div className="text-[11px] text-emerald-400 mt-1">전사 데이터 무손실 집결</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="text-xs text-slate-400">AI 견적/수주 전환율</div>
                    <div className="text-2xl font-black text-indigo-400 mt-1">94.2 %</div>
                    <div className="text-[11px] text-slate-300 mt-1">3초 내 전산 자동 적재</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <div className="text-xs text-slate-400">지출 영수증 자동 승인율</div>
                    <div className="text-2xl font-black text-amber-400 mt-1">100 %</div>
                    <div className="text-[11px] text-slate-300 mt-1">이중 전표 입력 제로</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeScreen === "mobile" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-xl font-black text-slate-900">
                    스마트 모바일 포털 (`/m`) — 대표 &amp; 임직원 현장 비서
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    출퇴근 체크, 현장 사진 스냅태스크 업로드, 모바일 영수증 결재, 원클릭 고객 문자 발송
                  </p>
                </div>
                <Link
                  href="/m"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>모바일 포털 접속</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 모바일 목업 카드 */}
              <div className="max-w-sm mx-auto bg-slate-900 rounded-3xl p-5 text-white border-4 border-slate-800 shadow-xl space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">이지데스크 모바일</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">연결됨</span>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl">
                  <div className="text-[11px] text-slate-400">원터치 출퇴근 &amp; 전자결재</div>
                  <div className="text-sm font-bold text-white mt-0.5">정상 출근 체크 (08:58)</div>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl">
                  <div className="text-[11px] text-slate-400">현장 스냅태스크 피드</div>
                  <div className="text-sm font-bold text-indigo-300 mt-0.5">시공 현장 도면 사진 업로드 완료</div>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl">
                  <div className="text-[11px] text-slate-400">대표이사 모바일 결재</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">결재 대기 0건 (Inbox Zero)</div>
                </div>
              </div>
            </div>
          )}

          {activeScreen === "ocr" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-xl font-black text-slate-900">
                    Gemini AI Vision 멀티모달 서류 판독 뷰어
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    견적서, 계약서, 원산지증명서, 통관 서류를 올리면 품목 명세와 세액을 3초 만에 한글 요약 리포트로 변환
                  </p>
                </div>
                <Link
                  href="/estimates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>견적 AI OCR 체험</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* OCR 뷰어 목업 */}
              <div className="rounded-2xl bg-slate-900 p-6 text-white space-y-4">
                <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-indigo-400 font-bold">🌟 AI Daily 시각 판독 리포트</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      공급사 견적서 (PDF) 판독 완료 — 14개 품목, 공급가액 ₩ 14,800,000
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full">
                    실재고 매핑 100%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
