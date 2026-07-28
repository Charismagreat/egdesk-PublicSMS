"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

// Haversine 두 위도/경도 간 거리(m) 연산 헬퍼
export const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function useMobilePortalData() {
  const [session, setSession] = useState<any>(null);
  const [allWorkplaces, setAllWorkplaces] = useState<any[]>([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState<any | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<{ total: number; used: number; remaining: number }>({
    total: 15,
    used: 0,
    remaining: 15,
  });

  // 사업장 목록 페칭
  useEffect(() => {
    async function loadWorkplaces() {
      try {
        const res = await apiFetch("/api/workplaces?action=list");
        const json = await res.json();
        if (json.success && json.workplaces) {
          setAllWorkplaces(json.workplaces);
        }
      } catch (e) {
        console.error("Failed to load workplaces:", e);
      }
    }
    loadWorkplaces();
  }, []);

  // 세션 정보 조회
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await apiFetch("/api/auth/me");
        const json = await res.json();
        if (json.success) {
          setSession(json);
        }
      } catch (e) {
        console.error("Failed to load session:", e);
      }
    }
    loadSession();
  }, []);

  // 세션 수신 시 기본 사업장 지정
  useEffect(() => {
    if (session && allWorkplaces.length > 0 && !selectedWorkplace) {
      const myWp = allWorkplaces.find(
        (w) => w.name === session.workplace_name || w.id === session.workplace_id
      );
      if (myWp) {
        setSelectedWorkplace(myWp);
      } else {
        const mainWp = allWorkplaces.find((w) => w.is_main === "Y") || allWorkplaces[0];
        setSelectedWorkplace(mainWp);
      }
    }
  }, [session, allWorkplaces]);

  // 연차 잔액 조회
  useEffect(() => {
    async function fetchLeaveBalance() {
      try {
        const res = await apiFetch("/api/hr/leaves/balance");
        const json = await res.json();
        if (json.success && json.balance) {
          setLeaveBalance({
            total: json.balance.total_allowed ?? 15,
            used: json.balance.used ?? 0,
            remaining: json.balance.remaining ?? 15,
          });
        }
      } catch (e) {
        console.error("Failed to fetch leave balance:", e);
      }
    }
    fetchLeaveBalance();
  }, []);

  return {
    session,
    allWorkplaces,
    selectedWorkplace,
    setSelectedWorkplace,
    leaveBalance,
    setLeaveBalance,
  };
}
