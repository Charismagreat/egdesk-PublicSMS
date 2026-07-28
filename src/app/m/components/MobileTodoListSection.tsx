"use client";

import React from "react";
import { CheckSquare, Square, Search, AlertCircle, Plus, Calendar } from "lucide-react";

interface MobileTodoListSectionProps {
  todoTab: "active" | "completed";
  setTodoTab: (tab: "active" | "completed") => void;
  todoPeriod: "ALL" | "TODAY" | "TOMORROW" | "WEEK" | "MONTH";
  setTodoPeriod: (period: "ALL" | "TODAY" | "TOMORROW" | "WEEK" | "MONTH") => void;
  completedPeriod: "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH";
  setCompletedPeriod: (period: "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTasks: any[];
  activeTaskCount: number;
  completedTaskCount: number;
  onToggleTaskStatus: (taskId: string, currentStatus: string) => void;
  onOpenNewTaskModal: () => void;
}

export const MobileTodoListSection: React.FC<MobileTodoListSectionProps> = ({
  todoTab,
  setTodoTab,
  todoPeriod,
  setTodoPeriod,
  completedPeriod,
  setCompletedPeriod,
  searchQuery,
  setSearchQuery,
  filteredTasks,
  activeTaskCount,
  completedTaskCount,
  onToggleTaskStatus,
  onOpenNewTaskModal,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 mb-4 text-left">
      {/* 탭 헤더 */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTodoTab("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${
              todoTab === "active"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            진행 중 할 일 ({activeTaskCount})
          </button>
          <button
            onClick={() => setTodoTab("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer ${
              todoTab === "completed"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            완료된 한 일 ({completedTaskCount})
          </button>
        </div>

        <button
          onClick={onOpenNewTaskModal}
          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border-none cursor-pointer flex items-center justify-center shadow-3xs"
          title="새 할 일 추가"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 기간별 필터 세그먼트 스위치 바 */}
      <div className="pt-3 pb-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {todoTab === "active" ? (
          <>
            {[
              { id: "ALL", label: "전체" },
              { id: "TODAY", label: "오늘" },
              { id: "TOMORROW", label: "내일" },
              { id: "WEEK", label: "1주일" },
              { id: "MONTH", label: "1달" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTodoPeriod(p.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all border-none cursor-pointer ${
                  todoPeriod === p.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </>
        ) : (
          <>
            {[
              { id: "ALL", label: "전체" },
              { id: "TODAY", label: "오늘" },
              { id: "YESTERDAY", label: "어제" },
              { id: "WEEK", label: "1주일" },
              { id: "MONTH", label: "1달" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setCompletedPeriod(p.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all border-none cursor-pointer ${
                  completedPeriod === p.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* 검색 바 */}
      <div className="my-2.5 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="업무 제목 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white"
        />
      </div>

      {/* 목록 / 빈 안내 */}
      <div className="space-y-2 mt-3">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-400">
              {todoTab === "active"
                ? "할 일에 등록된 업무가 없습니다."
                : "해당 기간에 '한 일'에 등록된 업무가 없습니다."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl flex items-start gap-2.5 transition-all"
            >
              <button
                onClick={() => onToggleTaskStatus(task.id, task.status)}
                className="mt-0.5 text-slate-400 hover:text-indigo-600 border-none bg-transparent cursor-pointer"
              >
                {task.status === "DONE" ? (
                  <CheckSquare className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-slate-300 shrink-0" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-extrabold leading-snug break-all ${
                    task.status === "DONE" ? "line-through text-slate-400" : "text-slate-800"
                  }`}
                >
                  {task.title}
                </p>
                {task.due_date && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-1">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>마감: {task.due_date}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
