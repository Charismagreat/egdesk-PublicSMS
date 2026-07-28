"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";

// 분리된 1:1 복원 컴포넌트 & 커스텀 훅 Import
import { useMobilePortalData, getDistanceMeters } from "./hooks/useMobilePortalData";
import { MobilePortalHeader } from "./components/MobilePortalHeader";
import { MobileAttendanceWidget } from "./components/MobileAttendanceWidget";
import { MobileLocationMapModal } from "./components/MobileLocationMapModal";
import { MobileLeaveRequestModal } from "./components/MobileLeaveRequestModal";
import { MobileDailyReportCard } from "./components/MobileDailyReportCard";
import { MobileTodoListSection } from "./components/MobileTodoListSection";
import { MobileFieldTaskCollector } from "./components/MobileFieldTaskCollector";

export default function MobileHubPage() {
  const router = useRouter();
  const {
    session,
    allWorkplaces,
    selectedWorkplace,
    setSelectedWorkplace,
    leaveBalance,
  } = useMobilePortalData();

  // ⏰ 실시간 시계 & 근태 스탬프 상태
  const [currentTime, setCurrentTime] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<"before" | "working" | "done">("before");
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ⚠️ 지각 여부 및 지각 사유 상신 상태
  const [isTodayLate, setIsTodayLate] = useState(false);
  const [isLateReasonReported, setIsLateReasonReported] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [isReportingLateReason, setIsReportingLateReason] = useState(false);

  // 📄 금일 작성된 일일 업무 보고서 상태
  const [todayReport, setTodayReport] = useState<any>(null);

  // 🗺️ 근태 지도 모달 상태
  const [isLocationMapModalOpen, setIsLocationMapModalOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>("위치 정보 확인 중...");
  const [locationLoading, setLocationLoading] = useState(false);

  // 📅 연차 신청 모달 상태
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<"ANNUAL" | "HALF_AM" | "HALF_PM">("ANNUAL");
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaveReason, setLeaveReason] = useState("");
  const [isLeaveSubmitting, setIsLeaveSubmitting] = useState(false);
  const [leaveErrorMsg, setLeaveErrorMsg] = useState("");

  // 📋 할 일 / 한 일 탭 & 기간 스위치 필터 상태
  const [todoTab, setTodoTab] = usePersistedState<"active" | "completed">("m_todoTab", "active");
  const [todoPeriod, setTodoPeriod] = usePersistedState<"ALL" | "TODAY" | "TOMORROW" | "WEEK" | "MONTH">("m_todoPeriod", "ALL");
  const [completedPeriod, setCompletedPeriod] = usePersistedState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH">("m_completedPeriod", "ALL");
  const [searchQuery, setSearchQuery] = usePersistedState<string>("m_todoSearch", "");
  const [tasks, setTasks] = useState<any[]>([]);

  // 📂 현장 정보 수집 폴더 및 파일 내역 상태
  const [taskFolders, setTaskFolders] = useState<any[]>([
    { id: "F-1", name: "시흥 본사 설치 현장", itemCount: 2 },
    { id: "F-2", name: "강남 지사 마케팅 수집", itemCount: 1 },
  ]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>("F-1");
  const [collectedItems, setCollectedItems] = useState<any[]>([
    { id: "ITEM-1", name: "현장 전경 사진.jpg", type: "IMAGE", date: "2026-07-28" },
    { id: "ITEM-2", name: "설치 시방서 검토.pdf", type: "DOCUMENT", date: "2026-07-28" },
  ]);
  const [isUploading, setIsUploading] = useState(false);

  // 시계 및 근무 시간 타이머 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("ko-KR", { hour12: false }));

      if (attendanceStatus === "working" && workStartTime) {
        const diff = Math.floor((now.getTime() - workStartTime) / 1000);
        setElapsedSeconds(diff > 0 ? diff : 0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attendanceStatus, workStartTime]);

  // 경과 근무 시간 포맷
  const getElapsedWorkTimeStr = () => {
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 금일 작성된 일보 상태 조회
  useEffect(() => {
    async function fetchTodayReport() {
      try {
        const res = await apiFetch("/api/governance?action=daily_reports");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            if (json.success && json.reports && json.reports.length > 0) {
              setTodayReport(json.reports[0]);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch today report:", e);
      }
    }
    fetchTodayReport();
  }, []);

  // 로그아웃
  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  // 출근 등록
  const handleClockIn = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setClockInTime(timeStr);
    setWorkStartTime(now.getTime());
    setAttendanceStatus("working");

    // 09:00 초과 출근 시 지각 판정
    if (now.getHours() >= 9 && (now.getHours() > 9 || now.getMinutes() > 0)) {
      setIsTodayLate(true);
    }
  };

  // 퇴근 등록
  const handleClockOut = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setClockOutTime(timeStr);
    setAttendanceStatus("done");
  };

  // 지각 사유 제출
  const handleReportLateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReportingLateReason(true);
    setTimeout(() => {
      setIsLateReasonReported(true);
      setIsReportingLateReason(false);
    }, 600);
  };

  // 지도 위치 측정 실행
  const handleOpenLocationMap = () => {
    setIsLocationMapModalOpen(true);
    setLocationLoading(true);
    setLocationAddress("GPS 수신 및 최단 거리 사업장 탐지 중...");

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserCoords({ lat: latitude, lng: longitude });

          if (allWorkplaces.length > 0) {
            let minDistance = Infinity;
            let nearestWp: any = null;
            allWorkplaces.forEach((wp) => {
              const d = getDistanceMeters(latitude, longitude, wp.latitude || 37.5665, wp.longitude || 126.9780);
              if (d < minDistance) {
                minDistance = d;
                nearestWp = wp;
              }
            });
            if (nearestWp) {
              setSelectedWorkplace(nearestWp);
              setLocationAddress(`GPS 감지: 가장 인접한 [${nearestWp.name}] (약 ${Math.round(minDistance)}m)`);
            }
          }
          setLocationLoading(false);
        },
        (err) => {
          const defaultWp = selectedWorkplace || allWorkplaces[0] || { name: "본사", latitude: 37.5665, longitude: 126.9780, address: "서울특별시 중구 세종대로 110" };
          setUserCoords({ lat: defaultWp.latitude || 37.5665, lng: defaultWp.longitude || 126.9780 });
          setLocationAddress(`${defaultWp.address || "본사 지정 구역"}`);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // 연차 제출
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLeaveSubmitting(true);
    setLeaveErrorMsg("");
    try {
      const res = await apiFetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: leaveStartDate,
          end_date: leaveType === "ANNUAL" ? leaveEndDate : leaveStartDate,
          reason: leaveReason,
        }),
      });
      if (res.ok) {
        setIsLeaveModalOpen(false);
        setLeaveReason("");
      } else {
        setLeaveErrorMsg("연차 신청 실패");
      }
    } catch (err: any) {
      setLeaveErrorMsg("서버 통신 실패");
    } finally {
      setIsLeaveSubmitting(false);
    }
  };

  // 할 일 상태 토글
  const handleToggleTaskStatus = (taskId: string, currentStatus: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus === "DONE" ? "TODO" : "DONE" } : t))
    );
  };

  // 현장 정보 파일 업로드
  const handleUploadCollectedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      setCollectedItems((prev) => [
        ...prev,
        {
          id: `ITEM-${Date.now()}`,
          name: file.name,
          type: file.type.includes("image") ? "IMAGE" : file.type.includes("audio") ? "AUDIO" : "DOCUMENT",
          date: new Date().toLocaleDateString("ko-KR"),
        },
      ]);
      setIsUploading(false);
    }, 700);
  };

  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const completedTasks = tasks.filter((t) => t.status === "DONE");

  const filteredTasks = tasks.filter((t) => {
    const isTabMatch = todoTab === "active" ? t.status !== "DONE" : t.status === "DONE";
    const isSearchMatch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return isTabMatch && isSearchMatch;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 text-left">
      {/* 1. 상단 유저 헤더 */}
      <MobilePortalHeader
        userName={session?.name || "차민수"}
        avatarUrl={session?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"}
        onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. 실시간 근태 위젯 */}
      <MobileAttendanceWidget
        currentTime={currentTime}
        workplaceName={selectedWorkplace?.name || "본사"}
        attendanceStatus={attendanceStatus}
        checkInTime={clockInTime}
        checkOutTime={clockOutTime}
        elapsedTimeStr={getElapsedWorkTimeStr()}
        totalWorkTimeStr="8시간 00분"
        isTodayLate={isTodayLate}
        isLateReasonReported={isLateReasonReported}
        lateReason={lateReason}
        setLateReason={setLateReason}
        isReportingLateReason={isReportingLateReason}
        onReportLateReason={handleReportLateReason}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        onOpenLocationMap={handleOpenLocationMap}
      />

      {/* 3. 일일 업무 보고서 카드 (미제출/제출완료/승인완료 상태 반영) */}
      <MobileDailyReportCard todayReport={todayReport} />

      {/* 4. 진행 중 / 완료된 할 일 섹션 */}
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
        activeTaskCount={activeTasks.length}
        completedTaskCount={completedTasks.length}
        onToggleTaskStatus={handleToggleTaskStatus}
        onOpenNewTaskModal={() => {}}
      />

      {/* 5. 현장 수집 정보 카드 */}
      <MobileFieldTaskCollector
        folders={taskFolders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={(id) => setSelectedFolderId(id)}
        onOpenNewFolderModal={() => {}}
        collectedItems={collectedItems}
        onUploadFile={handleUploadCollectedFile}
        onOpenItemViewer={() => {}}
        onClearFolderItems={() => setCollectedItems([])}
        isUploading={isUploading}
      />

      {/* 🗺️ 근태 지도 팝업 모달 */}
      <MobileLocationMapModal
        isOpen={isLocationMapModalOpen}
        onClose={() => setIsLocationMapModalOpen(false)}
        userCoords={userCoords}
        locationAddress={locationAddress}
        locationLoading={locationLoading}
        allWorkplaces={allWorkplaces}
        selectedWorkplace={selectedWorkplace}
        onSelectWorkplace={(wp) => setSelectedWorkplace(wp)}
        onReMeasureLocation={handleOpenLocationMap}
      />

      {/* 📅 간편 연차 신청 모달 */}
      <MobileLeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        leaveBalance={leaveBalance}
        leaveType={leaveType}
        setLeaveType={setLeaveType}
        startDate={leaveStartDate}
        setStartDate={setLeaveStartDate}
        endDate={leaveEndDate}
        setEndDate={setLeaveEndDate}
        reason={leaveReason}
        setReason={setLeaveReason}
        isSubmitting={isLeaveSubmitting}
        errorMessage={leaveErrorMsg}
        onSubmit={handleSubmitLeave}
      />
    </div>
  );
}
