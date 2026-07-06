"use client";

import React from "react";
import { useGrantManagement } from "./hooks/useGrantManagement";
import GrantMatchCard from "./components/GrantMatchCard";
import RndPlanBuilderCard from "./components/RndPlanBuilderCard";
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, Award, Building2 } from "lucide-react";

/**
 * 지원금 신청 AI (AI Grant Hunter) 메인 대시보드
 */
export default function GrantManagementPage() {
  const {
    isLoading,
    isGenerating,
    toast,
    announcements,
    companyProfile,
    selectedAnnId,
    rndPlan,
    hasSearched,
    syncInterval,
    lastSyncTime,
    handleSearchGrants,
    handleSaveSchedule,
    handleToggleBookmark,
    handleGenerateRndPlan,
    handleUpdateSection,
    handleExportCsv,
    isSyncing,
  } = useGrantManagement();

  const bookmarkedCount = announcements.filter((a) => a.isBookmarked).length;
  const averageMatch = Math.round(
    announcements.reduce((acc, curr) => acc + curr.matchScore, 0) / (announcements.length || 1)
  );

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="지원금 신청 AI: 정부 정책 무상 출연금 및 R&D 지원 정책의 자격 요건 판별과 매칭을 가이드합니다.">
      
      {/* 헤더 및 타이틀 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Award className="w-8 h-8 text-indigo-600 mr-3" />
            지원금 신청 AI
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            정부 지원 사업(보조금, R&D 과제) 공고를 실시간 스캔하여 당사 프로필과 매칭하고, 혁신성장 R&D 과제 계획서의 핵심 원고 초안을 인공지능이 즉석에서 설계해 줍니다.
          </p>
        </div>
      </div>

      {/* 주요 통계 요약 스코어카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4 text-left">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-extrabold block">매칭 대상 공고</span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {announcements.length} <span className="text-xs text-slate-400 font-bold">건</span>
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50/50">
            <Award className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4 text-left">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-extrabold block">관심 보관함</span>
            <span className="text-2xl font-black text-amber-550 font-mono">
              {bookmarkedCount} <span className="text-xs text-amber-300 font-bold">건</span>
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/50">
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4 text-left">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-extrabold block">평균 매칭 적합도</span>
            <span className="text-2xl font-black text-emerald-650 font-mono">
              {hasSearched ? `${averageMatch}%` : "0%"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* 로딩 표시 */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-bold">정부 혜택 및 지원 사업 공고를 동기화 중입니다...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 좌측: 공고 목록 또는 찾기 대기 버튼 */}
          <div className="lg:col-span-6">
            {!hasSearched ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm animate-pulse">
                  <Award className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-lg font-bold text-slate-800">나에게 맞는 지원금 찾기</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    시스템 설정의 본사 정보, MY DB 재무제표 수치, 그리고 사내 HR 임직원 현황 및 특허 목록을 실시간 종합 수집하여 최적의 정부 지원금 공고를 매칭합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSearchGrants}
                  className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:from-indigo-600 hover:to-indigo-750 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 animate-bounce" />
                  <span>사내 DB 스캔 및 지원금 찾기</span>
                </button>
              </div>
            ) : (
              <GrantMatchCard
                announcements={announcements}
                onToggleBookmark={handleToggleBookmark}
                onGenerateRndPlan={handleGenerateRndPlan}
                selectedAnnId={selectedAnnId}
                isGenerating={isGenerating}
                syncInterval={syncInterval}
                lastSyncTime={lastSyncTime}
                onSaveSchedule={handleSaveSchedule}
                onSearchGrants={handleSearchGrants}
                isSyncing={isSyncing}
              />
            )}
          </div>

          {/* 우측: R&D 사업계획서 빌더 및 회사 프로필 */}
          <div className="lg:col-span-6 space-y-6">
            {/* 당사 AI 매칭 프로필 정보 (우측 그리드 이동) */}
            {companyProfile && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs text-left space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Building2 className="w-4.5 h-4.5 text-slate-500" />
                  <span className="text-xs font-black text-slate-700">당사 AI 매칭 프로필 정보</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9.5px] font-bold text-slate-550">
                  <div>
                    <span className="block text-[8px] text-slate-400 font-black">업태 및 분야</span>
                    <span className="text-slate-800 text-[10.5px] font-black">{companyProfile.sector}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-black">설립 연도 (업력)</span>
                    <span className="text-slate-800 text-[10.5px] font-mono font-black">
                      {companyProfile.establishmentYear}년 (창업 4년차)
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-black">보유 특허</span>
                    <span className="text-indigo-600 text-[10.5px] font-mono font-black">
                      {companyProfile.patentsCount}건
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-black">근로자 비율 (청년/여성)</span>
                    <span className="text-slate-800 text-[10.5px] font-mono font-black">
                      청년 {companyProfile.youthEmployeeRatio}% / 여성 {companyProfile.femaleEmployeeRatio}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <RndPlanBuilderCard
              announcements={announcements}
              rndPlan={rndPlan}
              isGenerating={isGenerating}
              onUpdateSection={handleUpdateSection}
              onExportCsv={handleExportCsv}
            />
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
