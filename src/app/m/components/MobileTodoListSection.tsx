"use client";

import React from "react";
import { CheckSquare, Square, Search, AlertCircle, Plus, Calendar, Folder, ShieldCheck, Clock, FileText, ExternalLink, XCircle, Trash2, Ban, Image as ImageIcon, Film, Music, Compass } from "lucide-react";
import { isTaskInPeriod } from "../utils/mobileTaskUtils";

interface MobileTodoListSectionProps {
  todoTab: "active" | "completed" | "folders";
  setTodoTab: (tab: "active" | "completed" | "folders") => void;
  todoPeriod: "TODAY" | "TOMORROW" | "WEEK" | "MONTH" | "NEXT_MONTH" | "ALL";
  setTodoPeriod: (period: "TODAY" | "TOMORROW" | "WEEK" | "MONTH" | "NEXT_MONTH" | "ALL") => void;
  completedPeriod: "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "LAST_MONTH" | "ALL";
  setCompletedPeriod: (period: "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "LAST_MONTH" | "ALL") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTasks: any[];
  allTasks?: any[];
  activeTaskCount: number;
  completedTaskCount: number;
  taskFolderCount: number;
  onToggleTaskStatus: (taskId: string, currentStatus: string) => void;
  onOpenNewTaskModal: () => void;
  onCancelTaskRequest?: (task: any) => void;
  onSelectTask?: (task: any) => void;
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
  allTasks = [],
  activeTaskCount,
  completedTaskCount,
  taskFolderCount,
  onToggleTaskStatus,
  onOpenNewTaskModal,
  onCancelTaskRequest,
  onSelectTask,
  taskFolderContent,
}) => {

  const handleTaskCheckClick = (t: any) => {
    const isAdminAssigned = 
      t.created_by?.includes('최고관리자') || 
      t.category === 'ADMIN_DIRECTIVE' || 
      t.title?.includes('[수주납기 관리]') ||
      t.is_assigned === true;

    if (isAdminAssigned) {
      // 💡 최고관리자가 배정한 업무는 직원이 직접 체크하여 완료(DONE) 토글 가능
      onToggleTaskStatus(t.id, t.status);
    } else {
      const isTaskDone = t.status === "DONE" || t.status === "COMPLETE" || t.status === "RESOLVED";
      if (!isTaskDone) {
        alert("📌 임직원 현장 상신 건은 최고관리자의 컨트롤타워 관제 및 결재 실행 완료 후 '한 일'로 자동 이동됩니다.");
      } else {
        onToggleTaskStatus(t.id, t.status);
      }
    }
  };

  // 하부 탭별 건수 동적 집계 함수
  const extractDueDate = (t: any): string | null => {
    if (t.due_date && String(t.due_date).trim() !== '') {
      const cleaned = String(t.due_date).trim().replace(/[\.\/]/g, '-');
      const match = cleaned.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      if (match) return match[1];
    }
    if (t.title) {
      const cleaned = String(t.title).trim().replace(/[\.\/]/g, '-');
      const match = cleaned.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      if (match) return match[1];
    }
    return null;
  };

  // 💡 경과 일수(Overdue Days) 계산 헬퍼 (예: 2026-08-28 납기인 건은 오늘 8/31 기준 +3일)
  const getOverdueDays = (t: any): number | null => {
    const rawDateStr = extractDueDate(t);
    if (!rawDateStr) return null;

    try {
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const todayStr = kstNow.toISOString().substring(0, 10);

      const todayMidnight = new Date(`${todayStr}T00:00:00Z`).getTime();
      const targetMidnight = new Date(`${rawDateStr}T00:00:00Z`).getTime();

      const diffMs = todayMidnight - targetMidnight;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch {
      return null;
    }
  };

  const formatTaskDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.substring(0, 16);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${m}.${day} ${h}:${min}`;
    } catch (e) {
      return dateStr.substring(0, 16);
    }
  };

  const getSubTabCount = (periodId: any, tabType: "active" | "completed") => {
    if (!allTasks || allTasks.length === 0) return 0;
    const targetTasks = allTasks.filter((t) => {
      if (tabType === "active") {
        return t.status === "ACTIVE" || t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL";
      } else {
        return t.status === "DONE" || t.status === "COMPLETE" || t.status === "RESOLVED" || t.status === "CANCELLED";
      }
    });
    if (periodId === "ALL") return targetTasks.length;

    return targetTasks.filter((t) => isTaskInPeriod(t, periodId, tabType)).length;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-3.5 sm:p-4 mb-3 sm:mb-4 text-left">
      {/* 3가지 메인 탭 헤더: 할 일 (N) / 한 일 (N) / 태스크 폴더 (N) */}
      <div className="flex items-center pb-3 border-b border-slate-100 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full">
          <button
            type="button"
            onClick={() => setTodoTab("active")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer whitespace-nowrap text-center ${
              todoTab === "active"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            할 일 ({activeTaskCount})
          </button>
          <button
            type="button"
            onClick={() => setTodoTab("completed")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer whitespace-nowrap text-center ${
              todoTab === "completed"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            한 일 ({completedTaskCount})
          </button>
          <button
            type="button"
            onClick={() => setTodoTab("folders")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
              todoTab === "folders"
                ? "bg-white text-indigo-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>태스크 폴더 ({taskFolderCount})</span>
          </button>
        </div>
      </div>

      {/* 3번 탭: 태스크 폴더 선택 시 컨텐츠 바로 노출 */}
      {todoTab === "folders" ? (
        <div className="pt-2">{taskFolderContent}</div>
      ) : (
        <>
          {/* 기간별 필터 세그먼트 스위치 바 (오늘, 내일/어제, 이번주, 이번달, 다음달/지난달) */}
          <div className="pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {todoTab === "active" ? (
              <>
                {[
                  { id: "TODAY", label: "오늘" },
                  { id: "TOMORROW", label: "내일" },
                  { id: "WEEK", label: "이번 주" },
                  { id: "MONTH", label: "이번 달" },
                  { id: "NEXT_MONTH", label: "다음달" },
                ].map((item) => {
                  const count = getSubTabCount(item.id, "active");
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTodoPeriod(item.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all whitespace-nowrap flex items-center gap-1 ${
                        todoPeriod === item.id
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${todoPeriod === item.id ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {[
                  { id: "TODAY", label: "오늘" },
                  { id: "YESTERDAY", label: "어제" },
                  { id: "WEEK", label: "이번 주" },
                  { id: "MONTH", label: "이번 달" },
                  { id: "LAST_MONTH", label: "지난달" },
                ].map((item) => {
                  const count = getSubTabCount(item.id, "completed");
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCompletedPeriod(item.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all whitespace-nowrap flex items-center gap-1 ${
                        completedPeriod === item.id
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${completedPeriod === item.id ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* 검색창 */}
          <div className="relative mt-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="업무 검색..."
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
                    ? "등록된 할 일이 없습니다."
                    : "완료된 한 일이 없습니다."}
                </p>
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isDone = t.status === 'DONE' || t.status === 'COMPLETE' || t.status === 'RESOLVED';
                const isCancelledTask = Boolean(
                  t.is_cancelled ||
                  t.cancel_status === 'APPROVED' ||
                  t.status === 'CANCELLED' ||
                  (isDone && t.has_cancel_request) ||
                  (isDone && (t.description || '').includes('삭제 승인')) ||
                  (isDone && (t.description || '').includes('취소 승인')) ||
                  (isDone && (t.description || '').includes('폐기')) ||
                  (isDone && (t.title || '').includes('취소'))
                );

                const isAdminAssigned = 
                  t.created_by?.includes('최고관리자') || 
                  t.category === 'ADMIN_DIRECTIVE' || 
                  t.title?.includes('[수주납기 관리]') ||
                  t.is_assigned === true;
                const displayTitle = isAdminAssigned
                  ? t.title.replace(/^\[상신\]\s*/g, '')
                  : t.title;

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask && onSelectTask(t)}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 text-left cursor-pointer active:scale-[0.99] ${
                      isCancelledTask
                        ? "bg-rose-50/30 border-rose-200/80 hover:border-rose-300 shadow-2xs"
                        : isDone
                        ? "bg-slate-50/70 border-slate-200/60 opacity-80"
                        : "bg-white border-slate-200 hover:border-indigo-300 shadow-2xs"
                    }`}
                  >
                    {/* 최고관리자 관제 실행 연동 안내 체크 박스 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskCheckClick(t);
                      }}
                      className="mt-0.5 text-slate-400 border-none bg-transparent cursor-pointer shrink-0"
                      title={isCancelledTask ? "취소 승인 완료됨" : isDone ? "정상 완료됨" : isAdminAssigned ? "클릭하여 업무 완료 처리" : "최고관리자 관제 승인 대기"}
                    >
                      {isCancelledTask ? (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      ) : isDone ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs font-extrabold leading-snug ${
                            isCancelledTask
                              ? "line-through text-rose-950/70"
                              : isDone
                              ? "line-through text-slate-400"
                              : "text-slate-800"
                          }`}
                        >
                          {displayTitle}
                        </p>
                        {/* 관제 상태 뱃지 및 취소 요청 버튼 */}
                        {isCancelledTask ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200/80 flex items-center gap-0.5 shrink-0 shadow-3xs">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>취소 승인</span>
                          </span>
                        ) : isDone ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center gap-0.5 shrink-0 shadow-3xs">
                            <ShieldCheck className="w-3 h-3" />
                            <span>정상 완료</span>
                          </span>
                        ) : t.status === 'PENDING_APPROVAL' ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5 shrink-0">
                            <Clock className="w-3 h-3 text-rose-600 animate-pulse" />
                            <span>🚨 취소 승인 대기 중</span>
                          </span>
                        ) : isAdminAssigned ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1 shadow-3xs">
                              <span>📌 배정 업무</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>관제 승인 대기</span>
                            </span>
                            {onCancelTaskRequest && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelTaskRequest(t);
                                }}
                                className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-md text-[9px] font-black cursor-pointer transition-all active:scale-95"
                                title="최고관리자의 관제에 취소 요청 상신"
                              >
                                취소 요청
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {/* 📎 [상신 실물 첨부파일/서류/미디어 미리보기 & 다운로드 뱃지 목록] */}
                      {t.attachments && t.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {t.attachments.map((att: any, attIdx: number) => {
                            const fType = att.fileType || 'DOCUMENT';
                            let badgeStyle = "bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200/80";
                            let icon = <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
                            let linkColor = "text-blue-400";

                            if (fType === "IMAGE") {
                              badgeStyle = "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80";
                              icon = <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                              linkColor = "text-emerald-400";
                            } else if (fType === "VIDEO") {
                              badgeStyle = "bg-purple-50/80 hover:bg-purple-100 text-purple-700 border-purple-200/80";
                              icon = <Film className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
                              linkColor = "text-purple-400";
                            } else if (fType === "AUDIO") {
                              badgeStyle = "bg-amber-50/80 hover:bg-amber-100 text-amber-700 border-amber-200/80";
                              icon = <Music className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
                              linkColor = "text-amber-400";
                            } else if (fType === "CAD") {
                              badgeStyle = "bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80";
                              icon = <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
                              linkColor = "text-indigo-400";
                            }

                            return (
                              <a
                                key={attIdx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 ${badgeStyle} font-extrabold text-[10px] px-2 py-1 rounded-lg border transition-all text-decoration-none cursor-pointer`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {icon}
                                <span className="truncate max-w-[180px]">{att.name}</span>
                                <ExternalLink className={`w-3 h-3 ${linkColor} shrink-0`} />
                              </a>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center flex-wrap gap-1.5 mt-2 text-[10px] font-bold">
                        {/* 1. 마감/납기일 및 경과 일수 뱃지 (할 일인 경우) */}
                        {!isDone && (t.due_date || extractDueDate(t)) && (() => {
                          const targetDate = (t.due_date || extractDueDate(t))?.substring(0, 10);
                          const overdueDays = getOverdueDays(t);
                          const isOverdue = overdueDays !== null && overdueDays > 0;
                          const isToday = overdueDays === 0;

                          return (
                            <span
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold shrink-0 border transition-all ${
                                isOverdue
                                  ? "bg-rose-50 text-rose-700 border-rose-300 shadow-3xs"
                                  : isToday
                                  ? "bg-amber-50 text-amber-800 border-amber-300 shadow-3xs"
                                  : "bg-purple-50 text-purple-700 border-purple-200/80"
                              }`}
                              title={isOverdue ? `마감일로부터 ${overdueDays}일 경과됨` : isToday ? '오늘 마감' : '마감 예정일'}
                            >
                              <Calendar className={`w-3 h-3 shrink-0 ${isOverdue ? "text-rose-600 animate-pulse" : isToday ? "text-amber-600" : "text-purple-600"}`} />
                              <span>{t.title?.includes('[수주납기 관리]') ? '납기' : '마감'} {targetDate}</span>
                              {isOverdue && (
                                <span className="bg-rose-600 text-white font-black px-1.5 py-0.2 rounded text-[9px] ml-0.5 flex items-center gap-0.5 shadow-2xs">
                                  <span>+{overdueDays}일</span>
                                </span>
                              )}
                              {isToday && (
                                <span className="bg-amber-600 text-white font-black px-1.5 py-0.2 rounded text-[9px] ml-0.5 shadow-2xs">
                                  오늘
                                </span>
                              )}
                            </span>
                          );
                        })()}

                        {/* 2. 등록일시 */}
                        {t.created_at && (
                          <span className="flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium shrink-0" title="등록 일시">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>등록 {formatTaskDate(t.created_at)}</span>
                          </span>
                        )}

                        {/* 3. 완료일시 (한 일인 경우) */}
                        {isDone && (t.completed_at || t.updated_at) && (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-md font-bold shrink-0" title="완료 일시">
                            <CheckSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>완료 {formatTaskDate(t.completed_at || t.updated_at)}</span>
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
