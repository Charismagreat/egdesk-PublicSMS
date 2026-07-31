"use client";

import React from "react";
import { RotateCcw, CheckCircle2 } from "lucide-react";

interface GovernanceRestoreTabProps {
  deletedItems: any[];
  handleRestore: (item: any) => void;
}

export default function GovernanceRestoreTab({
  deletedItems,
  handleRestore,
}: GovernanceRestoreTabProps) {
  return (
    <div className="space-y-4">
      {/* 서브 헤더 컨트롤바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            <span>소프트 삭제(Soft Delete) 보류 대장 복원 센터</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            임직원이 삭제 시도 후 보류된 견적, 발주, 수주 대장 항목을 원본 데이터로 복구 및 보존합니다.
          </p>
        </div>
      </div>

      {/* Deleted Items List */}
      {deletedItems.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-600">소프트 삭제되어 복원 대기 중인 항목이 없습니다.</h3>
          <p className="text-xs text-slate-400">모든 업무 대장이 안전하게 보존되고 있습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deletedItems.map((item) => (
            <div key={`${item.doc_type}_${item.id}`} className="bg-white border border-slate-200/85 hover:border-slate-300 rounded-3xl p-5 shadow-xs flex justify-between items-center transition-all hover:shadow-md text-left">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    item.doc_type === 'estimate' ? 'bg-indigo-50 text-indigo-700' : item.doc_type === 'purchase_order' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {item.doc_type === 'estimate' ? '견적' : item.doc_type === 'purchase_order' ? '발주' : '수주'}
                  </span>
                  <span className="font-bold text-slate-800">{item.id}</span>
                </div>
                <div className="text-xs font-bold text-slate-600">
                  거래처: {item.customer_name || item.partner_name || "미지정"}
                </div>
                <div className="text-xs text-slate-500">
                  금액: {item.total_amount ? `${item.total_amount.toLocaleString()}원` : "0원"}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>삭제자: {item.deleted_by}</span>
                  <span>•</span>
                  <span>삭제일시: {item.deleted_at}</span>
                </div>
              </div>
              <button
                onClick={() => handleRestore(item)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>원장 복원</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
