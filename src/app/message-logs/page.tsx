"use client";

import React from "react";
import { useMessageLogs } from "./hooks/useMessageLogs";
import { MessageLogsHeader } from "./components/MessageLogsHeader";
import { MessageLogsFilter } from "./components/MessageLogsFilter";
import { MessageLogsTable } from "./components/MessageLogsTable";
import { MessageLogsPagination } from "./components/MessageLogsPagination";

export default function MessageLogsPage() {
  const {
    data,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    activePreset,
    setActivePreset,
    isMounted,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    formatKoreanTime,
    setPreset,
    parseSenderDevice
  } = useMessageLogs();

  return (
    <div className="space-y-6 pb-20" data-easybot-hint="발송 내역 조회: 발송된 SMS/LMS 메시지의 성공 여부, 발송 단말 및 대상자 세부 로그를 조회합니다.">
      {/* 타이틀 헤더 바 */}
      <MessageLogsHeader />
      
      {/* 2단 구조 필터바 (즉석 검색 및 날짜 기간 설정) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <MessageLogsFilter 
          filteredCount={filteredData.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isMounted={isMounted}
          activePreset={activePreset}
          setPreset={setPreset}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          setActivePreset={setActivePreset}
        />

        {/* 발송 데이터 내역 테이블 영역 */}
        <MessageLogsTable 
          data={filteredData}
          paginatedData={paginatedData}
          formatKoreanTime={formatKoreanTime}
          parseSenderDevice={parseSenderDevice}
        />

        {/* 페이지네이션 하단 컨트롤 바 */}
        <MessageLogsPagination 
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          filteredDataLength={filteredData.length}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      </div>
    </div>
  );
}
