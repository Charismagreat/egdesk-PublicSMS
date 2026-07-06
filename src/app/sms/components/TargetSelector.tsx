import React from "react";
import { Search, Download, Upload, X, FileText } from "lucide-react";
import { Customer } from "../types";

interface TargetSelectorProps {
  targetMode: 'db' | 'excel';
  setTargetMode: (mode: 'db' | 'excel') => void;
  dbSearchQuery: string;
  setDbSearchQuery: (val: string) => void;
  excelSearchQuery: string;
  setExcelSearchQuery: (val: string) => void;
  fetchCustomers: () => void;
  paginatedDbCustomers: Customer[];
  selectedIds: Set<number>;
  toggleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleSelect: (id: number) => void;
  dbItemsPerPage: number;
  setDbItemsPerPage: (val: number) => void;
  dbCurrentPage: number;
  setDbCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  filteredDbCustomers: Customer[];
  totalDbPages: number;
  startDbIndex: number;
  endDbIndex: number;
  downloadSampleExcel: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  paginatedExcelCustomers: Customer[];
  selectedExcelIds: Set<number>;
  excelItemsPerPage: number;
  setExcelItemsPerPage: (val: number) => void;
  excelCurrentPage: number;
  setExcelCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  filteredExcelCustomers: Customer[];
  totalExcelPages: number;
  startExcelIndex: number;
  endExcelIndex: number;
  handleDeleteSelectedExcel: () => void;
}

export function TargetSelector({
  targetMode,
  setTargetMode,
  dbSearchQuery,
  setDbSearchQuery,
  excelSearchQuery,
  setExcelSearchQuery,
  fetchCustomers,
  paginatedDbCustomers,
  selectedIds,
  toggleSelectAll,
  toggleSelect,
  dbItemsPerPage,
  setDbItemsPerPage,
  dbCurrentPage,
  setDbCurrentPage,
  filteredDbCustomers,
  totalDbPages,
  startDbIndex,
  endDbIndex,
  downloadSampleExcel,
  fileInputRef,
  handleExcelUpload,
  paginatedExcelCustomers,
  selectedExcelIds,
  excelItemsPerPage,
  setExcelItemsPerPage,
  excelCurrentPage,
  setExcelCurrentPage,
  filteredExcelCustomers,
  totalExcelPages,
  startExcelIndex,
  endExcelIndex,
  handleDeleteSelectedExcel
}: TargetSelectorProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
        <h2 className="text-base font-black text-slate-800">발송 대상 선택</h2>
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button 
            type="button"
            onClick={() => setTargetMode('db')}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-md transition-colors border-none cursor-pointer ${
              targetMode === 'db' ? 'bg-white text-blue-650 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            DB 연동
          </button>
          <button 
            type="button"
            onClick={() => setTargetMode('excel')}
            className={`px-4 py-1.5 text-xs font-extrabold rounded-md transition-colors border-none cursor-pointer ${
              targetMode === 'excel' ? 'bg-white text-blue-650 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            엑셀 직접 업로드
          </button>
        </div>
      </div>
      
      {targetMode === 'db' ? (
        <>
          <div className="flex justify-between items-center gap-3 mb-4">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="이름, 연락처, 태그로 검색..."
                value={dbSearchQuery}
                onChange={e => setDbSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-808 font-semibold bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={fetchCustomers} 
                className="text-xs font-bold text-blue-600 hover:underline border-none bg-transparent cursor-pointer"
              >
                새로고침
              </button>
            </div>
          </div>

          <div className="border border-slate-150 rounded-2xl overflow-hidden h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse relative">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 shadow-xs z-10 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 cursor-pointer focus:ring-0" 
                      checked={paginatedDbCustomers.length > 0 && paginatedDbCustomers.every(c => selectedIds.has(c.id))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 font-bold text-[10px]">이름</th>
                  <th className="p-4 font-bold text-[10px]">연락처</th>
                  <th className="p-4 font-bold text-[10px]">태그 (메모)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedDbCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-455 font-bold font-sans">
                      {dbSearchQuery ? "검색 결과와 일치하는 고객이 없습니다." : "등록된 고객이 없습니다. 고객 관리 메뉴에서 등록해주세요."}
                    </td>
                  </tr>
                ) : (
                  paginatedDbCustomers.map(c => (
                    <tr 
                      key={c.id} 
                      className="hover:bg-slate-55/70 cursor-pointer transition-colors" 
                      onClick={() => toggleSelect(c.id)}
                    >
                      <td className="p-4 text-center animate-none" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded text-blue-600 cursor-pointer focus:ring-0" 
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="p-4 font-black text-slate-800">{c.name}</td>
                      <td className="p-4 font-mono font-bold text-slate-505">{c.phone}</td>
                      <td className="p-4">
                        {c.tags && (
                          <span className="bg-blue-50 text-blue-750 px-2 py-0.5 rounded border border-blue-100 text-[10px] font-bold">
                            {c.tags}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">페이지당 표시:</span>
              <select 
                value={dbItemsPerPage} 
                onChange={e => {
                  setDbItemsPerPage(Number(e.target.value));
                  setDbCurrentPage(1);
                }} 
                className="border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-705 focus:border-blue-500"
              >
                <option value={5}>5명씩 보기</option>
                <option value={10}>10명씩 보기</option>
                <option value={20}>20명씩 보기</option>
                <option value={50}>50명씩 보기</option>
              </select>
              <span className="text-xs text-slate-400 font-semibold ml-2">
                {filteredDbCustomers.length === 0 
                  ? "전체 0명 표시" 
                  : `전체 ${filteredDbCustomers.length}명 중 ${startDbIndex + 1}-${Math.min(endDbIndex, filteredDbCustomers.length)}명 표시`}
              </span>
              <span className="text-xs text-blue-600 font-extrabold ml-2">
                ({selectedIds.size}명 선택됨)
              </span>
            </div>
            
            <div className="flex space-x-1">
              <button 
                type="button"
                disabled={dbCurrentPage === 1 || totalDbPages <= 1}
                onClick={() => setDbCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-650 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>
              {totalDbPages <= 1 ? (
                <button 
                  type="button"
                  disabled
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm border border-blue-600 cursor-not-allowed"
                >
                  1
                </button>
              ) : (
                Array.from({ length: totalDbPages }, (_, i) => i + 1).map(page => (
                  <button 
                    type="button"
                    key={page}
                    onClick={() => setDbCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      dbCurrentPage === page 
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-600' 
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    {page}
                  </button>
                ))
              )}
              <button 
                type="button"
                disabled={dbCurrentPage === totalDbPages || totalDbPages <= 1}
                onClick={() => setDbCurrentPage(prev => Math.min(totalDbPages, prev + 1))}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-650 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                다음
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-xs text-slate-500 font-semibold leading-relaxed">
              첫 줄에 <strong className="text-blue-600 font-extrabold">이름, 연락처</strong> 열이 포함된 엑셀 파일을 업로드하세요.
            </div>
            <div className="flex space-x-2 w-auto">
              <button 
                type="button"
                onClick={downloadSampleExcel}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-105 flex items-center justify-center cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                양식 다운로드
              </button>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                ref={fileInputRef}
                onChange={handleExcelUpload}
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center shadow-sm cursor-pointer border-none"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                엑셀 파일 첨부
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 mb-4">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="이름, 연락처, 태그로 검색..."
                value={excelSearchQuery}
                onChange={e => setExcelSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-808 font-semibold bg-white"
              />
            </div>
          </div>

          <div className="border border-slate-150 rounded-2xl overflow-hidden h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse relative">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 shadow-xs z-10 font-bold">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 cursor-pointer focus:ring-0" 
                      checked={paginatedExcelCustomers.length > 0 && paginatedExcelCustomers.every(c => selectedExcelIds.has(c.id))}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 font-bold text-[10px]">이름</th>
                  <th className="p-4 font-bold text-[10px]">연락처</th>
                  <th className="p-4 font-bold text-[10px]">태그 (메모)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedExcelCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-455 font-bold font-sans">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="leading-relaxed">
                          {excelSearchQuery 
                            ? "검색 결과와 일치하는 고객이 없습니다." 
                            : <>업로드된 고객 명단이 없습니다.<br/>우측 상단의 <strong>[엑셀 파일 첨부]</strong> 버튼을 눌러 파일을 등록해주세요.</>}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedExcelCustomers.map(c => (
                    <tr 
                      key={c.id} 
                      className="hover:bg-slate-55/70 cursor-pointer transition-colors" 
                      onClick={() => toggleSelect(c.id)}
                    >
                      <td className="p-4 text-center animate-none" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded text-blue-600 cursor-pointer focus:ring-0" 
                          checked={selectedExcelIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="p-4 font-black text-slate-800">{c.name}</td>
                      <td className="p-4 font-mono font-bold text-slate-505">{c.phone}</td>
                      <td className="p-4">
                        {c.tags && (
                          <span className="bg-blue-50 text-blue-750 px-2 py-0.5 rounded border border-blue-100 text-[10px] font-bold">
                            {c.tags}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">페이지당 표시:</span>
              <select 
                value={excelItemsPerPage} 
                onChange={e => {
                  setExcelItemsPerPage(Number(e.target.value));
                  setExcelCurrentPage(1);
                }} 
                className="border rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-bold cursor-pointer text-slate-705 focus:border-blue-500"
              >
                <option value={5}>5명씩 보기</option>
                <option value={10}>10명씩 보기</option>
                <option value={20}>20명씩 보기</option>
                <option value={50}>50명씩 보기</option>
              </select>
              <span className="text-xs text-slate-400 font-semibold ml-2">
                {filteredExcelCustomers.length === 0 
                  ? "전체 0명 표시" 
                  : `전체 ${filteredExcelCustomers.length}명 중 ${startExcelIndex + 1}-${Math.min(endExcelIndex, filteredExcelCustomers.length)}명 표시`}
              </span>
              <span className="text-xs text-blue-650 font-extrabold ml-2">
                ({selectedExcelIds.size}명 선택됨)
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedExcelIds.size > 0 && (
                <button 
                  type="button"
                  onClick={handleDeleteSelectedExcel}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600 rounded-lg border border-red-100 transition-colors flex items-center shadow-2xs mr-2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  선택 삭제
                </button>
              )}

              <div className="flex space-x-1">
                <button 
                  type="button"
                  disabled={excelCurrentPage === 1 || totalExcelPages <= 1}
                  onClick={() => setExcelCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-655 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  이전
                </button>
                {totalExcelPages <= 1 ? (
                  <button 
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm border border-blue-600 cursor-not-allowed"
                  >
                    1
                  </button>
                ) : (
                  Array.from({ length: totalExcelPages }, (_, i) => i + 1).map(page => (
                    <button 
                      type="button"
                      key={page}
                      onClick={() => setExcelCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        excelCurrentPage === page 
                          ? 'bg-blue-600 text-white shadow-sm border border-blue-600' 
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      {page}
                    </button>
                  ))
                )}
                <button 
                  type="button"
                  disabled={excelCurrentPage === totalExcelPages || totalExcelPages <= 1}
                  onClick={() => setExcelCurrentPage(prev => Math.min(totalExcelPages, prev + 1))}
                  className="px-3 py-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-655 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
