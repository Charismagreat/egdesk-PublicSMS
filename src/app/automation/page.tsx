"use client";

import React from "react";
import { useAutomation } from "./hooks/useAutomation";
import { AutomationHeader } from "./components/AutomationHeader";
import { AutomationInfo } from "./components/AutomationInfo";
import { AutomationGrid } from "./components/AutomationGrid";

export default function AutomationPage() {
  const {
    templates,
    rules,
    isSaving,
    toggleRule,
    changeTemplate,
    saveRules
  } = useAutomation();

  return (
    <div className="space-y-6" data-easybot-hint="자동 발송 설정: 예약 문자, 조건별 자동 발송 등 이벤트 트리거 기반 메시지 자동화 규칙을 설정합니다.">
      {/* 타이틀 및 저장 버튼 헤더 바 */}
      <AutomationHeader 
        isSaving={isSaving}
        onSave={saveRules}
      />

      {/* 가이드 안내 카드 영역 */}
      <AutomationInfo />

      {/* 10개 이벤트 토글 2열 카드 그리드 영역 */}
      <AutomationGrid 
        rules={rules}
        templates={templates}
        toggleRule={toggleRule}
        changeTemplate={changeTemplate}
      />
    </div>
  );
}
