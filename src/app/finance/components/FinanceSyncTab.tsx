"use client";

import React from "react";
import { RefreshCw, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { SyncLog } from "../types";

interface FinanceSyncTabProps {
  syncHistory: SyncLog[];
  hometaxSync: any[];
}

export default function FinanceSyncTab({ syncHistory, hometaxSync }: FinanceSyncTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. 은행/카드 뱅킹 동기화 로그 */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 pb-3 border-b border-slate-100">
          <RefreshCw className="w-4 h-4 text-blue-500" />
          뱅킹 & 카드 데이터 스크래핑 동기화 로그
        </h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {syncHistory.map((log) => (
            <div key={log.id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-start gap-3">
              {log.status === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-800">{log.operationType}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{log.startedAt?.replace("T", " ")}</span>
                </div>
                {log.recordsCount !== undefined && (
                  <p className="text-[11px] font-medium text-slate-500">
                    동기화 결과: <strong className="text-blue-600">{log.recordsCount}건</strong>의 거래 레코드 갱신 완료
                  </p>
                )}
                {log.errorMessage && (
                  <p className="text-[11px] text-rose-500 font-medium">{log.errorMessage}</p>
                )}
              </div>
            </div>
          ))}
          {syncHistory.length === 0 && (
            <div className="text-center text-slate-400 py-12 text-xs font-semibold">
              기록된 은행/카드 스크래핑 동기화 이력이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 2. 국세청 홈택스 동기화 역사 */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 pb-3 border-b border-slate-100">
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          국세청 홈택스 엑셀 임포트 & 스크래핑 로그
        </h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {hometaxSync.map((log, idx) => (
            <div key={idx} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-800">{log.fileName || "홈택스 데이터 자동 스크래핑"}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{log.importedAt || "-"}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  임포트 세부: 세금계산서 <strong className="text-emerald-600">{log.invoiceCount || 0}건</strong>, 현금영수증 <strong className="text-emerald-600">{log.receiptCount || 0}건</strong> 성공적 갱신
                </p>
              </div>
            </div>
          ))}
          {hometaxSync.length === 0 && (
            <div className="text-center text-slate-400 py-12 text-xs font-semibold">
              기록된 국세청 증빙 스크래핑/동기화 이력이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
