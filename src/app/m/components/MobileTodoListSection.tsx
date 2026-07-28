"use client";

import React from "react";
import { CheckSquare, Square, Search, AlertCircle, Plus, Calendar, Folder } from "lucide-react";

interface MobileTodoListSectionProps {
  todoTab: "active" | "completed" | "folders";
  setTodoTab: (tab: "active" | "completed" | "folders") => void;
  todoPeriod: "ALL" | "TODAY" | "TOMORROW" | "WEEK" | "MONTH";
  setTodoPeriod: (period: "ALL" | "TODAY" | "TOMORROW" | "WEEK" | "MONTH") => void;
  completedPeriod: "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH";
  setCompletedPeriod: (period: "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTasks: any[];
  activeTaskCount: number;
  completedTaskCount: number;
  taskFolderCount: number;
  onToggleTaskStatus: (taskId: string, currentStatus: string) => void;
  onOpenNewTaskModal: () => void;
  taskFolderContent?: React.ReactNode;
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
  taskFolderCount,
  onToggleTaskStatus,
  onOpenNewTaskModal,
  taskFolderContent,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 mb-4 text-left">
      {/* 3가지 메인 탭 헤더: 진행 중 할 일 (N) / 완료된 한 일 (N) / 태스크 폴더 (N) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setTodoTab("active")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer whitespace-nowrap ${
              todoTab === "active"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            진행 중 할 일 ({activeTaskCount})
          </button>
          <button
            type="button"
            onClick={() => setTodoTab("completed")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer whitespace-nowrap ${
              todoTab === "completed"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            완료된 한 일 ({completedTaskCount})
          </button>
          <button
            type="button"
            onClick={() => setTodoTab("folders")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              todoTab === "folders"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>태스크 폴더 ({taskFolderCount})</span>
          </button>
        </div>

        {todoTab !== "folders" && (
          <button
            type="button"
            onClick={onOpenNewTaskModal}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border-none cursor-pointer flex items-center justify-center shadow-3xs ml-2 shrink-0"
            title="새 할 일 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3번 탭: 태스크 폴더 선택 시 컨텐츠 바로 노출 */}
      {todoTab === "folders" ? (
        <div className="pt-2">{taskFolderContent}</div>
      ) : (
        <>
          {/* 기간별 필터 세그먼트 스위치 바 */}
          <div className="pt-3 pb-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {todoTab === "active" ? (
              <>
                {[
                  { id: "ALL", label: "전체" },
                  { id: "TODAY", label: "오늘" },
                  { id: "TOMORROW", label: "내일" },
                  { id: "WEEK", label: "이번 주" },
                  { id: "MONTH", label: "이번 달" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTodoPeriod(item.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all whitespace-nowrap ${
                      todoPeriod === item.id
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                {[
                  { id: "ALL", label: "전체" },
                  { id: "TODAY", label: "오늘" },
                  { id: "YESTERDAY", label: "어제" },
                  { id: "WEEK", label: "이번 주" },
                  { id: "MONTH", label: "이번 달" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCompletedPeriod(item.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all whitespace-nowrap ${
                      completedPeriod === item.id
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* 검색창 */}
          <div className="relative my-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={todoTab === "active" ? "진행 중 할 일 검색..." : "완료된 한 일 검색..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* 업무 태스크 목록 카드 */}
          <div className="space-y-2 mt-3">
            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-400">
                  {searchQuery
                    ? `'${searchQuery}' 검색 결과가 없습니다.`
                    : todoTab === "active"
                    ? "진행 중인 할 일이 없습니다."
                    : "완료된 한 일이 없습니다."}
                </p>
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isDone = t.status === "DONE";
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 text-left ${
                      isDone
                        ? "bg-slate-50/70 border-slate-200/60 opacity-75"
                        : "bg-white border-slate-200 hover:border-indigo-300 shadow-2xs"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(t.id, t.status)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 border-none bg-transparent cursor-pointer shrink-0"
                    >
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-extrabold leading-snug ${
                          isDone ? "line-through text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-slate-400">
                        {t.due_date && (
                          <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {t.due_date.substring(0, 10)}
                          </span>
                        )}
                        {t.assignee_name && (
                          <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-extrabold">
                            담당: {t.assignee_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
