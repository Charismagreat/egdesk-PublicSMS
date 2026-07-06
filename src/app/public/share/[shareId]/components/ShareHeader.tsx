import React from "react";
import { Database, Calendar } from "lucide-react";

interface ShareHeaderProps {
  refreshInterval: string;
  lastRefreshedAt: string | null;
}

export function ShareHeader({
  refreshInterval,
  lastRefreshedAt
}: ShareHeaderProps) {
  return (
    <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Database className="w-4 h-4 text-blue-400" />
        </div>
        <span className="text-xs font-black tracking-wider text-slate-200">EGDESK SHARED BI</span>
      </div>
      
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${
          refreshInterval === 'NONE' ? 'bg-slate-900 text-slate-450 border-slate-800' :
          refreshInterval === 'HOURLY' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          refreshInterval === 'DAILY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
          'bg-purple-500/10 text-purple-400 border-purple-500/20'
        }`}>
          {refreshInterval === 'NONE' ? '정적 데이터' :
           refreshInterval === 'HOURLY' ? '매시간 자동 갱신됨' :
           refreshInterval === 'DAILY' ? '매일 자동 갱신됨' :
           '매주 자동 갱신됨'}
        </span>
        
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 font-semibold font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          마지막 갱신: {lastRefreshedAt || '-'}
        </div>
      </div>
    </header>
  );
}
