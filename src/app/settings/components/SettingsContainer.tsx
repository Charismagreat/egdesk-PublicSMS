"use client";

import React from "react";
import DatabaseInitCard from "../DatabaseInitCard";
import CompanySettingsCard from "../CompanySettingsCard";
import SmtpSettingsCard from "../SmtpSettingsCard";
import FaxSettingsCard from "../FaxSettingsCard";
import AiSettingsCard from "../../AiSettingsCard";
import EstimateSettingsCard from "../EstimateSettingsCard";
import PointSettingsCard from "../../PointSettingsCard";
import AiUsageMonitor from "../../AiUsageMonitor";
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
      
      {/* AI 설정 카드 */}
      <AiSettingsCard />

      {/* 견적/발주 AI 할인 및 템플릿 커스텀 설정 카드 */}
      <EstimateSettingsCard />
      
      {/* AI 사용량 모니터링 카드 */}
      <AiUsageMonitor />
      
      {/* 포인트 설정 카드 */}
      <PointSettingsCard />
      
      {/* 메뉴 설정 카드 */}
      <MenuSettingsCard />
      
      {/* 피드백 관리 카드 */}
      <FeedbackManagementCard />
    </div>
  );
}
