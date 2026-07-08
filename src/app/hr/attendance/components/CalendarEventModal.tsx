import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EventType } from "../types";

// 일정 추가 모달 Props 정의
interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  eventTypes: EventType[];
  onSuccess: () => void;
  onOpenTypeManager: () => void;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  eventTypes,
  onSuccess,
  onOpenTypeManager,
}) => {
  // 내부 폼 상태
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventType, setEventType] = useState("COMPANY_EVENT");
  const [eventDesc, setEventDesc] = useState("");
  const [loading, setLoading] = useState(false);

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setEventTitle("");
      setEventStart("");
      setEventEnd("");
      setEventType(eventTypes[0]?.type_key || "COMPANY_EVENT");
      setEventDesc("");
    }
  }, [isOpen, eventTypes]);

  // 일정 등록 API 호출
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStart || !eventEnd) {
      alert('일정 제목과 기간을 입력하세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/hr/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          title: eventTitle,
          start_date: eventStart,
          end_date: eventEnd,
          event_type: eventType,
          description: eventDesc,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        onSuccess();
        onClose();
      } else {
        alert(data.error || '일정 등록 실패');
      }
    } catch (e: any) {
      alert('일정 통신 에러: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-100 shadow-2xl relative block text-slate-800"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-0"
              type="button"
            >
              <X size={18} />
            </button>

            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              📅 전사 회사 일정 등록
            </h4>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs font-bold text-slate-650">
              {/* 일정 제목 */}
              <div className="space-y-1 block">
                <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">일정 제목 (상호)</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="예: 전사 워크숍, 마감 납품일"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 text-xs"
                />
              </div>

              {/* 일정 유형 */}
              <div className="space-y-1 block">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">일정 유형</label>
                  {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PRESIDENT') && (
                    <button
                      type="button"
                      onClick={onOpenTypeManager}
                      className="text-[9px] text-indigo-650 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-all hover:underline font-bold bg-transparent border-0"
                    >
                      ⚙️ 유형 관리
                    </button>
                  )}
                </div>
                <select
                  value={eventType}
                  onChange={(e: any) => setEventType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-700 cursor-pointer text-xs"
                >
                  {eventTypes.map((t) => (
                    <option key={t.type_key} value={t.type_key}>
                      {t.type_key === 'COMPANY_EVENT' ? '🏢 ' :
                       t.type_key === 'HOLIDAY' ? '🔴 ' :
                       t.type_key === 'DEPT_EVENT' ? '👥 ' :
                       t.type_key === 'DEADLINE' ? '⚠️ ' :
                       t.type_key === 'LEGAL' ? '⚖️ ' :
                       t.type_key === 'EDUCATION' ? '📚 ' : '🎨 '}
                      {t.type_name}
                    </option>
                  ))}
                  {eventTypes.length === 0 && (
                    <>
                      <option value="COMPANY_EVENT">🏢 회사 공동 행사 (COMPANY)</option>
                      <option value="HOLIDAY">🔴 공식 휴일 (HOLIDAY)</option>
                      <option value="DEPT_EVENT">👥 부서별 특정 일정 (DEPT)</option>
                      <option value="DEADLINE">⚠️ 마감 및 납품 기일 (DEADLINE)</option>
                      <option value="LEGAL">⚖️ 대외 법무 및 감사 일정 (LEGAL)</option>
                      <option value="EDUCATION">📚 필수 산업 교육 및 세미나 (EDUCATION)</option>
                    </>
                  )}
                </select>
              </div>

              {/* 기간 설정 */}
              <div className="grid grid-cols-2 gap-2.5 block">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">시작 일자</label>
                  <input
                    type="date"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">종료 일자</label>
                  <input
                    type="date"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>

              {/* 세부 메모 */}
              <div className="space-y-1 block">
                <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">일정 세부 메모</label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="행사 설명 및 장소를 자유롭게 기입하세요."
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold resize-none leading-relaxed text-xs text-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 border-0"
              >
                <Plus size={12} />
                캘린더 일정 배포 등록
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
