"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, RefreshCw, CheckCircle, ShieldAlert, AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

export default function AIHelpManager() {
  const pathname = usePathname();

  // --- SSR Hydration 방지용 mounted 상태 ---
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- ⚙️ 도움말 기능 전역 활성화 상태 (localStorage 연계) ---
  const [isHelpEnabled, setIsHelpEnabled] = useState<boolean>(true);
  const isHelpEnabledRef = useRef(isHelpEnabled);

  useEffect(() => {
    isHelpEnabledRef.current = isHelpEnabled;
  }, [isHelpEnabled]);

  const toggleHelp = () => {
    const nextVal = !isHelpEnabled;
    setIsHelpEnabled(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_ai_help_enabled", String(nextVal));
      window.dispatchEvent(
        new CustomEvent("ai-help-toggle", { detail: { enabled: nextVal } })
      );
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("egdesk_ai_help_enabled");
      setIsHelpEnabled(saved !== "false");

      const handleToggle = (e: any) => {
        setIsHelpEnabled(e.detail.enabled);
        if (!e.detail.enabled) {
          // 비활성화 시 즉각 열려 있는 배지 및 팝업 닫기
          setHelpInfo(prev => ({ ...prev, isOpen: false }));
          setCursorIndicator(prev => ({ ...prev, visible: false }));
        }
      };

      window.addEventListener("ai-help-toggle", handleToggle);
      return () => {
        window.removeEventListener("ai-help-toggle", handleToggle);
      };
    }
  }, []);

  // --- 🔑 최고관리자 권한 상태 선언 ---
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  
  // --- 🛎️ 글로벌 토스트 알림 상태 선언 ---
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warn" } | null>(null);

  // --- 💡 AI Contextual 도움말 상태 선언 ---
  const [helpInfo, setHelpInfo] = useState<{
    isOpen: boolean;
    hintKey: string;
    hintText: string;
    explanation: string;
    isLoading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    hintKey: "",
    hintText: "",
    explanation: "",
    isLoading: false,
    error: null
  });

  // --- 💡 AI 마우스 커서 도움말 인디케이터 상태 ---
  const [cursorIndicator, setCursorIndicator] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({
    visible: false,
    x: 0,
    y: 0
  });

  // useRef를 활용한 타이머 및 상태 레퍼런스 영속화 (리렌더링에 의한 리셋 방지)
  const helpInfoRef = useRef(helpInfo);
  const hoverTimerRef = useRef<any>(null);
  const leaveTimerRef = useRef<any>(null);

  useEffect(() => {
    helpInfoRef.current = helpInfo;
  }, [helpInfo]);

  // 도움말 마우스 진입시 해제 방지
  const handlePopupMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handlePopupMouseLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setHelpInfo(prev => ({ ...prev, isOpen: false }));
    }, 1500); // 1.5초 유예 딜레이
  };

  // 마우스 오버 힌트 실시간 리스너 훅 (디펜던시 []로 최초 마운트 시 1회만 등록)
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      if (!isHelpEnabledRef.current) return;
      const target = e.target as HTMLElement;
      if (!target) return;

      // 도움말 팝업창 내부로 마우스가 진입한 경우 닫기 지연 타이머 즉시 초기화 (마우스 좌표 겹침에 의한 진입 이벤트 미발생 대응)
      if (target.closest("#ai-contextual-help-popup")) {
        if (leaveTimerRef.current) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        return;
      }

      const hintElement = target.closest("[data-easybot-hint]");
      if (!hintElement) return;

      const hintText = hintElement.getAttribute("data-easybot-hint") || "";
      if (!hintText) return;

      const colonIdx = hintText.indexOf(":");
      const hintKey = colonIdx !== -1 ? hintText.substring(0, colonIdx).trim() : hintText.trim();
      const hintVal = colonIdx !== -1 ? hintText.substring(colonIdx + 1).trim() : hintText;

      // 즉시 도움말 배지 활성화 및 위치 지정
      setCursorIndicator({
        visible: true,
        x: e.clientX,
        y: e.clientY
      });

      // 1. 이미 동일한 도움말이 열려 있는 경우라면 닫기 타이머만 취소하고 유지
      if (helpInfoRef.current.isOpen && helpInfoRef.current.hintKey === hintKey) {
        if (leaveTimerRef.current) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        return;
      }

      // 2. 다른 요소를 호버한 경우 기존 닫기 타이머 및 대기 타이머 클리어
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }

      // 1초 호버 딜레이 개시
      hoverTimerRef.current = setTimeout(async () => {
        setHelpInfo({
          isOpen: true,
          hintKey,
          hintText: hintVal,
          explanation: "",
          isLoading: true,
          error: null
        });

        // 현재 페이지 경로 파싱
        const pagePath = window.location.pathname;

        try {
          const res = await apiFetch("/api/ai/contextual-help", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hintKey, hintText: hintVal, pagePath })
          });
          const data = await res.json();
          if (data.success) {
            setHelpInfo(prev => ({
              ...prev,
              explanation: data.explanation,
              isLoading: false
            }));
          } else {
            throw new Error(data.error || "도움말 데이터를 불러오지 못했습니다.");
          }
        } catch (err: any) {
          setHelpInfo(prev => ({
            ...prev,
            isLoading: false,
            error: err.message
          }));
        }
      }, 1000);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHelpEnabledRef.current) return;
      const target = e.target as HTMLElement;
      if (!target) return;

      // 팝업창 내부에서 마우스가 움직이는 중이라면 닫기 타이머를 계속 초기화하고 커서 배지를 감춤
      if (target.closest("#ai-contextual-help-popup")) {
        if (leaveTimerRef.current) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        setCursorIndicator(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const hintElement = target.closest("[data-easybot-hint]");
      if (hintElement) {
        setCursorIndicator({
          visible: true,
          x: e.clientX,
          y: e.clientY
        });
      } else {
        setCursorIndicator(prev => prev.visible ? { ...prev, visible: false } : prev);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!isHelpEnabledRef.current) return;
      const target = e.target as HTMLElement;
      if (!target) return;

      const hintElement = target.closest("[data-easybot-hint]");
      if (hintElement) {
        // 호버 중 영역을 나가면 로딩 대기 타이머 클리어
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }

        // 즉시 마우스 배지 숨김
        setCursorIndicator(prev => prev.visible ? { ...prev, visible: false } : prev);

        // 1.5초 뒤 닫기 타이머 예약
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = setTimeout(() => {
          setHelpInfo(prev => ({ ...prev, isOpen: false }));
        }, 1500);
      }
    };

    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const showToast = (message: string, type: "success" | "error" | "warn" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 🔄 AI 도움말 재생성 및 캐시 갱신 핸들러 (최고 관리자 전용)
  const handleRefreshExplanation = async () => {
    if (helpInfo.isLoading || !helpInfo.hintKey) return;

    setHelpInfo(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // 현재 페이지 경로 파싱
    const pagePath = window.location.pathname;

    try {
      const res = await apiFetch("/api/ai/contextual-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hintKey: helpInfo.hintKey,
          hintText: helpInfo.hintText,
          pagePath,
          forceRefresh: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setHelpInfo(prev => ({
          ...prev,
          explanation: data.explanation,
          isLoading: false
        }));
        showToast("AI 도움말 설명이 성공적으로 갱신되었습니다.", "success");
      } else {
        throw new Error(data.error || "도움말 재생성을 실패했습니다.");
      }
    } catch (err: any) {
      setHelpInfo(prev => ({
        ...prev,
        isLoading: false,
        error: err.message
      }));
      showToast(err.message, "error");
    }
  };

  // 🔑 최고관리자(SUPER_ADMIN) 또는 대표자(PRESIDENT) 권한이 있는지 확인하는 헬퍼 변수
  const hasAdminAccess = useMemo(() => {
    if (!userRole) return false;
    const role = userRole.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'PRESIDENT';
  }, [userRole]);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.role) {
          setUserRole(data.role);
        }
      } catch (e) {
        console.error("Failed to fetch user session on client", e);
      }
    };
    fetchUserRole();
  }, []);

  if (
    pathname === '/login' || 
    pathname.startsWith('/interpretation-ai') || 
    pathname.startsWith('/form-management-new/print') || 
    pathname.startsWith('/shared/view') || 
    pathname.startsWith('/store') || 
    pathname.startsWith('/table-order') || 
    pathname.startsWith('/booking') || 
    pathname.startsWith('/m/') || 
    pathname.startsWith('/expenses/mobile-approve') ||
    pathname.startsWith('/employee') ||
    pathname.startsWith('/estimates/web-view') ||
    pathname.startsWith('/estimates/print-pdf') ||
    pathname.startsWith('/estimates/manufacture-webview') ||
    pathname.startsWith('/import-customs/web-view')
  ) {
    return null;
  }

  return (
    <>
      {/* 🛎️ 알림 토스트 컴포넌트 - Portal 렌더링으로 뷰포트 최상단 보장 */}
      {toast && mounted && createPortal(
        <div className={`fixed top-6 right-6 z-[10001] p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
          toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {toast.type === 'error' && <ShieldAlert className="w-5 h-5 text-red-600" />}
          {toast.type === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>,
        document.body
      )}

      {/* 💡 AI 마우스 커서 도움말 인디케이터 (즉시 반응 툴팁 배지) - React Portal 사용으로 쌓임 맥락(Stacking Context) 해결 */}
      {cursorIndicator.visible && !helpInfo.isOpen && mounted && createPortal(
        <div
          className="fixed pointer-events-none z-[10000] flex items-center justify-center bg-gradient-to-tr from-rose-500 to-amber-500 text-white rounded-full w-8 h-8 shadow-2xl animate-pulse print:hidden"
          style={{
            left: `${cursorIndicator.x + 12}px`,
            top: `${cursorIndicator.y + 12}px`,
            transition: "left 0.04s ease-out, top 0.04s ease-out"
          }}
        >
          <Sparkles className="w-4 h-4 text-white animate-bounce" />
        </div>,
        document.body
      )}

      {/* AI 도움말 플로팅 팝업창 - React Portal 사용으로 타 컴포넌트 스크롤 영역과의 마우스 이벤트 겹침(z-index 간섭) 완벽 해결 */}
      {helpInfo.isOpen && mounted && createPortal(
        <div
          id="ai-contextual-help-popup"
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
          className="fixed bottom-24 right-6 w-96 bg-slate-900/90 hover:bg-slate-900/95 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md z-[9999] text-left animate-fade-in text-white transition-all print:hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5 mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <span className="text-xs font-black tracking-tight text-slate-100">AI 도움말</span>
            </div>
            <button
              onClick={() => setHelpInfo(prev => ({ ...prev, isOpen: false }))}
              className="text-slate-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-1 text-[10px]"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200">📌 {helpInfo.hintKey}</h4>
            
            {helpInfo.isLoading ? (
              <div className="flex items-center space-x-2 py-3">
                <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-slate-400 font-medium">설명을 생성하고 있습니다...</span>
              </div>
            ) : helpInfo.error ? (
              <p className="text-xs text-rose-350 leading-relaxed font-semibold">
                {helpInfo.error}
              </p>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                {helpInfo.explanation}
              </p>
            )}
          </div>

          <div className="border-t border-slate-800/80 pt-2.5 mt-3 flex justify-between items-center text-[9px] text-slate-500 font-bold">
            <span>EGDesk AI 서비스</span>
            {hasAdminAccess ? (
              <button
                onClick={handleRefreshExplanation}
                disabled={helpInfo.isLoading}
                className="flex items-center space-x-1 text-rose-400 hover:text-rose-350 transition-colors border-none bg-transparent cursor-pointer font-bold disabled:text-slate-600 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${helpInfo.isLoading ? 'animate-spin' : ''}`} />
                <span>재설명 요청</span>
              </button>
            ) : (
              <span>설명 자동 저장됨</span>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 💡 AI 도움말 끄고 켜기 플로팅 버튼 (이지봇 위젯 왼쪽 옆 배치) */}
      {mounted && createPortal(
        <div className="fixed bottom-[32px] right-[88px] z-50 flex items-center justify-center ignore-capture print:hidden">
          <div className="relative group">
            <button
              onClick={toggleHelp}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border cursor-pointer border-solid ${
                isHelpEnabled
                  ? "bg-gradient-to-tr from-rose-500/90 to-amber-500/90 hover:from-rose-500 hover:to-amber-500 text-white border-rose-400/30 hover:scale-110"
                  : "bg-slate-900/90 hover:bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-700/80 hover:scale-110"
              }`}
              aria-label="Toggle AI Help Guide"
            >
              <Sparkles className={`w-4.5 h-4.5 ${isHelpEnabled ? "animate-pulse" : ""}`} />
            </button>
            
            {/* 프리미엄 툴팁 가이드 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-fade-in">
              <div className="bg-slate-950/95 text-slate-100 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xl border border-solid border-slate-800 whitespace-nowrap">
                {isHelpEnabled ? "AI 도움말 가이드 끄기" : "AI 도움말 가이드 켜기"}
              </div>
              <div className="w-1.5 h-1.5 rotate-45 bg-slate-950 border-r border-b border-solid border-slate-800 -mt-[4px]" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
