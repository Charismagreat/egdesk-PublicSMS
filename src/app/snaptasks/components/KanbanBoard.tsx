import React from "react";
import { Play, CheckCircle2, Archive, Building2, Calendar, Eye, Trash2 } from "lucide-react";
import { SnapTask } from "../types";

interface KanbanBoardProps {
  tasks: SnapTask[];
  onOpenDetail: (task: SnapTask) => void;
  onDeleteTask: (task: SnapTask, e: React.MouseEvent) => void;
}

export function KanbanBoard({ tasks, onOpenDetail, onDeleteTask }: KanbanBoardProps) {
  const activeTasks = tasks.filter((t) => t.status === "ACTIVE");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const archivedTasks = tasks.filter((t) => t.status === "ARCHIVED");

  const renderKanbanCard = (task: SnapTask) => {
    return (
      <div
        key={task.id}
        onClick={() => onOpenDetail(task)}
        className="bg-white border border-slate-100 hover:border-indigo-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 group space-y-3.5 animate-scale-up"
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold font-mono text-slate-400">{task.id}</span>
          <span
            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
              task.status === "ACTIVE"
                ? "bg-indigo-50 border-indigo-100 text-indigo-500"
                : task.status === "COMPLETED"
                ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            {task.status}
          </span>
        </div>

        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
          {task.title}
        </h3>

        {task.partner_company_name && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="truncate">거래처: {task.partner_company_name}</span>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>생성일: {task.created_at.substring(0, 10)}</span>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onOpenDetail(task)}
              className="p-1 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-all"
              title="상세 관제 피드 보기"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => onDeleteTask(task, e)}
              className="p-1 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all"
              title="영구 삭제 파괴"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 칼럼 1: 진행 중 (ACTIVE) */}
      <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 space-y-4 flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <Play className="w-4 h-4 text-indigo-500 fill-indigo-500" />
            진행 중인 협업 태스크
          </span>
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            {activeTasks.length}
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {activeTasks.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-400 font-bold">진행 중인 활성 태스크가 없습니다.</p>
          ) : (
            activeTasks.map((t) => renderKanbanCard(t))
          )}
        </div>
      </div>

      {/* 칼럼 2: 계약/수주 성사 (COMPLETED) */}
      <div className="bg-emerald-50/20 rounded-3xl p-5 border border-emerald-500/5 space-y-4 flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500" />
            최종 목표 달성 건
          </span>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            {completedTasks.length}
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {completedTasks.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-400 font-bold">완료된 수주 계약이 없습니다.</p>
          ) : (
            completedTasks.map((t) => renderKanbanCard(t))
          )}
        </div>
      </div>

      {/* 칼럼 3: 완료 보관 (ARCHIVED) */}
      <div className="bg-slate-100/50 rounded-3xl p-5 border border-slate-200/20 space-y-4 flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Archive className="w-4 h-4 text-slate-400 fill-slate-400" />
            과거 태스크 이력 보관함
          </span>
          <span className="bg-slate-200 text-slate-650 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            {archivedTasks.length}
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {archivedTasks.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-400 font-bold">보관함이 비어 있습니다.</p>
          ) : (
            archivedTasks.map((t) => renderKanbanCard(t))
          )}
        </div>
      </div>
    </div>
  );
}
