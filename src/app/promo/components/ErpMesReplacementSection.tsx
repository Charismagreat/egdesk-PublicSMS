"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Factory, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Zap, 
  ScanLine, 
  Receipt, 
  Barcode, 
  Cpu, 
  Camera, 
  CheckSquare, 
  AlertTriangle,
  ShieldCheck,
  Smartphone
} from "lucide-react";

export default function ErpMesReplacementSection() {
  const [activeTab, setActiveTab] = useState<"erp" | "mes">("erp");

  return (
    <section id="erp-mes-replacement" className="scroll-mt-20 py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>NEXT-GEN ERP & MES REPLACEMENT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            비싸고 복잡한 <strong>기존 ERP와 MES</strong>,<br className="hidden sm:inline" />
            이지데스크가 완벽히 대체합니다
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            월 구독료와 전산 인력 부담, 끝없는 수기 타이핑 입력 때문에 결국 엑셀로 돌아가셨나요?<br className="hidden sm:inline" />
            <strong>AI 자동화(Zero-Typing)와 스마트폰 연동</strong>으로 중소기업 운영의 패러다임을 바꿉니다.
          </p>
        </div>

        {/* ERP vs MES 탭 전환 */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab("erp")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "erp"
                  ? "bg-white text-indigo-600 shadow-md shadow-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>중소기업 ERP 대체 (영업·회계·재고·결재)</span>
            </button>

            <button
              onClick={() => setActiveTab("mes")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "mes"
                  ? "bg-white text-indigo-600 shadow-md shadow-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Factory className="w-4 h-4" />
              <span>스마트 제조 MES 대체 (생산·품질·안전·협업)</span>
            </button>
          </div>
        </div>

        {/* 탭 1: ERP 대체 콘텐츠 */}
        {activeTab === "erp" && (
          <div className="mt-12 space-y-8 max-w-5xl mx-auto">
            {/* 요약 배너 */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-indigo-700 uppercase">Legacy ERP vs EGDesk</div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  유저당 월 과금 & 수기 입력 지옥 탈출 → AI 자동 적재 & 100% 프라이빗 서버
                </h3>
              </div>
              <div className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shrink-0 shadow-sm">
                구독료 0원화 & 수기 입력 0초
              </div>
            </div>

            {/* 4대 ERP 대체 핵심 영역 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 카드 1: 견적 / 수발주 */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    1. 견적서 & 수발주 관리
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 ERP: 직원이 지면 견적서를 보고 일일이 수기 타이핑
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 3초 AI Vision OCR & 원클릭 발주/수주 전환
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Gemini Vision이 거래처 견적서를 3초 만에 품목·단가·수량 데이터로 파싱하여 오타 없이 전산에 적재하고, 승인 시 카카오 알림톡을 바이어에게 자동 발송합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/estimates" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    견적/발주 AI 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 카드 2: 재고 / 바코드 */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    2. 실재고 & 바코드(INV-ID)
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 ERP: 수기 수량과 창고 실재고 불일치 빈번
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 실물 검수 승인 & 시계열 로그(inventory_logs) 영구 보존
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    실제 눈으로 확인한 수량만큼 입력 승인하면 재고가 자동 누적되고, 마스터 바코드 및 <code className="text-indigo-600 font-mono">INV-&#123;id&#125;</code> 표준 코드로 전사 재고를 체계화합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/inventory" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    재고 관리 AI 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 카드 3: 지출 / 영수증 RPA */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    3. 경비 지출 & 영수증 회계 RPA
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 ERP: 월말마다 종이 영수증 풀칠 & 수기 분개 전표 작성
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 영수증 드래그앤드롭 즉시 전표 자동 적재 & 계정과목 3단 분류
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    신용카드 거래 건에 영수증 사진을 올리면 판관비/원가 계정과목을 자동 분류하여 지출 대장(crm_expenses)에 승인 상태로 즉시 적재하여 이중 입력이 소멸됩니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/expenses" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    지출 관리 AI 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 카드 4: 모바일 ERP 결재 */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    4. 대표이사 모바일 ERP 결재
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 ERP: 사무실 PC에서만 접속 가능, 출장 중 결재 지연
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 스마트폰 모바일 포털(/m) Inbox Zero 원터치 결재
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    자동 승인된 건은 결재 대기 목록에서 안전하게 배제되고, 대표자가 확인해야 할 건만 모바일 푸시로 제공되어 이동 중에도 결재 지연 제로를 달성합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/expenses/mobile-approve" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    모바일 결재 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 탭 2: MES 대체 콘텐츠 */}
        {activeTab === "mes" && (
          <div className="mt-12 space-y-8 max-w-5xl mx-auto">
            {/* 요약 배너 */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-6 rounded-3xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-emerald-700 uppercase">Legacy MES vs EGDesk Smart MES</div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  고가 키오스크 단말기 & 복잡한 입력 거부 탈출 → 스마트폰 협업 & AI 안전·품질 관리
                </h3>
              </div>
              <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shrink-0 shadow-sm">
                현장 단말기 설치비 0원 & 모바일 실시간 싱크
              </div>
            </div>

            {/* 4대 MES 대체 핵심 영역 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 카드 1: 생산 계획 */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-4">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    1. 수주 연동 생산 계획 (MES)
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 MES: 수주 변경 시 복잡한 일정 수동 재설정 및 납기 지연
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 수주 즉시 공정 스케줄링 & 시각화 간트차트 자동 편성
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    바이어 수주 내역과 연동되어 라인별 작업 지시서가 자동 발행되고, 납기 일정에 맞춘 공정 진척도를 실시간 집계합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/production-plan" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                    생산 계획 MES 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 카드 2: 현장 스냅태스크 */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                    <Camera className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    2. 현장 스냅태스크 피드 (SnapTask)
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 MES: 현장 단말기에 일일이 수기 입력하느라 소통 단절
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 스마트폰으로 사진·도면 PDF·음성 촬영 즉시 타임라인 피드 공유
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    공장 현장과 사무실이 실시간으로 사진, 시공 도면, 녹취 메모를 공유하고 AI가 액션 아이템과 후속 조치를 자동 정리합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/snaptasks" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                    스냅태스크 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 카드 3: 품질 관리 QC */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    3. 품질 관리 (QC) & 불량 분석
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 MES: 불량 일지 엑셀 수기 관리로 원인 분석 부재
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 수입 검사, 공정 불량률 통계 & 원인별 파레토 분석
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    원자재 입고 검수부터 공정 불량 발생 유형을 데이터로 축적하여 품질 개선 피드백을 생산 라인에 즉시 전달합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/quality-control" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                    품질 관리 QC 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 카드 4: AI 안전사고 감지 */}
              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-2">
                    4. AI 안전사고 감지 & 중대재해 예방
                  </h4>
                  <div className="text-xs text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> 기존 환경: 안전관리자 1인의 수기 순찰에만 의존
                  </div>
                  <div className="text-xs text-emerald-800 font-bold mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 이지데스크: 작업장 사진/CCTV 기반 보호구 미착용 AI 실시간 감지 & 일지 자동화
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    현장 안전 수칙 위반 요소를 감지하여 관리자에게 즉각 경보를 울리고 중대재해처벌법 대응 안전 점검 일지를 자동으로 보관합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <Link href="/safety-detection" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                    AI 안전 관리 확인하기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
