"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, MessageSquare, Settings, ShoppingCart, 
  ClipboardList, CreditCard, CalendarDays, Truck, Send, 
  PackageSearch, Package, UserCog, Zap, Ticket, Landmark, Globe, Briefcase, HelpCircle,
  ArrowRightLeft, Handshake, Sparkles, Coins, Database, Compass, Shield, CheckSquare, Wrench, ShieldAlert, Award, Scale, Key, Mail, Eye, EyeOff, ExternalLink,
  GripVertical, Activity, Smartphone, Mic, Bot, LayoutDashboard
} from "lucide-react";

import { MENU_STATIC_MAP } from '@/lib/menu-metadata';

interface SidebarMenuProps {
  userRole: string;
  userUsername?: string;
}

interface MenuSettingItem {
  menu_href: string;
  is_enabled: number;
  sort_order: number;
}

export default function SidebarMenu({ userRole, userUsername = "" }: SidebarMenuProps) {
  const pathname = usePathname();
  
  // 1. 초기 렌더링 시 깜빡임이나 공백 방지를 위해 정적 기본 배열로 초기값 바인딩
  const getInitialDefaultItems = () => {
    const baseItems = Object.entries(MENU_STATIC_MAP).map(([href, meta]) => ({
      href,
      label: meta.label,
      icon: meta.icon,
      color: meta.color
    }));
    // 일반 계정일 경우 AI 브리핑은 제외
    const filtered = baseItems.filter(item => {
      if (item.href === "/ai-briefing") {
        return userRole === "SUPER_ADMIN";
      }
      return true;
    });

    // 중복 href 방어 가드 적용
    const seen = new Set<string>();
    return filtered.filter(item => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  };

  const [displayMenuItems, setDisplayMenuItems] = useState<any[]>(getInitialDefaultItems());
  const [hiddenHrefs, setHiddenHrefs] = useState<string[]>([]);
  
  // 드래그 정렬 상태 정의
  const [isRearrangeMode, setIsRearrangeMode] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [pressTimer, setPressTimer] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 💡 새 탭에서 열기 클릭 이벤트 핸들러
  const handleOpenNewTab = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(href, "_blank");
  };

  // 활성화 메뉴 감지 도우미
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // 2. 동적 메뉴 데이터 가져오기 및 권한별 필터링/정렬 수행 함수
  const fetchAndApplyMenuSettings = async () => {
    try {
      const res = await apiFetch("/api/settings/menu");
      const data = await res.json();

      if (data.success && data.menuSettings) {
        const settings: MenuSettingItem[] = data.menuSettings;

        // DB 설정을 토대로 활성화 및 순서 결합
        const resolved = settings
          .filter(setting => {
            // (1) 비활성화된 메뉴 숨김
            if (Number(setting.is_enabled) !== 1) return false;
            
            const cleanHref = (setting.menu_href || "").trim();
            
            // (2) 정적 메뉴 맵(MENU_STATIC_MAP)에 없는 미구현/미개발 임시 경로는 완전히 제외
            if (!MENU_STATIC_MAP[cleanHref]) return false;
            
            // (3) AI 브리핑은 데이터베이스에 켜져 있더라도 최고관리자만 노출
            if (cleanHref === "/ai-briefing") {
              return userRole === "SUPER_ADMIN";
            }
            return true;
          })
          .map(setting => {
            const cleanHref = (setting.menu_href || "").trim();
            const meta = MENU_STATIC_MAP[cleanHref] || { label: cleanHref, icon: HelpCircle, color: "text-slate-400" };
            return {
              href: cleanHref,
              label: meta.label,
              icon: meta.icon,
              color: meta.color,
              sort_order: setting.sort_order
            };
          });

        // 중복 href 방어 가드 적용
        const seen = new Set<string>();
        const uniqueResolved = resolved.filter(item => {
          if (seen.has(item.href)) return false;
          seen.add(item.href);
          return true;
        });

        // sort_order 정렬 왜곡 방지를 위해 숫자 오름차순 정렬 강제 적용
        uniqueResolved.sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

        setDisplayMenuItems(uniqueResolved);
      }
    } catch (e) {
      console.error("사이드바 메뉴 동적 로딩 실패, 로컬 폴백 유지:", e);
    }
  };

  // 3. 마운트 시 동작 및 실시간 이벤트 리스너 등록
  useEffect(() => {
    fetchAndApplyMenuSettings();

    // 로컬스토리지에서 숨긴 메뉴 목록 불러오기
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("egdesk_hidden_menus");
      if (saved) {
        try {
          setHiddenHrefs(JSON.parse(saved));
        } catch (e) {
          console.error("숨김 메뉴 정보 로드 실패", e);
        }
      }
    }

    // 최고관리자 카드 저장 시 실시간 동기화를 위한 이벤트 청취
    window.addEventListener("menu-settings-updated", fetchAndApplyMenuSettings);

    return () => {
      window.removeEventListener("menu-settings-updated", fetchAndApplyMenuSettings);
    };
  }, [userRole]);

  // 💡 메뉴 접근 시 최근 사용(Last Used) 타임스탬프 기록
  useEffect(() => {
    if (typeof window !== "undefined" && pathname) {
      // 정확한 매칭 또는 서브경로 매칭 탐색
      const matchingHref = Object.keys(MENU_STATIC_MAP).find(href => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
      });
      if (matchingHref) {
        try {
          const lastUsedMap = JSON.parse(localStorage.getItem("egdesk_menu_last_used") || "{}");
          lastUsedMap[matchingHref] = Date.now();
          localStorage.setItem("egdesk_menu_last_used", JSON.stringify(lastUsedMap));
        } catch (e) {
          console.error("최근 사용 메뉴 기록 실패:", e);
        }
      }
    }
  }, [pathname]);

  // ESC 키로 편집 모드 탈출
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRearrangeMode) {
        setIsRearrangeMode(false);
        fetchAndApplyMenuSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRearrangeMode]);

  // 롱 프레스 감지 핸들러
  const startPressTimer = (e: React.MouseEvent | React.TouchEvent) => {
    if (userRole !== "SUPER_ADMIN") return;
    if ("button" in e && e.button !== 0) return; // 좌클릭만 허용
    if (isRearrangeMode) return;

    const timer = setTimeout(() => {
      setIsRearrangeMode(true);
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(100);
      }
    }, 2000); // 2초간 롱 프레스
    
    setPressTimer(timer);
  };

  const clearPressTimer = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDraggedOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...displayMenuItems];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setDisplayMenuItems(updated);
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  // DB에 새 순서 저장
  const saveMenuOrder = async () => {
    setIsSaving(true);
    try {
      const mapped = displayMenuItems.map((item, idx) => ({
        menu_href: item.href,
        is_enabled: true,
        sort_order: (idx + 1) * 10
      }));

      const res = await apiFetch("/api/settings/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: mapped })
      });

      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent("menu-settings-updated"));
      } else {
        alert("메뉴 순서 저장 실패: " + data.error);
      }
    } catch (e) {
      console.error("메뉴 순서 저장 중 오류:", e);
      alert("서버 오류로 메뉴 순서를 저장할 수 없습니다.");
    } finally {
      setIsSaving(false);
      setIsRearrangeMode(false);
    }
  };

  // 메뉴 숨김 처리
  const hideMenu = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = [...hiddenHrefs, href];
    setHiddenHrefs(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_hidden_menus", JSON.stringify(next));
    }
  };

  // 메뉴 숨김 해제
  const unhideMenu = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = hiddenHrefs.filter((h) => h !== href);
    setHiddenHrefs(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_hidden_menus", JSON.stringify(next));
    }
  };

  // 현재 노출할 메뉴와 숨김 메뉴 분리 (SUPER_ADMIN 권한만 숨김 필터링 적용)
  const visibleItems = userRole === "SUPER_ADMIN" 
    ? displayMenuItems.filter((item) => !hiddenHrefs.includes(item.href))
    : displayMenuItems;

  const hiddenItems = userRole === "SUPER_ADMIN"
    ? displayMenuItems.filter((item) => hiddenHrefs.includes(item.href))
    : [];

  return (
    <>
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800/80 scrollbar-track-transparent">
        {/* 편집 모드 알림 배너 */}
        {isRearrangeMode && (
          <div className="mx-1 mb-3 bg-blue-950/60 border border-blue-800/50 rounded-lg p-2.5 text-center animate-fade-in shadow-lg shadow-blue-900/10">
            <div className="text-xs font-semibold text-blue-200 mb-1 flex items-center justify-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>메뉴 순서 변경 모드</span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
              메뉴를 드래그 앤 드롭하여 정렬하세요.
            </p>
            <button
              onClick={() => saveMenuOrder()}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-[11px] font-bold py-1.5 px-3 rounded transition-colors border-none cursor-pointer"
            >
              {isSaving ? "저장 중..." : "정렬 완료 (ESC)"}
            </button>
          </div>
        )}

        {visibleItems.map((item, index) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const isDragged = draggedIndex === index;
          const isOver = draggedOverIndex === index;

          if (isRearrangeMode) {
            return (
              <div
                key={item.href}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
                  isDragged ? "opacity-30 border-blue-500 bg-slate-800/20" : ""
                } ${
                  isOver ? "border-t-2 border-t-blue-500 border-dashed bg-slate-800/40" : "border-transparent"
                } ${
                  active
                    ? "bg-blue-600/20 text-white font-semibold border-blue-500/30"
                    : "text-slate-300 bg-slate-800/40 border-slate-750 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                  <Icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : item.color}`} />
                  <span className="truncate text-sm">{item.label}</span>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseDown={startPressTimer}
              onMouseUp={clearPressTimer}
              onMouseLeave={clearPressTimer}
              onTouchStart={startPressTimer}
              onTouchEnd={clearPressTimer}
              className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
                active
                  ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/10 scale-[1.02]"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${active ? "text-white" : item.color}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0 ml-2 z-10">
                {/* 💡 새 탭에서 열기 숏컷 버튼 */}
                <button
                  type="button"
                  onClick={(e) => handleOpenNewTab(e, item.href)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white border-none bg-transparent cursor-pointer flex items-center justify-center"
                  title="새 탭에서 열기"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                {userRole === "SUPER_ADMIN" && (
                  <button
                    type="button"
                    onClick={(e) => hideMenu(item.href, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white border-none bg-transparent cursor-pointer flex items-center justify-center"
                    title="메뉴 숨기기"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Link>
          );
        })}

        {/* 숨겨진 메뉴함 (SUPER_ADMIN 최고관리자 전용) */}
        {userRole === "SUPER_ADMIN" && hiddenItems.length > 0 && (
          <div className="relative group/vault pt-2 mx-1 border-t border-slate-700/60 mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-default p-2 rounded-lg hover:bg-slate-800/30">
              <div className="flex items-center space-x-2">
                <EyeOff className="w-4 h-4 text-slate-500" />
                <span>숨겨진 메뉴함 ({hiddenItems.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">호버하여 열기</span>
            </div>

            {/* 호버 시 팝업되어 위로 솟아오르는 숨김 메뉴 목록 */}
            <div className="absolute bottom-full left-0 right-0 pb-3 hidden group-hover/vault:block z-50">
              <div className="bg-slate-800/95 border border-slate-700 rounded-xl p-2 shadow-2xl backdrop-blur-md space-y-1 animate-fade-in max-w-[240px]">
                <div className="text-[9px] font-bold text-slate-500 px-2.5 py-1.5 border-b border-slate-700 mb-1">
                  클릭하면 원래 메뉴로 복구됩니다
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {hiddenItems.map((hItem) => {
                    const HIcon = hItem.icon;
                    return (
                      <button
                        key={hItem.href}
                        onClick={(e) => unhideMenu(hItem.href, e)}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-semibold text-left transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <HIcon className={`w-4 h-4 shrink-0 ${hItem.color}`} />
                          <span className="truncate">{hItem.label}</span>
                        </div>
                        <Eye className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400 shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* 하단 고정 메뉴 영역 */}
      <div className="p-4 border-t border-slate-700/80 bg-slate-900/95 backdrop-blur-md space-y-2 shadow-[0_-12px_24px_-8px_rgba(0,0,0,0.8)] relative z-10">
        {userRole === "SUPER_ADMIN" && userUsername === "admin" && (
          <Link
            href="/admin/members"
            className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
              isActive("/admin/members")
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/10 scale-[1.02]"
                : "text-slate-300 hover:bg-slate-800 hover:text-white hover:scale-[1.01]"
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Shield className={`w-5 h-5 shrink-0 ${isActive("/admin/members") ? "text-white" : "text-slate-400"}`} />
              <span>회원 관리</span>
            </div>
            {/* 💡 새 탭에서 열기 숏컷 버튼 */}
            <button
              type="button"
              onClick={(e) => handleOpenNewTab(e, "/admin/members")}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 ml-2 z-10"
              title="새 탭에서 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </Link>
        )}

        <Link
          href="/"
          className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
            isActive("/")
              ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/10 scale-[1.02]"
              : "text-slate-300 hover:bg-slate-800 hover:text-white hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <LayoutDashboard className={`w-5 h-5 shrink-0 ${isActive("/") ? "text-white" : "text-blue-550"}`} />
            <span>대시보드</span>
          </div>
          {/* 💡 새 탭에서 열기 숏컷 버튼 */}
          <button
            type="button"
            onClick={(e) => handleOpenNewTab(e, "/")}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 ml-2 z-10"
            title="새 탭에서 열기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </Link>

        {userRole === "SUPER_ADMIN" && (
          <Link
            href="/governance"
            className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
              isActive("/governance")
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/10 scale-[1.02]"
                : "text-slate-300 hover:bg-slate-800 hover:text-white hover:scale-[1.01]"
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <ShieldAlert className={`w-5 h-5 shrink-0 ${isActive("/governance") ? "text-white" : "text-rose-555"}`} />
              <span>AI 컨트롤타워</span>
            </div>
            {/* 💡 새 탭에서 열기 숏컷 버튼 */}
            <button
              type="button"
              onClick={(e) => handleOpenNewTab(e, "/governance")}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 ml-2 z-10"
              title="새 탭에서 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </Link>
        )}

        {(userRole === "SUPER_ADMIN" || userRole === "SUB_OPERATOR") && (
          <Link
            href="/my-db"
            className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
              isActive("/my-db")
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/10 scale-[1.02]"
                : "text-slate-300 hover:bg-slate-800 hover:text-white hover:scale-[1.01]"
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Database className={`w-5 h-5 shrink-0 ${isActive("/my-db") ? "text-white" : "text-slate-400"}`} />
              <span>MY DB</span>
            </div>
            {/* 💡 새 탭에서 열기 숏컷 버튼 */}
            <button
              type="button"
              onClick={(e) => handleOpenNewTab(e, "/my-db")}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 ml-2 z-10"
              title="새 탭에서 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </Link>
        )}
        <Link
          href="/settings"
          className={`group flex items-center justify-between p-3 rounded-lg transition-all ${
            isActive("/settings")
              ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/10 scale-[1.02]"
              : "text-slate-300 hover:bg-slate-800 hover:text-white hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <Settings className={`w-5 h-5 shrink-0 ${isActive("/settings") ? "text-white" : "text-slate-400"}`} />
            <span>시스템 설정</span>
          </div>
          {/* 💡 새 탭에서 열기 숏컷 버튼 */}
          <button
            type="button"
            onClick={(e) => handleOpenNewTab(e, "/settings")}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 ml-2 z-10"
            title="새 탭에서 열기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </>
  );
}
