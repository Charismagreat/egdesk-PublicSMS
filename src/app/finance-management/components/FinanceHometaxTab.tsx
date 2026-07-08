"use client";

import React from "react";
import { FileSpreadsheet, Edit } from "lucide-react";
import { HometaxInvoice, HometaxCash, DbExpenseTag } from "../types";
import { downloadHometaxCashExcel, downloadHometaxInvoiceExcel } from "../utils";
import TableSkeleton from "./TableSkeleton";
import PaginationBar from "./PaginationBar";

interface FinanceHometaxTabProps {
  hometaxSubTab: "invoice" | "exempt" | "cash";
  setHometaxSubTab: (tab: "invoice" | "exempt" | "cash") => void;
  taxInvoiceList: HometaxInvoice[];
  taxExemptList: HometaxInvoice[];
  cashReceiptList: HometaxCash[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  setCurrentPage: (page: number) => void;
  loading: boolean;
  hasAdminAccess: boolean;
  invoiceType: "all" | "sales" | "purchase";
  setInvoiceType: (type: "all" | "sales" | "purchase") => void;
  selectedCashPurpose: string;
  setSelectedCashPurpose: (purpose: string) => void;
  editingHometaxTxId: string | null;
  setEditingHometaxTxId: (id: string | null) => void;
  editingField: "category" | "memo" | null;
  setEditingField: (field: "category" | "memo" | null) => void;
  tempMemo: string;
  setTempMemo: (memo: string) => void;
  dbTags: DbExpenseTag[];
  handleTagToggle: (tagName: string) => void;
  handleUpdateHometaxTransaction: (txId: string, type: "invoice" | "exempt" | "cash", updates: { memo?: string }) => Promise<void>;
  isUpdatingHometaxTx: boolean;
}

export default function FinanceHometaxTab({
  hometaxSubTab,
  setHometaxSubTab,
  taxInvoiceList,
  taxExemptList,
  cashReceiptList,
  totalCount,
  currentPage,
  pageSize,
  setPageSize,
  setCurrentPage,
  loading,
  hasAdminAccess,
  invoiceType,
  setInvoiceType,
  selectedCashPurpose,
  setSelectedCashPurpose,
  editingHometaxTxId,
  setEditingHometaxTxId,
  editingField,
  setEditingField,
  tempMemo,
  setTempMemo,
  dbTags,
  handleTagToggle,
  handleUpdateHometaxTransaction,
  isUpdatingHometaxTx,
}: FinanceHometaxTabProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* 국세청 데이터 하브 탭 네비게이션 */}
      <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 w-max shadow-3xs">
        <button
          onClick={() => setHometaxSubTab("invoice")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            hometaxSubTab === "invoice"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          전자세금계산서 과세
        </button>
        <button
          onClick={() => setHometaxSubTab("exempt")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            hometaxSubTab === "exempt"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          전자계산서 면세
        </button>
        <button
          onClick={() => setHometaxSubTab("cash")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            hometaxSubTab === "cash"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          현금영수증 내역
        </button>
      </div>

      {/* 명세 테이블 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-slate-800 text-sm">
              국세청 홈택스 {hometaxSubTab === "invoice" ? "전자세금계산서" : hometaxSubTab === "exempt" ? "전자계산서" : "현금영수증"} 명세서
            </h3>
            <span className="text-xs text-slate-400 font-semibold ml-2">총 {totalCount}건</span>
          </div>

          {/* 세무 교차 필터 드롭다운 UI */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (hometaxSubTab === "cash") {
                  downloadHometaxCashExcel(cashReceiptList);
                } else {
                  downloadHometaxInvoiceExcel(
                    hometaxSubTab === "exempt" ? taxExemptList : taxInvoiceList,
                    hometaxSubTab === "exempt"
                  );
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer mr-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              엑셀 다운로드
            </button>
            {(hometaxSubTab === "invoice" || hometaxSubTab === "exempt") && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">구분:</span>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as any)}
                  className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="all">전체 내역</option>
                  <option value="sales">매출 (발행)</option>
                  <option value="purchase">매입 (수취)</option>
                </select>
              </div>
            )}

            {hometaxSubTab === "cash" && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">용도:</span>
                <select
                  value={selectedCashPurpose}
                  onChange={(e) => setSelectedCashPurpose(e.target.value)}
                  className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="all">전체 용도</option>
                  <option value="소득공제">소득공제</option>
                  <option value="지출증빙">지출증빙</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* 세금계산서 / 면세계산서 명세 */}
            {(hometaxSubTab === "invoice" || hometaxSubTab === "exempt") && (
              <>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400">
                    <th className="p-4 w-32">발행일자</th>
                    <th className="p-4">구분</th>
                    <th className="p-4">공급받는자 / 공급자</th>
                    <th className="p-4">품목명</th>
                    <th className="p-4 min-w-[120px] text-amber-600 font-extrabold">🏷️ 태그</th>
                    <th className="p-4 text-right">공급가액</th>
                    <th className="p-4 text-right">부가세</th>
                    <th className="p-4 text-right">합계금액</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton cols={8} rows={5} />
                  ) : (
                    (hometaxSubTab === "invoice" ? taxInvoiceList : taxExemptList).map((inv) => {
                      const isSales = inv.invoiceType === "sales" || inv.invoiceType === "매출";
                      return (
                        <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-xs text-slate-700">
                          <td className="p-4 font-mono font-medium text-slate-400">{inv.issueDate}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                                isSales
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                              }`}
                            >
                              {isSales ? "매출" : "매입"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-extrabold text-slate-800">
                              {isSales ? inv.buyerName : inv.supplierName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              사업자등록번호: {inv.id.split("-")[0] || "-"}
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-slate-600">{inv.itemName || "종합 광고 수수료"}</td>
                          <td className="p-4 max-w-[150px]">
                            {hasAdminAccess && editingHometaxTxId === inv.id && editingField === "memo" ? (
                              <div className="flex flex-col gap-1.5 p-1 bg-white rounded-2xl border border-slate-100 shadow-lg min-w-[220px]">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    id={`hometax-invoice-memo-${inv.id}`}
                                    value={tempMemo}
                                    onChange={(e) => setTempMemo(e.target.value)}
                                    className="border border-amber-300 bg-amber-50 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500 w-full"
                                    placeholder="쉼표로 태그 구분"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleUpdateHometaxTransaction(inv.id, hometaxSubTab === "invoice" ? "invoice" : "exempt", { memo: tempMemo });
                                      } else if (e.key === "Escape") {
                                        setEditingHometaxTxId(null);
                                        setEditingField(null);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleUpdateHometaxTransaction(inv.id, hometaxSubTab === "invoice" ? "invoice" : "exempt", { memo: tempMemo })}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                                    disabled={isUpdatingHometaxTx}
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingHometaxTxId(null);
                                      setEditingField(null);
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                                  >
                                    취소
                                  </button>
                                </div>
                                
                                {/* 태그 프리셋 가이드 칩 UI */}
                                <div className="mt-1 p-2 bg-slate-50/50 rounded-xl border border-slate-100/60">
                                  <div className="text-[9px] font-extrabold text-slate-400 mb-1.5">사용할 수 있는 태그 목록 (클릭 토글)</div>
                                  <div className="flex flex-wrap gap-1">
                                    {dbTags.map((tag) => {
                                      const isSelected = tempMemo.split(",")
                                        .map(t => t.trim())
                                        .filter(Boolean)
                                        .includes(tag.name);
                                      return (
                                        <button
                                          key={tag.id}
                                          type="button"
                                          onClick={() => handleTagToggle(tag.name)}
                                          className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all active:scale-95 cursor-pointer ${
                                            isSelected
                                              ? "bg-amber-500 text-white border-amber-500 shadow-3xs"
                                              : "bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                                          }`}
                                        >
                                          #{tag.name}
                                        </button>
                                      );
                                    })}
                                    {dbTags.length === 0 && (
                                      <span className="text-[9px] text-slate-300 font-light">프리셋 태그를 로드할 수 없습니다.</span>
                                    )}
                                  </div>
                                  {hasAdminAccess && (
                                    <div className="mt-2 pt-1.5 border-t border-slate-100/60 flex justify-end">
                                      <a
                                        href="/expenses"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-black text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-0.5 animate-pulse"
                                      >
                                        ⚙️ 태그 관리 바로가기
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div 
                                className={`min-h-[28px] flex items-center w-full ${hasAdminAccess ? "cursor-pointer hover:bg-amber-50/50 p-1.5 rounded-xl transition-all group" : ""}`}
                                onClick={() => {
                                  if (hasAdminAccess) {
                                    setEditingHometaxTxId(inv.id);
                                    setEditingField("memo");
                                    setTempMemo(inv.memo || "");
                                  }
                                }}
                                title={hasAdminAccess ? "클릭하여 비고(태그) 수정" : undefined}
                              >
                                {inv.memo ? (
                                  <div className="flex flex-wrap gap-1 items-center w-full">
                                    {inv.memo.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                                      <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100/60 shadow-3xs">
                                        #{tag}
                                      </span>
                                    ))}
                                    {hasAdminAccess && (
                                      <span className="ml-auto opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity">
                                        <Edit className="w-3 h-3" />
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-300 font-bold select-none group-hover:text-amber-500 transition-colors">
                                    -
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-700">
                            ₩ {inv.supplyAmount?.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-400">
                            ₩ {inv.taxAmount?.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-extrabold text-slate-800">
                            ₩ {inv.totalAmount?.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {!loading && (hometaxSubTab === "invoice" ? taxInvoiceList : taxExemptList).length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 text-xs font-semibold">
                        해당 조회 조건에 맞는 홈택스 전자(세금)계산서 자료가 존재하지 않습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

            {/* 현금영수증 명세 */}
            {hometaxSubTab === "cash" && (
              <>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400">
                    <th className="p-4 w-32">거래일자</th>
                    <th className="p-4">가맹점 / 승인번호</th>
                    <th className="p-4">용도구분</th>
                    <th className="p-4 min-w-[120px] text-amber-600 font-extrabold">🏷️ 태그</th>
                    <th className="p-4 text-right">공급가액</th>
                    <th className="p-4 text-right">부가세</th>
                    <th className="p-4 text-right">합계금액</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton cols={7} rows={5} />
                  ) : (
                    cashReceiptList.map((rcpt) => (
                      <tr key={rcpt.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-xs text-slate-700">
                        <td className="p-4 font-mono font-medium text-slate-400">{rcpt.transactionDate}</td>
                        <td className="p-4">
                          <div className="font-extrabold text-slate-800">{rcpt.franchiseName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">승인: {rcpt.approvalNumber}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {rcpt.purpose || "지출증빙용"}
                          </span>
                        </td>
                        <td className="p-4 max-w-[150px]">
                          {hasAdminAccess && editingHometaxTxId === rcpt.id && editingField === "memo" ? (
                            <div className="flex flex-col gap-1.5 p-1 bg-white rounded-2xl border border-slate-100 shadow-lg min-w-[220px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  id={`hometax-cash-memo-${rcpt.id}`}
                                  value={tempMemo}
                                  onChange={(e) => setTempMemo(e.target.value)}
                                  className="border border-amber-300 bg-amber-50 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500 w-full"
                                  placeholder="쉼표로 태그 구분"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleUpdateHometaxTransaction(rcpt.id, "cash", { memo: tempMemo });
                                    } else if (e.key === "Escape") {
                                      setEditingHometaxTxId(null);
                                      setEditingField(null);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleUpdateHometaxTransaction(rcpt.id, "cash", { memo: tempMemo })}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                                  disabled={isUpdatingHometaxTx}
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingHometaxTxId(null);
                                    setEditingField(null);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                                >
                                  취소
                                </button>
                              </div>
                              
                              {/* 태그 프리셋 가이드 칩 UI */}
                              <div className="mt-1 p-2 bg-slate-50/50 rounded-xl border border-slate-100/60">
                                <div className="text-[9px] font-extrabold text-slate-400 mb-1.5">사용할 수 있는 태그 목록 (클릭 토글)</div>
                                <div className="flex flex-wrap gap-1">
                                  {dbTags.map((tag) => {
                                    const isSelected = tempMemo.split(",")
                                      .map(t => t.trim())
                                      .filter(Boolean)
                                      .includes(tag.name);
                                    return (
                                      <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => handleTagToggle(tag.name)}
                                        className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border transition-all active:scale-95 cursor-pointer ${
                                          isSelected
                                            ? "bg-amber-500 text-white border-amber-500 shadow-3xs"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                                        }`}
                                      >
                                        #{tag.name}
                                      </button>
                                    );
                                  })}
                                  {dbTags.length === 0 && (
                                    <span className="text-[9px] text-slate-300 font-light">프리셋 태그를 로드할 수 없습니다.</span>
                                  )}
                                </div>
                                {hasAdminAccess && (
                                  <div className="mt-2 pt-1.5 border-t border-slate-100/60 flex justify-end">
                                    <a
                                      href="/expenses"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] font-black text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-0.5 animate-pulse"
                                    >
                                      ⚙️ 태그 관리 바로가기
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div 
                              className={`min-h-[28px] flex items-center w-full ${hasAdminAccess ? "cursor-pointer hover:bg-amber-50/50 p-1.5 rounded-xl transition-all group" : ""}`}
                              onClick={() => {
                                if (hasAdminAccess) {
                                  setEditingHometaxTxId(rcpt.id);
                                  setEditingField("memo");
                                  setTempMemo(rcpt.memo || "");
                                }
                              }}
                              title={hasAdminAccess ? "클릭하여 비고(태그) 수정" : undefined}
                            >
                              {rcpt.memo ? (
                                <div className="flex flex-wrap gap-1 items-center w-full">
                                  {rcpt.memo.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                                    <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100/60 shadow-3xs">
                                      #{tag}
                                    </span>
                                  ))}
                                  {hasAdminAccess && (
                                    <span className="ml-auto opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity">
                                      <Edit className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold select-none group-hover:text-amber-500 transition-colors">
                                  -
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-700">
                          ₩ {rcpt.supplyAmount?.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-400">
                          ₩ {rcpt.taxAmount?.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-extrabold text-slate-800">
                          ₩ {rcpt.totalAmount?.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && cashReceiptList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-semibold">
                        해당 조회 조건에 맞는 국세청 현금영수증 내역이 존재하지 않습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
        
        {/* 하단 페이지네이션 컴포넌트 */}
        {!loading && totalCount > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setCurrentPage={setCurrentPage}
            totalCount={totalCount}
          />
        )}
      </div>
    </div>
  );
}
