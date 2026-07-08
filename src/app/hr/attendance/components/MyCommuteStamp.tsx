import React from "react";
import { Clock } from "lucide-react";
import { Employee } from "../types";

// 나의 출퇴근 간편 스탬프 카드 Props 정의
interface MyCommuteStampProps {
  currentEmpRecord: Employee | undefined;
  submitLoading: boolean;
  handleClockStamp: (action: 'CLOCK_IN' | 'CLOCK_OUT') => Promise<void>;
  onOpenLeaveModal: () => void;
}

export const MyCommuteStamp: React.FC<MyCommuteStampProps> = ({
  currentEmpRecord,
  submitLoading,
  handleClockStamp,
  onOpenLeaveModal,
}) => {
  return (
    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
      {/* 럭셔리 데코 배경 */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -z-10"></div>
      
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-500/10 text-indigo-650 rounded-2xl">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800">나의 오늘 출퇴근 기록</h4>
          <p className="text-xs text-slate-400 font-semibold mt-1">간편한 원터치 타임스탬프로 실시간 근태 대장에 스탬프를 적재합니다.</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 flex-wrap">
        {/* 출근 시간 표시 영역 */}
        <div className="text-xs font-extrabold text-slate-700 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-2xl min-w-[180px] text-center shadow-inner">
          {currentEmpRecord?.clock_in ? (
            <span>출근 완료: <b className="text-emerald-650 font-bold">{currentEmpRecord.clock_in}</b></span>
          ) : (
            <span className="text-slate-400">출근 기록이 없습니다</span>
          )}
        </div>
        
        {/* 동작 버튼 영역 */}
        <div className="flex gap-2 items-center flex-wrap">
          <button
            disabled={submitLoading || (currentEmpRecord && !!currentEmpRecord.clock_in)}
            onClick={() => handleClockStamp('CLOCK_IN')}
            className="py-2.5 px-5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 rounded-xl transition-all shadow-md cursor-pointer text-center border-0"
          >
            출근 🟢
          </button>
          <button
            disabled={submitLoading || !currentEmpRecord || (currentEmpRecord && !currentEmpRecord.clock_in) || (currentEmpRecord && !!currentEmpRecord.clock_out)}
            onClick={() => handleClockStamp('CLOCK_OUT')}
            className="py-2.5 px-5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-30 rounded-xl transition-all shadow-md cursor-pointer text-center border-0"
          >
            퇴근 🔴
          </button>
          <button
            type="button"
            onClick={onOpenLeaveModal}
            className="py-2.5 px-5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md cursor-pointer text-center flex items-center gap-1 border-0"
          >
            휴가 신청 🏖️
          </button>
        </div>
      </div>
    </div>
  );
};
