"use client";

import React from "react";
import { Table as TableIcon, Search, X, Database, Loader2, Filter, Layers, CheckCircle2 } from "lucide-react";
import { usePersistedState } from "@/hooks/usePersistedState";

interface LeftTableListProps {
  tables: any[];
  isTablesLoading?: boolean;
  selectedTable: string;
  setSelectedTable: (name: string) => void;
  tableSearchQuery: string;
  setTableSearchQuery: (query: string) => void;
}

export default function LeftTableList({
  tables,
  isTablesLoading = false,
  selectedTable,
  setSelectedTable,
  tableSearchQuery,
  setTableSearchQuery
}: LeftTableListProps) {
  // 🔘 데이터가 있는 테이블만 보기 필터 상태 (sessionStorage 상태 보존)
  const [onlyWithData, setOnlyWithData] = usePersistedState<boolean>("egdesk_mydb_onlyWithData", false);

  // 데이터 건수가 1건 이상인 테이블 개수 계산
  const tablesWithDataCount = tables.filter((t) => {
    const cnt = typeof t.count === "number" ? t.count : parseInt(String(t.count || 0), 10);
    return cnt > 0;
  }).length;

  const filteredTables = tables.filter((t) => {
    // 1. 데이터 있는 테이블만 보기 조건 검사
    if (onlyWithData) {
      const cnt = typeof t.count === "number" ? t.count : parseInt(String(t.count || 0), 10);
      if (isNaN(cnt) || cnt <= 0) return false;
    }

    // 2. 검색어 매칭
    const query = tableSearchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      t.name.toLowerCase().includes(query) ||
      (t.displayName && t.displayName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3 shrink-0">
        <h2 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
          <TableIcon className="w-4.5 h-4.5 text-blue-500" />
          물리 테이블
        </h2>
        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
          {isTablesLoading ? "..." : `${filteredTables.length}/${tables.length}`}
        </span>
      </div>

      {/* 🔘 필터 세그먼트 (전체 vs 데이터 있음) */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/90 rounded-xl mb-3 shrink-0">
        <button
          type="button"
          onClick={() => setOnlyWithData(false)}
          className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer border-none ${
            !onlyWithData
              ? "bg-white text-slate-800 shadow-xs font-extrabold"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>전체 ({tables.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setOnlyWithData(true)}
          className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer border-none ${
            onlyWithData
              ? "bg-blue-600 text-white shadow-xs font-extrabold"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${onlyWithData ? "bg-emerald-300 animate-pulse" : "bg-emerald-500"}`} />
          <span>데이터 있음 ({tablesWithDataCount})</span>
        </button>
      </div>

      {/* 🔍 테이블 검색바 */}
      <div className="relative mb-3.5 shrink-0">
        <input
          type="text"
          placeholder="테이블명 또는 한글명 검색..."
          value={tableSearchQuery}
          onChange={(e) => setTableSearchQuery(e.target.value)}
          disabled={isTablesLoading}
          className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-700 placeholder-slate-400 border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-xl outline-none transition-all font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        {tableSearchQuery && (
          <button
            onClick={() => setTableSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full border-none bg-transparent cursor-pointer transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 📋 테이블 리스트 */}
      <div className="space-y-1.5 max-h-[850px] overflow-y-auto no-scrollbar flex-1 flex flex-col justify-start">
        {isTablesLoading ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center gap-3.5 text-center bg-blue-50/40 rounded-2xl border border-blue-100/70 my-auto shadow-2xs">
            <div className="relative">
              <Database className="w-8 h-8 text-blue-500 animate-bounce" />
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-800 tracking-tight">테이블 리스트 로딩 중...</p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                데이터베이스 물리 테이블 및 건수를<br />실시간 탐색하고 있습니다.
              </p>
            </div>
          </div>
        ) : tables.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold">
            테이블이 탐색되지 않았습니다.
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
            <Filter className="w-6 h-6 text-slate-300" />
            <span>
              {onlyWithData
                ? "데이터가 존재하는 테이블이 없습니다."
                : "검색 결과가 없습니다."}
            </span>
            {onlyWithData && (
              <button
                type="button"
                onClick={() => setOnlyWithData(false)}
                className="mt-1 text-xs text-blue-600 hover:underline font-bold bg-transparent border-none cursor-pointer"
              >
                전체 테이블 보기
              </button>
            )}
          </div>
        ) : (
          filteredTables.map((t) => {
            const rowCount = typeof t.count === "number" ? t.count : parseInt(String(t.count || 0), 10);
            const hasData = !isNaN(rowCount) && rowCount > 0;

            return (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer group ${
                  selectedTable === t.name
                    ? "bg-blue-50/70 border-blue-200 text-blue-700 font-extrabold shadow-3xs"
                    : "bg-white border-slate-100 hover:bg-slate-50 text-slate-650 hover:text-slate-800"
                }`}
              >
                <div className="flex flex-col min-w-0 leading-tight">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Database
                      className={`w-3.5 h-3.5 shrink-0 ${
                        selectedTable === t.name ? "text-blue-500" : hasData ? "text-blue-400" : "text-slate-300"
                      }`}
                    />
                    <span className="text-xs truncate font-semibold">{t.name}</span>
                  </div>
                  {t.displayName && t.displayName !== t.name && (
                    <span className="text-[10px] text-slate-400 pl-5 truncate font-normal mt-0.5">
                      {t.displayName}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black border transition-all shrink-0 ${
                    selectedTable === t.name
                      ? "bg-blue-500 text-white border-blue-500"
                      : hasData
                      ? "bg-blue-50 text-blue-600 border-blue-200 font-black"
                      : "bg-slate-100 text-slate-400 border-slate-200/60 font-medium"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

