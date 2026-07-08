"use client";

import React from "react";
import { Code, Table } from "lucide-react";
import { ColumnSchema } from "../types";

export interface SchemaTabProps {
  tableDDL: string;
  tableSchema: ColumnSchema[];
}

export default function SchemaTab({ tableDDL, tableSchema }: SchemaTabProps) {
  return (
    <div className="p-5 space-y-6 animate-fade-in text-slate-700 text-left">
      {/* 1. DDL 생성 쿼리 */}
      <div>
        <h3 className="text-xs font-black text-slate-400 mb-2.5 flex items-center gap-1">
          <Code className="w-3.5 h-3.5 text-indigo-500" />
          CREATE TABLE DDL (생성 구문)
        </h3>
        <pre className="p-4 bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-2xl overflow-x-auto select-all leading-relaxed shadow-3xs max-h-60">
          {tableDDL || "-- DDL 정보가 조회되지 않았습니다."}
        </pre>
      </div>

      {/* 2. 컬럼 구조 테이블 */}
      <div>
        <h3 className="text-xs font-black text-slate-400 mb-2.5 flex items-center gap-1">
          <Table className="w-3.5 h-3.5 text-blue-500" />
          데이터베이스 컬럼 상세 구조
        </h3>
        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-sm">
              <tr>
                <th className="p-4 font-bold text-slate-700">CID</th>
                <th className="p-4 font-bold text-slate-700">컬럼명</th>
                <th className="p-4 font-bold text-slate-700">데이터 타입</th>
                <th className="p-4 font-bold text-slate-700">Null 허용 여부</th>
                <th className="p-4 font-bold text-slate-700">기본값</th>
                <th className="p-4 font-bold text-slate-700">기본키 (PK)</th>
              </tr>
            </thead>
            <tbody>
              {tableSchema.map((col, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 font-mono text-[11px] text-slate-650">
                  <td className="p-4 text-slate-400">{col.cid}</td>
                  <td className="p-4 text-slate-800 font-black">{col.name}</td>
                  <td className="p-4 text-indigo-600 font-bold">{col.type}</td>
                  <td className="p-4">
                    {col.notnull === 1 ? (
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">NOT NULL</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">NULL OK</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500">
                    {col.dflt_value !== null ? String(col.dflt_value) : "-"}
                  </td>
                  <td className="p-4">
                    {col.pk === 1 ? (
                      <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black rounded animate-pulse">
                        Primary Key
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
