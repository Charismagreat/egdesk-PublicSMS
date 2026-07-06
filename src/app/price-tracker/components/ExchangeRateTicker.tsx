import React from "react";
import { Calendar } from "lucide-react";
import { ExchangeRate } from "../types";

interface ExchangeRateTickerProps {
  exchangeRates: ExchangeRate[];
}

export default function ExchangeRateTicker({ exchangeRates }: ExchangeRateTickerProps) {
  const lastSyncTime = exchangeRates[0]?.last_updated_at || "N/A";

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white rounded-2xl p-3.5 shadow-md border border-slate-850 overflow-hidden relative">
      <div className="absolute top-0 left-0 bg-pink-650 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-br-lg tracking-wider flex items-center gap-1 z-10 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
        Live Exchange Rates
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3.5 px-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {exchangeRates.map((rate) => {
            const isUp = rate.change_direction === "UP";
            const isDown = rate.change_direction === "DOWN";
            return (
              <div key={rate.rate_id} className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-colors">
                <span className="text-[10px] font-black text-slate-300">{rate.currency_code}/KRW</span>
                <span className="text-xs font-black font-mono text-white">
                  {rate.current_rate.toLocaleString()} 원
                </span>
                <span className={`text-[9px] font-bold font-mono flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                  isUp ? "bg-rose-500/20 text-rose-350" : isDown ? "bg-sky-500/20 text-sky-350" : "bg-slate-500/20 text-slate-300"
                }`}>
                  {isUp ? "▲" : isDown ? "▼" : "•"} {Math.abs(rate.change_rate)}%
                </span>
              </div>
            );
          })}
          {exchangeRates.length === 0 && (
            <span className="text-xs font-bold text-slate-500">환율 서버로부터 실시간 변동 테이블을 대기 중입니다.</span>
          )}
        </div>
        
        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 sm:self-end">
          <Calendar className="w-3.5 h-3.5 text-pink-400" />
          최종 동기화 시점: {lastSyncTime}
        </div>
      </div>
    </div>
  );
}
