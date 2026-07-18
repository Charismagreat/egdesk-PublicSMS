import React from "react";
import { Compass } from "lucide-react";
import { SnapTask } from "../types";

interface TaskScrollListProps {
  loading: boolean;
  tasks: SnapTask[];
  filteredTasks: SnapTask[];
  selectedTask: SnapTask | null;
  setSelectedTask: (task: SnapTask) => void;
}

export function TaskScrollList({
  loading,
  tasks,
  filteredTasks,
  selectedTask,
  setSelectedTask
}: TaskScrollListProps) {
  return (
    <div className="bg-slate-900/30 border-b border-slate-900 py-3.5 px-4 overflow-x-auto flex gap-3 scrollbar-none shrink-0 z-10">
      {loading ? (
        <span className="text-xs text-slate-500 font-bold py-1">스냅 태스크 동기화 중...</span>
      ) : tasks.length === 0 ? (
        <span className="text-xs text-slate-400 font-bold py-1">
          생성된 태스크가 없습니다. 새 태스크를 열어주세요.
        </span>
      ) : filteredTasks.length === 0 ? (
        <span className="text-xs text-slate-500 font-bold py-1">일치하는 검색 결과가 없습니다.</span>
      ) : (
        filteredTasks.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTask(t)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer ${
              selectedTask?.id === t.id 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-600/20 scale-105' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {t.title}
            {t.partner_company_name && (
              <span className="text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-medium">
                {t.partner_company_name}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
