"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Sparkles,
  UserCheck,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ArrowUpRight,
  Plus,
  Award,
  FileCheck,
  AlertCircle,
  Truck,
  Filter,
  ShieldCheck,
  Users,
  Check,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

export default function DashboardCertPatentWidget() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [patents, setPatents] = useState<any[]>([]);
  const [salesDeliveries, setSalesDeliveries] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 카테고리 필터 상태 ('ALL' | 'AI_TASK' | 'CERT_PATENT' | 'SALES')
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // ⚠️ 미배정 건만 보기 토글 상태
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(false);

  // 달력 연도 / 월 선택 상태
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");

  // 최고관리자 복수 담당자 배정 모달
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [customAssigneeInput, setCustomAssigneeInput] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [registerAsPartnerManager, setRegisterAsPartnerManager] = useState(true);
  const [applyToAllUnassigned, setApplyToAllUnassigned] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/cert-patent");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setCertificates(data.certificates || []);
        setPatents(data.patents || []);
        setSalesDeliveries(data.salesDeliveries || []);
        const filteredOps = (data.operators || []).filter((o: any) => 
          o.role !== 'SYSTEM_ADMIN' && 
          o.username !== 'admin' && 
          o.name !== '시스템 운영자'
        );
        setOperators(filteredOps);
      }
    } catch (e) {
      console.error("Universal Calendar Widget Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDateStr(todayStr);
  }, []);

  // AI Daily Scanner 가동
  const handleTriggerAiScan = async () => {
    try {
      const res = await apiFetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger_ai_scan",
          payload: {
            title: "전사 기한 서류 AI 일일 파싱 및 마일스톤 자동 등록",
            file_name: "전사_통합서류_스캔.pdf"
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("AI Daily Scanner가 가동되어 전사 통합 기한 달력에 새로운 마일스톤이 등록되었습니다!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 👥 복수 담당자 선택 토글
  const toggleAssignee = (name: string) => {
    setSelectedAssignees(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // 배정 모달 열기 핸들러
  const handleOpenAssignModal = (item: any) => {
    setSelectedTask(item);
    const existing = item.assigned_to ? item.assigned_to.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    setSelectedAssignees(existing);
    setCustomAssigneeInput("");
    setRegisterAsPartnerManager(true);
    setApplyToAllUnassigned(true);
    setIsAssignModalOpen(true);
  };

  // 복수 담당자 배정 확정 제출
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    let finalAssignees = [...selectedAssignees];
    if (customAssigneeInput.trim() && !finalAssignees.includes(customAssigneeInput.trim())) {
      finalAssignees.push(customAssigneeInput.trim());
    }

    if (finalAssignees.length === 0) {
      alert("배정할 직원을 1명 이상 선택하거나 입력해 주세요.");
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const isSo = selectedTask.category === "SALES" || selectedTask.type === "SALES_ORDER" || selectedTask.so_id;
      const partnerName = selectedTask.customer_name || selectedTask.raw?.customer_name || selectedTask.raw?.partner_name || '';
      const res = await apiFetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isSo ? "assign_sales_order" : "assign_task",
          payload: {
            taskId: selectedTask.id,
            soId: selectedTask.so_id || (selectedTask.raw?.id ? selectedTask.raw.id : null),
            partnerName,
            assignees: finalAssignees,
            registerAsPartnerManager,
            applyToAllUnassigned
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `${finalAssignees.join(', ')} 님에게 성공적으로 배정되었습니다.`);
        setIsAssignModalOpen(false);
        setSelectedTask(null);
        setSelectedAssignees([]);
        setCustomAssigneeInput("");
        fetchData();
      } else {
        alert(data.error || "배정 처리 중 오류가 발생했습니다.");
      }
    } catch (e: any) {
      console.error(e);
      alert("배정 요청 중 오류: " + e.message);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // 월 이동 핸들러
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // 🗓️ 월별 달력 그리드 일자 계산 (KST 타임존 오차 방지 일관 포맷터)
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarCells = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonthDate = new Date(year, month - 1, d);
    calendarCells.push({
      dateStr: formatDateKey(prevMonthDate),
      dayNum: d,
      isCurrentMonth: false
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    calendarCells.push({
      dateStr: formatDateKey(dateObj),
      dayNum: d,
      isCurrentMonth: true
    });
  }

  const remainingCells = 42 - calendarCells.length;
  for (let d = 1; d <= (remainingCells >= 7 ? remainingCells - 7 : remainingCells); d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    calendarCells.push({
      dateStr: formatDateKey(nextMonthDate),
      dayNum: d,
      isCurrentMonth: false
    });
  }

  // 특정 날짜에 대한 전사 기한 이벤트 조회 (카테고리 필터 및 미배정 필터 포함)
  const getEventsForDate = (dateStr: string) => {
    const eventList: any[] = [];

    // 1. AI 수집/태스크
    if (categoryFilter === "ALL" || categoryFilter === "AI_TASK") {
      tasks.forEach(t => {
        if (t.due_date === dateStr) {
          eventList.push({
            category: 'AI_TASK',
            type: 'TASK',
            id: t.id,
            title: t.title,
            status: t.status,
            assigned_to: t.assigned_to,
            raw: t
          });
        }
      });
    }

    // 2. 인증서 만료일 & 특허 연차료
    if (categoryFilter === "ALL" || categoryFilter === "CERT_PATENT") {
      certificates.forEach(c => {
        if (c.expire_date === dateStr) {
          eventList.push({
            category: 'CERT_PATENT',
            type: 'CERT',
            id: c.id,
            title: `[인증만료] ${c.cert_name}`,
            status: c.renewal_status,
            assigned_to: c.assigned_to || null,
            raw: c
          });
        }
      });

      patents.forEach(p => {
        if (p.next_annual_fee_date === dateStr) {
          eventList.push({
            category: 'CERT_PATENT',
            type: 'PATENT',
            id: p.id,
            title: `[연차료] ${p.title}`,
            amount: p.annual_fee_amount,
            assigned_to: p.assigned_to || null,
            raw: p
          });
        }
      });
    }

    // 3. 수주/발주 납기 기한
    if (categoryFilter === "ALL" || categoryFilter === "SALES") {
      salesDeliveries.forEach(s => {
        if (s.due_date === dateStr) {
          eventList.push({
            category: 'SALES',
            type: s.type || 'SALES_DELIVERY',
            id: s.id,
            so_id: s.so_id,
            title: s.title,
            amount: s.amount,
            assigned_to: s.assigned_to || null,
            raw: s
          });
        }
      });
    }

    // ⚠️ 미배정 필터 적용 (assigned_to가 없는 건만 추출)
    if (unassignedOnly) {
      return eventList.filter(ev => !ev.assigned_to || String(ev.assigned_to).trim() === "");
    }

    return eventList;
  };

  // 전사 전체 미배정 총 건수 계산
  const totalUnassignedCount = useMemo(() => {
    let count = 0;
    tasks.forEach(t => { if (!t.assigned_to) count++; });
    salesDeliveries.forEach(s => { if (!s.assigned_to) count++; });
    return count;
  }, [tasks, salesDeliveries]);

  // 선택된 일자의 이벤트 목록
  const selectedEvents = getEventsForDate(selectedDateStr);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
      {/* 캘린더 위젯 상단 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              전사 캘린더 (수주 납기 · 전사 마일스톤)
            </h3>
            <span className="text-[11px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
              실시간 DB 감시 연동
            </span>
            <div className="flex items-center gap-1.5 ml-2 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 납기예정
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 명세발송
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span> 🚚 납품완료
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            수주 대장 납기일, 특허 연차료, 인증서 갱신, AI 자동 태스크 일정을 실시간 종합 관제합니다.
          </p>
        </div>

        {/* 월 이동 및 액션 컨트롤러 */}
        <div className="flex items-center flex-wrap gap-2">
          {/* ⚠️ 미배정 건만 보기 필터 토글 버튼 */}
          <button
            type="button"
            onClick={() => setUnassignedOnly(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              unassignedOnly
                ? "bg-amber-500 text-white ring-2 ring-amber-400 animate-pulse"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>미배정 건만 보기</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              unassignedOnly ? "bg-white text-amber-600" : "bg-amber-200 text-amber-900"
            }`}>
              {totalUnassignedCount}건
            </span>
          </button>

          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-black text-slate-800 font-mono">
              {year}년 {month + 1}월
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            오늘
          </button>

          <button
            onClick={handleTriggerAiScan}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            AI Daily Scan
          </button>
        </div>
      </div>

      {/* 🏷️ 카테고리 필터 버튼 칩 바 */}
      <div className="flex items-center gap-1.5 py-3 overflow-x-auto scrollbar-none text-xs">
        <span className="text-slate-400 font-bold flex items-center gap-1 mr-1 shrink-0">
          <Filter className="w-3 h-3" /> 필터:
        </span>
        <button
          onClick={() => setCategoryFilter("ALL")}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
            categoryFilter === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        >
          전체 보기
        </button>
        <button
          onClick={() => setCategoryFilter("AI_TASK")}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
            categoryFilter === "AI_TASK"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
          }`}
        >
          <Sparkles className="w-3 h-3" /> AI 수집 태스크
        </button>
        <button
          onClick={() => setCategoryFilter("CERT_PATENT")}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
            categoryFilter === "CERT_PATENT"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
          }`}
        >
          <ShieldCheck className="w-3 h-3" /> 인증서 · 특허 기한
        </button>
        <button
          onClick={() => setCategoryFilter("SALES")}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
            categoryFilter === "SALES"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200"
          }`}
        >
          <Truck className="w-3 h-3" /> 수주 · 발주 · 납기일
        </button>
      </div>

      {/* 🗓️ 7일 요일 헤더 (일 ~ 토) */}
      <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-t-2xl py-2.5">
        <div className="text-rose-500">일 (Sun)</div>
        <div>월 (Mon)</div>
        <div>화 (Tue)</div>
        <div>수 (Wed)</div>
        <div>목 (Thu)</div>
        <div>금 (Fri)</div>
        <div className="text-indigo-600">토 (Sat)</div>
      </div>

      {/* 🗓️ 6주 x 7일 월별 격자 달력 그리드 UI */}
      <div className="grid grid-cols-7 border-x border-b border-slate-200 rounded-b-2xl divide-x divide-y divide-slate-200/80 bg-slate-50/30">
        {calendarCells.map((cell, idx) => {
          const events = getEventsForDate(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDateStr;
          const isSunday = idx % 7 === 0;
          const isSaturday = idx % 7 === 6;
          const hasUnassigned = events.some(e => !e.assigned_to);

          return (
            <div
              key={cell.dateStr + idx}
              onClick={() => setSelectedDateStr(cell.dateStr)}
              className={`min-h-[135px] p-2.5 transition-all cursor-pointer flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? "bg-slate-100/50 text-slate-400"
                  : isSelected
                  ? "bg-indigo-50/60 ring-2 ring-indigo-500/80 z-10"
                  : "bg-white hover:bg-slate-50/80"
              }`}
            >
              {/* 날짜 표시 및 오늘 뱃지 / 미배정 알림 */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                    isToday
                      ? "bg-indigo-600 text-white shadow-xs"
                      : isSunday
                      ? "text-rose-500"
                      : isSaturday
                      ? "text-indigo-600"
                      : cell.isCurrentMonth
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  {cell.dayNum}
                </span>

                <div className="flex items-center gap-1">
                  {hasUnassigned && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="미배정 건 존재" />
                  )}
                  {events.length > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      hasUnassigned ? "bg-amber-400 text-slate-950 font-bold" : "bg-slate-100 text-slate-600"
                    }`}>
                      {events.length}건
                    </span>
                  )}
                </div>
              </div>

              {/* 해당 날짜의 통합 이벤트 칩 리스트 */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {events.slice(0, 3).map((ev, i) => {
                  const isUnassigned = !ev.assigned_to;
                  return (
                    <div
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAssignModal(ev);
                      }}
                      className={`px-1.5 py-1 rounded-md text-[10px] font-extrabold truncate flex items-center justify-between transition-all cursor-pointer hover:opacity-90 ${
                        isUnassigned
                          ? "bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-400/40"
                          : ev.category === "SALES" && (ev.status === "DELIVERED" || ev.raw?.status === "DELIVERED")
                          ? "bg-indigo-50 text-indigo-900 border border-indigo-200 opacity-85"
                          : ev.category === "SALES" && (ev.status === "STATEMENT_SENT" || ev.raw?.status === "STATEMENT_SENT")
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : ev.category === "SALES"
                          ? "bg-rose-100 text-rose-900 border border-rose-200"
                          : ev.type === "TASK" && ev.status === "AI_SUGGESTED"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : ev.type === "TASK" && ev.status === "ASSIGNED"
                          ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                          : ev.type === "CERT"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          : "bg-purple-100 text-purple-900 border border-purple-200"
                      }`}
                      title={`${ev.title} (${ev.assigned_to ? `담당: ${ev.assigned_to}` : '미배정 - 클릭하여 배정'})`}
                    >
                      <span className="truncate">{ev.title}</span>
                      {isUnassigned ? (
                        <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.2 rounded-md font-black shrink-0 ml-1 shadow-3xs">
                          미배정
                        </span>
                      ) : (
                        <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-md font-black shrink-0 ml-1 shadow-3xs flex items-center gap-0.5 max-w-[70px] truncate">
                          <span>👤</span>
                          <span className="truncate">{ev.assigned_to}</span>
                        </span>
                      )}
                    </div>
                  );
                })}

                {events.length > 3 && (
                  <div className="text-[9px] text-slate-400 font-bold text-center">
                    +{events.length - 3}건 더보기
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 캘린더 하단: 선택된 날짜 상세 마일스톤 이력 패널 */}
      <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" />
            선택 일자 전사 마일스톤: <strong className="text-slate-900 font-mono">{selectedDateStr}</strong> ({selectedEvents.length}건)
          </h4>
          <div className="flex flex-wrap gap-2.5 mt-2.5">
            {selectedEvents.length === 0 ? (
              <span className="text-xs text-slate-400">선택한 날짜에 예정된 전사 기한 일정이 없습니다.</span>
            ) : (
              selectedEvents.map((ev, i) => {
                const isDelivered = ev.category === "SALES" && (ev.status === "DELIVERED" || ev.raw?.status === "DELIVERED");
                const isStatementSent = ev.category === "SALES" && (ev.status === "STATEMENT_SENT" || ev.raw?.status === "STATEMENT_SENT");

                return (
                  <div 
                    key={i} 
                    className={`px-3.5 py-2 rounded-2xl text-xs flex flex-wrap items-center gap-2 shadow-xs transition-all border ${
                      isDelivered
                        ? "bg-indigo-50/30 border-indigo-200 hover:border-indigo-300"
                        : isStatementSent
                        ? "bg-emerald-50/20 border-emerald-200 hover:border-emerald-300"
                        : "bg-white border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {/* 상태 뱃지 */}
                    {ev.category === "SALES" && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                        isDelivered
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          : isStatementSent
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}>
                        {isDelivered ? "🚚 납품완료" : isStatementSent ? "📄 명세발송" : "🔴 납기예정"}
                      </span>
                    )}

                    <span className={`font-extrabold ${isDelivered ? "text-slate-700" : "text-slate-900"}`}>
                      {ev.title}
                    </span>
                    
                    {/* 담당자 뱃지 / 미배정 배정하기 버튼 */}
                    {ev.assigned_to ? (
                      <button
                        onClick={() => handleOpenAssignModal(ev)}
                        className="text-[11px] text-indigo-900 font-extrabold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs"
                        title="클릭하여 담당자 변경"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>배정 담당: <strong className="text-indigo-700 underline underline-offset-2">{ev.assigned_to}</strong></span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenAssignModal(ev)}
                        className="text-[11px] text-amber-900 font-extrabold bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                        <span>미배정 (클릭하여 배정)</span>
                      </button>
                    )}

                    {/* 📦 수주 납기 건 바로가기 */}
                    {ev.category === "SALES" && (
                      <div className="flex items-center gap-1.5 ml-1">
                        {ev.raw?.client_order_no && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            발주번호: {ev.raw.client_order_no}
                          </span>
                        )}
                        {isDelivered ? (
                          <Link
                            href="/estimates/web-view?type=outbound_delivered"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="납품 완료 대장 조회"
                          >
                            <span>🚚 납품대장조회</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </Link>
                        ) : (
                          <Link
                            href={ev.raw?.so_id ? `/estimates/statement-write?soId=${ev.raw.so_id}` : "/estimates"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-2 py-0.5 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                              isStatementSent ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                            }`}
                          >
                            <span>{isStatementSent ? "명세서 재확인" : "거래명세서/수주조회"}</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <Link
          href="/governance"
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 self-start md:self-auto shadow-2xs"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
          태스크 폴더 관제 센터
          <ArrowUpRight className="w-3 h-3 text-slate-400" />
        </Link>
      </div>

      {/* 👥 모달: 최고관리자 스마트 복수 담당자 배정 */}
      {isAssignModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                담당자 지정 및 자율 작업 배정
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-4">
              <p className="text-xs text-slate-500">배정 대상 마일스톤</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">{selectedTask.title}</p>
              {selectedTask.raw?.client_order_no && (
                <p className="text-xs font-mono text-slate-500 mt-1">발주번호: {selectedTask.raw.client_order_no}</p>
              )}
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* 등록된 직원 복수 선택 칩 영역 */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 flex items-center justify-between">
                  <span>사내 등록 직원 (클릭하여 1명 또는 복수 선택)</span>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    선택됨: {selectedAssignees.length}명
                  </span>
                </label>

                {operators.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">
                    등록된 직원 정보가 없습니다. 아래에 이름을 직접 입력해 주세요.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {operators.map((op) => {
                      const isSelected = selectedAssignees.includes(op.name);
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => toggleAssignee(op.name)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          <div className="flex flex-col text-left">
                            <span>{op.name}</span>
                            <span className={`text-[9px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                              {op.role || "직원"}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 추가/외부 직접 입력 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  기타 / 직접 입력 (선택)
                </label>
                <input
                  type="text"
                  placeholder="예: 김담당, 이출하 등 직접 입력"
                  value={customAssigneeInput}
                  onChange={(e) => setCustomAssigneeInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 🌟 [스마트 자율 배정 2종 옵션 카드] */}
              {(selectedTask?.category === "SALES" || selectedTask?.type === "SALES_ORDER" || selectedTask?.so_id) && (
                <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-100/80 rounded-2xl p-3.5 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={registerAsPartnerManager}
                      onChange={(e) => setRegisterAsPartnerManager(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-indigo-950 font-extrabold flex items-center gap-1">
                        🏢 해당 거래처({selectedTask?.customer_name || '거래처'})의 전담 납기 매니저로 영구 등록
                      </span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">
                        향후 모바일 상신이나 엑셀 수주 등록 시 해당 거래처 건은 이 담당자에게 100% 자동 배정됩니다.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-800 pt-2 border-t border-indigo-100/70">
                    <input
                      type="checkbox"
                      checked={applyToAllUnassigned}
                      onChange={(e) => setApplyToAllUnassigned(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-indigo-950 font-extrabold flex items-center gap-1">
                        ⚡ 동일 거래처의 다른 미배정 수주 건도 지금 즉시 일괄 배정
                      </span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">
                        현재 대장에 등록된 동일 거래처의 모든 미배정 수주 건을 한 번에 배정하고 모바일 SnapTask도 동시 발송합니다.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 leading-relaxed">
                💡 <strong>자동 연동 안내</strong>: [배정 확정]을 누르시면 지정된 직원들의 <strong>모바일 스냅태스크(SnapTask) 업무 보드에 즉시 납기 관리 태스크가 자동 생성</strong>되고, 전사 캘린더에 배정 상태가 즉시 마운트됩니다.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAssign ? "배정 처리 중..." : "배정 확정 (모바일 SnapTask 전송)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
