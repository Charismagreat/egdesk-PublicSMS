"use client";

import React from "react";
import { useCreditRisk } from "./hooks/useCreditRisk";
import CreditRiskCard from "./components/CreditRiskCard";
import CollectionCard from "./components/CollectionCard";
import { Sparkles, CheckCircle2, ShieldAlert, AlertCircle, Coins, ShieldCheck } from "lucide-react";

/**
 * 채권 관리 AI (AI Credit Risk Advisor) 메인 대시보드
 */
export default function CreditRiskPage() {
  const {
    isLoading,
    isRecalculating,
    isSending,
    toast,
    stats,
    summary,
    aging,
    selectedPartnerId,
    recalculateCreditRisk,
    sendOverdueSms,
    handlePrintNotice,
    setSelectedPartnerId
  } = useCreditRisk();

  const totalPartners = stats.length;
  const criticalCount = stats.filter(s => s.riskLevel === "CRITICAL").length;
  const warningCount = stats.filter(s => s.riskLevel === "WARNING").length;

  const selectedPartner = stats.find(s => s.id === selectedPartnerId) || null;

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="채권 관리 AI: 미수금 회수 현황을 분석하고 연체 방지를 위한 AI 추심 관리 및 독촉 SMS를 전계합니다.">
      
      {/* 헤더 및 타이틀 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Coins className="w-8 h-8 text-indigo-650 mr-3" />
            채권 관리 AI
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            B2B 매출채권의 지연 및 부도 리스크를 머신러닝 기반 신용점수로 진단하고, 공정채권추심법 가이드라인을 통과한 SMS 자동 독촉 및 최고장 인쇄 솔루션을 제공합니다.
          </p>
        </div>
      </div>

      {/* 주요 통계 요약 스코어카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4 text-left">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-extrabold block">관리 거래처</span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {totalPartners} <span className="text-xs text-slate-400 font-bold">개사</span>
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50/50">
            <Coins className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4 text-left">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-extrabold block">부도 고위험군</span>
            <span className="text-2xl font-black text-rose-550 font-mono">
              {criticalCount} <span className="text-xs text-rose-350 font-bold">개사</span>
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50/50">
            <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4 text-left">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-extrabold block">수금 경고/주의</span>
            <span className="text-2xl font-black text-amber-550 font-mono">
              {warningCount} <span className="text-xs text-amber-300 font-bold">개사</span>
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/50">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* 로딩 표시 */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-bold">거래처 거래 원장 및 미수금 연체 기간을 AI 분석기로 분석하고 있습니다...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 전사 리스크 요인 요약 배너 */}
          {summary && summary.riskFactors.length > 0 && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
              <span className="block text-[9px] text-slate-400 font-black">AI 채권 관리 통합 진단 리포트</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {summary.riskFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[9px] font-bold text-slate-650 bg-white border border-slate-100 p-2.5 rounded-xl">
                    <span className="shrink-0">{factor.startsWith("⚠️") ? "⚠️" : factor.startsWith("💡") ? "💡" : "ℹ️"}</span>
                    <p className="leading-relaxed">{factor.replace(/^[⚠️💡ℹ️]\s*/, "")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 메인 관제 콘텐츠 2컬럼 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 좌측: 거래처 신용 위험 대장 */}
            <div className="lg:col-span-7 h-[680px]">
              <CreditRiskCard
                stats={stats}
                aging={aging}
                selectedPartnerId={selectedPartnerId}
                onSelectPartner={setSelectedPartnerId}
                onRecalculate={recalculateCreditRisk}
                isRecalculating={isRecalculating}
              />
            </div>

            {/* 우측: 수금 관리 및 독촉 제어 솔루션 */}
            <div className="lg:col-span-5 h-[680px]">
              <CollectionCard
                partner={selectedPartner}
                onSendSms={sendOverdueSms}
                onPrintNotice={handlePrintNotice}
                isSending={isSending}
              />
            </div>
          </div>

        </div>
      )}

      {/* 토스트 알림 팝업 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-left border ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-650 shrink-0" />
            ) : toast.type === "error" ? (
              <ShieldAlert className="w-5 h-5 text-rose-650 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-650 shrink-0" />
            )}
            <div>
              <span className="block text-[10px] font-bold">
                {toast.type === "success" ? "작업 성공" : toast.type === "error" ? "오류 발생" : "알림 경고"}
              </span>
              <p className="text-[10px] font-black mt-0.5">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
