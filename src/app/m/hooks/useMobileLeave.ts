"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export function useMobileLeave() {
  // 📅 연차 신청 모달 상태
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<"ANNUAL" | "HALF_AM" | "HALF_PM">("ANNUAL");
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFiles, setLeaveFiles] = useState<any[]>([]);
  const [isLeaveSubmitting, setIsLeaveSubmitting] = useState(false);
  const [leaveErrorMsg, setLeaveErrorMsg] = useState("");

  // ⏳ 결재 대기 중인 연차/반차 현황
  const [pendingLeave, setPendingLeave] = useState<any | null>(null);
  const [isPendingLeaveModalOpen, setIsPendingLeaveModalOpen] = useState(false);

  // 연차 잔액
  const [leaveBalance, setLeaveBalance] = useState<{ total: number; used: number; remaining: number }>({
    total: 15,
    used: 0,
    remaining: 15,
  });

  // 대기 중인 연차 조회
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
      console.error("Failed to fetch pending leave:", e);
    }
  }, []);

  // 연차 잔액 조회
  const fetchLeaveBalance = useCallback(async () => {
    try {
      const res = await apiFetch("/api/hr/leaves/balance");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.balance) {
          setLeaveBalance({
            total: json.balance.total_allowed ?? 15,
            used: json.balance.used ?? 0,
            remaining: json.balance.remaining ?? 15,
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch leave balance:", e);
    }
  }, []);

  useEffect(() => {
    fetchPendingLeave();
    fetchLeaveBalance();
  }, [fetchPendingLeave, fetchLeaveBalance]);

  // 연차 신청 제출
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate) {
      setLeaveErrorMsg("시작일을 선택해 주세요.");
      return;
    }
    if (leaveType === "ANNUAL" && !leaveEndDate) {
      setLeaveErrorMsg("종료일을 선택해 주세요.");
      return;
    }

    setIsLeaveSubmitting(true);
    setLeaveErrorMsg("");

    try {
      const uploadedAttachments: any[] = [];
      for (const f of leaveFiles) {
        if (f.file) {
          const formData = new FormData();
          formData.append("file", f.file);
          const uploadRes = await apiFetch("/api/shared/files", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.file) {
            uploadedAttachments.push({
              name: f.name,
              url: uploadData.file.url,
              file_id: uploadData.file.id,
            });
          }
        } else if (f.url) {
          uploadedAttachments.push(f);
        }
      }

      let daysSpent = 1;
      if (leaveType === "HALF_AM" || leaveType === "HALF_PM") {
        daysSpent = 0.5;
      } else {
        const start = new Date(leaveStartDate);
        const end = new Date(leaveEndDate || leaveStartDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        daysSpent = Math.max(1, diffDays);
      }

      const payload = {
        action: "APPLY",
        leave_type: leaveType,
        start_date: leaveStartDate,
        end_date: leaveType === "ANNUAL" ? leaveEndDate : leaveStartDate,
        days_spent: daysSpent,
        reason: leaveReason,
        attachments: uploadedAttachments,
      };

      const res = await apiFetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert("🎉 연차 신청이 성공적으로 접수되었습니다. 관리자 승인 후 최종 반영됩니다.");
        setIsLeaveModalOpen(false);
        setLeaveReason("");
        setLeaveFiles([]);
        fetchPendingLeave();
        fetchLeaveBalance();
      } else {
        setLeaveErrorMsg(data.error || "연차 신청에 실패했습니다.");
      }
    } catch (err: any) {
      setLeaveErrorMsg(err.message || "서버 통신 실패");
    } finally {
      setIsLeaveSubmitting(false);
    }
  };

  return {
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    leaveType,
    setLeaveType,
    leaveStartDate,
    setLeaveStartDate,
    leaveEndDate,
    setLeaveEndDate,
    leaveReason,
    setLeaveReason,
    leaveFiles,
    setLeaveFiles,
    isLeaveSubmitting,
    leaveErrorMsg,
    handleLeaveSubmit,
    pendingLeave,
    isPendingLeaveModalOpen,
    setIsPendingLeaveModalOpen,
    leaveBalance,
    fetchPendingLeave,
    fetchLeaveBalance,
  };
}
