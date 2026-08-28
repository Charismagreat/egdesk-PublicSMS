"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Clock } from "lucide-react";

// 분리된 1:1 복원 컴포넌트 & 커스텀 훅 Import
import { useMobilePortalData, getDistanceMeters } from "./hooks/useMobilePortalData";
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

export default function MobileHubPage() {
  const router = useRouter();
  const {
    session,
    allWorkplaces,
    selectedWorkplace,
    setSelectedWorkplace,
    leaveBalance,
  } = useMobilePortalData();

  // 📄 선택된 할 일 카드 상세 모달 상태
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

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

  // ⚠️ 조퇴 여부 및 조퇴 사유 상신 상태
  const [isTodayEarlyLeave, setIsTodayEarlyLeave] = useState(false);
  const [isEarlyLeaveReasonReported, setIsEarlyLeaveReasonReported] = useState(false);
  const [earlyLeaveReason, setEarlyLeaveReason] = useState("");
  const [isReportingEarlyLeaveReason, setIsReportingEarlyLeaveReason] = useState(false);

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
  const [leaveFiles, setLeaveFiles] = useState<any[]>([]);
  const [isLeaveSubmitting, setIsLeaveSubmitting] = useState(false);
  const [leaveErrorMsg, setLeaveErrorMsg] = useState("");

  // ⏳ 대기 중인 반차/연차 결재 상태
  const [pendingLeave, setPendingLeave] = useState<any>(null);
  const [isPendingLeaveModalOpen, setIsPendingLeaveModalOpen] = useState(false);

  const fetchPendingLeave = useCallback(async () => {
    try {
      const res = await apiFetch("/api/hr/leaves?status=PENDING");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.leaves) && json.leaves.length > 0) {
          setPendingLeave(json.leaves[0]);
        } else {
          setPendingLeave(null);
        }
      }
    } catch (e) {
      console.error("Failed to load pending leave:", e);
    }
  }, []);

  useEffect(() => {
    fetchPendingLeave();
  }, [fetchPendingLeave]);

  // 📋 할 일 / 한 일 / 태스크 폴더 탭 & 기간 스위치 필터 상태
  const [todoTab, setTodoTab] = usePersistedState<"active" | "completed" | "folders">("m_todoTab", "active");
  const [todoPeriod, setTodoPeriod] = usePersistedState<"TODAY" | "TOMORROW" | "WEEK" | "MONTH" | "NEXT_MONTH" | "ALL">("m_todoPeriod", "TODAY");
  const [completedPeriod, setCompletedPeriod] = usePersistedState<"TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "LAST_MONTH" | "ALL">("m_completedPeriod", "TODAY");
  const [searchQuery, setSearchQuery] = usePersistedState<string>("m_todoSearch", "");
  const [tasks, setTasks] = useState<any[]>([]);

  // 📂 태스크 정보 수집 폴더 및 파일 내역 실시간 DB 연동
  const [taskFolders, setTaskFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [collectedItems, setCollectedItems] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 🤖 AI 관제 상신 & 태스크 발급 모달 상태
  const [isTaskRequestModalOpen, setIsTaskRequestModalOpen] = useState(false);
  const [requestPhotos, setRequestPhotos] = useState<any[]>([]);
  const [requestFiles, setRequestFiles] = useState<any[]>([]);
  const [requestVoiceText, setRequestVoiceText] = useState("");

  // 📋 스냅태스크(할 일 / 한 일) DB 목록 로드
  useEffect(() => {
    async function loadSnapTasks() {
      try {
        const res = await apiFetch("/api/snaptasks");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            if (json.success && json.tasks) {
              const filtered = json.tasks.filter((t: any) => {
                const title = t.title || '';
                return !(
                  title.includes('이지봇 자율 대행 작동 지침 누락') ||
                  title.includes('AI API 쿼터') ||
                  title.includes('AI API 헬스') ||
                  title.includes('긴급 AI 관제') ||
                  title.includes('작동 지침 누락 경보') ||
                  title.includes('관제 경보')
                );
              });
              setTasks(filtered);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load snaptasks:", e);
      }
    }
    loadSnapTasks();
  }, []);

  // 📂 직원의 실물 태스크 폴더 DB 목록 로드 (/api/task-folders)
  useEffect(() => {
    async function loadTaskFolders() {
      try {
        const res = await apiFetch("/api/task-folders?action=list");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            if (json.success && json.folders) {
              const formattedFolders = json.folders.map((f: any) => ({
                id: String(f.id),
                name: f.name || f.title,
                itemCount: f.items_count || f.count || 0,
              }));
              setTaskFolders(formattedFolders);
              if (formattedFolders.length > 0 && !selectedFolderId) {
                setSelectedFolderId(String(formattedFolders[0].id));
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to load task folders:", e);
      }
    }
    loadTaskFolders();
  }, []);

  // 선택된 태스크 폴더의 수집 아이템 내역 DB 로드 (/api/task-folders)
  useEffect(() => {
    if (!selectedFolderId) return;
    async function loadTaskFolderItems() {
      try {
        const res = await apiFetch(`/api/task-folders?action=items&folder_id=${selectedFolderId}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            if (json.success && json.items) {
              setCollectedItems(
                json.items.map((item: any) => ({
                  id: String(item.id),
                  name: item.file_name || item.title || item.name || "첨부 파일",
                  type: item.type || (item.content_type?.includes("image") ? "IMAGE" : "DOCUMENT"),
                  date: item.created_at ? item.created_at.substring(0, 10) : "",
                }))
              );
            } else {
              setCollectedItems([]);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load task folder items:", e);
      }
    }
    loadTaskFolderItems();
  }, [selectedFolderId]);

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

  // 총 근무 시간 계산 (출근 시각 ~ 퇴근 시각 차이 동적 연산)
  const getTotalWorkTimeStr = () => {
    if (!clockInTime || !clockOutTime) return "0분";
    const [inH, inM, inS] = clockInTime.split(":").map(Number);
    const [outH, outM, outS] = clockOutTime.split(":").map(Number);
    const startSec = inH * 3600 + inM * 60 + (inS || 0);
    const endSec = outH * 3600 + outM * 60 + (outS || 0);
    const diffSec = Math.max(0, endSec - startSec);
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes < 10 ? "0" + minutes : minutes}분`;
    }
    return `${minutes}분`;
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
              const todayStr = new Date().toISOString().substring(0, 10);
              const myName = session?.name;
              const myUsername = session?.username;
              // 오늘 날짜(YYYY-MM-DD)와 일치하고 본인이 작성한 일일 업무 보고서 검색
              const todayFound = json.reports.find((r: any) => {
                const reportDate = r.report_date || r.date || (r.created_at ? r.created_at.substring(0, 10) : "");
                const isDateMatch = reportDate === todayStr;
                const isMyReport = !myName || r.operator === myName || r.operator === myUsername;
                return isDateMatch && isMyReport;
              });
              setTodayReport(todayFound || null);
            } else {
              setTodayReport(null);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch today report:", e);
      }
    }
    fetchTodayReport();
  }, []);

  // 🟢 금일 근태 기록 실시간 DB 페칭 및 복원
  useEffect(() => {
    async function fetchTodayAttendance() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await apiFetch(`/api/hr/attendance?work_date=${todayStr}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.success && data.currentUser) {
              const currentUsername = data.currentUser.id;
              const myRecord = data.employees?.find(
                (e: any) => e.username === currentUsername
              );
              if (myRecord && myRecord.clock_in) {
                setClockInTime(myRecord.clock_in);
                if (myRecord.status === 'LATE') {
                  setIsTodayLate(true);
                  if (myRecord.memo && myRecord.memo.trim() && myRecord.memo !== '지각 출근 기록') {
                    setIsLateReasonReported(true);
                    setLateReason(myRecord.memo);
                  }
                }
                if (myRecord.status === 'EARLY_LEAVE') {
                  setIsTodayEarlyLeave(true);
                  if (myRecord.memo && myRecord.memo.trim() && myRecord.memo !== '정상 출근' && myRecord.memo !== '지각 출근 기록') {
                    setIsEarlyLeaveReasonReported(true);
                    setEarlyLeaveReason(myRecord.memo.replace('[조퇴 사유] ', ''));
                  }
                }
                if (myRecord.clock_out) {
                  setClockOutTime(myRecord.clock_out);
                  setAttendanceStatus("done");
                } else {
                  setAttendanceStatus("working");
                  // 🌟 출근일시 기반 경과시간 정밀 계산 (야간/철야 근무 지원)
                  const [h, m, s] = myRecord.clock_in.split(':').map(Number);
                  const inDateParts = (myRecord.work_date || todayStr).split('-').map(Number);
                  const startTime = new Date(inDateParts[0], inDateParts[1] - 1, inDateParts[2], h, m, s || 0);
                  setWorkStartTime(startTime.getTime());
                  const now = new Date();
                  const diffSec = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                  setElapsedSeconds(diffSec > 0 ? diffSec : 0);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch today attendance:", e);
      }
    }
    fetchTodayAttendance();
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
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOCK_IN" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const now = new Date();
          const timeStr = data.record?.clock_in || now.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setClockInTime(timeStr);
          setWorkStartTime(now.getTime());
          setAttendanceStatus("working");

          if (data.record?.status === "LATE" || (now.getHours() >= 9 && (now.getHours() > 9 || now.getMinutes() > 0))) {
            setIsTodayLate(true);
          }
          alert(data.message || "🟢 출근 등록이 완료되었습니다.");
        } else {
          alert(data.error || "출근 등록 처리에 실패했습니다.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "출근 등록 처리 중 오류가 발생했습니다.");
      }
    } catch (e: any) {
      console.error("Clock-in error:", e);
      alert("출근 등록 중 네트워크 통신 오류가 발생했습니다.");
    }
  };

  // 퇴근 등록
  const handleClockOut = async () => {
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOCK_OUT" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const now = new Date();
          const timeStr = data.record?.clock_out || now.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setClockOutTime(timeStr);
          setAttendanceStatus("done");

          if (data.record?.status === "EARLY_LEAVE") {
            setIsTodayEarlyLeave(true);
          }
          alert(data.message || "👋 퇴근 등록이 완료되었습니다.");
        } else {
          alert(data.error || "퇴근 등록 처리에 실패했습니다.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "퇴근 등록 처리 중 오류가 발생했습니다.");
      }
    } catch (e: any) {
      console.error("Clock-out error:", e);
      alert("퇴근 등록 중 네트워크 통신 오류가 발생했습니다.");
    }
  };

  // 지각 사유 제출
  const handleReportLateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateReason.trim()) {
      alert("지각 사유를 입력해 주세요.");
      return;
    }
    setIsReportingLateReason(true);
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REPORT_LATE_REASON",
          memo: lateReason.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsLateReasonReported(true);
          alert(data.message || "🟢 지각 사유가 정상 상신되었습니다.");
        } else {
          alert(data.error || "지각 사유 제출 실패");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "지각 사유 제출 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      console.error("Failed to report late reason:", err);
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsReportingLateReason(false);
    }
  };

  // 조퇴 사유 제출
  const handleReportEarlyLeaveReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!earlyLeaveReason.trim()) {
      alert("조퇴 사유를 입력해 주세요.");
      return;
    }
    setIsReportingEarlyLeaveReason(true);
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REPORT_LATE_REASON",
          memo: `[조퇴 사유] ${earlyLeaveReason.trim()}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsEarlyLeaveReasonReported(true);
          alert(data.message || "🟢 조퇴 사유가 정상 상신되었습니다.");
        } else {
          alert(data.error || "조퇴 사유 제출 실패");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "조퇴 사유 제출 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      console.error("Failed to report early leave reason:", err);
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsReportingEarlyLeaveReason(false);
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

    let daysSpent = 1;
    if (leaveType === "HALF_AM" || leaveType === "HALF_PM") {
      daysSpent = 0.5;
    } else {
      const s = new Date(leaveStartDate);
      const eDate = new Date(leaveEndDate);
      const diffTime = eDate.getTime() - s.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      daysSpent = diffDays > 0 ? diffDays : 1;
    }

    try {
      const res = await apiFetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPLY",
          leave_type: leaveType,
          start_date: leaveStartDate,
          end_date: leaveType === "ANNUAL" ? leaveEndDate : leaveStartDate,
          days_spent: daysSpent,
          reason: leaveReason,
          attachments: leaveFiles,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsLeaveModalOpen(false);
        setLeaveReason("");
        setLeaveFiles([]);
        fetchPendingLeave();
      } else {
        setLeaveErrorMsg(data.error || "연차 신청 실패");
      }
    } catch (err: any) {
      setLeaveErrorMsg(err.message || "서버 통신 실패");
    } finally {
      setIsLeaveSubmitting(false);
    }
  };

  // AI 관제 상신 & 스냅태스크 발급 처리 함수
  const handleSendGovernanceRequest = async (titleInput: string, note: string, photosInput?: any[], filesInput?: any[]) => {
    try {
      const photosToSend = photosInput && photosInput.length > 0 ? photosInput : requestPhotos;
      const filesToSend = filesInput && filesInput.length > 0 ? filesInput : requestFiles;

      let rawTitle = (titleInput || "").trim();
      if (!rawTitle) {
        const firstFile = (filesToSend[0] || photosToSend[0]);
        if (firstFile?.name) {
          rawTitle = firstFile.name.replace(/\.[^/.]+$/, "");
        } else if (note?.trim()) {
          rawTitle = note.trim().substring(0, 30);
        } else {
          rawTitle = "현장 수주 및 업무 접수";
        }
      }

      const formattedTitle = rawTitle.startsWith("[상신]") ? rawTitle : `[상신] ${rawTitle}`;
      const currentOperator = currentEmployee?.name || (session as any)?.name || (session as any)?.username || "이주용";
      const res = await apiFetch("/api/governance?action=create_log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formattedTitle,
          doc_title: formattedTitle,
          doc_type: "FIELD_COLLECTION",
          note: note,
          operator: currentOperator,
          photos: photosToSend,
          files: filesToSend,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("🎉 업무 요청이 성공적으로 상신되었으며, 새로운 태스크가 발급되었습니다!");
        // 태스크 목록 DB 재조회
        const taskRes = await apiFetch("/api/snaptasks");
        if (taskRes.ok) {
          const taskJson = await taskRes.json();
          if (taskJson.success && taskJson.tasks) {
            setTasks(taskJson.tasks);
          }
        }
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

  // 📂 태스크 폴더 관리 확장 상태 및 헬퍼
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");

  const [isMoveItemModalOpen, setIsMoveItemModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<any>(null);
  const [targetFolderId, setTargetFolderId] = useState("");

  const reloadTaskFolders = async () => {
    try {
      const folderRes = await apiFetch("/api/task-folders?action=list");
      if (folderRes.ok) {
        const folderJson = await folderRes.json();
        if (folderJson.success && folderJson.folders) {
          const formatted = folderJson.folders.map((f: any) => ({
            id: String(f.id),
            name: f.name || f.title,
            description: f.description || "",
            itemCount: f.items_count || f.count || 0,
          }));
          setTaskFolders(formatted);
          return formatted;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  // 1) 신규 태스크 폴더 생성 (이름 & 설명)
  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await apiFetch("/api/task-folders?action=create_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, description: newFolderDesc }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✨ 새로운 태스크 폴더가 생성되었습니다.");
        setNewFolderName("");
        setNewFolderDesc("");
        setIsNewFolderModalOpen(false);
        const updated = await reloadTaskFolders();
        if (updated.length > 0) setSelectedFolderId(String(updated[0].id));
      } else {
        alert("폴더 생성 실패: " + data.error);
      }
    } catch (err: any) {
      alert("폴더 생성 중 오류가 발생했습니다.");
    }
  };

  // 2) 태스크 폴더 수정 (이름 & 설명)
  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !editFolderName.trim()) return;
    try {
      const res = await apiFetch("/api/task-folders?action=update_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingFolder.id, name: editFolderName, description: editFolderDesc }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✏️ 폴더 정보가 수정되었습니다.");
        setIsEditFolderModalOpen(false);
        await reloadTaskFolders();
      } else {
        alert("폴더 수정 실패: " + data.error);
      }
    } catch (err) {
      alert("폴더 수정 중 오류가 발생했습니다.");
    }
  };

  // 3) 태스크 폴더 삭제
  const handleDeleteFolder = async (folderId: string) => {
    try {
      const res = await apiFetch("/api/task-folders?action=delete_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("🗑️ 태스크 폴더가 삭제되었습니다.");
        const updated = await reloadTaskFolders();
        if (updated.length > 0) {
          setSelectedFolderId(String(updated[0].id));
        } else {
          setSelectedFolderId(null);
        }
      } else {
        alert("폴더 삭제 실패: " + data.error);
      }
    } catch (err) {
      alert("폴더 삭제 중 오류가 발생했습니다.");
    }
  };

  // 4) 항목 다른 폴더로 이동
  const handleMoveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingItem || !targetFolderId) return;
    try {
      const res = await apiFetch("/api/task-folders?action=update_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: movingItem.id, folder_id: targetFolderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("🔄 항목이 선택한 폴더로 이동되었습니다.");
        setIsMoveItemModalOpen(false);
        setMovingItem(null);
        if (selectedFolderId) {
          const itemsRes = await apiFetch(`/api/task-folders?action=items&folder_id=${selectedFolderId}`);
          if (itemsRes.ok) {
            const itemsJson = await itemsRes.json();
            setCollectedItems(itemsJson.items || []);
          }
        }
        await reloadTaskFolders();
      } else {
        alert("항목 이동 실패: " + data.error);
      }
    } catch (err) {
      alert("항목 이동 중 오류가 발생했습니다.");
    }
  };

  // 5) 수집 항목 단건 삭제
  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await apiFetch("/api/task-folders?action=delete_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      const data = await res.json();
      if (data.success) {
        setCollectedItems((prev) => prev.filter((i) => String(i.id) !== String(itemId)));
        await reloadTaskFolders();
      } else {
        alert("삭제 실패: " + data.error);
      }
    } catch (err) {
      alert("항목 삭제 중 오류가 발생했습니다.");
    }
  };

  // 태스크 폴더에 자료 직접 보관 처리
  const handleSaveToTaskFolder = async (folderId: string, itemTitle: string) => {
    try {
      const res = await apiFetch("/api/snaptasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_item",
          task_id: folderId,
          title: itemTitle,
          photos: requestPhotos,
          files: requestFiles,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("선택한 태스크 폴더에 자료가 보관되었습니다.");
        setSelectedFolderId(folderId);
        setRequestPhotos([]);
        setRequestFiles([]);
      } else {
        throw new Error(data.error || "보관 실패");
      }
    } catch (e: any) {
      alert("보관 중 오류가 발생했습니다: " + e.message);
    }
  };

  // 할 일 상태 안내
  const handleToggleTaskStatus = (taskId: string, currentStatus: string) => {
    if (currentStatus !== "DONE") {
      alert("📌 해당 업무는 최고관리자의 컨트롤타워 관제 및 승인 완료 후 '한 일'로 자동 전환됩니다.");
    } else {
      alert("✅ 최고관리자의 관제 승인에 의해 실행 완료된 업무입니다.");
    }
  };

  // 🚨 관제 승인 대기 건에 대한 취소 요청 상신
  const handleCancelTaskRequest = async (task: any) => {
    const inputReason = window.prompt(
      `📌 '${task.title}' 건에 대해 최고관리자 관제 취소 요청을 상신하시겠습니까?\n취소 사유를 입력해 주세요:`,
      "단가 또는 입력 정보 재검토를 위해 취소를 요청합니다."
    );
    if (inputReason === null) return;

    const actualReason = inputReason.trim() || `[모바일 현장 직원의 취소 요청] (${task.title})`;
    const operatorName = (session as any)?.user?.name || "임직원";

    try {
      const res = await apiFetch("/api/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_cancel_request",
          taskId: String(task.id),
          reason: actualReason,
          operator: operatorName
        }),
      });

      if (res.ok) {
        alert("🎉 최고관리자의 컨트롤타워 관제에 취소 요청이 정상 상신되었습니다.");
        const taskRes = await apiFetch("/api/snaptasks");
        if (taskRes.ok) {
          const taskJson = await taskRes.json();
          if (taskJson.success && taskJson.tasks) {
            setTasks(taskJson.tasks);
          }
        }
      } else {
        alert("취소 요청 처리에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Failed to cancel task request:", err);
      alert("서버 통신 오류가 발생했습니다.");
    }
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

  // 📅 기간별 필터링 판별 함수 (실제 발생/완료일 기준 정밀 대조)
  const isTaskInPeriod = (t: any, period: string, tab: "active" | "completed") => {
    if (period === "ALL") return true;

    const rawDate = (tab === "active" ? (t.due_date || t.created_at) : (t.resolved_at || t.completed_at || t.updated_at || t.created_at)) || '';
    const dateMatch = String(rawDate).match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    
    if (dateMatch) {
      const [y, m, d] = dateMatch[1].split('-').map(Number);
      const taskDate = new Date(y, m - 1, d);
      taskDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 🗓️ 캘린더 기준 이번 주 (일요일 ~ 토요일) 범위 산출
      const dayOfWeek = today.getDay(); // 0(일) ~ 6(토)
      const sundayTime = new Date(today).setDate(today.getDate() - dayOfWeek);
      const startOfWeek = new Date(sundayTime);
      startOfWeek.setHours(0, 0, 0, 0);

      const saturdayTime = new Date(startOfWeek).setDate(startOfWeek.getDate() + 6);
      const endOfWeek = new Date(saturdayTime);
      endOfWeek.setHours(23, 59, 59, 999);

      const isInCurrentWeek = taskDate.getTime() >= startOfWeek.getTime() && taskDate.getTime() <= endOfWeek.getTime();

      if (tab === "active") {
        if (period === "TODAY") return diffDays <= 0; // 오늘 및 마감 지난 지연건 포함
        if (period === "TOMORROW") return diffDays === 1;
        if (period === "WEEK") return isInCurrentWeek && diffDays >= 0;
        if (period === "MONTH") {
          return taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() === today.getMonth();
        }
        if (period === "NEXT_MONTH") {
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          return taskDate.getFullYear() === nextMonth.getFullYear() && taskDate.getMonth() === nextMonth.getMonth();
        }
      } else {
        // 한 일 (completed) 탭:
        if (period === "TODAY") return diffDays === 0; // 오늘 완료 건만!
        if (period === "YESTERDAY") return diffDays === -1; // 어제 완료 건만!
        if (period === "WEEK") return isInCurrentWeek && diffDays <= 0; // 이번 주에 완료된 건만!
        if (period === "MONTH") {
          return taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() === today.getMonth();
        }
        if (period === "LAST_MONTH") {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          return taskDate.getFullYear() === lastMonth.getFullYear() && taskDate.getMonth() === lastMonth.getMonth();
        }
      }
      return false;
    }

    // 날짜 정보가 전혀 없는 예외 건
    if (tab === "active") {
      return period === "TODAY";
    } else {
      return period === "TODAY";
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const isTabMatch = todoTab === "active" ? t.status !== "DONE" : t.status === "DONE";
    const isSearchMatch = !searchQuery || (t.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const currentPeriod = todoTab === "active" ? todoPeriod : completedPeriod;
    const isPeriodMatch = isTaskInPeriod(t, currentPeriod, todoTab === "active" ? "active" : "completed");
    return isTabMatch && isSearchMatch && isPeriodMatch;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 text-left">
      {/* 1. 상단 유저 헤더 */}
      <MobilePortalHeader
        userName={session?.name || "임직원"}
        avatarUrl={session?.avatar_url}
        pendingLeave={pendingLeave}
        onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
        onOpenPendingLeaveModal={() => setIsPendingLeaveModalOpen(true)}
        onLogout={handleLogout}
        onAvatarUpdated={(newUrl) => {
          if (session) session.avatar_url = newUrl;
        }}
      />

      {/* 2. 실시간 근태 위젯 */}
      <MobileAttendanceWidget
        currentTime={currentTime}
        workplaceName={selectedWorkplace?.name || "본사"}
        attendanceStatus={attendanceStatus}
        checkInTime={clockInTime}
        checkOutTime={clockOutTime}
        elapsedTimeStr={getElapsedWorkTimeStr()}
        totalWorkTimeStr={getTotalWorkTimeStr()}
        isTodayLate={isTodayLate}
        isLateReasonReported={isLateReasonReported}
        lateReason={lateReason}
        setLateReason={setLateReason}
        isReportingLateReason={isReportingLateReason}
        onReportLateReason={handleReportLateReason}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        onOpenLocationMap={handleOpenLocationMap}
        pendingLeave={pendingLeave}
        onOpenPendingLeaveModal={() => setIsPendingLeaveModalOpen(true)}
        isTodayEarlyLeave={isTodayEarlyLeave}
        isEarlyLeaveReasonReported={isEarlyLeaveReasonReported}
        earlyLeaveReason={earlyLeaveReason}
        setEarlyLeaveReason={setEarlyLeaveReason}
        isReportingEarlyLeaveReason={isReportingEarlyLeaveReason}
        onReportEarlyLeaveReason={handleReportEarlyLeaveReason}
      />

      {/* 3. 일일 업무 보고서 카드 (미제출/제출완료/승인완료 상태 반영) */}
      <MobileDailyReportCard todayReport={todayReport} />

      {/* 4. 진행 중 / 완료된 할 일 섹션 */}
      {/* 4. 진행 중 할 일 (N) / 완료된 한 일 (N) / 태스크 폴더 (N) 통합 3탭 섹션 */}
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
        taskFolderCount={taskFolders.length}
        onToggleTaskStatus={handleToggleTaskStatus}
        onOpenNewTaskModal={() => {}}
        onCancelTaskRequest={handleCancelTaskRequest}
        onSelectTask={(task) => setSelectedTask(task)}
        taskFolderContent={
          <MobileFieldTaskCollector
            folders={taskFolders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => setSelectedFolderId(id)}
            onOpenNewFolderModal={() => setIsNewFolderModalOpen(true)}
            onEditFolder={(folder) => {
              setEditingFolder(folder);
              setEditFolderName(folder.name);
              setEditFolderDesc(folder.description || "");
              setIsEditFolderModalOpen(true);
            }}
            onDeleteFolder={handleDeleteFolder}
            collectedItems={collectedItems}
            onUploadFile={handleUploadCollectedFile}
            onOpenItemViewer={() => {}}
            onMoveItem={(item) => {
              setMovingItem(item);
              setTargetFolderId("");
              setIsMoveItemModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onClearFolderItems={() => setCollectedItems([])}
            isUploading={isUploading}
          />
        }
      />

      {/* 📂 1. 새 태스크 폴더 생성 모달 (이름 & 설명) */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xs w-full p-5 space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">새 태스크 폴더 생성</h3>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateNewFolder} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">폴더 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 시흥 본사 통관 서류"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">폴더 설명 (선택)</label>
                <textarea
                  rows={2}
                  placeholder="폴더에 대한 간단한 설명을 입력하세요."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl border-none shadow-xs cursor-pointer"
                >
                  폴더 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ 2. 태스크 폴더 편집 모달 (이름 & 설명 수정) */}
      {isEditFolderModalOpen && editingFolder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xs w-full p-5 space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">태스크 폴더 편집</h3>
              <button
                type="button"
                onClick={() => setIsEditFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateFolder} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">폴더 이름</label>
                <input
                  type="text"
                  required
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">폴더 설명</label>
                <textarea
                  rows={2}
                  value={editFolderDesc}
                  onChange={(e) => setEditFolderDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditFolderModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl border-none shadow-xs cursor-pointer"
                >
                  수정 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔄 3. 항목 다른 폴더로 이동 모달 */}
      {isMoveItemModalOpen && movingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xs w-full p-5 space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">다른 태스크 폴더로 이동</h3>
              <button
                type="button"
                onClick={() => setIsMoveItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleMoveItemSubmit} className="space-y-3">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-400 block text-[10px] font-bold">선택된 항목</span>
                <span className="font-extrabold text-slate-800 truncate block">
                  {movingItem.name || movingItem.title || "첨부 파일"}
                </span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">이동할 목적지 폴더</label>
                <select
                  required
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="">이동할 폴더를 선택하세요</option>
                  {taskFolders
                    .filter((f) => String(f.id) !== String(selectedFolderId))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMoveItemModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!targetFolderId}
                  className="flex-1 py-2 bg-indigo-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl border-none shadow-xs cursor-pointer"
                >
                  이동 실행
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        leaveFiles={leaveFiles}
        onAddLeaveFiles={(newItems) => setLeaveFiles((prev) => [...prev, ...newItems])}
        onRemoveLeaveFile={(index) => setLeaveFiles((prev) => prev.filter((_, i) => i !== index))}
        isSubmitting={isLeaveSubmitting}
        errorMessage={leaveErrorMsg}
        onSubmit={handleSubmitLeave}
      />

      {/* ⏳ 결재 대기 중인 연차/반차 현황 모달 */}
      {isPendingLeaveModalOpen && pendingLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xs w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">결재 대기 현황</h3>
                  <span className="text-[10px] text-amber-600 font-bold">최고관리자 승인 진행 중</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPendingLeaveModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-amber-900">신청 구분</span>
                  <span className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 shadow-3xs">
                    {pendingLeave.leave_type === "HALF_AM"
                      ? "오전 반차 (0.5일)"
                      : pendingLeave.leave_type === "HALF_PM"
                      ? "오후 반차 (0.5일)"
                      : "종일 연차"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-amber-900">희망 일자</span>
                  <span className="font-bold text-slate-800">
                    {pendingLeave.leave_type === "HALF_AM"
                      ? `${pendingLeave.start_date} 오전`
                      : pendingLeave.leave_type === "HALF_PM"
                      ? `${pendingLeave.start_date} 오후`
                      : `${pendingLeave.start_date} ~ ${pendingLeave.end_date}`}
                  </span>
                </div>
                <div className="pt-1 border-t border-amber-200/60">
                  <span className="text-[10px] text-slate-500 font-bold block mb-0.5">신청 사유</span>
                  <span className="font-medium text-slate-700 block bg-white p-2 rounded-xl border border-amber-100">
                    {pendingLeave.reason || "개인 사유"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-[11px] text-slate-600 space-y-1">
                <span className="font-extrabold text-indigo-900 block flex items-center gap-1">
                  💡 근태 정산 안내
                </span>
                <p className="leading-relaxed">
                  최고관리자의 결재 승인이 완료되면 <strong className="text-indigo-700">당일 근무시간(8시간)</strong>으로 최종 확정 정산 처리됩니다.
                </p>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsPendingLeaveModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-xs border-none cursor-pointer"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 AI 관제 상신 & 태스크 자동 발급 모달 */}
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
        taskFolders={taskFolders}
        onSendGovernanceRequest={handleSendGovernanceRequest}
        onSaveToTaskFolder={handleSaveToTaskFolder}
      />

      {/* 🔮 스피드 다이얼 + FAB 버튼 (카메라, 스피커/음성, 폴더, 링크) */}
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
                  name: file.name || '현장사진.jpg', 
                  type: file.type || 'image/jpeg',
                  preview: base64Str, 
                  base64: base64Str,
                  url: base64Str,
                  data: base64Str
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
                  name: file.name || '첨부서류.pdf', 
                  size: (file.size / 1024).toFixed(1) + " KB", 
                  type: file.type || 'application/pdf', 
                  preview: base64Str,
                  base64: base64Str,
                  url: base64Str,
                  data: base64Str
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

      {/* 📱 모바일 할 일 상세 모달 */}
      <MobileTaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onCancelTaskRequest={(taskId, title) => handleCancelTaskRequest({ id: taskId, title })}
      />
    </div>

  );
}
