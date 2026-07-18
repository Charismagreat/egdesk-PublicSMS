import React from "react";
import { Sparkles, Plus } from "lucide-react";

interface SnapHeaderProps {
  onOpenNewTask: () => void;
}

export function SnapHeader({ onOpenNewTask }: SnapHeaderProps) {
  return (
    <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
        <h1 className="text-md font-black tracking-wider uppercase bg-clip-text bg-gradient-to-r from-white to-slate-400">
          SnapTask AI 🪐
        </h1>
      </div>
      
      <button
        onClick={onOpenNewTask}
        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-indigo-400 transition-colors flex items-center gap-1 border border-slate-700/60 text-xs font-bold border-0 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        새 태스크
      </button>
    </div>
  );
}
