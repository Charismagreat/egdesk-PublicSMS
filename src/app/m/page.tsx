"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";

// 분리된 리팩토링 컴포넌트 & 커스텀 훅 Import
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

  // ⏰ 실시간 시계 & 출퇴근 상태
  const [currentTime, setCurrentTime] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<"CHECKED_IN" | "CHECKED_OUT" | "NOT_YET">("NOT_YET");
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [isClocking, setIsClocking] = useState(false);

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

  // 📁 일일 업무 보고서 모달 상태
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);

  // 📋 할 일 / 한 일 상태 및 필터
  const [todoTab, setTodoTab] = usePersistedState<"active" | "completed">("m_todoTab", "active");
  const [todoPeriod, setTodoPeriod] = usePersistedState<"ALL" | "TODAY" | "TOMORROW" | "WEEK" | "MONTH">("m_todoPeriod", "ALL");
  const [completedPeriod, setCompletedPeriod] = usePersistedState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH">("m_completedPeriod", "ALL");
  const [searchQuery, setSearchQuery] = usePersistedState<string>("m_todoSearch", "");
  const [tasks, setTasks] = useState<any[]>([]);

  // 📂 현장 정보 수집 폴더 및 데이터 상태
  const [taskFolders, setTaskFolders] = useState<any[]>([
    { id: "F-1", name: "시흥 본사 설치 현장" },
    { id: "F-2", name: "강남 지사 마케팅 정보" },
  ]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>("F-1");
  const [collectedItems, setCollectedItems] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 시계 라이브 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("ko-KR", { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 로그아웃 핸들러
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
    setIsClocking(true);
    try {
      const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit" });
      setCheckInTime(nowStr);
      setAttendanceStatus("CHECKED_IN");
    } finally {
      setIsClocking(false);
    }
  };

  // 퇴근 등록
  const handleClockOut = async () => {
    setIsClocking(true);
    try {
      const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit" });
      setCheckOutTime(nowStr);
      setAttendanceStatus("CHECKED_OUT");
    } finally {
      setIsClocking(false);
    }
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
              setLocationAddress(`GPS 감지: 인접 사업장 [${nearestWp.name}] (약 ${Math.round(minDistance)}m)`);
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

  const safeJson = async (res: Response) => {
    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    return null;
  };

  // 연차 상신 제출
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
      const json = await safeJson(res);
      if (json && json.success) {
        setIsLeaveModalOpen(false);
        setLeaveReason("");
      } else {
        setLeaveErrorMsg(json?.error || "신청 도중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setLeaveErrorMsg("서버와의 요청 처리 실패");
    } finally {
      setIsLeaveSubmitting(false);
    }
  };

  // 일일 업무 보고서 상신
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReportSubmitting(true);
    try {
      await apiFetch("/api/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json text/plain" },
        body: JSON.stringify({ content: reportContent }),
      });
      setIsDailyReportModalOpen(false);
      setReportContent("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsReportSubmitting(false);
    }
  };

  // AI 일보 요약 생성
  const handleAiSummarizeReport = async () => {
    setIsAiSummarizing(true);
    try {
      const res = await apiFetch("/api/daily-reports/ai-summary");
      const json = await safeJson(res);
      if (json && json.success && json.summary) {
        setReportContent(json.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiSummarizing(false);
    }
  };

  // 할 일 토글
  const handleToggleTaskStatus = (taskId: string, currentStatus: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus === "DONE" ? "TODO" : "DONE" } : t))
    );
  };

  // 현장 수집 파일 업로드
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
    }, 800);
  };

  const filteredTasks = tasks.filter((t) => {
    const isTabMatch = todoTab === "active" ? t.status !== "DONE" : t.status === "DONE";
    const isSearchMatch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return isTabMatch && isSearchMatch;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 text-left">
      {/* 1. 상단 프로필 헤더 */}
      <MobilePortalHeader
        userName={session?.name || "임직원"}
        userRole={session?.role || "직원"}
        avatarUrl={session?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"}
        onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. 출퇴근 실시간 위젯 */}
      <MobileAttendanceWidget
        currentTime={currentTime}
        workplaceName={selectedWorkplace?.name || "본사"}
        attendanceStatus={attendanceStatus}
        checkInTime={checkInTime}
        checkOutTime={checkOutTime}
        isClocking={isClocking}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        onOpenLocationMap={handleOpenLocationMap}
      />

      {/* 3. 일일 업무 보고서 카드 */}
      <MobileDailyReportCard
        isDailyReportModalOpen={isDailyReportModalOpen}
        onOpenModal={() => setIsDailyReportModalOpen(true)}
        onCloseModal={() => setIsDailyReportModalOpen(false)}
        reportContent={reportContent}
        setReportContent={setReportContent}
        isSubmitting={isReportSubmitting}
        isAiSummarizing={isAiSummarizing}
        onAiSummarize={handleAiSummarizeReport}
        onSubmitReport={handleSubmitReport}
      />

      {/* 4. 진행 중 / 완료된 할 일 세그먼트 섹션 */}
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
        onToggleTaskStatus={handleToggleTaskStatus}
        onOpenNewTaskModal={() => {}}
      />

      {/* 5. 현장 정보 수집 폴더 및 파일 관리 */}
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

      {/* 🗺️ 위치 지도 모달 */}
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

      {/* 📅 연차 신청 모달 */}
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
