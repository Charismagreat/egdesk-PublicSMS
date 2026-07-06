import React from "react";
import { ForecastTransaction } from "../types";
import { ClipboardList, AlertCircle, MessageSquare, ShieldAlert, CheckCircle } from "lucide-react";

interface TransactionForecastListProps {
  list: ForecastTransaction[];
  onSendRemindSms: (item: ForecastTransaction) => void;
}

/**
 * 향후 90일 수금 및 지출 예상 타임라인 대장 및 미수금 독촉 모듈
 */
export default function TransactionForecastList({ list, onSendRemindSms }: TransactionForecastListProps) {
  if (!list || list.length === 0) return null;

  // 연체금액 계산
  const overdueTransactions = list.filter((item) => item.isOverdue && item.type === "IN");
  const totalOverdueAmount = overdueTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs text-left grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* 1. 좌측: 미수금 현황 요약 보드 */}
      <div className="xl:col-span-1 space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <ClipboardList className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">미수금 및 수금 현황 관리</h4>
              <p className="text-[9px] text-slate-400 font-bold">FreeSMS 기반 연체 독촉 프로세스</p>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 space-y-1">
            <span className="text-[8.5px] font-black text-rose-800">현재 회수 지연 총 미수금액</span>
            <h3 className="text-lg font-black text-rose-700">{totalOverdueAmount.toLocaleString()}원</h3>
            <span className="text-[8px] text-slate-450 block font-bold mt-1">총 {overdueTransactions.length}건 연체 중 ⚠️</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 text-[9.5px] font-bold text-slate-650 space-y-1.5">
          <div className="flex items-center gap-1 text-slate-800">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>이지데스크 0원 독촉 가이드</span>
          </div>
          <p className="font-medium leading-relaxed pl-1 text-[9px]">
            수금 기일이 경과한 거래처에 **[미수금 독촉]** 단추를 누르면, 가입하신 스마트폰 요금제 한도 내에서 정중한 미수금 회수 요청 문자가 무료 발송됩니다.
          </p>
        </div>
      </div>

      {/* 2. 우측: 90일 예상 자금 타임라인 테이블 */}
      <div className="xl:col-span-3 space-y-3">
        <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2">
          향후 90일 예상 유입/유출 리스트 대장
        </h4>

        <div className="overflow-x-auto bg-slate-50 border border-slate-150 rounded-2xl max-h-[280px] overflow-y-auto">
          <table className="min-w-full text-[10px] font-bold text-slate-700 divide-y divide-slate-200">
            <thead className="bg-slate-100 text-[9px] font-black text-slate-450 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">예정일</th>
                <th className="px-4 py-3 text-left">구분</th>
                <th className="px-4 py-3 text-left">내역 상세</th>
                <th className="px-4 py-3 text-left">거래처</th>
                <th className="px-4 py-3 text-left">예상 금액</th>
                <th className="px-4 py-3 text-center">수금 독촉 / 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {list.map((item) => {
                const isIn = item.type === "IN";
                return (
                  <tr key={item.id} className={`hover:bg-slate-50/50 ${item.isOverdue ? 'bg-rose-50/20' : ''}`}>
                    <td className="px-4 py-3 text-slate-400 font-medium">{item.date.slice(5)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${
                        isIn 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}>
                        {isIn ? "수금(IN)" : "지출(OUT)"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-850 font-extrabold max-w-[200px] truncate">
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-slate-550 font-medium">{item.partnerName}</td>
                    <td className="px-4 py-3 font-black text-slate-850">{item.amount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center">
                      {item.isOverdue ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[8.5px] font-black bg-rose-100 text-rose-800 border border-rose-250 px-2 py-0.5 rounded shrink-0">
                            미수 연체 중
                          </span>
                          <button
                            type="button"
                            onClick={() => onSendRemindSms(item)}
                            className="flex items-center gap-0.5 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[8.5px] font-black transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            독촉 발송
                          </button>
                        </div>
                      ) : (
                        <span className="text-[8.5px] font-bold text-slate-400 flex items-center justify-center gap-0.5">
                          {isIn ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span>{isIn ? "대기" : "지급예정"}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
