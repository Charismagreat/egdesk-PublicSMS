"use client";

import React from "react";
import { ShareViewPageProps } from "./types";
import { useSharedView } from "./hooks/useSharedView";
import { SharedViewHeader } from "./components/SharedViewHeader";
import { SharedViewTable } from "./components/SharedViewTable";

export default function ShareViewPage({ params }: ShareViewPageProps) {
  const {
    hash,
    data,
    isLoading,
    error,
    filterQuery,
    setFilterQuery,
    sortColumn,
    sortDirection,
    filteredRows,
    fetchData,
    handleSort,
    handleDownloadExcel
  } = useSharedView(params);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12">
      {/* 은은한 그라데이션 장식 및 상단 테이블 정보 헤더 카드 */}
      <SharedViewHeader 
        hash={hash}
        isLoading={isLoading}
        tableName={data?.friendlyTableName}
        allowCsvDownload={data?.allowCsvDownload}
        onRefresh={fetchData}
        onDownloadExcel={handleDownloadExcel}
      />
      
      {/* 메인 본문 컨테이너 */}
      <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* 실시간 즉석 검색창, 정렬 그리드 및 로딩/에러 뷰 내장 테이블 */}
        <SharedViewTable 
          isLoading={isLoading}
          error={error}
          data={data}
          filteredRows={filteredRows}
          filterQuery={filterQuery}
          setFilterQuery={setFilterQuery}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          handleSort={handleSort}
          onRetry={fetchData}
        />
      </div>
    </div>
  );
}
