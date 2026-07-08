"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { 
  Home, Users, MessageSquare, Settings, ShoppingCart, 
  ClipboardList, CreditCard, CalendarDays, Truck, Send, 
  PackageSearch, Package, UserCog, Zap, Ticket, Landmark, Globe, Briefcase, HelpCircle,
  ArrowRightLeft, Handshake, Sparkles, Coins, Database, Compass,
  ChevronUp, ChevronDown, Check, Save, ShieldAlert, GripVertical, Shield, CheckSquare, Wrench, Award, Scale, Key, Mic, Bot
} from "lucide-react";

import { MENU_METADATA_MAP, CATEGORY_MAP } from '@/lib/menu-metadata';

interface MenuSettingItem {
  id?: number;
  menu_href: string;
  is_enabled: number;
  sort_order: number;
}

export default function MenuSettingsCard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [menuItems, setMenuItems] = useState<MenuSettingItem[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 유저 권한 및 메뉴 데이터 로딩
  useEffect(() => {
    // 1-1. 최고관리자 권한 조회
    apiFetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.role === "SUPER_ADMIN") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      })
      .catch(() => setIsAdmin(false));

    // 1-2. 메뉴 설정 조회
    apiFetch("/api/settings/menu", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.menuSettings) {
          let items = data.menuSettings;
          if (typeof window !== "undefined") {
            const savedSort = localStorage.getItem("egdesk_menu_active_sort");
            if (savedSort === "abc" || savedSort === "category" || savedSort === "recent") {
              setActiveSort(savedSort as "abc" | "category" | "recent");
              items = applySortHelper(items, savedSort as "abc" | "category" | "recent");
            }
          }
          setMenuItems(items);
        }
      })
      .catch(e => console.error("메뉴 조회 실패:", e))
      .finally(() => setIsLoading(false));
  }, []);

  // 2. 개별 메뉴 On/Off 토글 핸들러
  const handleToggle = (index: number) => {
    const updated = [...menuItems];
    updated[index].is_enabled = Number(updated[index].is_enabled) === 1 ? 0 : 1;
    setMenuItems(updated);
  };

  // 3. 버튼 클릭을 통한 순서 이동 (위로/아래로)
  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menuItems.length) return;

    setActiveSort(null); // 수동 재배치 시 소팅 필터 비활성화
    if (typeof window !== "undefined") {
      localStorage.removeItem("egdesk_menu_active_sort");
    }

    const updated = [...menuItems];
    // 스왑
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setMenuItems(updated);
  };

  // 4. HTML5 Drag & Drop 핸들러
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    setActiveSort(null); // 수동 재배치 시 소팅 필터 비활성화
    if (typeof window !== "undefined") {
      localStorage.removeItem("egdesk_menu_active_sort");
    }

    const updated = [...menuItems];
    const temp = updated[draggedIdx];
    updated.splice(draggedIdx, 1);
    updated.splice(index, 0, temp);

    setDraggedIdx(index);
    setMenuItems(updated);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  // 5. 서버에 일괄 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reorderedSettings = menuItems.map((item, idx) => ({
        menu_href: item.menu_href,
        is_enabled: item.is_enabled,
        sort_order: (idx + 1) * 10
      }));

      const res = await apiFetch("/api/settings/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: reorderedSettings })
      });
      const data = await res.json();

      if (data.success) {
        setIsSaved(true);
        setMenuItems(reorderedSettings);
        setTimeout(() => setIsSaved(false), 2000);
        
        // 사이드바 동기화 이벤트 트리거
        window.dispatchEvent(new Event("menu-settings-updated"));
      } else {
        alert("메뉴 설정 저장 실패: " + data.error);
      }
    } catch (e: any) {
      alert("서버 통신 오류: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 💡 정렬(소팅) 기준 활성 상태 변수
  const [activeSort, setActiveSort] = useState<"abc" | "category" | "recent" | null>(null);

  // 💡 정렬 처리 공통 헬퍼 함수
  const applySortHelper = (items: MenuSettingItem[], type: "abc" | "category" | "recent") => {
    let sorted = [...items];

    if (type === "abc") {
      // 1. 가나다순 정렬
      sorted.sort((a, b) => {
        const labelA = String(MENU_METADATA_MAP[a.menu_href]?.label || a.menu_href || "");
        const labelB = String(MENU_METADATA_MAP[b.menu_href]?.label || b.menu_href || "");
        return labelA.localeCompare(labelB, "ko");
      });
    } else if (type === "category") {
      // 2. 업무 종류별 정렬
      sorted.sort((a, b) => {
        const hrefA = a.menu_href || "";
        const hrefB = b.menu_href || "";
        const catA = CATEGORY_MAP[hrefA] || 99;
        const catB = CATEGORY_MAP[hrefB] || 99;
        if (catA !== catB) {
          return catA - catB;
        }
        const labelA = String(MENU_METADATA_MAP[hrefA]?.label || hrefA);
        const labelB = String(MENU_METADATA_MAP[hrefB]?.label || hrefB);
        return labelA.localeCompare(labelB, "ko");
      });
    } else if (type === "recent") {
      // 3. 최근 사용 정렬
      let lastUsedMap: Record<string, number> = {};
      if (typeof window !== "undefined") {
        try {
          lastUsedMap = JSON.parse(localStorage.getItem("egdesk_menu_last_used") || "{}");
        } catch (e) {
          console.error(e);
        }
      }
      sorted.sort((a, b) => {
        const hrefA = a.menu_href || "";
        const hrefB = b.menu_href || "";
        const timeA = lastUsedMap[hrefA] || 0;
        const timeB = lastUsedMap[hrefB] || 0;
        if (timeA !== timeB) {
          return timeB - timeA; // 최신 우선
        }
        const labelA = String(MENU_METADATA_MAP[hrefA]?.label || hrefA);
        const labelB = String(MENU_METADATA_MAP[hrefB]?.label || hrefB);
        return labelA.localeCompare(labelB, "ko");
      });
    }

    return sorted.map((item, idx) => ({
      ...item,
      sort_order: (idx + 1) * 10
    }));
  };

  // 💡 메뉴 정렬(소팅) 핸들러 구현
  const handleSort = (type: "abc" | "category" | "recent") => {
    setActiveSort(type);
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_menu_active_sort", type);
    }
    setMenuItems(applySortHelper(menuItems, type));
  };

  // 권한 가드 화면 (주변 영역 스타일과 조화롭게 연한 파스텔 배경 사용)
  if (isAdmin === false) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50/80 p-6 md:p-8 rounded-2xl border border-indigo-100 shadow-sm mt-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-lg font-extrabold text-indigo-950">최고관리자 전용 설정</h2>
          <p className="text-xs text-indigo-750/90 mt-2 max-w-md leading-relaxed">
            사이드바 메뉴 활성화 및 노출 순서 제어 기능은 최고관리자(`SUPER_ADMIN`) 계정으로 로그인한 경우에만 접근 및 편집이 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50/80 p-6 md:p-8 rounded-2xl border border-indigo-100 shadow-sm mt-6 relative overflow-hidden">
      {/* 백그라운드 디자인 글래어 이펙트 (밝은 모드 연출) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-250/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* 헤더 영역 (밝은 테마 보더와 컬러 적용) */}
        <div className="border-b border-indigo-100/60 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-indigo-950 flex items-center gap-2 flex-wrap">
              <Settings className="w-5.5 h-5.5 text-indigo-600" />
              사이드바 동적 메뉴 활성 및 순서 설정
              {!isLoading && (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-850 ml-1">
                    전체 {menuItems.length}개
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-850 ml-1">
                    활성 {menuItems.filter(item => Number(item.is_enabled) === 1).length}개
                  </span>
                </>
              )}
            </h2>
            <p className="text-xs text-indigo-750/90 mt-1.5 leading-relaxed">
              업체 내에서 사용하지 않는 메뉴는 토글 스위치로 꺼서 숨길 수 있으며, 리스트 항목을 마우스로 드래그하거나 화살표 단추를 눌러 노출 순서를 간편하게 재배치할 수 있습니다.
            </p>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 duration-150 shrink-0 self-start md:self-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? "저장 중..." : isSaved ? "저장 완료!" : "메뉴 설정 저장"}
          </button>
        </div>

        {/* 💡 정렬(소팅) 옵션 도구막대 추가 */}
        {!isLoading && menuItems.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-100/30 p-2 rounded-xl border border-indigo-100/60 self-start text-xs">
            <span className="text-[10px] text-indigo-750 font-bold mr-1 select-none">목록 자동 정렬:</span>
            
            <button
              onClick={() => handleSort("abc")}
              className={`px-3 py-1.5 rounded-lg border-none font-extrabold text-[10px] cursor-pointer transition-all duration-150 ${
                activeSort === "abc"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white/80 text-indigo-700 hover:bg-white"
              }`}
            >
              ㄱㄴㄷ 가나다순
            </button>

            <button
              onClick={() => handleSort("category")}
              className={`px-3 py-1.5 rounded-lg border-none font-extrabold text-[10px] cursor-pointer transition-all duration-150 ${
                activeSort === "category"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white/80 text-indigo-700 hover:bg-white"
              }`}
            >
              💼 업무 종류별
            </button>

            <button
              onClick={() => handleSort("recent")}
              className={`px-3 py-1.5 rounded-lg border-none font-extrabold text-[10px] cursor-pointer transition-all duration-150 ${
                activeSort === "recent"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white/80 text-indigo-700 hover:bg-white"
              }`}
            >
              ⏰ 최근 사용순
            </button>
            
            {activeSort && (
              <span className="text-[9px] text-indigo-650/80 font-bold ml-1.5 select-none animate-pulse">
                * 순서가 정렬됨 (설정 저장 버튼을 눌러야 영구 반영됩니다.)
              </span>
            )}
          </div>
        )}

        {/* 로딩 인디케이터 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-indigo-700/80 font-medium">메뉴 데이터를 불러오는 중입니다...</span>
          </div>
        ) : (
          /* 메뉴 아이템 편집 리스트 영역 (밝은 백그라운드와 연한 보더 적용) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto pr-2.5 scrollbar-thin">
            {menuItems.map((item, idx) => {
              const meta = MENU_METADATA_MAP[item.menu_href] || { label: item.menu_href, icon: HelpCircle, color: "text-slate-550" };
              const Icon = meta.icon;
              const isEnabled = Number(item.is_enabled) === 1;

              return (
                <div
                  key={item.menu_href}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-3.5 bg-white/90 hover:bg-indigo-50/50 border rounded-xl transition-all cursor-grab active:cursor-grabbing ${
                    draggedIdx === idx ? "border-indigo-500 bg-indigo-50/40 scale-[0.98]" : isEnabled ? "border-indigo-100" : "border-slate-200/50 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 드래그 핸들 */}
                    <div className="text-slate-400 hover:text-slate-650 transition-colors cursor-grab">
                      <GripVertical className="w-4 h-4 shrink-0" />
                    </div>

                    {/* 아이콘 및 레이블 */}
                    <div className={`p-2 rounded-lg bg-indigo-50/80 shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate">{meta.label}</span>
                      <span className="text-[10px] text-indigo-650/70 tracking-tight mt-0.5 truncate">{item.menu_href}</span>
                    </div>
                  </div>

                  {/* 정렬 제어 및 활성 토글 제어 단추 */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* 순서 조정 버튼 (▲, ▼) */}
                    <div className="flex items-center bg-indigo-50/50 rounded-lg p-0.5 border border-indigo-100/80">
                      <button
                        onClick={() => moveItem(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 disabled:hover:text-slate-300 transition-colors"
                        title="위로 이동"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-[1px] h-3 bg-indigo-100" />
                      <button
                        onClick={() => moveItem(idx, "down")}
                        disabled={idx === menuItems.length - 1}
                        className="p-1 text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 disabled:hover:text-slate-300 transition-colors"
                        title="아래로 이동"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* On/Off 토글 스위치 (밝은 모드 스타일링) */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggle(idx)}
                        className="sr-only peer"
                        id={`toggle-${item.menu_href}`}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
