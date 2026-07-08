"use client";

import React from "react";
import { Table as TableIcon, Search, X, Database } from "lucide-react";

interface LeftTableListProps {
  tables: any[];
  selectedTable: string;
  setSelectedTable: (name: string) => void;
  tableSearchQuery: string;
  setTableSearchQuery: (query: string) => void;
}

export default function LeftTableList({
  tables,
  selectedTable,
  setSelectedTable,
  tableSearchQuery,
  setTableSearchQuery
}: LeftTableListProps) {
  const filteredTables = tables.filter((t) => {
    const query = tableSearchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      (t.displayName && t.displayName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 overflow-hidden flex flex-col">
      <h2 className="font-extrabold text-slate-800 text-base pb-3.5 border-b border-slate-100 flex items-center gap-2 mb-3 shrink-0">
        <TableIcon className="w-4.5 h-4.5 text-blue-500" />
        물리 테이블 ({filteredTables.length}/{tables.length})
      </h2>

      {/* 🔍 테이블 검색바 */}
      <div className="relative mb-3.5 shrink-0">
        <input
          type="text"
          placeholder="테이블명 또는 한글명 검색..."
          value={tableSearchQuery}
          onChange={(e) => setTableSearchQuery(e.target.value)}
          className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-705 placeholder-slate-400 border border-slate-250 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-xl outline-none transition-all font-semibold"
        />
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        {tableSearchQuery && (
          <button
            onClick={() => setTableSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-655 rounded-full border-none bg-transparent cursor-pointer transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-[850px] overflow-y-auto no-scrollbar">
        {tables.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold">
            테이블이 탐색되지 않았습니다.
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold">
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredTables.map((t) => (
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
                      selectedTable === t.name ? "text-blue-500" : "text-slate-400"
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
                    : "bg-slate-100 text-slate-400 border-slate-200/60"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
