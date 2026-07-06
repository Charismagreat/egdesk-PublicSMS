import React from "react";
import { RefreshCw, Download } from "lucide-react";

interface SharedViewHeaderProps {
  hash: string;
  isLoading: boolean;
  tableName: string | undefined;
  allowCsvDownload: boolean | undefined;
  onRefresh: () => Promise<void>;
  onDownloadExcel: () => Promise<void>;
}

export function SharedViewHeader({
  hash,
  isLoading,
  tableName,
  allowCsvDownload,
  onRefresh,
  onDownloadExcel
}: SharedViewHeaderProps) {
  return (
    <>
      {/* 🌌 최상단 은은한 프리미엄 그라데이션 장식 라인 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      {/* 1. 상단 정보 카드 영역 (Glassmorphism & Neon Shadow) */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-50 text-indigo-650 border border-indigo-200 px-2 py-0.5 rounded-full font-black select-none">
              데이터 공유 뷰
            </span>
            <span className="text-[10px] text-slate-400 font-bold font-mono">
              {hash ? `${hash.substring(0, 8)}...` : ""}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
            {isLoading ? "공유 테이블 불러오는 중..." : (tableName || "안전한 공유 뷰어")}
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">
            이 테이블은 사내 공유용으로 실시간 갱신 및 데이터 보안 마스킹 처리가 완료된 상태입니다.
          </p>
        </div>

        {/* 우측 유틸 도구 모음 */}
        {!isLoading && tableName && (
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center justify-center p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-xl cursor-pointer hover:text-slate-700 transition-colors shadow-3xs"
              title="데이터 새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            {allowCsvDownload && (
              <button
                type="button"
                onClick={onDownloadExcel}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-3xs cursor-pointer border-none transition-colors"
                title="정제된 내역을 엑셀로 백업"
              >
                <Download className="w-4 h-4 text-white" />
                엑셀 다운로드
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
