import React from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { LeaveRequest, CompanyEvent, EventType } from "../types";
import { getDaysInMonth, getDaysInWeek } from "../utils/calendar";

// 전사 공유 캘린더 Props 정의
interface CompanyCalendarProps {
  currentCalendarDate: Date;
  calendarView: 'month' | 'week';
  setCalendarView: (view: 'month' | 'week') => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  setIsEventModalOpen: (open: boolean) => void;
  leaveRequests: LeaveRequest[];
  companyEvents: CompanyEvent[];
  eventTypes: EventType[];
  currentUser: any;
  handleDeleteEvent: (id: string) => Promise<void>;
}

export const CompanyCalendar: React.FC<CompanyCalendarProps> = ({
  currentCalendarDate,
  calendarView,
  setCalendarView,
  handlePrevMonth,
  handleNextMonth,
  setIsEventModalOpen,
  leaveRequests,
  companyEvents,
  eventTypes,
  currentUser,
  handleDeleteEvent,
}) => {
  // 날짜 관련 유틸 연산 직접 수행
  const { firstDay, totalDays, year, month } = getDaysInMonth(currentCalendarDate);
  const weekDays = getDaysInWeek(currentCalendarDate);

  const weekStartStr = `${weekDays[0].getFullYear()}.${String(weekDays[0].getMonth() + 1).padStart(2, '0')}.${String(weekDays[0].getDate()).padStart(2, '0')}`;
  const weekEndStr = `${weekDays[6].getFullYear()}.${String(weekDays[6].getMonth() + 1).padStart(2, '0')}.${String(weekDays[6].getDate()).padStart(2, '0')}`;

  const calendarTitle = calendarView === 'month'
    ? `${year}년 ${month + 1}월`
    : `${weekStartStr} ~ ${weekEndStr}`;

  // 특정 일자의 근태 정보 및 이벤트 추출기
  const getDayMetadata = (day: number, cellYear: number, cellMonth: number) => {
    const formattedDay = String(day).padStart(2, '0');
    const targetDate = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${formattedDay}`;

    // 당일 승인된 연차
    const leavesToday = leaveRequests.filter(
      (l) => l.status === 'APPROVED' && targetDate >= l.start_date && targetDate <= l.end_date
    );

    // 당일 회사 일정
    const evs = companyEvents.filter(
      (ev) => targetDate >= ev.start_date && targetDate <= ev.end_date
    );

    return {
      events: evs,
      leavesCount: leavesToday.length,
      leavesList: leavesToday,
    };
  };

  // 날짜 셀 렌더러
  const renderDayCell = (day: number, cellYear: number, cellMonth: number, isWeekView: boolean = false) => {
    const metadata = getDayMetadata(day, cellYear, cellMonth);
    const hasHoliday = metadata.events.some((e) => e.event_type === 'HOLIDAY');

    const targetDayStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // 프로젝트 데드라인 부근 비상 공백 감지 시뮬레이션 데코 (6월 15일 기준 휴가자가 존재할 시 비상 경보)
    const isProjectDeliveryNear = targetDayStr === '2026-06-15' && metadata.leavesCount > 0;

    const today = new Date();
    const isToday =
      today.getFullYear() === cellYear &&
      today.getMonth() === cellMonth &&
      today.getDate() === day;

    const minHeightClass = isWeekView ? 'min-h-[165px]' : 'min-h-[95px]';

    return (
      <div
        key={`day-${cellYear}-${cellMonth}-${day}`}
        className={`${minHeightClass} p-2.5 rounded-xl border flex flex-col justify-between transition-all group hover:bg-slate-50/50 hover:shadow-xs relative overflow-hidden ${
          isToday
            ? 'border-indigo-500 ring-2 ring-indigo-500/25 bg-indigo-50/[0.15] shadow-xs z-20'
            : isProjectDeliveryNear
            ? 'border-rose-300 ring-2 ring-rose-500/10 shadow-inner bg-white'
            : 'border-slate-100 hover:border-slate-200 bg-white'
        }`}
      >
        {/* 비상 파동 효과 */}
        {isProjectDeliveryNear && (
          <div className="absolute inset-0 bg-rose-500/5 animate-pulse -z-0"></div>
        )}
        {/* 오늘 날짜 잔물결 효과 */}
        {isToday && (
          <div className="absolute inset-0 bg-indigo-500/[0.03] animate-pulse -z-0"></div>
        )}

        <div className="flex justify-between items-start z-10 w-full">
          <div className="flex items-center gap-1">
            <span
              className={`text-[11px] font-black px-1.5 py-0.2 rounded-md ${
                isToday
                  ? 'text-indigo-650 bg-indigo-100/75'
                  : hasHoliday
                  ? 'text-rose-500'
                  : 'text-slate-700'
              }`}
            >
              {day}
            </span>
            {isToday && (
              <span className="text-[7.5px] font-black bg-indigo-600 text-white px-1 py-0.2 rounded-sm shrink-0 shadow-2xs tracking-tighter">
                TODAY ⚡
              </span>
            )}
          </div>

          {/* 오늘 휴가자 뱃지 */}
          {metadata.leavesCount > 0 && (
            <div className="flex flex-col gap-0.5 items-end shrink-0">
              <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 font-extrabold text-[8px]">
                휴가 {metadata.leavesCount}명 🔴
              </span>
              {metadata.leavesList.some(l => l.leave_type === 'SICK' && l.medical_certificate_path) && (
                <a
                  href={metadata.leavesList.find(l => l.leave_type === 'SICK' && l.medical_certificate_path)?.medical_certificate_path}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-[7.5px] text-violet-600 hover:text-violet-850 font-black underline tracking-tighter"
                >
                  📄 진단서 보기
                </a>
              )}
            </div>
          )}
        </div>

        {/* 일정 칩스 */}
        <div className="space-y-1 mt-1.5 z-10">
          {metadata.events.map((ev) => {
            const matchedType = eventTypes.find((t) => t.type_key === ev.event_type);
            const colorTheme = matchedType ? matchedType.color_theme : 'Slate';

            let chipStyle = 'bg-slate-50 border border-slate-200 text-slate-700 font-bold';
            if (colorTheme === 'Indigo') {
              chipStyle = 'bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold';
            } else if (colorTheme === 'Rose') {
              chipStyle = 'bg-rose-50 border border-rose-100 text-rose-600 font-bold';
            } else if (colorTheme === 'Amber') {
              chipStyle = 'bg-amber-50 border border-amber-100 text-amber-700 font-bold';
            } else if (colorTheme === 'Purple') {
              chipStyle = 'bg-purple-50 border border-purple-100 text-purple-700 font-bold';
            } else if (colorTheme === 'Emerald') {
              chipStyle = 'bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold';
            } else if (colorTheme === 'Cyan') {
              chipStyle = 'bg-cyan-50 border border-cyan-100 text-cyan-700 font-bold';
            } else if (colorTheme === 'Lime') {
              chipStyle = 'bg-lime-50 border border-lime-100 text-lime-700 font-bold';
            } else if (colorTheme === 'Teal') {
              chipStyle = 'bg-teal-50 border border-teal-100 text-teal-700 font-bold';
            } else if (colorTheme === 'Pink') {
              chipStyle = 'bg-pink-50 border border-pink-100 text-pink-700 font-bold';
            } else if (colorTheme === 'Slate') {
              chipStyle = 'bg-slate-50 border border-slate-200 text-slate-700 font-bold';
            }

            return (
              <div
                key={ev.id}
                className={`px-1.5 py-0.8 rounded-md text-[9px] font-black truncate relative flex items-center justify-between gap-1 group-hover:pr-6 ${chipStyle}`}
                title={`${ev.title}: ${ev.description}`}
              >
                <span className="truncate">{ev.title}</span>

                {/* 관리자 권한 시 삭제 단추 노출 */}
                {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PRESIDENT') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(ev.id);
                    }}
                    className="absolute right-1 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 rounded transition-all cursor-pointer bg-white border border-slate-100 shrink-0"
                  >
                    <Trash2 size={9} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 비상 공백 경고 텍스트 */}
        {isProjectDeliveryNear && (
          <div className="text-[7.5px] font-extrabold text-rose-500 mt-1 block leading-tight flex items-center gap-0.5 z-10">
            <span>🚨 AI 공백 비상 경보</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="xl:col-span-2 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm block space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-4.5 bg-indigo-500 rounded-full"></span>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            전사 공유 캘린더
            <span className="text-[10px] font-bold text-slate-400">Company Board</span>
          </h3>
        </div>

        {/* 조작 도구 */}
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setCalendarView('month')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                calendarView === 'month' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500'
              }`}
            >
              월별 보기
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                calendarView === 'week' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500'
              }`}
            >
              주별 보기
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button onClick={handlePrevMonth} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-slate-700 px-2 min-w-[80px] text-center">
              {calendarTitle}
            </span>
            <button onClick={handleNextMonth} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 일정 추가 버튼 */}
          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PRESIDENT') && (
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="px-3 py-1.5 text-[10px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm border-0"
            >
              <Plus size={11} />
              일정 추가
            </button>
          )}
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="w-full">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2">
          <span className="text-rose-500">일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span className="text-indigo-500">토</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarView === 'month' ? (
            <>
              {/* 시작 전 공백 셀 */}
              {Array.from({ length: firstDay }).map((_, idx) => (
                <div key={`empty-${idx}`} className="min-h-[85px] bg-slate-50/20 rounded-xl border border-slate-100/30"></div>
              ))}

              {/* 월간 날짜 셀 */}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const day = idx + 1;
                return renderDayCell(day, year, month);
              })}
            </>
          ) : (
            <>
              {/* 주간 날짜 셀 */}
              {weekDays.map((dateItem) => {
                const dYear = dateItem.getFullYear();
                const dMonth = dateItem.getMonth();
                const dDay = dateItem.getDate();
                return renderDayCell(dDay, dYear, dMonth, true);
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
