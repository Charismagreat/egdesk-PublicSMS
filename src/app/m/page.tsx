"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";

// 🧩 분리된 커스텀 훅 Import
import { useMobilePortalData } from "./hooks/useMobilePortalData";
import { useMobileAttendance } from "./hooks/useMobileAttendance";
import { useMobileLeave } from "./hooks/useMobileLeave";
import { useMobileTaskFolders } from "./hooks/useMobileTaskFolders";
import { isTaskInPeriod } from "./utils/mobileTaskUtils";

// 🧩 분리된 UI 컴포넌트 & 모달 Import
import { MobilePortalHeader } from "./components/MobilePortalHeader";
import { MobileAttendanceWidget } from "./components/MobileAttendanceWidget";
import { MobileLocationMapModal } from "./components/MobileLocationMapModal";
import { MobileLeaveRequestModal } from "./components/MobileLeaveRequestModal";
import { MobileDailyReportCard } from "./components/MobileDailyReportCard";
import { MobileTodoListSection } from "./components/MobileTodoListSection";
import { MobileFieldTaskCollector } from "./components/MobileFieldTaskCollector";
import { MobileSpeedDialFab } from "./components/MobileSpeedDialFab";
import { MobileTaskRequestModal } from "./components/MobileTaskRequestModal";
import MobileTaskDetailModal from "./components/MobileTaskDetailModal";
import { MobileTaskFolderModals } from "./components/MobileTaskFolderModals";

export default function MobileHubPage() {
  const router = useRouter();

  // 1. 포털 및 사용자 기본 데이터
  const {
    session,
    allWorkplaces,
    selectedWorkplace,
    setSelectedWorkplace,
  } = useMobilePortalData();

  // 2. 근태 & 출퇴근 타이머 & 위치 훅
  const attendance = useMobileAttendance(selectedWorkplace);

  // 3. 연차 & 결재대기 훅
  const leave = useMobileLeave();

  // 4. 태스크 폴더 & 수집 관리 훅
  const folders = useMobileTaskFolders();

  // 5. 할 일 & 업무 데이터 상태
  const [tasks, setTasks] = useState<any[]>([]);
  const [todayReport, setTodayReport] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // 6. 상신 모달 상태 및 임시 첨부 파일 상태
  const [isTaskRequestModalOpen, setIsTaskRequestModalOpen] = useState(false);
  const [requestPhotos, setRequestPhotos] = useState<any[]>([]);
  const [requestFiles, setRequestFiles] = useState<any[]>([]);
  const [requestVoiceText, setRequestVoiceText] = useState("");

  // 7. 할 일 / 한 일 / 폴더 탭 및 필터
  const [todoTab, setTodoTab] = usePersistedState<"active" | "completed" | "folders">("m_todoTab", "active");
  const [todoPeriod, setTodoPeriod] = usePersistedState<"TODAY" | "TOMORROW" | "WEEK" | "MONTH" | "NEXT_MONTH" | "ALL">("m_todoPeriod", "TODAY");
  const [completedPeriod, setCompletedPeriod] = usePersistedState<"TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "LAST_MONTH" | "ALL">("m_completedPeriod", "TODAY");
  const [searchQuery, setSearchQuery] = useState("");

  // 8. 할 일 목록 조회
  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiFetch("/api/snaptasks");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.tasks) {
          setTasks(json.tasks);
        }
      }
    } catch (e) {
      console.error("Failed to load tasks:", e);
    }
  }, []);

  // 9. 금일 작성된 일일 업무 보고서 조회
  const fetchTodayReport = useCallback(async () => {
    try {
      const res = await apiFetch("/api/governance?action=daily_reports");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.reports && json.reports.length > 0) {
          const todayStr = new Date().toISOString().substring(0, 10);
          const myName = session?.name;
          const myUsername = session?.username;
          const todayFound = json.reports.find((r: any) => {
            const reportDate = r.report_date || r.date || (r.created_at ? r.created_at.substring(0, 10) : "");
            const isDateMatch = reportDate === todayStr;
            const isMyReport = !myName || r.operator === myName || r.operator === myUsername;
            return isDateMatch && isMyReport;
          });
          setTodayReport(todayFound || null);
        }
      }
    } catch (e) {
      console.error("Failed to load today report:", e);
    }
  }, [session]);

  useEffect(() => {
    fetchTasks();
    fetchTodayReport();
  }, [fetchTasks, fetchTodayReport]);

  // 10. 로그아웃 핸들러
  const handleLogout = async () => {
    if (!confirm("정말 로그아웃 하시겠습니까?")) return;
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
      router.push("/login");
    }
  };

  // 11. 할 일 상태 토글 (완료 / 미완료)
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "DONE" : "ACTIVE";
      const res = await apiFetch("/api/snaptasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (e) {
      console.error("Failed to toggle task status:", e);
    }
  };

  // 12. 상신 취소 요청 핸들러
  const handleCancelTaskRequest = async (task: any) => {
    if (!confirm(`'${task.title}' 상신건을 정말 취소 요청하시겠습니까?`)) return;
    try {
      const res = await apiFetch("/api/governance?action=cancel_log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ 상신 취소 요청이 접수되었습니다.");
        fetchTasks();
        setSelectedTask(null);
      } else {
        alert("취소 요청 실패: " + (data.error || "오류가 발생했습니다."));
      }
    } catch (e) {
      alert("취소 요청 처리 중 오류가 발생했습니다.");
    }
  };

  // 13. AI 관제 상신 & 스냅태스크 발급 핸들러
  const handleSendGovernanceRequest = async (titleInput: string, note: string, photosInput?: any[], filesInput?: any[]) => {
    try {
      const photosToSend = photosInput && photosInput.length > 0 ? photosInput : requestPhotos;
      const filesToSend = filesInput && filesInput.length > 0 ? filesInput : requestFiles;

      let rawTitle = (titleInput || "").trim();
      if (!rawTitle) {
        const firstFile = filesToSend[0] || photosToSend[0];
        if (firstFile?.name) {
          rawTitle = firstFile.name.replace(/\.[^/.]+$/, "");
        } else if (note?.trim()) {
          rawTitle = note.trim().substring(0, 30);
        } else {
          rawTitle = "현장 수주 및 업무 접수";
        }
      }

      const formattedTitle = rawTitle.startsWith("[상신]") ? rawTitle : `[상신] ${rawTitle}`;
      const currentOperator = (session as any)?.name || (session as any)?.username || (session as any)?.user?.name || "이주용";
      const res = await apiFetch("/api/governance?action=create_log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formattedTitle,
          doc_title: formattedTitle,
          doc_type: "FIELD_COLLECTION",
          note: note,
          operator: currentOperator,
          photos: photosToSend.map((p: any) => ({
            name: p.name,
            url: p.url || (p.base64?.startsWith('/') ? p.base64 : ''),
            base64: p.base64 && p.base64.length < 50000 ? p.base64 : (p.url || ''),
            preview: p.preview || p.url || '',
            type: p.type || "image/jpeg",
          })),
          files: filesToSend.map((f: any) => ({
            name: f.name,
            url: f.url || (f.base64?.startsWith('/') ? f.base64 : ''),
            base64: f.base64 && f.base64.length < 50000 ? f.base64 : (f.url || ''),
            preview: f.preview || f.url || '',
            type: f.type || "application/octet-stream",
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("🎉 업무 요청이 성공적으로 상신되었으며, 새로운 태스크가 발급되었습니다!");
        fetchTasks();
        setRequestPhotos([]);
        setRequestFiles([]);
        setRequestVoiceText("");
      } else {
        throw new Error(data.error || "상신 실패");
      }
    } catch (e: any) {
      alert("상신 중 오류가 발생했습니다: " + e.message);
    }
  };

  // 14. 태스크 폴더에 자료 저장
  const handleSaveToTaskFolder = async (folderId: string, folderName: string, items: any[]) => {
    try {
      let savedCount = 0;
      for (const item of items) {
        if (item.file) {
          const ok = await folders.handleUploadCollectedFile(folderId, item.file, item.name || "");
          if (ok) savedCount++;
        }
      }
      alert(`📁 '${folderName}' 폴더에 ${savedCount > 0 ? savedCount : items.length}개의 자료가 저장되었습니다.`);
      folders.setSelectedFolderId(folderId);
      setTodoTab("folders");
      setRequestPhotos([]);
      setRequestFiles([]);
      setRequestVoiceText("");
    } catch (e) {
      alert("폴더 저장 중 오류가 발생했습니다.");
    }
  };

  // 15. 필터링된 할 일 및 완료 목록
  const activeTasks = tasks.filter((t) => t.status === "ACTIVE" || t.status === "IN_PROGRESS" || t.status === "PENDING_APPROVAL");
  const completedTasks = tasks.filter((t) => t.status === "DONE" || t.status === "RESOLVED" || t.status === "CANCELLED");

  const filteredTasks = (todoTab === "active" ? activeTasks : completedTasks).filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.partner_company_name && t.partner_company_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    const currentPeriod = todoTab === "active" ? todoPeriod : completedPeriod;
    return isTaskInPeriod(t, currentPeriod, todoTab);
  });

  const currentUserName = (session as any)?.name || (session as any)?.username || "임직원";
  const currentUserAvatar = (session as any)?.avatar_url || (session as any)?.my_card_image_url || null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 select-none font-sans">
      {/* 메인 컨테이너 */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* 1. 모바일 헤더 */}
        <MobilePortalHeader
          userName={currentUserName}
          avatarUrl={currentUserAvatar}
          pendingLeave={leave.pendingLeave}
          onOpenLeaveModal={() => leave.setIsLeaveModalOpen(true)}
          onOpenPendingLeaveModal={() => leave.setIsPendingLeaveModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* 2-1. 스마트 출퇴근 및 근태 위젯 */}
        <MobileAttendanceWidget
          currentTime={attendance.currentTime}
          workplaceName={selectedWorkplace?.name || "본사 (KST)"}
          attendanceStatus={attendance.attendanceStatus}
          checkInTime={attendance.clockInTime}
          checkOutTime={attendance.clockOutTime}
          elapsedTimeStr={attendance.getElapsedWorkTimeStr()}
          totalWorkTimeStr={attendance.getTotalWorkTimeStr()}
          onClockIn={attendance.handleClockIn}
          onClockOut={attendance.handleClockOut}
          onOpenLocationMap={attendance.handleOpenLocationMap}
          pendingLeave={leave.pendingLeave}
          onOpenPendingLeaveModal={() => leave.setIsPendingLeaveModalOpen(true)}
          isTodayLate={attendance.isTodayLate}
          isLateReasonReported={attendance.isLateReasonReported}
          lateReason={attendance.lateReason}
          setLateReason={attendance.setLateReason}
          isReportingLateReason={attendance.isReportingLateReason}
          onReportLateReason={(e) => {
            if (e && e.preventDefault) e.preventDefault();
            attendance.handleReportLateReason();
          }}
          isTodayEarlyLeave={attendance.isTodayEarlyLeave}
          isEarlyLeaveReasonReported={attendance.isEarlyLeaveReasonReported}
          earlyLeaveReason={attendance.earlyLeaveReason}
          setEarlyLeaveReason={attendance.setEarlyLeaveReason}
          isReportingEarlyLeaveReason={attendance.isReportingEarlyLeaveReason}
          onReportEarlyLeaveReason={(e) => {
            if (e && e.preventDefault) e.preventDefault();
            attendance.handleReportEarlyLeaveReason();
          }}
        />

        {/* 2-2. 일일 업무 보고서 카드 */}
        <MobileDailyReportCard
          todayReport={todayReport}
        />

        {/* 2-3. 할 일 / 한 일 / 태스크 폴더 섹션 */}
        <MobileTodoListSection
          todoTab={todoTab}
          setTodoTab={setTodoTab}
          todoPeriod={todoPeriod}
          setTodoPeriod={setTodoPeriod}
          completedPeriod={completedPeriod}
          setCompletedPeriod={setCompletedPeriod}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredTasks={filteredTasks}
          allTasks={tasks}
          activeTaskCount={activeTasks.length}
          completedTaskCount={completedTasks.length}
          taskFolderCount={folders.taskFolders.length}
          onToggleTaskStatus={handleToggleTaskStatus}
          onOpenNewTaskModal={() => setIsTaskRequestModalOpen(true)}
          onCancelTaskRequest={handleCancelTaskRequest}
          onSelectTask={(task) => setSelectedTask(task)}
          taskFolderContent={
            <MobileFieldTaskCollector
              folders={folders.taskFolders}
              selectedFolderId={folders.selectedFolderId}
              collectedItems={folders.collectedItems}
              onSelectFolder={(id) => folders.setSelectedFolderId(id)}
              onOpenNewFolderModal={() => folders.setIsNewFolderModalOpen(true)}
              onEditFolder={(folder) => {
                folders.setEditingFolder(folder);
                folders.setEditFolderName(folder.name);
                folders.setEditFolderDesc(folder.description || "");
                folders.setIsEditFolderModalOpen(true);
              }}
              onDeleteFolder={(id, name) => folders.handleDeleteFolder(id, name || "")}
              onMoveItem={(item) => {
                folders.setMovingItem(item);
                folders.setTargetFolderId(folders.selectedFolderId || "");
                folders.setIsMoveItemModalOpen(true);
              }}
            />
          }
        />
      </main>

      {/* 3. 근태 GPS 지도 확인 모달 */}
      <MobileLocationMapModal
        isOpen={attendance.isLocationMapModalOpen}
        onClose={() => attendance.setIsLocationMapModalOpen(false)}
        userCoords={attendance.userCoords}
        locationAddress={attendance.locationAddress}
        locationLoading={attendance.locationLoading}
        selectedWorkplace={selectedWorkplace}
        allWorkplaces={allWorkplaces}
        onSelectWorkplace={(wp) => setSelectedWorkplace(wp)}
        onReMeasureLocation={attendance.handleOpenLocationMap}
      />

      {/* 4. 연차 신청 폼 모달 */}
      <MobileLeaveRequestModal
        isOpen={leave.isLeaveModalOpen}
        onClose={() => leave.setIsLeaveModalOpen(false)}
        leaveBalance={leave.leaveBalance}
        leaveType={leave.leaveType}
        setLeaveType={leave.setLeaveType}
        startDate={leave.leaveStartDate}
        setStartDate={leave.setLeaveStartDate}
        endDate={leave.leaveEndDate}
        setEndDate={leave.setLeaveEndDate}
        reason={leave.leaveReason}
        setReason={leave.setLeaveReason}
        leaveFiles={leave.leaveFiles}
        onAddLeaveFiles={(newItems) => leave.setLeaveFiles((prev) => [...prev, ...newItems])}
        onRemoveLeaveFile={(index) => leave.setLeaveFiles((prev) => prev.filter((_, i) => i !== index))}
        isSubmitting={leave.isLeaveSubmitting}
        errorMessage={leave.leaveErrorMsg}
        onSubmit={leave.handleLeaveSubmit}
      />

      {/* 5. 태스크 폴더 관련 모달 3종 + 결재대기 연차 모달 */}
      <MobileTaskFolderModals
        isNewFolderModalOpen={folders.isNewFolderModalOpen}
        setIsNewFolderModalOpen={folders.setIsNewFolderModalOpen}
        newFolderName={folders.newFolderName}
        setNewFolderName={folders.setNewFolderName}
        newFolderDesc={folders.newFolderDesc}
        setNewFolderDesc={folders.setNewFolderDesc}
        handleCreateNewFolder={folders.handleCreateNewFolder}
        isEditFolderModalOpen={folders.isEditFolderModalOpen}
        setIsEditFolderModalOpen={folders.setIsEditFolderModalOpen}
        editFolderName={folders.editFolderName}
        setEditFolderName={folders.setEditFolderName}
        editFolderDesc={folders.editFolderDesc}
        setEditFolderDesc={folders.setEditFolderDesc}
        handleSaveEditFolder={folders.handleSaveEditFolder}
        isMoveItemModalOpen={folders.isMoveItemModalOpen}
        setIsMoveItemModalOpen={folders.setIsMoveItemModalOpen}
        movingItem={folders.movingItem}
        taskFolders={folders.taskFolders}
        targetFolderId={folders.targetFolderId}
        setTargetFolderId={folders.setTargetFolderId}
        handleMoveItemToFolder={folders.handleMoveItemToFolder}
        isPendingLeaveModalOpen={leave.isPendingLeaveModalOpen}
        setIsPendingLeaveModalOpen={leave.setIsPendingLeaveModalOpen}
        pendingLeave={leave.pendingLeave}
      />

      {/* 6. AI 관제 상신 & 태스크 발급 모달 */}
      <MobileTaskRequestModal
        isOpen={isTaskRequestModalOpen}
        onClose={() => setIsTaskRequestModalOpen(false)}
        photos={requestPhotos}
        files={requestFiles}
        voiceText={requestVoiceText}
        setVoiceText={setRequestVoiceText}
        onRemovePhoto={(idx) => setRequestPhotos((prev) => prev.filter((_, i) => i !== idx))}
        onRemoveFile={(idx) => setRequestFiles((prev) => prev.filter((_, i) => i !== idx))}
        onAddPhoto={(p) => setRequestPhotos((prev) => [...prev, p])}
        onAddFile={(f) => setRequestFiles((prev) => [...prev, f])}
        taskFolders={folders.taskFolders}
        onSendGovernanceRequest={handleSendGovernanceRequest}
        onSaveToTaskFolder={handleSaveToTaskFolder}
      />

      {/* 7. 스피드 다이얼 + FAB 버튼 */}
      <MobileSpeedDialFab
        onPhotoCapture={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const base64Str = reader.result as string;
            if (base64Str) {
              setRequestPhotos((prev) => [
                ...prev,
                {
                  name: file.name || "현장사진.jpg",
                  type: file.type || "image/jpeg",
                  preview: base64Str,
                  base64: base64Str,
                  url: base64Str,
                },
              ]);
              setIsTaskRequestModalOpen(true);
            }
          };
          reader.readAsDataURL(file);
          if (e.target) e.target.value = "";
        }}
        onFileUpload={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const base64Str = reader.result as string;
            if (base64Str) {
              setRequestFiles((prev) => [
                ...prev,
                {
                  name: file.name || "첨부서류.pdf",
                  size: (file.size / 1024).toFixed(1) + " KB",
                  type: file.type || "application/pdf",
                  preview: base64Str,
                  base64: base64Str,
                  url: base64Str,
                },
              ]);
              setIsTaskRequestModalOpen(true);
            }
          };
          reader.readAsDataURL(file);
          if (e.target) e.target.value = "";
        }}
        onAddVoiceTask={(audioBlob, note) => {
          setRequestVoiceText(note || "현장 음성 녹음 메모");
          setIsTaskRequestModalOpen(true);
        }}
        onAddLinkTask={(title, url) => {
          setRequestFiles((prev) => [
            ...prev,
            { name: title || url, size: "URL 링크", type: "LINK", isLink: true, url },
          ]);
          setIsTaskRequestModalOpen(true);
        }}
      />

      {/* 8. 모바일 할 일 상세 모달 */}
      <MobileTaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onCancelTaskRequest={(taskId, title) => handleCancelTaskRequest({ id: taskId, title })}
      />
    </div>
  );
}
