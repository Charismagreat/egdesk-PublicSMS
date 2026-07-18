"use client";

import React from "react";
import { useSnapTasks } from "./hooks/useSnapTasks";
import { SnapHeader } from "./components/SnapHeader";
import { TaskSearchBar } from "./components/TaskSearchBar";
import { TaskScrollList } from "./components/TaskScrollList";
import { TimelineFeed } from "./components/TimelineFeed";
import { SnapController } from "./components/SnapController";
import NewTaskModal from "./components/NewTaskModal";

export default function MobileSnapTasksPage() {
  const {
    tasks,
    selectedTask,
    setSelectedTask,
    timeline,
    loading,
    detailLoading,
    snapping,
    searchTerm,
    setSearchTerm,
    isNewTaskOpen,
    setIsNewTaskOpen,
    newTaskTitle,
    setNewTaskTitle,
    contentText,
    setContentText,
    attachedFile,
    setAttachedFile,
    attachedFileType,
    setAttachedFileBase64,
    fileInputRef,
    timelineEndRef,
    handleCreateTask,
    handleFileChange,
    handleSnapSubmit,
    filteredTasks
  } = useSnapTasks();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden relative pb-4">
      {/* 럭셔리 네온 아우라 그라데이션 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 모바일 헤더 */}
      <SnapHeader onOpenNewTask={() => setIsNewTaskOpen(true)} />

      {/* 실시간 검색창 */}
      <TaskSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      {/* 1. 부서별 활성 스냅 태스크 수평 스크롤바 */}
      <TaskScrollList
        loading={loading}
        tasks={tasks}
        filteredTasks={filteredTasks}
        selectedTask={selectedTask}
        setSelectedTask={setSelectedTask}
      />

      {/* 2. 메인 바디: 카톡 스타일 타임라인 피드 */}
      <TimelineFeed
        selectedTask={selectedTask}
        detailLoading={detailLoading}
        timeline={timeline}
        timelineEndRef={timelineEndRef}
      />

      {/* 3. 모바일 하단 플로팅 스냅 컨트롤러 위젯 */}
      {selectedTask && (
        <SnapController
          attachedFile={attachedFile}
          attachedFileType={attachedFileType}
          setAttachedFile={setAttachedFile}
          setAttachedFileBase64={setAttachedFileBase64}
          contentText={contentText}
          setContentText={setContentText}
          snapping={snapping}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onSnapSubmit={handleSnapSubmit}
        />
      )}

      {/* 모달: 신규 태스크 개설 팝업 */}
      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        newTaskTitle={newTaskTitle}
        setNewTaskTitle={setNewTaskTitle}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
