"use client";

import React from "react";
import { X, Building2 } from "lucide-react";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function NewTaskModal({
  isOpen,
  onClose,
  newTaskTitle,
  setNewTaskTitle,
  onSubmit,
}: NewTaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <form 
        onSubmit={onSubmit}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative animate-scale-up"
      >
        <button 
          type="button" 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
          <Building2 className="w-5 h-5 text-indigo-400" />
          <span>새로운 비즈니스 협업 태스크 생성</span>
        </h3>

        <div className="space-y-1">
          <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block pl-0.5">태스크 제목 *</label>
          <input 
            type="text"
            placeholder="예: 미래푸드 유통 원두 제안 건"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-2xl outline-none text-xs font-bold text-slate-200"
            required
          />
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl text-xs font-bold"
          >
            취소
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/10"
          >
            생성 완료
          </button>
        </div>
      </form>
    </div>
  );
}
