"use client";

import React from "react";
import PromoGnb from "./components/PromoGnb";
import PromoHero from "./components/PromoHero";
import AiAppStoreStory from "./components/AiAppStoreStory";
import ProblemSolution from "./components/ProblemSolution";
import GoogleWorkspaceSyncSection from "./components/GoogleWorkspaceSyncSection";
import FeatureShowcase from "./components/FeatureShowcase";
import FinanceAutomationSection from "./components/FinanceAutomationSection";
import ErpMesReplacementSection from "./components/ErpMesReplacementSection";
import MobilePortalSection from "./components/MobilePortalSection";
import FeatureMatrix from "./components/FeatureMatrix";
import EgdeskInfraSection from "./components/EgdeskInfraSection";
import RoiCalculator from "./components/RoiCalculator";
import FdeSection from "./components/FdeSection";
import PreviewTour from "./components/PreviewTour";
import InquiryForm from "./components/InquiryForm";
import FaqSection from "./components/FaqSection";
import PromoFooter from "./components/PromoFooter";

export default function PromoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* 상단 고정 헤더 GNB */}
      <PromoGnb />

      {/* 히어로 섹션: 우리 회사만의 안전한 사내 AI 시스템 EGDESK */}
      <PromoHero />

      {/* 🌟 사내 AI 앱스토어 탄생 배경 & 3대 병목 해결 스토리 */}
      <AiAppStoreStory />

      {/* 기존 고통 vs 도입 후 혁신 비교 */}
      <ProblemSolution />

      {/* 🌟 [신규] 기존 구글 시트 & 드라이브 원클릭 실시간 연동 (도입 장벽 0%) */}
      <GoogleWorkspaceSyncSection />

      {/* 5대 핵심 솔루션 인터랙티브 쇼케이스 */}
      <FeatureShowcase />

      {/* 🌟 [신규] 3대 금융·세무 자동화 (홈택스 + 통장 + 법인카드) & 표준 엑셀 무손실 이관 */}
      <FinanceAutomationSection />

      {/* 🌟 기존 ERP & MES 완벽 대체 섹션 */}
      <ErpMesReplacementSection />

      {/* 🌟 [신규] PC 앞이 아니어도 완벽한 업무 통제, 모바일 전용 임직원 포털 (/m) */}
      <MobilePortalSection />

      {/* 30+ 전체 기능 검색 & 카테고리별 올인원 디렉토리 */}
      <FeatureMatrix />

      {/* 이지데스크(EGDesk) 서버 인프라 & 프라이빗 데이터 주권 */}
      <EgdeskInfraSection />

      {/* 인터랙티브 ROI 절감액 계산기 */}
      <RoiCalculator />

      {/* 🌟 Forward Deployed Engineer (FDE) 현장 파견 & 파트너 모집 */}
      <FdeSection />

      {/* PC 관제 대시보드 & 모바일 포털 실시간 투어 */}
      <PreviewTour />

      {/* 도입 상담 & 무료 체험 신청 폼 */}
      <InquiryForm />

      {/* 자주 묻는 질문 FAQ */}
      <FaqSection />

      {/* 푸터 */}
      <PromoFooter />
    </main>
  );
}
