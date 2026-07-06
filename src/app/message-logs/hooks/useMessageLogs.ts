"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useMemo } from "react";
import { MessageLog, SenderDevice } from "../types";
import { usePersistedState } from "@/hooks/usePersistedState";

export function useMessageLogs() {
  const [data, setData] = useState<MessageLog[]>([]);
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState("egdesk_msglogs_searchQuery", "");
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState("egdesk_msglogs_currentPage", 1);
  const [itemsPerPage, setItemsPerPage, isItemsPerPageRestored] = usePersistedState("egdesk_msglogs_itemsPerPage", 10);
  const [startDate, setStartDate, isStartDateRestored] = usePersistedState("egdesk_msglogs_startDate", "");
  const [endDate, setEndDate, isEndDateRestored] = usePersistedState("egdesk_msglogs_endDate", "");
  const [activePreset, setActivePreset, isActivePresetRestored] = usePersistedState<'all' | 'today' | '7d' | '30d' | 'custom'>("egdesk_msglogs_activePreset", "all");
  const [isMounted, setIsMounted] = useState(false);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isSearchQueryRestored && isCurrentPageRestored && isItemsPerPageRestored && isStartDateRestored && isEndDateRestored && isActivePresetRestored;

  useEffect(() => { 
    setIsMounted(true);
  }, []);

  useEffect(() => { 
    if (isRestored) {
      fetchData(); 
    }
  }, [isRestored]);
  
  // 검색어 또는 날짜 필터 입력 시 페이지 번호 초기화 (단, 세션 복원이 모두 마쳐진 상태에서만 작동하도록 가드)
  useEffect(() => {
    if (isRestored) {
      setCurrentPage(1);
    }
  }, [searchQuery, startDate, endDate, isRestored]);

  const fetchData = async () => {
    try {
      const res = await apiFetch("/api/message-logs");
      const json = await res.json();
      if (json.success) {
        // 🔍 [디버그] 실제 DB 적재 메타데이터 확인용 콘솔로그
        console.log("===== [EGDESK SMS] FETCHED MESSAGE LOGS =====");
        json.logs.slice(0, 5).forEach((log: any) => {
          console.log(`Log ID: ${log.id} | Phone: ${log.phone} | Raw Message Preview: ${log.message ? log.message.substring(log.message.length - 40) : "N/A"}`);
        });
        setData(json.logs || []);
      }
    } catch (e) {
      console.error("발송 내역 조회 에러:", e);
    }
  };

  // 🕒 한국 시간대(KST) YYYY-MM-DD HH:mm:ss 포맷 변환 헬퍼
  const formatKoreanTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      const ss = String(date.getSeconds()).padStart(2, "0");
      
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    } catch (e) {
      return isoString;
    }
  };

  // 날짜 필터 퀵 프리셋 설정 헬퍼
  const setPreset = (preset: "all" | "today" | "7d" | "30d") => {
    setActivePreset(preset);
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const end = new Date();
    const start = new Date();
    
    if (preset === "today") {
      // 오늘
    } else if (preset === "7d") {
      start.setDate(end.getDate() - 7);
    } else if (preset === "30d") {
      start.setDate(end.getDate() - 30);
    }
    
    const toDateString = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    setStartDate(toDateString(start));
    setEndDate(toDateString(end));
  };

  // 발신 기기 메타데이터 파싱 헬퍼
  const parseSenderDevice = (msg: string): SenderDevice => {
    if (!msg) return { cleanMessage: "", deviceId: "기본 기기" };
    const match = msg.match(/\[sender_device:\s*([^\]]+)\]/);
    if (match) {
      const deviceId = match[1];
      const cleanMessage = msg.replace(/\n?\[sender_device:\s*[^\]]+\]/, "");
      return { cleanMessage, deviceId };
    }
    return { cleanMessage: msg, deviceId: "기본 기기" };
  };

  const filteredData = useMemo(() => {
    return data.filter(t => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        (t.phone && t.phone.toLowerCase().includes(query)) ||
        (t.message && t.message.toLowerCase().includes(query))
      );

      if (!matchesSearch) return false;
      if (!t.created_at) return true;

      try {
        const logDate = new Date(t.created_at);
        if (isNaN(logDate.getTime())) return true; // 안전장치

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (logDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) return false;
        }
      } catch (e) {
        console.error(e);
      }
      return true;
    });
  }, [data, searchQuery, startDate, endDate]);

  // 페이지네이션 슬라이싱 로직
  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / itemsPerPage);
  }, [filteredData.length, itemsPerPage]);

  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage;
  }, [currentPage, itemsPerPage]);

  const endIndex = useMemo(() => {
    return startIndex + itemsPerPage;
  }, [startIndex, itemsPerPage]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  return {
    data,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    activePreset,
    setActivePreset,
    isMounted,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    formatKoreanTime,
    setPreset,
    parseSenderDevice,
    fetchData
  };
}
