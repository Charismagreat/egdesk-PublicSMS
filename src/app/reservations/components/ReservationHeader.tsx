import React from "react";
import { CalendarDays, Download, FileSpreadsheet } from "lucide-react";

interface ReservationHeaderProps {
  isUploadingExcel: boolean;
  handleExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDownloadSample: () => Promise<void>;
}

export function ReservationHeader({
  isUploadingExcel,
  handleExcelUpload,
  handleDownloadSample
}: ReservationHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center">
        <CalendarDays className="w-8 h-8 mr-3 text-indigo-500" /> 예약 관리 AI
      </h1>
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownloadSample}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer"
          title="엑셀 표준 샘플 서식 파일 다운로드"
        >
          <Download className="w-3.5 h-3.5" />
          샘플 서식 다운로드
        </button>
        <label className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-all">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          {isUploadingExcel ? "업로드 중..." : "엑셀 파일 일괄 등록"}
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelUpload}
            disabled={isUploadingExcel}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
