"use client";

import React from "react";
import { useCashflowSimulator } from "./hooks/useCashflowSimulator";
import CashflowForecastCard from "./components/CashflowForecastCard";
import CostSimulatorCard from "./components/CostSimulatorCard";
import TransactionForecastList from "./components/TransactionForecastList";
import { Coins, RefreshCw, CheckCircle, AlertOctagon, AlertTriangle } from "lucide-react";

/**
 * 자금 흐름 예측 및 원가 시뮬레이터(Cashflow & Cost Simulator) PC용 통합 관제 대시보드
 */
export default function CashflowSimulatorPage() {
  const {
    isLoading,
    isSimulating,
    toast,
    currentBalance,
    cashflowForecast,
    productMargins,
    forecastList,
    exchangeRate,
    setExchangeRate,
    materialRate,
    setMaterialRate,
    laborRate,
    setLaborRate,
    handleSendRemindSms,
    handleResetSimulation,
    runSimulation,
  } = useCashflowSimulator();

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="자금/원가 AI: 환율, 원자재가, 인건비 변동 시나리오에 따른 미래 90일 자금 흐름(Cashflow) 예측 시뮬레이터입니다.">
      
      {/* 🛎️ 알림 토스트 */}
      {toast && (
        <div className={`fixed top-6 right-6 z-55 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
          toast.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-250' :
          'bg-amber-50 text-amber-700 border-amber-250'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
          {toast.type === 'error' && <AlertOctagon className="w-5 h-5 text-rose-600" />}
          {toast.type === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* 헤더 및 타이틀 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Coins className="w-8 h-8 text-indigo-500 mr-3 animate-pulse" />
            자금/원가 AI
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            원부자재비, 노무비(임금), 환율 변동 조건에 따른 향후 90일 자금 예측 흐름 및 제품별 실시간 이익 마진 시뮬레이션
          </p>
        </div>

        {/* 강제 시뮬레이션 연산 트리거 버튼 */}
        <button 
          onClick={runSimulation}
          disabled={isLoading || isSimulating}
          className="flex items-center gap-1.5 px-4.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold shadow-2xs transition-all shrink-0 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSimulating ? 'animate-spin' : ''}`} />
          AI 자금 재예측 기동
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="font-extrabold text-slate-500 text-sm">전사 회계 및 수주 대장 데이터를 RAG 시뮬레이션 중입니다...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 1. 90일 자금 흐름 시계열 예측 카드 */}
          <CashflowForecastCard forecast={cashflowForecast} currentBalance={currentBalance} />

          {/* 2. 제품 원가/마진 변동 슬라이더 카드 */}
          <CostSimulatorCard
            margins={productMargins}
            exchangeRate={exchangeRate}
            onExchangeRateChange={setExchangeRate}
            materialRate={materialRate}
            onMaterialRateChange={setMaterialRate}
            laborRate={laborRate}
            onLaborRateChange={setLaborRate}
            onReset={handleResetSimulation}
            isSimulating={isSimulating}
          />

          {/* 3. 예상 유출입 타임라인 및 미수금 독촉 대장 */}
          <TransactionForecastList list={forecastList} onSendRemindSms={handleSendRemindSms} />

        </div>
      )}
    </div>
  );
}
