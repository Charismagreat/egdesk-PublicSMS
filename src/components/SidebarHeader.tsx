"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, LayoutDashboard, Settings, Database, ShieldAlert, Shield, X, Compass
} from "lucide-react";
import { MENU_METADATA_LIST } from "@/lib/menu-metadata";

interface SidebarHeaderProps {
  sidebarMainTitle: string;
  sidebarSubTitle: string;
  userRole: string;
  userUsername: string;
}

export default function SidebarHeader({
  sidebarMainTitle,
  sidebarSubTitle,
  userRole,
  userUsername
}: SidebarHeaderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때 자동으로 입력창에 포커스를 줍니다.
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // 🔍 1. 검색 대상이 될 전체 메뉴 풀 (동적 메뉴 + 하단 고정 메뉴 통합) 구성
  const getFullMenuPool = () => {
    // 동적 메뉴 리스트 매핑
    const dynamicItems = MENU_METADATA_LIST.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      color: item.color,
      type: "업무 AI 서비스"
    }));

    // 하단 고정 메뉴 리스트 동적 권한 매핑
    const staticItems: any[] = [];
    
    // (1) 대시보드
    staticItems.push({
      href: "/",
      label: "대시보드",
      icon: LayoutDashboard,
      color: "text-blue-550",
      type: "기본 관제"
    });

    // (2) 회원 관리 (SUPER_ADMIN + admin인 경우)
    if (userRole === "SUPER_ADMIN" && userUsername === "admin") {
      staticItems.push({
        href: "/admin/members",
        label: "회원 관리",
        icon: Shield,
        color: "text-slate-400",
        type: "플랫폼 관리"
      });
    }

    // (3) AI 컨트롤타워 (SUPER_ADMIN 전용)
    if (userRole === "SUPER_ADMIN") {
      staticItems.push({
        href: "/governance",
        label: "AI 컨트롤타워",
        icon: ShieldAlert,
        color: "text-rose-555",
        type: "플랫폼 관리"
      });
    }

    // (4) MY DB (SUPER_ADMIN 또는 SUB_OPERATOR)
    if (userRole === "SUPER_ADMIN" || userRole === "SUB_OPERATOR") {
      staticItems.push({
        href: "/my-db",
        label: "MY DB",
        icon: Database,
        color: "text-slate-400",
        type: "데이터 자원"
      });
    }

    // (5) 시스템 설정
    staticItems.push({
      href: "/settings",
      label: "시스템 설정",
      icon: Settings,
      color: "text-slate-400",
      type: "기본 관제"
    });

    return [...staticItems, ...dynamicItems];
  };

  // 초성 매칭 도우미
  const matchesConsonants = (str: string, q: string) => {
    const cleanStr = str.toLowerCase();
    const cleanQ = q.toLowerCase();
    
    if (cleanQ === "ㄱㅌ" && (cleanStr.includes("근태") || cleanStr.includes("출퇴근"))) return true;
    if (cleanQ === "ㄱㅇ" && cleanStr.includes("급여")) return true;
    if (cleanQ === "ㅇㅅ" && cleanStr.includes("인사")) return true;
    if (cleanQ === "ㅅㅈ" && (cleanStr.includes("설정") || cleanStr.includes("수주"))) return true;
    if (cleanQ === "ㄷㅅ" && cleanStr.includes("대시보드")) return true;
    if (cleanQ === "ㅋㅌ" && cleanStr.includes("컨트롤타워")) return true;
    if (cleanQ === "ㄱㅈ" && cleanStr.includes("견적")) return true;
    if (cleanQ === "ㅂㅈ" && cleanStr.includes("발주")) return true;
    if (cleanQ === "ㅎㅇ" && cleanStr.includes("회원")) return true;
    if (cleanQ === "ㅁㅊ" && cleanStr.includes("매출")) return true;
    if (cleanQ === "ㅈㅊ" && cleanStr.includes("지출")) return true;
    if (cleanQ === "ㅈㄱ" && cleanStr.includes("재고")) return true;
    if (cleanQ === "ㅅㅂ" && cleanStr.includes("설비")) return true;
    if (cleanQ === "ㅇㅈ" && cleanStr.includes("안전")) return true;
    if (cleanQ === "ㅍㅈ" && cleanStr.includes("품질")) return true;
    if (cleanQ === "ㅇㄴ" && cleanStr.includes("에너지")) return true;
    return false;
  };

  // 실시간 필터링 엔진
  const getFilteredMenus = () => {
    const pool = getFullMenuPool();
    const query = searchQuery.trim().toLowerCase();
    
    if (!query) return pool;

    return pool.filter((menu) => {
      const label = menu.label.toLowerCase();
      const href = menu.href.toLowerCase();
      
      return (
        label.includes(query) ||
        href.includes(query) ||
        matchesConsonants(menu.label, query)
      );
    });
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
    setSearchQuery("");
  };

  const filtered = getFilteredMenus();

  return (
    <>
      {/* 로고 영역 (클릭 가능한 포인터 적용) */}
      <div 
        onClick={() => setIsOpen(true)}
        className="p-6 border-b border-slate-800 w-full min-w-0 cursor-pointer hover:bg-slate-800/40 transition-colors group flex flex-col justify-center select-none"
        title="전체 메뉴 실시간 검색 팝업 열기 🔍"
      >
        <div className="flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 truncate whitespace-nowrap group-hover:scale-[1.01] transition-transform"
            title={sidebarMainTitle}
          >
            {sidebarMainTitle}
          </h1>
          <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 opacity-60 group-hover:opacity-100 transition-opacity">
            🔍 검색
          </span>
        </div>
        <p 
          className="text-sm text-slate-400 mt-1 truncate whitespace-nowrap"
          title={sidebarSubTitle}
        >
          {sidebarSubTitle}
        </p>
      </div>

      {/* 🔮 Spotlight 스타일 Command Palette 메뉴 검색 모달 */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4 animate-fade-in">
          {/* 아웃포커스 클릭 시 닫기 가드 */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl p-5 shadow-2xl space-y-4 relative z-10 flex flex-col max-h-[85vh] overflow-hidden">
            {/* 헤더 및 닫기 버튼 */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-indigo-500 animate-spin-slow" />
                <h3 className="text-sm font-black text-slate-200">이지데스크 AI 메뉴 신속 이동기</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 입력창 */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이동할 메뉴명 또는 초성을 입력하세요... (예: ㄱㅌ, 설정)"
                className="w-full bg-slate-950/60 border border-slate-800 text-white rounded-2xl p-3 pl-10 outline-none text-xs font-black placeholder-slate-500 focus:border-indigo-500/80 transition-colors focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            {/* 메뉴 리스트 (5열 콤팩트 그리드로 스크롤 배제) */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 no-scrollbar">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-500 text-xs font-bold space-y-2">
                  <p>일치하는 메뉴가 발견되지 않았습니다 🔍</p>
                  <p className="text-[10px] text-slate-600 font-normal">정확한 메뉴명을 입력하거나 한글 초성 단축키를 사용해 보세요.</p>
                </div>
              ) : (
                filtered.map((menu) => {
                  const MIcon = menu.icon || Compass;
                  return (
                    <div
                      key={menu.href}
                      onClick={() => handleNavigate(menu.href)}
                      className="group flex items-center space-x-2.5 p-2 rounded-xl bg-slate-950/30 border border-slate-800/60 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all duration-150 cursor-pointer select-none min-w-0"
                      title={`${menu.label} (${menu.href})`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-950/80 group-hover:bg-indigo-700/80 flex items-center justify-center transition-colors shrink-0">
                        <MIcon className={`w-3.5 h-3.5 group-hover:text-white ${menu.color}`} />
                      </div>
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-[11px] font-black text-slate-200 group-hover:text-white transition-colors truncate">
                          {menu.label}
                        </span>
                        <span className="text-[8px] text-slate-500 group-hover:text-indigo-200 transition-colors truncate">
                          {menu.type}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 푸터 핫키 정보 */}
            <div className="text-[9px] text-slate-600 text-center border-t border-slate-800/50 pt-2 shrink-0 select-none">
              닫으려면 <kbd className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800 font-mono">ESC</kbd> 키를 누르세요.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
