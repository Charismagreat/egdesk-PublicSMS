"use client";

import React from "react";
import { Database, X } from "lucide-react";
import { ColumnSchema } from "../types";

interface RowEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: string;
  tableSchema: ColumnSchema[];
  editingRow: any | null;
  isLoading: boolean;
  handleSaveRow: (e: React.FormEvent) => Promise<void>;
}

export default function RowEditModal({
  isOpen,
  onClose,
  selectedTable,
  tableSchema,
  editingRow,
  isLoading,
  handleSaveRow
}: RowEditModalProps) {
  if (!isOpen || !selectedTable) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in text-left">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-1.5">
            <Database className="w-4.5 h-4.5 text-blue-500" />
            {editingRow
              ? `✏️ [${selectedTable}] 행 데이터 편집 (UPDATE)`
              : `📥 [${selectedTable}] 신규 레코드 삽입 (INSERT)`}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-655 rounded-full border-none bg-transparent cursor-pointer transition-colors animate-fade-in"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveRow} className="flex flex-col">
          <div className="p-6 max-h-[480px] overflow-y-auto no-scrollbar space-y-4 text-slate-705 bg-white text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tableSchema.map((col) => {
                const isPK = col.pk === 1;
                const value = editingRow ? editingRow[col.name] : "";

                return (
                  <div key={col.name} className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                      {col.name}
                      <span className="text-[9px] text-indigo-500 font-bold font-mono">
                        ({col.type})
                      </span>
                      {isPK && (
                        <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded-sm">
                          PK
                        </span>
                      )}
                      {col.notnull === 1 && (
                        <span className="text-[8px] bg-rose-50 text-rose-700 border border-rose-200 px-1 rounded-sm">
                          필수
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name={col.name}
                      defaultValue={value !== null ? String(value) : ""}
                      placeholder={
                        isPK && !editingRow ? "(자동 시퀀스 ID)" : `${col.name} 값 기입...`
                      }
                      disabled={isPK && !editingRow}
                      required={col.notnull === 1 && (!isPK || editingRow)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs text-slate-705 transition-all placeholder:text-slate-350 shadow-3xs disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-505 text-white rounded-xl text-xs font-black shadow-sm border-none cursor-pointer disabled:opacity-50"
            >
              {editingRow ? "데이터 갱신 (UPDATE)" : "레코드 삽입 (INSERT)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
