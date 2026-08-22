import React from "react";
import { Plus, Users, FileSpreadsheet, Upload } from "lucide-react";

interface HeaderProps {
  isUploading: boolean;
  handleCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowAddModal: (show: boolean) => void;
}

export function Header({ isUploading, handleCsvUpload, setShowAddModal }: HeaderProps) {
  return (
    <div className="space-y-3">
      {/* 1. 상단 액션바 */}
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

        <div className="flex items-center gap-2.5 shrink-0">
          <label className={`bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-2xs text-xs cursor-pointer active:scale-95 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isUploading ? "업로드 중..." : "CSV/엑셀 일괄 등록"}</span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleCsvUpload}
              disabled={isUploading}
            />
          </label>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/10 text-xs border-none cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>신규 고객 등록</span>
          </button>
        </div>
      </div>

      {isUploading && (
        <div className="bg-indigo-50/80 border border-indigo-200 text-indigo-900 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
            <div>
              <p className="font-extrabold text-xs">고객 연락처 데이터를 분석하고 있습니다...</p>
              <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">파일 내의 연락처와 태그 정보를 확인하여 데이터베이스에 안전하게 등록 중입니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
