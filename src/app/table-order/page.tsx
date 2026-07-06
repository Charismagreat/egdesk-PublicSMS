"use client";

import { useTableOrderEntry } from "./hooks/useTableOrderEntry";
import { TableOrderEntryHeader } from "./components/TableOrderEntryHeader";
import { TableOrderEntryForm } from "./components/TableOrderEntryForm";

// 테이블 오더 진입 메인 오케스트레이터 컴포넌트
export default function TableOrderEntryPage() {
  // 테이블 번호 상태 및 라우팅 제어 핸들러 획득
  const entryState = useTableOrderEntry();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
        {/* 상단 타이틀 및 가이드 */}
        <TableOrderEntryHeader />
        
        {/* 중앙 테이블 번호 입력 폼 */}
        <TableOrderEntryForm {...entryState} />
      </div>
    </div>
  );
}

