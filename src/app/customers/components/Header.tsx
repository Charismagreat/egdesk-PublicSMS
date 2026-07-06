import React from "react";
import { Plus, Users } from "lucide-react";

interface HeaderProps {
  isUploading: boolean;
  handleCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowAddModal: (show: boolean) => void;
}

export function Header({ isUploading, handleCsvUpload, setShowAddModal }: HeaderProps) {
  return (
    <>
      {/* 1. 상단 액션바 (PC용 고정 정렬) */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
          <Users className="w-8 h-8 text-green-500 mr-3" />
          고객 관리 AI
        </h1>
        <div className="flex space-x-2">
          <label className={`bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center shadow-sm text-xs ${isUploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
            {isUploading ? "업로드 중..." : "CSV/엑셀 일괄 등록"}
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center shadow-sm text-xs border-none cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            신규 등록
          </button>
        </div>
      </div>

      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <div>
              <p className="font-bold text-xs">연락처를 업로드하는 중입니다...</p>
              <p className="text-xs mt-1 text-slate-500">파일의 연락처를 분석하고 데이터베이스에 저장하고 있습니다.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
