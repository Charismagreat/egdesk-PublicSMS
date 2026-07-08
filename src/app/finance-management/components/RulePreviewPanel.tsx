"use client";

import React from "react";

interface RulePreviewPanelProps {
  isOpen: boolean;
  previewList: any[];
  onClose: () => void;
  onDownloadExcel: () => void;
}

export default function RulePreviewPanel({
  isOpen,
  previewList,
  onClose,
  onDownloadExcel
}: RulePreviewPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="mt-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 p-3 flex flex-col gap-2 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-indigo-700 flex items-center gap-1">
          🔍 규칙 적용 시 영향받는 거래 건 미리보기 (총 {previewList.length}건 감지)
        </span>
        <div className="flex items-center gap-1.5">
          {previewList.length > 0 && (
            <button
              type="button"
              onClick={onDownloadExcel}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-0.5 shadow-sm active:scale-95"
            >
              📥 엑셀 다운로드
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 font-bold text-[10px] px-1.5 py-0.5 rounded hover:bg-slate-200/50 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
      
      {previewList.length === 0 ? (
        <div className="text-[10px] text-slate-500 font-medium text-center py-4 bg-white/50 rounded-xl border border-slate-100">
          해당 규칙의 조건에 부합하여 자동으로 분류될 거래 내역이 없습니다. (조건을 다시 한 번 확인해 보세요!)
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[160px] bg-white rounded-xl border border-slate-100/80 shadow-3xs overflow-y-auto pr-1 scrollbar-thin">
          <table className="w-full text-left border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-extrabold sticky top-0 backdrop-blur-xs">
                <th className="p-1.5">거래일자</th>
                <th className="p-1.5">가맹점명</th>
                <th className="p-1.5">금액</th>
                <th className="p-1.5">현재 계정과목</th>
                <th className="p-1.5">매칭 후 계정과목</th>
                <th className="p-1.5">비고(태그)</th>
              </tr>
            </thead>
            <tbody>
              {previewList.map((tx, idx) => (
                <tr key={tx.id || idx} className="border-b border-slate-55 hover:bg-slate-50/50 text-slate-600 font-medium">
                  <td className="p-1.5 whitespace-nowrap">{tx.date}</td>
                  <td className="p-1.5 font-bold text-slate-800">{tx.merchantName}</td>
                  <td className="p-1.5 font-bold text-slate-700">{tx.amount.toLocaleString()}원</td>
                  <td className="p-1.5 text-slate-400">{tx.currentCategory}</td>
                  <td className="p-1.5 font-extrabold text-indigo-600">{tx.targetCategory}</td>
                  <td className="p-1.5 text-slate-500 max-w-[120px] truncate" title={tx.memo}>{tx.memo || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
