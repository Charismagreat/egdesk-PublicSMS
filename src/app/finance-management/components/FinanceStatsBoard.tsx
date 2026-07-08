"use client";

import React from "react";
import { motion } from "framer-motion";
import { Landmark, CreditCard, Receipt, TrendingUp } from "lucide-react";
import { Account } from "../types";

interface FinanceStatsBoardProps {
  accounts: Account[];
  stats: { totalBalance: number; activeAccounts: number };
  summaryData: {
    months: string[];
    cardSummary: any[];
    hometaxSummary: {
      sales: { m0: number; m1: number; m2: number; yTotal: number };
      purchase: { m0: number; m1: number; m2: number; yTotal: number };
    };
  };
  groupedCards: any[];
}

export default function FinanceStatsBoard({
  accounts,
  stats,
  summaryData,
  groupedCards,
}: FinanceStatsBoardProps) {
  // 계좌 필터링
  const bankAccounts = accounts.filter(
    (acc) =>
      !acc.id.includes("CARD") &&
      !acc.bankId.includes("card") &&
      !acc.accountName.includes("카드")
  );

  // 당해 카드 누적 사용액
  const totalYearCardAmount = summaryData.cardSummary.reduce(
    (acc: number, curr: any) => acc + (curr.yTotal || 0),
    0
  );

  // 이번달 카드 사용액
  const totalMonthCardAmount = summaryData.cardSummary.reduce(
    (acc: number, curr: any) => acc + (curr.m0 || 0),
    0
  );

  // 홈택스 데이터 비율 연산
  const salesYTotal = summaryData.hometaxSummary?.sales?.yTotal || 0;
  const purchaseYTotal = summaryData.hometaxSummary?.purchase?.yTotal || 0;
  const hometaxTotal = salesYTotal + purchaseYTotal;
  const salesPercentage = hometaxTotal > 0 ? Math.round((salesYTotal / hometaxTotal) * 100) : 50;
  const purchasePercentage = hometaxTotal > 0 ? Math.round((purchaseYTotal / hometaxTotal) * 100) : 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 카드 1: 보유 계좌별 잔액 및 총합계 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between min-h-[440px]"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-blue-400" />
              보유 계좌별 잔액 및 총합계
            </span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-medium">
              {bankAccounts.length}개 계좌 연동
            </span>
          </div>

          <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1.5 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-700">
            {bankAccounts.map((acc) => (
              <div 
                key={acc.id} 
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600/30 text-blue-200 rounded border border-blue-500/20">
                      {acc.bankName}
                    </span>
                    <span className="text-white text-xs font-bold truncate max-w-[80px]">
                      {acc.accountName && !acc.accountName.includes("자동 임포트") && !acc.accountName.includes("자동등록") ? acc.accountName : ""}
                    </span>
                    {acc.lastTxDate && (
                      <span className="text-[9px] text-slate-400/80 font-medium">
                        최종: {acc.lastTxDate}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">{acc.accountNumber}</p>
                </div>
                <span className="text-xs font-extrabold text-blue-300 font-mono">
                  ₩ {acc.balance?.toLocaleString()}
                </span>
              </div>
            ))}
            {bankAccounts.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                연동된 은행 계좌가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-400 font-bold">보유 계좌 합계금액</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <TrendingUp className="w-3 h-3" />
              정상 연동 중
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1 font-mono">
            ₩ {stats.totalBalance?.toLocaleString() || "0"}
          </h3>
        </div>
      </motion.div>

      {/* 카드 2: 카드사별 3개월 지출 규모 & 금년도 누적 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[440px] relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
        
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-500" />
              카드사별 3개월 지출 현황
            </span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
              승인 기준 (취소 제외)
            </span>
          </div>

          <div className="max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-1.5 font-bold bg-white">카드명/번호</th>
                  <th className="pb-1.5 text-right font-bold bg-white">금월({summaryData.months[0]?.split("-")[1] || "5"}월)</th>
                  <th className="pb-1.5 text-right font-bold bg-white">전월({summaryData.months[1]?.split("-")[1] || "4"}월)</th>
                  <th className="pb-1.5 text-right font-bold bg-white">전전월({summaryData.months[2]?.split("-")[1] || "3"}월)</th>
                </tr>
              </thead>
              <tbody>
                {groupedCards.map((card: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 text-slate-700 font-medium">
                    <td className="py-2 pr-1">
                      <div className="font-extrabold text-slate-800 truncate max-w-[80px]">
                        {card.cardCompanyName}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">{card.cardNumber}</div>
                    </td>
                    <td className="py-2 text-right font-bold text-slate-800">₩{card.m0?.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-500">₩{card.m1?.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-500">₩{card.m2?.toLocaleString()}</td>
                  </tr>
                ))}
                {groupedCards.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-semibold">
                      조회된 신용카드 거래가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold block">금년도 사용액</span>
            <span className="text-xl font-black text-slate-800 font-mono block">
              ₩ {totalYearCardAmount.toLocaleString()}
            </span>
          </div>
          
          <div className="text-right space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold block">이번 달 사용액</span>
            <span className="text-xs font-bold text-slate-600 font-mono block">
              ₩ {totalMonthCardAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 카드 3: 홈택스 매출/매입 3개월 추이 & 누적 대비표 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[440px] relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-500" />
              홈택스 매출·매입 3개월 비교
            </span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
              세무 매칭액
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* 매출액 파트 */}
            <div className="space-y-3 p-4 py-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100/50">
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                매출액 (Sales)
              </span>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">금월({summaryData.months[0]?.split("-")[1] || "5"}월)</span>
                  <span className="font-extrabold text-emerald-600 font-mono">₩{summaryData.hometaxSummary?.sales?.m0?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">전월({summaryData.months[1]?.split("-")[1] || "4"}월)</span>
                  <span className="font-bold text-slate-600 font-mono">₩{summaryData.hometaxSummary?.sales?.m1?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">전전월({summaryData.months[2]?.split("-")[1] || "3"}월)</span>
                  <span className="font-bold text-slate-600 font-mono">₩{summaryData.hometaxSummary?.sales?.m2?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 매입액 파트 */}
            <div className="space-y-3 p-4 py-3.5 rounded-2xl bg-rose-50/30 border border-rose-100/50">
              <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                매입액 (Purchase)
              </span>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">금월({summaryData.months[0]?.split("-")[1] || "5"}월)</span>
                  <span className="font-extrabold text-rose-500 font-mono">₩{summaryData.hometaxSummary?.purchase?.m0?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">전월({summaryData.months[1]?.split("-")[1] || "4"}월)</span>
                  <span className="font-bold text-slate-600 font-mono">₩{summaryData.hometaxSummary?.purchase?.m1?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">전전월({summaryData.months[2]?.split("-")[1] || "3"}월)</span>
                  <span className="font-bold text-slate-600 font-mono">₩{summaryData.hometaxSummary?.purchase?.m2?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold block">금년도 매출액</span>
            <span className="text-lg font-black text-emerald-600 font-mono block">
              ₩ {salesYTotal.toLocaleString()}
            </span>
          </div>
          
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] text-slate-400 font-bold block">금년도 매입액</span>
            <span className="text-lg font-black text-rose-500 font-mono block">
              ₩ {purchaseYTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 슬라이딩 매출입 밸런스 비율 바 */}
        <div className="mt-3 space-y-1">
          <div className="w-full bg-rose-200 h-2.5 rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${salesPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-emerald-500 h-full rounded-l-full"
            ></motion.div>
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 font-bold">
            <span className="text-emerald-600">매출 {salesPercentage}%</span>
            <span className="text-rose-500">매입 {purchasePercentage}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
