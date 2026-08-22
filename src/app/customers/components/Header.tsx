import React from "react";
import { Plus, Users, FileSpreadsheet, Globe } from "lucide-react";

interface HeaderProps {
  onOpenBulkImport: () => void;
  onOpenGoogleSheets: () => void;
  setShowAddModal: (show: boolean) => void;
}

export function Header({ onOpenBulkImport, onOpenGoogleSheets, setShowAddModal }: HeaderProps) {
  return (
    <div className="space-y-3">
      {/* 상단 액션바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl shadow-3xs">
              <Users className="w-7 h-7" />
            </span>
            <span>고객 관리 AI</span>
          </h1>
          <p className="text-slate-500 mt-1.5 text-xs font-semibold pl-12">
            고객 정보 등록, 그룹핑 필터링 및 적립금/거래 이력을 체계적으로 관리하는 스마트 CRM 센터입니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* 1. 엑셀 일괄 등록 버튼 */}
          <button 
            onClick={onOpenBulkImport}
            className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-2xs text-xs cursor-pointer active:scale-95"
            title="엑셀 파일을 업로드하여 고객 데이터를 일괄 등록합니다."
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>엑셀 일괄 등록</span>
          </button>

          {/* 2. 구글 시트 연동 버튼 */}
          <button 
            onClick={onOpenGoogleSheets}
            className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-2xs text-xs cursor-pointer active:scale-95"
            title="구글 스프레드시트 링크와 실시간 연동하여 고객 데이터를 일괄 등록합니다."
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>구글 시트 연동</span>
          </button>

          {/* 3. 신규 고객 등록 버튼 */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/10 text-xs border-none cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>신규 고객 등록</span>
          </button>
        </div>
      </div>
    </div>
  );
}
