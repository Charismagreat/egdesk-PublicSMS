"use client";

import React from "react";
import { PackageSearch } from "lucide-react";

interface ProductsHeaderProps {
  isUploadingExcel: boolean;
  onDownloadSample: () => void;
  onExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProductsHeader({
  isUploadingExcel,
  onDownloadSample,
  onExcelUpload
}: ProductsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full text-slate-800">
      <h1 className="text-3xl font-bold flex items-center">
        <PackageSearch className="w-8 h-8 mr-3 text-blue-600" /> 
        상품 관리 AI
      </h1>
      <div className="flex items-center gap-2">
        {/* 📄 표준 양식 다운로드 버튼 */}
        <button 
          onClick={onDownloadSample}
          className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 shrink-0"
          title="표준 엑셀 샘플 서식 (.xlsx) 다운로드"
        >
          샘플 서식 다운로드
        </button>
        
        {/* 📥 엑셀 일괄 등록 버튼 */}
        <label 
          className={`flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 shrink-0 ${
            isUploadingExcel ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span>{isUploadingExcel ? '일괄 등록 중...' : '엑셀 파일 일괄 등록'}</span>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={onExcelUpload} 
            disabled={isUploadingExcel}
            className="hidden" 
          />
        </label>
      </div>
    </div>
  );
}
