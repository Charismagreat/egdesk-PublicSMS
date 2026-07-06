import React from "react";
import { Layout, Coffee, Dumbbell, Flame, Compass } from "lucide-react";

interface TemplateSelectorProps {
  applyPresetTemplate: (key: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  applyPresetTemplate,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white/80 p-3 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
      <span className="text-xs text-slate-500 font-bold ml-1 flex items-center gap-1">
        <Layout className="w-3.5 h-3.5 text-slate-400" /> 프리셋:
      </span>
      <button
        onClick={() => applyPresetTemplate("dining")}
        className="text-xs bg-rose-50/60 text-rose-700 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl font-bold transition-all border border-rose-200/50 flex items-center gap-1 cursor-pointer border-0"
      >
        <Coffee className="w-3.5 h-3.5 text-rose-500" /> 레스토랑
      </button>
      <button
        onClick={() => applyPresetTemplate("fitness")}
        className="text-xs bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl font-bold transition-all border border-emerald-200/50 flex items-center gap-1 cursor-pointer border-0"
      >
        <Dumbbell className="w-3.5 h-3.5 text-emerald-500" /> 필라테스
      </button>
      <button
        onClick={() => applyPresetTemplate("coupon")}
        className="text-xs bg-violet-50/60 text-violet-700 hover:bg-violet-100 px-3.5 py-1.5 rounded-xl font-bold transition-all border border-violet-200/50 flex items-center gap-1 cursor-pointer border-0"
      >
        <Flame className="w-3.5 h-3.5 text-violet-500" /> 헤어세일
      </button>
      <button
        onClick={() => applyPresetTemplate("minimalCafe")}
        className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl font-bold transition-all border border-slate-200/50 flex items-center gap-1 cursor-pointer border-0"
      >
        <Compass className="w-3.5 h-3.5 text-slate-500" /> 미니멀카페
      </button>
    </div>
  );
};
