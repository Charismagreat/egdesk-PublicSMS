"use client";

import React from "react";
import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";
import DatabaseInitCard from "../DatabaseInitCard";
import CompanySettingsCard from "../CompanySettingsCard";
import SmtpSettingsCard from "../SmtpSettingsCard";
import FaxSettingsCard from "../FaxSettingsCard";
import EstimateSettingsCard from "../EstimateSettingsCard";
import PointSettingsCard from "../../PointSettingsCard";
import MenuSettingsCard from "../MenuSettingsCard";
import FeedbackManagementCard from "../FeedbackManagementCard";

// 설정 페이지의 여러 설정 카드들을 레이아웃에 맞춰 배치하는 컨테이너 컴포넌트
export function SettingsContainer() {
  return (
    <div className="space-y-6">
      {/* 데이터베이스 초기화 카드 */}
      <DatabaseInitCard />
      
      {/* 회사 설정 카드 */}
      <CompanySettingsCard />
      
      {/* 발송 메일 SMTP 설정 카드 */}
      <SmtpSettingsCard />

      {/* 팩스 발신 설정 카드 */}
      <FaxSettingsCard />
      
      {/* AI 설정 및 모니터링 독립 페이지 바로가기 카드 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-extrabold text-slate-800">
              AI 비서 및 하이브리드 라우팅 설정
            </h3>
            <p className="text-xs text-slate-450 mt-1 leading-relaxed">
              구글 Gemini 클라우드 및 로컬 LLM(Ollama) 분기 작동 방식을 지능적으로 구성하고, 실시간 API 토큰 사용량 감사 대시보드를 제공하는 독립 전용 페이지로 이동합니다.
            </p>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto">
          <Link
            href="/ai-settings"
            className="flex items-center justify-center gap-1.5 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all w-full shadow-xs hover:shadow active:scale-95 duration-150"
          >
            설정 대시보드로 이동
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 견적/발주 AI 할인 및 템플릿 커스텀 설정 카드 */}
      <EstimateSettingsCard />
      
      {/* 포인트 설정 카드 */}
      <PointSettingsCard />
      
      {/* 메뉴 설정 카드 */}
      <MenuSettingsCard />
      
      {/* 피드백 관리 카드 */}
      <FeedbackManagementCard />
    </div>
  );
}
