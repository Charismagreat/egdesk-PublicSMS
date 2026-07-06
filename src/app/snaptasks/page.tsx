"use client";

import React, { useState } from "react";
import { useSnapTasks } from "./hooks/useSnapTasks";
import { Header } from "./components/Header";
import { SummaryCards } from "./components/SummaryCards";
import { KanbanBoard } from "./components/KanbanBoard";
import { TaskTable } from "./components/TaskTable";
import { DetailModal } from "./components/DetailModal";
import { Sparkles, Activity } from "lucide-react";

export default function SnapTasksDashboard() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const {
    tasks,
    loading,
    selectedTask,
    timeline,
    actions,
    partner,
    partnerContacts,
    detailLoading,
    isDetailOpen,
    setIsDetailOpen,
    contentText,
    setContentText,
    attachedFile,
    setAttachedFile,
    attachedFileType,
    setAttachedFileType,
    setAttachedFileBase64,
    snapping,
    fileInputRef,
    handleFileChange,
    handleSnapSubmit,
    openDetailPopup,
    handleUpdateStatus,
    handleDeleteTask,
  } = useSnapTasks();

  const activeTasks = tasks.filter((t) => t.status === "ACTIVE");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const archivedTasks = tasks.filter((t) => t.status === "ARCHIVED");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]" data-easybot-hint="AI 스냅태스크: 스캔된 사진이나 음성을 바탕으로 할 일을 자율적으로 기안하는 업무 지시 플랫폼입니다.">
        <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* 어드민 퍼플 광채 */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* 헤더 패널 */}
      <Header />

      {/* 실시간 전사적 협업 태스크 지표 요약 */}
      <SummaryCards
        totalCount={tasks.length}
        activeCount={activeTasks.length}
        completedCount={completedTasks.length}
        archivedCount={archivedTasks.length}
      />

      {/* 뷰 모드 토글 세그먼트 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
          <Activity className="w-4.5 h-4.5 text-indigo-500" />
          관제 데이터 디스플레이 설정
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button
            onClick={() => setViewMode("kanban")}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border-none ${
              viewMode === "kanban"
                ? "bg-white text-indigo-650 shadow-3xs"
                : "text-slate-450 hover:text-slate-700 bg-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            칸반 보드 뷰
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border-none ${
              viewMode === "list"
                ? "bg-white text-indigo-650 shadow-3xs"
                : "text-slate-450 hover:text-slate-700 bg-transparent"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            리스트 테이블 뷰
          </button>
        </div>
      </div>

      {/* 3대 칸반보드 또는 리스트 테이블 뷰 */}
      {viewMode === "kanban" ? (
        <KanbanBoard tasks={tasks} onOpenDetail={openDetailPopup} onDeleteTask={handleDeleteTask} />
      ) : (
        <TaskTable tasks={tasks} onOpenDetail={openDetailPopup} onDeleteTask={handleDeleteTask} />
      )}

      {/* 팝업 모달: 특정 태스크의 전체 타임라인 & AI 액션로그 피드 조망 */}
      {selectedTask && (
        <DetailModal
          selectedTask={selectedTask}
          isDetailOpen={isDetailOpen}
          setIsDetailOpen={setIsDetailOpen}
          timeline={timeline}
          actions={actions}
          partner={partner}
          partnerContacts={partnerContacts}
          detailLoading={detailLoading}
          handleUpdateStatus={handleUpdateStatus}
          contentText={contentText}
          setContentText={setContentText}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          attachedFileType={attachedFileType}
          setAttachedFileType={setAttachedFileType}
          setAttachedFileBase64={setAttachedFileBase64}
          snapping={snapping}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          handleSnapSubmit={handleSnapSubmit}
        />
      )}
    </div>
  );
}
