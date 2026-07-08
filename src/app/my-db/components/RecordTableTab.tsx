"use client";

import React from "react";
import { Search, Link, Trash2, RefreshCw, Edit, X } from "lucide-react";
import { ColumnSchema } from "../types";

interface RecordTableTabProps {
  selectedTable: string;
  tableSchema: ColumnSchema[];
  tableRows: any[];
  totalRows: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  searchKey: string;
  setSearchKey: (key: string) => void;
  searchValue: string;
  setSearchValue: (val: string) => void;
  showDeleted: boolean;
  setShowDeleted: (show: boolean) => void;
  handleSearch: (e: React.FormEvent) => void;
  handlePageChange: (page: number) => void;
  handleOpenFriendlyShareModal: () => void;
  handleRestoreRow: (row: any) => Promise<void>;
  handleDeleteRow: (row: any) => Promise<void>;
  setEditingRow: (row: any) => void;
  setIsRowModalOpen: (open: boolean) => void;
  setDebouncedSearchValue: (val: string) => void;
}

export default function RecordTableTab({
  selectedTable,
  tableSchema,
  tableRows,
  totalRows,
  currentPage,
  totalPages,
  itemsPerPage,
  searchKey,
  setSearchKey,
  searchValue,
  setSearchValue,
  showDeleted,
  setShowDeleted,
  handleSearch,
  handlePageChange,
  handleOpenFriendlyShareModal,
  handleRestoreRow,
  handleDeleteRow,
  setEditingRow,
  setIsRowModalOpen,
  setDebouncedSearchValue
}: RecordTableTabProps) {
  return (
    <div className="p-5 space-y-4">
      {selectedTable && (
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 p-3.5 border border-slate-100 rounded-2xl w-full"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 px-1 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
              실시간 검색 필터
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="text-xs font-bold outline-none bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 cursor-pointer shadow-3xs"
              >
                <option value="">-- 검색 컬럼 선택 --</option>
                {tableSchema.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name}
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="text"
                  placeholder="검색어 입력..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-slate-705 outline-none w-48 focus:border-blue-500 shadow-3xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-extrabold cursor-pointer border border-slate-800"
              >
                검색
              </button>
              {(searchKey || searchValue) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchKey("");
                    setSearchValue("");
                    setDebouncedSearchValue("");
                  }}
                  className="px-2 py-1 text-slate-400 hover:text-slate-655 text-xs font-bold border-none bg-transparent cursor-pointer"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenFriendlyShareModal}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 hover:from-indigo-100 hover:to-indigo-150 border border-indigo-200/80 text-indigo-650 rounded-xl text-xs font-black shadow-3xs cursor-pointer transition-all active:scale-95"
              title="데이터 공유 테이블 뷰 생성"
            >
              <Link className="w-3.5 h-3.5 text-indigo-550" />
              데이터 공유 뷰 생성
            </button>

            {tableSchema.some((col) => col.name === "deleted_at") && (
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50/60 hover:bg-rose-50 border border-rose-100 rounded-xl cursor-pointer select-none transition-all shadow-3xs">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600 bg-white focus:ring-rose-500/20 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-black text-rose-700 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  소프트 삭제(휴지통) 보기
                </span>
              </label>
            )}
          </div>
        </form>
      )}

      <div className="overflow-x-auto w-full border border-slate-100 rounded-xl max-h-[500px]">
        {tableRows.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 font-semibold">
            레코드 데이터가 비어있거나 검색 결과와 일치하는 내역이 없습니다.
          </div>
        ) : (
          <table className="w-full text-left border-collapse bg-white">
            <thead className="bg-slate-50 border-b border-slate-100 text-sm">
              <tr>
                {Object.keys(tableRows[0]).map((key) => (
                  <th
                    key={key}
                    className="p-4 font-bold text-slate-700 min-w-[120px] whitespace-nowrap"
                  >
                    {key}
                    {tableSchema.find((c) => c.name === key)?.pk === 1 && (
                      <span className="ml-1.5 text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded-sm">
                        PK
                      </span>
                    )}
                  </th>
                ))}
                <th className="p-4 text-center w-20 sticky right-0 bg-slate-50 border-l border-slate-100/60 z-10">
                  제어
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => {
                const isSoftDeleted =
                  row.deleted_at !== undefined && row.deleted_at !== null;
                return (
                  <tr
                    key={idx}
                    className={`border-b transition-all font-mono text-[11px] ${
                      isSoftDeleted
                        ? "bg-rose-50/55 hover:bg-rose-50/80 text-rose-700 border-rose-100/80"
                        : "border-slate-50 hover:bg-slate-50/50 text-slate-655"
                    }`}
                  >
                    {Object.entries(row).map(([key, val], cIdx) => (
                      <td
                        key={cIdx}
                        className="p-4 max-w-[250px] truncate"
                        title={val !== null ? String(val) : "NULL"}
                      >
                        {val === null ? (
                          <span className="text-[10px] text-slate-300 italic select-none">
                            NULL
                          </span>
                        ) : typeof val === "object" ? (
                          JSON.stringify(val)
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                    <td
                      className={`p-4 text-center sticky right-0 border-l ${
                        isSoftDeleted
                          ? "bg-rose-50/95 border-rose-100/80"
                          : "bg-white/95 border-slate-50"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {isSoftDeleted ? (
                          <button
                            onClick={() => handleRestoreRow(row)}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black border-none cursor-pointer flex items-center gap-0.5 shadow-3xs transition-all active:scale-95"
                            title="소프트 삭제 레코드 안전 복구"
                          >
                            <RefreshCw className="w-3 h-3 text-white" />
                            복구
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingRow(row);
                                setIsRowModalOpen(true);
                              }}
                              className="p-1 text-slate-450 hover:text-blue-655 hover:bg-slate-50 rounded border-none bg-transparent cursor-pointer transition-colors"
                              title="레코드 인라인 편집"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row)}
                              className="p-1 text-slate-455 hover:text-rose-655 hover:bg-slate-50 rounded border-none bg-transparent cursor-pointer transition-colors"
                              title={
                                tableSchema.some((col) => col.name === "deleted_at")
                                  ? "휴지통으로 소프트 삭제"
                                  : "레코드 즉시 삭제"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 하단 페이지네이션 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-xl">
          <span className="text-xs text-slate-400 font-semibold">
            전체 {totalRows}건 중 {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(totalRows, currentPage * itemsPerPage)}건 표시
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all shadow-3xs"
            >
              이전
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentPage === page
                    ? "bg-blue-600 text-white shadow-sm border-none"
                    : "border bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all shadow-3xs"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
