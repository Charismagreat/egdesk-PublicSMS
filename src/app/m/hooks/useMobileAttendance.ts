"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export function useMobileAttendance(selectedWorkplace?: any) {
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

  // 🗺️ 근태 지도 모달 상태
  const [isLocationMapModalOpen, setIsLocationMapModalOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>("위치 정보 확인 중...");
  const [locationLoading, setLocationLoading] = useState(false);

  // 1초 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("ko-KR", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      if (attendanceStatus === "working" && workStartTime) {
        setElapsedSeconds(Math.floor((now.getTime() - workStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attendanceStatus, workStartTime]);

  // 오늘 근태 기록 조회
  useEffect(() => {
    async function fetchTodayAttendance() {
      try {
        const res = await apiFetch("/api/hr/attendance?action=GET_TODAY");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.record) {
            const rec = data.record;
            if (rec.clock_in) {
              setClockInTime(rec.clock_in);
              const [h, m, s] = rec.clock_in.split(":").map(Number);
              const inDate = new Date();
              inDate.setHours(h, m, s || 0, 0);
              setWorkStartTime(inDate.getTime());
              setAttendanceStatus("working");

              if (h > 9 || (h === 9 && m > 0)) {
                setIsTodayLate(true);
                if (rec.late_reason) {
                  setIsLateReasonReported(true);
                  setLateReason(rec.late_reason);
                }
              }
            }
            if (rec.clock_out) {
              setClockOutTime(rec.clock_out);
              setAttendanceStatus("done");
              const [oh, om] = rec.clock_out.split(":").map(Number);
              if (oh < 18) {
                setIsTodayEarlyLeave(true);
                if (rec.early_leave_reason) {
                  setIsEarlyLeaveReasonReported(true);
                  setEarlyLeaveReason(rec.early_leave_reason);
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

          const hours = now.getHours();
          const minutes = now.getMinutes();
          if (hours > 9 || (hours === 9 && minutes > 0)) {
            setIsTodayLate(true);
            alert("⏰ 정상 출근 시간(09:00) 이후에 출근하셨습니다. 지각 사유를 등록해 주세요.");
          } else {
            alert("✨ 출근이 정상 등록되었습니다!");
          }
        } else {
          alert("출근 등록 실패: " + (data.error || "오류가 발생했습니다."));
        }
      }
    } catch (e) {
      console.error("Clock in error:", e);
      alert("출근 등록 중 오류가 발생했습니다.");
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

          const hours = now.getHours();
          if (hours < 18) {
            setIsTodayEarlyLeave(true);
            alert("⚠️ 정규 퇴근 시간(18:00) 이전에 퇴근하셨습니다. 조퇴 사유를 등록해 주세요.");
          } else {
            alert("🎉 퇴근이 정상 등록되었습니다. 수고하셨습니다!");
          }
        } else {
          alert("퇴근 등록 실패: " + (data.error || "오류가 발생했습니다."));
        }
      }
    } catch (e) {
      console.error("Clock out error:", e);
      alert("퇴근 등록 중 오류가 발생했습니다.");
    }
  };

  // 지각 사유 상신
  const handleReportLateReason = async () => {
    if (!lateReason.trim()) {
      alert("지각 사유를 입력해 주세요.");
      return;
    }
    setIsReportingLateReason(true);
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REPORT_LATE_REASON", reason: lateReason }),
      });
      const data = await res.json();
      if (data.success) {
        setIsLateReasonReported(true);
        alert("✅ 지각 사유가 성공적으로 상신되었습니다.");
      } else {
        alert("상신 실패: " + (data.error || "오류가 발생했습니다."));
      }
    } catch (e) {
      alert("지각 사유 상신 중 오류가 발생했습니다.");
    } finally {
      setIsReportingLateReason(false);
    }
  };

  // 조퇴 사유 상신
  const handleReportEarlyLeaveReason = async () => {
    if (!earlyLeaveReason.trim()) {
      alert("조퇴 사유를 입력해 주세요.");
      return;
    }
    setIsReportingEarlyLeaveReason(true);
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REPORT_EARLY_LEAVE_REASON", reason: earlyLeaveReason }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEarlyLeaveReasonReported(true);
        alert("✅ 조퇴 사유가 성공적으로 상신되었습니다.");
      } else {
        alert("상신 실패: " + (data.error || "오류가 발생했습니다."));
      }
    } catch (e) {
      alert("조퇴 사유 상신 중 오류가 발생했습니다.");
    } finally {
      setIsReportingEarlyLeaveReason(false);
    }
  };

  // 근무 시간 포맷팅
  const getElapsedWorkTimeStr = () => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getTotalWorkTimeStr = () => {
    if (!clockInTime || !clockOutTime) return "00:00:00";
    const [inH, inM, inS = 0] = clockInTime.split(":").map(Number);
    const [outH, outM, outS = 0] = clockOutTime.split(":").map(Number);
    const inTotalSec = inH * 3600 + inM * 60 + inS;
    const outTotalSec = outH * 3600 + outM * 60 + outS;
    let diffSec = Math.max(0, outTotalSec - inTotalSec);
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // 위치 지도 열기
  const handleOpenLocationMap = () => {
    setIsLocationMapModalOpen(true);
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });

          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              setLocationAddress(geoData.display_name || "위치 주소를 찾았습니다.");
            } else {
              setLocationAddress(`위도: ${lat.toFixed(5)}, 경도: ${lng.toFixed(5)}`);
            }
          } catch (err) {
            setLocationAddress(`위도: ${lat.toFixed(5)}, 경도: ${lng.toFixed(5)}`);
          } finally {
            setLocationLoading(false);
          }
        },
        () => {
          alert("위치 정보를 가져올 수 없습니다. GPS 권한을 확인해 주세요.");
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("이 브라우저에서는 위치 정보(GPS)를 지원하지 않습니다.");
      setLocationLoading(false);
    }
  };

  return {
    currentTime,
    attendanceStatus,
    clockInTime,
    clockOutTime,
    workStartTime,
    elapsedSeconds,
    isTodayLate,
    isLateReasonReported,
    lateReason,
    setLateReason,
    isReportingLateReason,
    handleReportLateReason,
    isTodayEarlyLeave,
    isEarlyLeaveReasonReported,
    earlyLeaveReason,
    setEarlyLeaveReason,
    isReportingEarlyLeaveReason,
    handleReportEarlyLeaveReason,
    handleClockIn,
    handleClockOut,
    getElapsedWorkTimeStr,
    getTotalWorkTimeStr,
    isLocationMapModalOpen,
    setIsLocationMapModalOpen,
    userCoords,
    locationAddress,
    locationLoading,
    handleOpenLocationMap,
  };
}
