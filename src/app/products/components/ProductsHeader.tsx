"use client";

import React from "react";
import { PackageSearch, FileSpreadsheet, Globe } from "lucide-react";

interface ProductsHeaderProps {
  onOpenBulkUpload: () => void;
  onOpenGoogleSheets: () => void;
}

export function ProductsHeader({
  onOpenBulkUpload,
  onOpenGoogleSheets
}: ProductsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full text-slate-800">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-2xl shadow-3xs">
            <PackageSearch className="w-7 h-7" />
          </span>
          <span>상품 관리 AI</span>
        </h1>
        <p className="text-slate-500 mt-1.5 text-xs font-semibold pl-12">
          플랫폼에 등록된 상품 명세, 규격, 판매 가격 및 채널별 판매 활성화 상태를 체계적으로 관리합니다.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {/* 1. 엑셀 업로드 버튼 */}
        <button 
          onClick={onOpenBulkUpload}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs hover:shadow transition-all cursor-pointer active:scale-95 shrink-0"
          title="엑셀 파일(.xlsx, .csv)을 업로드하여 상품 데이터를 일괄 등록합니다."
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>엑셀 업로드</span>
        </button>
        
        {/* 2. 구글 시트 업로드 버튼 */}
        <button 
          onClick={onOpenGoogleSheets}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs hover:shadow transition-all cursor-pointer active:scale-95 shrink-0"
          title="구글 스프레드시트 링크와 실시간 연동하여 상품 데이터를 일괄 등록합니다."
        >
          <Globe className="w-4 h-4 text-blue-600" />
          <span>구글 시트 업로드</span>
        </button>
      </div>
    </div>
  );
}
