import React from "react";
import { Send, RefreshCw } from "lucide-react";
import { Employee, EmployeeProfile } from "../types";

// 임직원 인적 명부 대장 에디터 Props 정의
interface BasicProfileEditorProps {
  currentUser: any;
  employees: Employee[];
  profiles: EmployeeProfile[];
  selectedProfileOperatorId: string;
  handleSelectEmployeeProfile: (operatorId: string) => void;
  profileDept: string;
  setProfileDept: (dept: string) => void;
  profileHireDate: string;
  setProfileHireDate: (date: string) => void;
  profileCommute: string;
  setProfileCommute: (commute: string) => void;
  profileSkills: string;
  setProfileSkills: (skills: string) => void;
  profileBackup: string;
  setProfileBackup: (backup: string) => void;
  handleSubmitProfile: (e: React.FormEvent) => Promise<void>;
  getIsProfileModified: () => boolean;
  submitLoading: boolean;
  profileLoading: boolean;
}

export const BasicProfileEditor: React.FC<BasicProfileEditorProps> = ({
  currentUser,
  employees,
  profiles,
  selectedProfileOperatorId,
  handleSelectEmployeeProfile,
  profileDept,
  setProfileDept,
  profileHireDate,
  setProfileHireDate,
  profileCommute,
  setProfileCommute,
  profileSkills,
  setProfileSkills,
  profileBackup,
  setProfileBackup,
  handleSubmitProfile,
  getIsProfileModified,
  submitLoading,
  profileLoading,
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
    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6 relative overflow-hidden mt-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -z-10"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-4.5 bg-emerald-600 rounded-full"></span>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            임직원 상세 인적사항 명부 대장
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">PROFILE MASTER</span>
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">실시간 AI RAG 연동 완료</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* 좌측: 인적사항 폼 */}
        <div className="xl:col-span-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
            ✍️ 인적 상세 프로필 편집
          </h4>
          
          <form onSubmit={handleSubmitProfile} className="space-y-4 text-xs font-bold text-slate-650">
            {/* 대상 직원 선택 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">대상 직원</label>
              <select
                value={selectedProfileOperatorId}
                onChange={(e) => handleSelectEmployeeProfile(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 cursor-pointer text-xs"
              >
                <option value="">직원을 선택하세요...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.employee_number ? `(${emp.employee_number})` : ''} ({getRoleKorean(emp.role)})
                  </option>
                ))}
              </select>
            </div>

            {/* 소속 부서 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">소속 부서</label>
              <input
                type="text"
                value={profileDept}
                onChange={(e) => setProfileDept(e.target.value)}
                placeholder="예: 구매팀, 생산본부"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-850 text-xs"
              />
            </div>

            {/* 입사일 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">공식 입사일</label>
              <input
                type="date"
                value={profileHireDate}
                onChange={(e) => setProfileHireDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-850 text-xs cursor-pointer"
              />
            </div>

            {/* 거주 통근지 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">출퇴근 거주지 및 교통수단</label>
              <input
                type="text"
                value={profileCommute}
                onChange={(e) => setProfileCommute(e.target.value)}
                placeholder="예: 서울 마포구 - 지하철 통근"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-855 text-xs"
              />
            </div>

            {/* 기술 역량 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">보유 주요 기술 및 역량</label>
              <input
                type="text"
                value={profileSkills}
                onChange={(e) => setProfileSkills(e.target.value)}
                placeholder="예: 자재 조율, IT 시스템 지원"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-855 text-xs"
              />
            </div>

            {/* 1차 백업 담당자 */}
            <div className="space-y-1 block">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest block">비상 시 1차 백업 대행자</label>
              <select
                value={profileBackup}
                onChange={(e) => setProfileBackup(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 cursor-pointer text-xs"
              >
                <option value="none">지정 없음</option>
                {employees
                  .filter(emp => String(emp.id) !== String(selectedProfileOperatorId))
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.employee_number ? `(${emp.employee_number})` : ''} ({getRoleKorean(emp.role)})
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitLoading || !selectedProfileOperatorId || !getIsProfileModified()}
              className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-705 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 border-0"
            >
              <Send size={12} />
              인적 상세사항 저장 및 AI 동기화
            </button>
          </form>
        </div>

        {/* 우측: 상세 인적사항 조회 대장 */}
        <div className="xl:col-span-8 space-y-4">
          <h4 className="text-xs font-black text-slate-700 border-b border-slate-100 pb-2">
            👥 전사 임직원 상세 인적 명부 대장
          </h4>

          {profileLoading ? (
            <div className="py-20 text-center animate-pulse flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
              <span className="text-xs text-slate-400 font-bold">임직원 인적사항 명부를 읽어오는 중...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs">
              등록된 상세 인적사항 명부가 없습니다. 직원을 선택해 먼저 등록해 주세요.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs font-bold">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-450 uppercase tracking-widest font-black">
                    <th className="py-3 px-4">직원명</th>
                    <th className="py-3 px-4">소속 부서/직급</th>
                    <th className="py-3 px-4 text-center">공식 입사일</th>
                    <th className="py-3 px-4">출퇴근 통근 구역 (거주지)</th>
                    <th className="py-3 px-4">보유 주요 기술 및 역량</th>
                    <th className="py-3 px-4 text-center">비상 백업자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {profiles.map((pf: any) => {
                    const backupEmp = employees.find(e => String(e.id) === String(pf.backup_operator_id));
                    return (
                      <tr key={pf.operator_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-black text-slate-800">
                          {pf.name} {pf.employee_number ? `(${pf.employee_number})` : ''}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="block text-[10px] text-emerald-600 font-black">{pf.department}</span>
                          <span className="text-slate-450 font-bold text-[10.5px]">{getRoleKorean(pf.role)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-650">{pf.hire_date}</td>
                        <td className="py-3.5 px-4 text-slate-750 font-semibold">{pf.commute_area}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {pf.skills ? pf.skills.split(',').map((skill: string, sIdx: number) => (
                              <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-extrabold text-[9px]">
                                {skill.trim()}
                              </span>
                            )) : <span className="text-slate-350">-</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {backupEmp ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-650 text-[9px] font-black">
                              {backupEmp.name} {backupEmp.employee_number ? `(${backupEmp.employee_number})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-350">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
