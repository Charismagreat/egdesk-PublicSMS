"use client";

import React, { useMemo } from "react";
import { MatchingItem } from "../types";
import { ArrowRight, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Calendar, FileText } from "lucide-react";
import PaginationBar from "./PaginationBar";

interface FinanceMatchingTabProps {
  matchingList: MatchingItem[];
  loading: boolean;
  matchingStatus: "all" | "matched" | "unmatched";
  setMatchingStatus: (status: "all" | "matched" | "unmatched") => void;
  invoiceType: "all" | "sales" | "purchase";
  totalCount: number;
  currentPage: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  setCurrentPage: (page: number) => void;
}

export default function FinanceMatchingTab({
  matchingList,
  loading,
  matchingStatus,
  setMatchingStatus,
  invoiceType,
  totalCount,
  currentPage,
  pageSize,
  setPageSize,
  setCurrentPage,
}: FinanceMatchingTabProps) {
  // 클라이언트 측 통계 계산 (현재 로드된 목록 기준)
  const stats = useMemo(() => {
    const total = matchingList.length;
    const matched = matchingList.filter((item) => item.bankTx !== null).length;
    const unmatched = total - matched;
    const rate = total > 0 ? Math.round((matched / total) * 100) : 0;

    return { total, matched, unmatched, rate };
  }, [matchingList]);

  // 금액 포맷 핸들러
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  return (
    <div className="space-y-6">
      {/* 1. 대조 현황 요약 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 text-blue-200">
            <FileText className="w-10 h-10" />
          </div>
          <p className="text-xs text-slate-500 font-bold">대조 대상 계산서</p>
          <h3 className="text-2xl font-black text-slate-800 mt-2">
            {stats.total} <span className="text-sm font-semibold text-slate-500">건</span>
          </h3>
          <p className="text-xxs text-slate-400 mt-1">전자세금계산서 & 계산서 통합</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 text-emerald-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <p className="text-xs text-slate-500 font-bold">매칭 완료 (수금/지급 확인)</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-2">
            {stats.matched} <span className="text-sm font-semibold text-slate-500">건</span>
          </h3>
          <p className="text-xxs text-emerald-600 mt-1">금액 및 거래처 정보 일치</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-6 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 text-rose-200">
            <AlertCircle className="w-10 h-10" />
          </div>
          <p className="text-xs text-slate-500 font-bold">미매칭 (미수금/미지급)</p>
          <h3 className="text-2xl font-black text-rose-700 mt-2">
            {stats.unmatched} <span className="text-sm font-semibold text-slate-500">건</span>
          </h3>
          <p className="text-xxs text-rose-600 mt-1">은행 입출금 내역 대조 실패</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-3xl border border-purple-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 text-purple-200">
            <TrendingUp className="w-10 h-10" />
          </div>
          <p className="text-xs text-slate-500 font-bold">대조 정합률 (성공률)</p>
          <h3 className="text-2xl font-black text-purple-700 mt-2">
            {stats.rate} <span className="text-sm font-semibold text-purple-500">%</span>
          </h3>
          {/* 게이지바 */}
          <div className="w-full bg-purple-200/50 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. 대조 상태 필터링 탭 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
          <button
            onClick={() => setMatchingStatus("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              matchingStatus === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            전체 보기
          </button>
          <button
            onClick={() => setMatchingStatus("matched")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              matchingStatus === "matched"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            대조 성공 ({stats.matched})
          </button>
          <button
            onClick={() => setMatchingStatus("unmatched")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              matchingStatus === "unmatched"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            미대조 건 ({stats.unmatched})
          </button>
        </div>

        <span className="text-slate-400 text-xs font-medium">
          * 합계금액 일치 및 상호명 Fuzzy 분석을 통한 실시간 SQL 대조
        </span>
      </div>

      {/* 3. 대조 결과 리스트 테이블 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-xxs font-bold tracking-wider">
                <th className="py-4.5 px-6">작성일자</th>
                <th className="py-4.5 px-4">구분</th>
                <th className="py-4.5 px-6">세금계산서 정보</th>
                <th className="py-4.5 px-6 text-right">계산서 금액</th>
                <th className="py-4.5 px-4 text-center">대조</th>
                <th className="py-4.5 px-6">은행 입출금 대조 내역</th>
                <th className="py-4.5 px-6 text-right">대조 금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      금융 대조 데이터를 분석하고 있습니다...
                    </div>
                  </td>
                </tr>
              ) : matchingList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    대조 대상 계산서 및 입출금 대조 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                matchingList.map((item) => {
                  const isSales = item.invoiceType === "sales";
                  const partnerName = isSales ? item.buyerName : item.supplierName;
                  const partnerBiz = isSales ? item.buyerBusinessNumber : item.supplierBusinessNumber;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* 작성일자 */}
                      <td className="py-4 px-6 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {item.issueDate}
                        </div>
                      </td>

                      {/* 구분 */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-lg text-xxs font-black ${
                            isSales
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : "bg-orange-50 text-orange-600 border border-orange-100"
                          }`}
                        >
                          {isSales ? "매출 (수금)" : "매입 (지급)"}
                        </span>
                      </td>

                      {/* 세금계산서 정보 */}
                      <td className="py-4 px-6">
                        <div className="max-w-[200px]">
                          <div className="font-bold text-slate-800 truncate" title={partnerName}>
                            {partnerName}
                          </div>
                          <div className="text-xxs text-slate-400 mt-0.5">{partnerBiz}</div>
                          {item.itemName && (
                            <div className="text-slate-400 text-xxs truncate mt-1 bg-slate-100 px-1.5 py-0.5 rounded-md inline-block max-w-full">
                              품목: {item.itemName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 계산서 금액 */}
                      <td className="py-4 px-6 text-right font-black text-slate-800">
                        ₩{formatAmount(item.totalAmount)}
                      </td>

                      {/* 대조 상태 배지 */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          {item.bankTx ? (
                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-100 text-xxs font-black">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              대조 성공
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-xl border border-rose-100 text-xxs font-black">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {isSales ? "미수금" : "미지급"}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 은행 입출금 대조 내역 */}
                      <td className="py-4 px-6">
                        {item.bankTx ? (
                          <div className="max-w-[280px]">
                            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-xxs border border-slate-200">
                                {item.bankTx.bankName}
                              </span>
                              <span className="text-xxs text-slate-500 font-mono">
                                {item.bankTx.accountNumber}
                              </span>
                            </div>
                            <div className="text-xxs text-slate-400 mt-1 truncate">
                              적요: <span className="font-semibold text-slate-600">{item.bankTx.description || "-"}</span> | 예금주: <span className="font-semibold text-slate-600">{item.bankTx.counterparty || "-"}</span>
                            </div>
                            <div className="text-xxs text-slate-400 mt-0.5">
                              거래일자: {item.bankTx.date} {item.bankTx.time || ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xxs text-slate-400 italic">
                            {isSales ? "입금 내역이 매칭되지 않았습니다." : "출금 내역이 매칭되지 않았습니다."}
                          </span>
                        )}
                      </td>

                      {/* 대조 금액 */}
                      <td className="py-4 px-6 text-right">
                        {item.bankTx ? (
                          <div className="flex flex-col items-end">
                            <span className="font-black text-slate-800">
                              ₩{formatAmount(item.bankTx.amount)}
                            </span>
                            <span className="text-xxs text-slate-400 font-bold mt-0.5 flex items-center gap-0.5">
                              대조 성공
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-black">
                            ₩{formatAmount(item.totalAmount)} 미수
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이징 제어 바 */}
      {!loading && matchingList.length > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize) || 1}
          pageSize={pageSize}
          totalCount={totalCount}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
        />
      )}
    </div>
  );
}
