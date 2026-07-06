import React from "react";
import { BarChart, Activity } from "lucide-react";
import DBChartRenderer from "@/components/DBChartRenderer";

interface ShareChartSectionProps {
  specObj: any;
  sampleRows: any[];
}

export function ShareChartSection({
  specObj,
  sampleRows
}: ShareChartSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
        <BarChart className="w-4 h-4 text-indigo-400" />
        <h2 className="text-xs font-black text-slate-350 tracking-wider">1. AI 지능형 시각화 차트 분석</h2>
      </div>
      
      <div className="bg-slate-950/50 rounded-2xl p-4 overflow-hidden border border-slate-900/40">
        {specObj ? (
          <DBChartRenderer spec={specObj} rows={sampleRows} />
        ) : (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <Activity className="w-8 h-8 text-slate-650" />
            <span className="text-xs font-bold">차트 구성 스펙이 올바르지 않습니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}
