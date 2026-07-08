import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Employee } from "../types";

// 연차 신청 모달 Props 정의
interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  employees: Employee[];
  onSuccess: () => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  employees,
  onSuccess,
}) => {
  // 내부 폼 상태 관리
  const [leaveStep, setLeaveStep] = useState<number>(1);
  const [leaveType, setLeaveType] = useState<'ANNUAL' | 'HALF' | 'SICK' | 'SPECIAL'>('ANNUAL');
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [halfTimeType, setHalfTimeType] = useState<'AM' | 'PM'>('AM');
  const [attachedFileName, setAttachedFileName] = useState("");
  
  const [isTempSaved, setIsTempSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setLeaveStep(1);
      setLeaveType('ANNUAL');
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      setHalfTimeType('AM');
      setAttachedFileName("");
    }
  }, [isOpen]);

  // 임시저장
  const handleTempSaveLeave = () => {
    const tempObj = {
      leaveType,
      leaveStart,
      leaveEnd,
      leaveReason,
      halfTimeType,
      attachedFileName,
    };
    localStorage.setItem('temp_leave_request', JSON.stringify(tempObj));
    setIsTempSaved(true);
    setTimeout(() => setIsTempSaved(false), 2000);
  };

  // 임시저장 불러오기
  const handleLoadTempLeave = () => {
    try {
      const saved = localStorage.getItem('temp_leave_request');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLeaveType(parsed.leaveType || 'ANNUAL');
        setLeaveStart(parsed.leaveStart || '');
        setLeaveEnd(parsed.leaveEnd || '');
        setLeaveReason(parsed.leaveReason || '');
        setHalfTimeType(parsed.halfTimeType || 'AM');
        setAttachedFileName(parsed.attachedFileName || '');
        alert('임시 저장된 신청서를 성공적으로 불러왔습니다! 📂');
      } else {
        alert('임시 저장된 내역이 존재하지 않습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 최종 휴가 신청서 전송
  const handleApplyLeave = async () => {
    let finalEnd = leaveEnd;
    if (leaveType === 'HALF') {
      finalEnd = leaveStart;
    }

    if (!leaveStart || !finalEnd || !leaveReason) {
      alert('신청 기간 및 휴가 사유를 명확히 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      // 날짜 일수 계산
      const start = new Date(leaveStart);
      const end = new Date(finalEnd);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const daysSpent = leaveType === 'HALF' ? 0.5 : diffDays;

      // 사유 결합
      let finalReason = leaveReason;
      if (leaveType === 'HALF') {
        finalReason = `[반차 구분: ${halfTimeType === 'AM' ? '오전 반차' : '오후 반차'}] ${leaveReason}`;
      }
      if (attachedFileName) {
        finalReason = `${finalReason}\n(📎 첨부 증빙: ${attachedFileName})`;
      }

      const res = await apiFetch('/api/hr/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPLY',
          leave_type: leaveType,
          start_date: leaveStart,
          end_date: finalEnd,
          days_spent: daysSpent,
          reason: finalReason,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        localStorage.removeItem('temp_leave_request');
        onSuccess();
        onClose();
      } else {
        alert(data.error || '연차 신청서 전송에 실패했습니다.');
      }
    } catch (e: any) {
      alert('신청서 통신 오류: ' + e.message);
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

            {/* 헤더 */}
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                📄 신규 휴가 신청서
              </h4>
              <div className="flex gap-1 mr-6">
                <span className={`h-1.5 w-4 rounded-full transition-all duration-300 ${leaveStep >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`}></span>
                <span className={`h-1.5 w-4 rounded-full transition-all duration-300 ${leaveStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></span>
                <span className={`h-1.5 w-4 rounded-full transition-all duration-300 ${leaveStep >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></span>
              </div>
            </div>

            {/* 임시저장 불러오기 패널 */}
            {leaveStep === 1 && typeof window !== 'undefined' && localStorage.getItem('temp_leave_request') && (
              <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-[10px]">
                <span className="text-slate-655 font-extrabold flex items-center gap-1">
                  📂 작성 중이던 신청서가 있습니다.
                </span>
                <button
                  type="button"
                  onClick={handleLoadTempLeave}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black cursor-pointer shadow-3xs transition-colors border-0"
                >
                  불러오기
                </button>
              </div>
            )}

            {/* 1단계: 근태종류 선택 */}
            {leaveStep === 1 && (
              <div className="space-y-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Step 1. 근태종류 선택
                </div>

                <div className="space-y-1 block">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">휴가 구분</label>
                  <select
                    value={leaveType}
                    onChange={(e: any) => setLeaveType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-700 cursor-pointer text-xs"
                  >
                    <option value="ANNUAL">연차 휴가 (1일 소모)</option>
                    <option value="HALF">오전/오후 반차 (0.5일 소모)</option>
                    <option value="SICK">병가 (유급/무급)</option>
                    <option value="SPECIAL">경조 휴가 (경조사 특별)</option>
                  </select>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex justify-between items-center shadow-inner">
                  <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">나의 잔여 연차</span>
                  <span className="text-base font-black text-indigo-700 font-mono">
                    {employees.find(e => e.id === currentUser?.id)?.remaining_leaves ?? 15} <span className="text-xs font-bold text-slate-400">일</span>
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-slate-105 hover:bg-slate-200 text-slate-655 rounded-xl text-xs font-black cursor-pointer transition-all border border-slate-250 text-center"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveStep(2)}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md transition-all text-center border-0"
                  >
                    다음 단계 →
                  </button>
                </div>
              </div>
            )}

            {/* 2단계: 기간 및 사유, 증빙 */}
            {leaveStep === 2 && (
              <div className="space-y-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Step 2. 기간, 사유 및 증빙 입력
                </div>

                <div className="grid grid-cols-2 gap-2.5 block">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">시작 일자</label>
                    <input
                      type="date"
                      value={leaveStart}
                      onChange={(e) => setLeaveStart(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 cursor-pointer text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">종료 일자</label>
                    <input
                      type="date"
                      value={leaveType === 'HALF' ? leaveStart : leaveEnd}
                      onChange={(e) => setLeaveEnd(e.target.value)}
                      disabled={leaveType === 'HALF'}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 disabled:opacity-50 text-xs cursor-pointer"
                    />
                  </div>
                </div>

                {leaveType === 'HALF' && (
                  <div className="space-y-1 block">
                    <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">반차 구분 시간</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setHalfTimeType('AM')}
                        className={`py-2 text-[10.5px] font-black rounded-xl transition-all cursor-pointer border-0 ${halfTimeType === 'AM' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}
                      >
                        오전 반차 (09~13시)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHalfTimeType('PM')}
                        className={`py-2 text-[10.5px] font-black rounded-xl transition-all cursor-pointer border-0 ${halfTimeType === 'PM' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}
                      >
                        오후 반차 (14~18시)
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 block">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">휴가 신청 구체적 사유</label>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="인사 평가 및 결재 보존용 신청 사유를 기입하세요."
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-extrabold text-[10.5px] resize-none leading-relaxed text-slate-700"
                  />
                </div>

                <div className="space-y-1 block">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">증빙서류 파일 첨부 (선택)</label>
                  <div className="relative border border-dashed border-slate-350 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachedFileName(file.name);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-[9.5px] font-black text-indigo-650 flex items-center gap-1">
                      📎 {attachedFileName ? attachedFileName : '증빙 자료 업로드 (PDF, JPG, PNG)'}
                    </span>
                    {attachedFileName && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachedFileName("");
                        }}
                        className="text-[7.5px] font-black text-rose-500 underline z-10 hover:text-rose-650 border-0 bg-transparent p-0 cursor-pointer"
                      >
                        파일 제거
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLeaveStep(1)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl text-xs font-black cursor-pointer transition-all border border-slate-250 text-center"
                  >
                    ← 이전
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!leaveStart || (leaveType !== 'HALF' && !leaveEnd) || !leaveReason) {
                        alert('휴가 기간 및 사유를 명확히 입력해 주십시오.');
                        return;
                      }
                      setLeaveStep(3);
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md transition-all text-center border-0"
                  >
                    다음 단계 →
                  </button>
                </div>
              </div>
            )}

            {/* 3단계: 신청서 요약 및 제출 */}
            {leaveStep === 3 && (
              <div className="space-y-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Step 3. 신청서 최종 요약 및 제출
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2.5 text-[10.5px] font-extrabold text-slate-700">
                  <div className="flex justify-between items-center border-b border-indigo-100/50 pb-1.5">
                    <span className="text-[9.5px] text-slate-400 font-extrabold">신청 항목</span>
                    <span className="font-black text-indigo-750 text-[11px]">
                      {leaveType === 'ANNUAL' ? '🏖️ 연차 휴가' : leaveType === 'HALF' ? `🌗 반차 휴가 (${halfTimeType === 'AM' ? '오전' : '오후'})` : leaveType === 'SICK' ? '🤒 병가' : '🎉 경조사 휴가'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-indigo-100/50 pb-1.5">
                    <span className="text-[9.5px] text-slate-400 font-extrabold">신청 기간</span>
                    <span className="font-black font-mono">
                      {leaveStart} {leaveType !== 'HALF' && `~ ${leaveEnd}`}
                    </span>
                  </div>

                  <div className="border-b border-indigo-100/50 pb-1.5 block">
                    <span className="text-[9.5px] text-slate-400 font-extrabold block mb-1">상세 사유</span>
                    <p className="text-slate-655 bg-white p-2 rounded-lg border border-slate-100 text-[10px] max-h-[60px] overflow-y-auto leading-relaxed font-semibold">
                      {leaveReason}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] text-slate-400 font-extrabold">증빙 자료</span>
                    <span className="font-extrabold text-[9.5px] text-indigo-650">
                      {attachedFileName ? `📎 ${attachedFileName}` : '증빙 자료 없음'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleTempSaveLeave}
                      className={`py-2 text-[10.5px] font-black rounded-xl cursor-pointer transition-all border flex items-center justify-center gap-1 ${isTempSaved ? 'bg-emerald-50 text-emerald-650 border-emerald-250' : 'bg-white hover:bg-slate-50 text-slate-650 border-slate-250'}`}
                    >
                      {isTempSaved ? '💾 저장완료! ✨' : '💾 임시저장'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 text-[10.5px] font-black bg-slate-100 hover:bg-slate-200 text-slate-655 border border-slate-250 rounded-xl cursor-pointer transition-all text-center"
                    >
                      ❌ 신청 취소
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyLeave}
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 border-0"
                  >
                    <Send size={12} className={loading ? "animate-spin" : ""} />
                    ⚡ 신청서 최종 제출 및 상신
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveStep(2)}
                    className="w-full py-1 text-[9.5px] text-slate-450 hover:text-indigo-650 font-black cursor-pointer transition-colors text-center bg-transparent border-0"
                  >
                    ← 기간 및 사유 수정하러 가기
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
