"use client";

import React from "react";
import { Layers, FileSpreadsheet, ArrowDownLeft, ArrowUpRight, Edit } from "lucide-react";
import { Account, Transaction, DbExpenseTag } from "../types";
import { downloadAccountsExcel } from "../utils";
import TableSkeleton from "./TableSkeleton";
import PaginationBar from "./PaginationBar";

interface FinanceAccountsTabProps {
  accounts: Account[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  selectedBankId: string;
  setSelectedBankId: (id: string) => void;
  transactionList: Transaction[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  setCurrentPage: (page: number) => void;
  loading: boolean;
  hasAdminAccess: boolean;
  editingBankTxId: string | null;
  setEditingBankTxId: (id: string | null) => void;
  editingField: "category" | "memo" | null;
  setEditingField: (field: "category" | "memo" | null) => void;
  tempMemo: string;
  setTempMemo: (memo: string) => void;
  dbTags: DbExpenseTag[];
  handleTagToggle: (tagName: string) => void;
  handleUpdateBankTransaction: (txId: string, updates: { category?: string; memo?: string }) => Promise<void>;
  isUpdatingBankTx: boolean;
}

export default function FinanceAccountsTab({
  accounts,
  selectedAccountId,
  setSelectedAccountId,
  selectedBankId,
  setSelectedBankId,
  transactionList,
  totalCount,
  currentPage,
  pageSize,
  setPageSize,
  setCurrentPage,
  loading,
  hasAdminAccess,
  editingBankTxId,
  setEditingBankTxId,
  editingField,
  setEditingField,
  tempMemo,
  setTempMemo,
  dbTags,
  handleTagToggle,
  handleUpdateBankTransaction,
  isUpdatingBankTx,
}: FinanceAccountsTabProps) {
  // 계좌 필터링
  const bankAccounts = accounts.filter(
    (acc) =>
      !acc.id.includes("CARD") &&
      !acc.bankId.includes("card") &&
      !acc.accountName.includes("카드")
  );

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* 계좌 리스트 슬라이드 카드형 레이아웃 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {bankAccounts.map((acc) => (
          <div
            key={acc.id}
            onClick={() => {
              if (selectedAccountId === acc.id) {
                setSelectedAccountId("all");
                setSelectedBankId("all");
              } else {
                setSelectedAccountId(acc.id);
                setSelectedBankId(acc.bankId || "all");
              }
            }}
            className={`p-5 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden cursor-pointer ${
              selectedAccountId === acc.id
                ? "border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/5"
                : "border-slate-100"
            }`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-lg"></div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                {acc.bankName}
              </span>
              <span className="text-slate-400 text-xs font-mono">{acc.accountNumber}</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 tracking-tight">
                {acc.accountName && !acc.accountName.includes("자동 임포트") && !acc.accountName.includes("자동등록") ? acc.accountName : ""}
              </h4>
              <p className="text-xl font-extrabold text-slate-800 mt-1">
                ₩ {acc.balance?.toLocaleString()}
              </p>
              {acc.lastTxDate && (
                <p className="text-[10px] text-slate-400 font-semibold mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  최종 거래: {acc.lastTxDate} {acc.lastTxTime}
                </p>
              )}
            </div>
          </div>
        ))}
        {bankAccounts.length === 0 && (
          <div className="col-span-full bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs font-medium">
            조회된 등록 계좌가 없습니다.
          </div>
        )}
      </div>

      {/* 은행 거래 목록 명세서 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-slate-800 text-sm">
              은행 통합 계좌 입출금 명세서
            </h3>
            <span className="text-xs text-slate-400 font-semibold ml-2">총 {totalCount}건의 거래</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadAccountsExcel(transactionList)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer mr-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              엑셀 다운로드
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">은행사:</span>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">전체 은행사</option>
                <option value="shinhan">신한은행</option>
                <option value="woori">우리은행</option>
                <option value="kookmin">KB국민은행</option>
                <option value="hana">하나은행</option>
                <option value="ibk">IBK기업은행</option>
                <option value="nh">NH농협은행</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">계좌번호:</span>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">전체 번호</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} ({acc.bankName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400">
                <th className="p-4 w-32">거래일자</th>
                <th className="p-4 w-28">은행명</th>
                <th className="p-4 w-36">계좌번호</th>
                <th className="p-4">적요 / 거래구분</th>
                <th className="p-4">구분</th>
                <th className="p-4 min-w-[120px] text-amber-600 font-extrabold">🏷️ 태그</th>
                <th className="p-4 text-right">입금액</th>
                <th className="p-4 text-right">출금액</th>
                <th className="p-4 text-right">잔액</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={9} rows={5} />
              ) : (
                transactionList.map((tx) => {
                  const isDeposit = tx.type === "deposit" || tx.type === "입금";
                  return (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-xs text-slate-700">
                      <td className="p-4 font-mono font-medium text-slate-400">
                        <div>{tx.date}</div>
                        {tx.time && (
                          <div className="text-[10px] text-slate-400/80 mt-0.5">{tx.time}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800">{tx.bankName || "기타은행"}</span>
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {tx.accountNumber || "-"}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800">{tx.description}</span>
                        {tx.category && (
                          <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md">
                            {tx.category}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 w-max ${
                            isDeposit
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-rose-50 text-rose-500 border border-rose-100"
                          }`}
                        >
                          {isDeposit ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3" />
                              입금
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              출금
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 max-w-[150px]">
                        {hasAdminAccess && editingBankTxId === tx.id && editingField === "memo" ? (
                          <div className="flex flex-col gap-1.5 p-1 bg-white rounded-2xl border border-slate-100 shadow-lg min-w-[220px]">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                id={`bank-tx-memo-${tx.id}`}
                                value={tempMemo}
                                onChange={(e) => setTempMemo(e.target.value)}
                                className="border border-amber-300 bg-amber-50 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500 w-full"
                                placeholder="쉼표로 태그 구분"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateBankTransaction(tx.id, { memo: tempMemo });
                                  } else if (e.key === "Escape") {
                                    setEditingBankTxId(null);
                                    setEditingField(null);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleUpdateBankTransaction(tx.id, { memo: tempMemo })}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                                disabled={isUpdatingBankTx}
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingBankTxId(null);
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
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`min-h-[28px] flex items-center w-full ${hasAdminAccess ? "cursor-pointer hover:bg-amber-50/50 p-1.5 rounded-xl transition-all group" : ""}`}
                            onClick={() => {
                              if (hasAdminAccess) {
                                setEditingBankTxId(tx.id);
                                setEditingField("memo");
                                setTempMemo(tx.memo || "");
                              }
                            }}
                            title={hasAdminAccess ? "클릭하여 비고(태그) 수정" : undefined}
                          >
                            {tx.memo ? (
                              <div className="flex flex-wrap gap-1 items-center w-full">
                                {tx.memo.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
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
                      <td className={`p-4 text-right font-extrabold ${isDeposit ? "text-emerald-600" : "text-slate-400"}`}>
                        {isDeposit ? `+ ₩ ${tx.amount?.toLocaleString()}` : "-"}
                      </td>
                      <td className={`p-4 text-right font-extrabold ${!isDeposit ? "text-rose-500" : "text-slate-400"}`}>
                        {!isDeposit ? `₩ ${tx.amount?.toLocaleString()}` : "-"}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-600">
                        ₩ {tx.balance?.toLocaleString() || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && transactionList.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 text-xs font-semibold">
                    해당 조회 조건에 맞는 은행 거래 내역이 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
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
