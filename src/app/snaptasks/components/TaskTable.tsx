"use client";

import React, { useState, useMemo } from "react";
import { Play, CheckCircle2, Archive, Building2, Calendar, Eye, Trash2, Search, Filter } from "lucide-react";
import { SnapTask } from "../types";

interface TaskTableProps {
  tasks: SnapTask[];
  onOpenDetail: (task: SnapTask) => void;
  onDeleteTask: (task: SnapTask, e: React.MouseEvent) => void;
}

export function TaskTable({ tasks, onOpenDetail, onDeleteTask }: TaskTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED">("ALL");

  // 검색어 및 상태 필터를 적용한 데이터 연산
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        task.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === "ALL" ? true : task.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 animate-scale-up">
      {/* 상단 검색 및 필터 도구 영역 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 p-3.5 border border-slate-100 rounded-2xl w-full">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 px-1 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            태스크 검색 필터
          </div>
          <div className="relative flex-1 sm:max-w-xs w-full">
            <input
              type="text"
              placeholder="태스크명 또는 ID 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-slate-700 outline-none focus:border-indigo-500 shadow-3xs"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-bold outline-none bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 cursor-pointer shadow-3xs"
            >
              <option value="ALL">전체 진행 단계</option>
              <option value="ACTIVE">진행 중 (ACTIVE)</option>
              <option value="COMPLETED">계약/수주 성사 (COMPLETED)</option>
              <option value="ARCHIVED">완료 보관 (ARCHIVED)</option>
            </select>
          </div>
        </div>

        <div className="shrink-0">
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-full select-none">
            검색 결과: {filteredTasks.length}건 / 전체: {tasks.length}건
          </span>
        </div>
      </div>

      {/* 테이블 영역 (맥스 높이 및 스크롤 고정 지원) */}
      <div className="overflow-x-auto w-full border border-slate-100 rounded-2xl max-h-[500px]">
        {filteredTasks.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 font-semibold bg-white flex flex-col items-center justify-center gap-2">
            <Filter className="w-6 h-6 text-slate-350" />
            조건과 일치하는 AI 스냅태스크 내역이 없습니다.
          </div>
        ) : (
          <table className="w-full text-left border-collapse bg-white">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500">
              <tr>
                <th className="p-4 min-w-[80px] whitespace-nowrap sticky top-0 bg-slate-50 z-10">
                  태스크 ID
                </th>
                <th className="p-4 min-w-[320px] whitespace-nowrap sticky top-0 bg-slate-50 z-10">
                  업무 내용 / 태스크 요약
                </th>
                <th className="p-4 min-w-[120px] whitespace-nowrap sticky top-0 bg-slate-50 z-10">
                  진행 단계
                </th>
                <th className="p-4 min-w-[200px] whitespace-nowrap sticky top-0 bg-slate-50 z-10">
                  연동 거래처
                </th>
                <th className="p-4 min-w-[130px] whitespace-nowrap sticky top-0 bg-slate-50 z-10">
                  생성 일시
                </th>
                <th className="p-4 text-center w-24 sticky top-0 right-0 bg-slate-50 border-l border-slate-100/60 z-20">
                  제어
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task, idx) => {
                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/50 bg-white transition-colors cursor-pointer group"
                    onClick={() => onOpenDetail(task)}
                  >
                    {/* ID */}
                    <td className="p-4 font-mono font-bold text-[10px] text-slate-400">
                      {task.id}
                    </td>

                    {/* 태스크 제목 */}
                    <td className="p-4 text-xs font-bold text-slate-800 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                      {task.title}
                    </td>

                    {/* 진행 단계 배지 */}
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${
                          task.status === "ACTIVE"
                            ? "bg-indigo-50 border-indigo-100 text-indigo-500"
                            : task.status === "COMPLETED"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                            : "bg-slate-100 border-slate-200 text-slate-550"
                        }`}
                      >
                        {task.status === "ACTIVE" && <Play className="w-2.5 h-2.5 fill-indigo-500 text-indigo-500" />}
                        {task.status === "COMPLETED" && <CheckCircle2 className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />}
                        {task.status === "ARCHIVED" && <Archive className="w-2.5 h-2.5 fill-slate-400 text-slate-400" />}
                        {task.status}
                      </span>
                    </td>

                    {/* 거래처 연동 */}
                    <td className="p-4">
                      {task.partner_company_name ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-650 font-bold bg-slate-50 border border-slate-150 px-2 py-1 rounded-xl">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {task.partner_company_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-350 font-semibold italic select-none">
                          연동 거래처 없음
                        </span>
                      )}
                    </td>

                    {/* 생성 날짜 */}
                    <td className="p-4 text-[10px] text-slate-400 font-bold">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-350" />
                        {task.created_at.substring(0, 16)}
                      </span>
                    </td>

                    {/* 제어 버튼 */}
                    <td
                      className="p-4 text-center sticky right-0 bg-white/95 border-l border-slate-100/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onOpenDetail(task)}
                          className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-650 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                          title="상세 관제 피드 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => onDeleteTask(task, e)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-650 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                          title="영구 삭제 파괴"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
