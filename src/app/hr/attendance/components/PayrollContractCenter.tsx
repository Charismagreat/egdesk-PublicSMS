import React from "react";
import { RefreshCw } from "lucide-react";
import { Employee, Contract, Payroll } from "../types";

// 근로계약 및 급여정산 Props 정의
interface PayrollContractCenterProps {
  currentUser: any;
  payrollYearMonth: string;
  setPayrollYearMonth: (ym: string) => void;
  employees: Employee[];
  contracts: Contract[];
  payroll: Payroll[];
  selectedContractOperatorId: string;
  handleSelectEmployeeContract: (operatorId: string) => void;
  hourlyWage: number;
  setHourlyWage: (wage: number) => void;
  weeklyHours: number;
  setWeeklyHours: (hours: number) => void;
  allowHolidayPay: number;
  setAllowHolidayPay: (allow: number) => void;
  workDays: string;
  setWorkDays: (days: string) => void;
  contractMemo: string;
  setContractMemo: (memo: string) => void;
  handleSubmitContract: (e: React.FormEvent) => Promise<void>;
  getIsContractModified: () => boolean;
  submitLoading: boolean;
  payrollLoading: boolean;
}

export const PayrollContractCenter: React.FC<PayrollContractCenterProps> = ({
  currentUser,
  payrollYearMonth,
  setPayrollYearMonth,
  employees,
  contracts,
  payroll,
  selectedContractOperatorId,
  handleSelectEmployeeContract,
  hourlyWage,
  setHourlyWage,
  weeklyHours,
  setWeeklyHours,
  allowHolidayPay,
  setAllowHolidayPay,
  workDays,
  setWorkDays,
  contractMemo,
  setContractMemo,
  handleSubmitContract,
  getIsContractModified,
  submitLoading,
  payrollLoading,
}) => {
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PRESIDENT';
  if (!isAdmin) return null;

  const getRoleKorean = (role: string) => {
    if (!role) return "";
    switch (role.toUpperCase()) {
      case 'SUPER_ADMIN': return '최고관리자';
      case 'SUB_OPERATOR': return '부운영자';
      case 'EMPLOYEE': return '일반직원';
      case 'PRESIDENT': return '대표이사';
      default: return role;
    }
  };

  return (
    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
      {/* 럭셔리 데코 백그라운드 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -z-10"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-4.5 bg-indigo-600 rounded-full"></span>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            근로계약 & 실시간 급여 정산 AI 관제
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">SUPER OWNER</span>
          </h3>
        </div>

        {/* 정산 대상 연월 피커 */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">정산 대상 연월</label>
          <input
            type="month"
            value={payrollYearMonth}
            onChange={(e) => setPayrollYearMonth(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* 좌측: 계약 조건 설정 폼 */}
        <div className="xl:col-span-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
            ✍️ 근로계약 변경 및 모바일 발송
          </h4>

          <form onSubmit={handleSubmitContract} className="space-y-4 text-xs font-bold text-slate-650">
            {/* 대상 직원 선택 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">대상 직원</label>
              <select
                value={selectedContractOperatorId}
                onChange={(e) => handleSelectEmployeeContract(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 cursor-pointer text-xs"
              >
                <option value="">직원을 선택하세요...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.employee_number ? `(${emp.employee_number})` : ''} ({getRoleKorean(emp.role)})
                  </option>
                ))}
              </select>
            </div>

            {/* 계약 시급 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">계약 시급 (원)</label>
              <input
                type="number"
                value={hourlyWage}
                onChange={(e) => setHourlyWage(parseInt(e.target.value) || 0)}
                placeholder="예: 10000"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-850 text-xs"
              />
            </div>

            {/* 주당 소정 근로시간 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">주당 소정 근로시간 (시간)</label>
              <input
                type="number"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(parseFloat(e.target.value) || 0)}
                placeholder="예: 40"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-850 text-xs"
              />
            </div>

            {/* 주휴 수당 여부 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">주휴수당 적용 여부</label>
              <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAllowHolidayPay(1)}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all border-0 cursor-pointer ${
                    allowHolidayPay === 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 bg-transparent'
                  }`}
                >
                  주휴수당 포함 🟢
                </button>
                <button
                  type="button"
                  onClick={() => setAllowHolidayPay(0)}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all border-0 cursor-pointer ${
                    allowHolidayPay === 0 ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 bg-transparent'
                  }`}
                >
                  주휴 미적용 🔴
                </button>
              </div>
            </div>

            {/* 근무 요일 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">소정 근무 요일</label>
              <input
                type="text"
                value={workDays}
                onChange={(e) => setWorkDays(e.target.value)}
                placeholder="예: 월,화,수,목,금"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-850 text-xs"
              />
            </div>

            {/* 특이사항 메모 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">계약 특이사항 및 메모</label>
              <textarea
                value={contractMemo}
                onChange={(e) => setContractMemo(e.target.value)}
                placeholder="인사평가 및 수습기간 등 기재..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-850 min-h-[60px] text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading || !getIsContractModified()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 rounded-xl font-black transition-all shadow-md cursor-pointer border-0 text-center"
            >
              {submitLoading ? '전송 중...' : '근로계약 변경 적용 및 모바일 락해제 🔑'}
            </button>
          </form>
        </div>

        {/* 우측: 급여 정산 테이블 */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              📊 {payrollYearMonth.split('-')[1]}월분 전사 급여 모의 정산서 (실시간 변동)
            </h4>
            {payrollLoading && <RefreshCw size={12} className="text-indigo-500 animate-spin" />}
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-bold text-slate-650">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-3">성명</th>
                    <th className="p-3">소속/직급</th>
                    <th className="p-3">기본시급</th>
                    <th className="p-3">소정/근무시간</th>
                    <th className="p-3 text-right">기본급</th>
                    <th className="p-3 text-right">주휴수당</th>
                    <th className="p-3 text-right">초과수당</th>
                    <th className="p-3 text-right">공제계</th>
                    <th className="p-3 text-right text-indigo-700">실수령액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {payroll.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                        정산 가능한 근로 조건이 설정된 직원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    payroll.map((pay) => (
                      <tr key={pay.operator_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-extrabold text-slate-800">
                          {pay.name} {pay.employee_number ? `(${pay.employee_number})` : ''}
                        </td>
                        <td className="p-3 text-slate-500">
                          {pay.role === 'PRESIDENT' ? '대표이사' : pay.role === 'SUPER_ADMIN' ? '최고관리자' : '일반직원'}
                        </td>
                        <td className="p-3 font-mono">{(pay.hourly_wage ?? 0).toLocaleString()}원</td>
                        <td className="p-3">
                          주 {pay.weekly_hours ?? 0}h / <b className="text-indigo-650 font-bold">{pay.total_worked_hours ?? 0}h</b>
                        </td>
                        <td className="p-3 text-right font-mono">{(pay.base_salary ?? 0).toLocaleString()}원</td>
                        <td className="p-3 text-right font-mono text-emerald-650">
                          +{(pay.weekly_holiday_allowance ?? 0).toLocaleString()}원
                        </td>
                        <td className="p-3 text-right font-mono text-indigo-600">
                          +{(pay.overtime_allowance ?? 0).toLocaleString()}원
                        </td>
                        <td className="p-3 text-right font-mono text-rose-500">
                          -{(pay.deduction_amount ?? 0).toLocaleString()}원
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-indigo-700 bg-indigo-50/10">
                          {(pay.net_salary ?? 0).toLocaleString()}원
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
