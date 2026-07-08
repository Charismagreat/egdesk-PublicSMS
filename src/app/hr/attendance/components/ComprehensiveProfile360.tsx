import React, { useState, useEffect } from "react";
import { Trash2, Send, Edit2 } from "lucide-react";
import { Employee } from "../types";

// 360도 종합 프로필 관제 Props 정의
interface ComprehensiveProfile360Props {
  currentUser: any;
  employees: Employee[];
  comprehensiveProfiles: any[];
  selected360OperatorId: string;
  handleSelect360Employee: (operatorId: string) => void;
  handleDelete360Record: (tableName: string, recordId: string) => Promise<void>;
  handleSubmit360Upsert: (tableName: string, operatorId: string, data: Record<string, any>) => Promise<void>;
  submitLoading: boolean;
  comprehensiveLoading: boolean;
}

export const ComprehensiveProfile360: React.FC<ComprehensiveProfile360Props> = ({
  currentUser,
  employees,
  comprehensiveProfiles,
  selected360OperatorId,
  handleSelect360Employee,
  handleDelete360Record,
  handleSubmit360Upsert,
  submitLoading,
  comprehensiveLoading,
}) => {
  // 내부 캡슐화 상태 변수들
  const [active360Tab, setActive360Tab] = useState<string>("basic");
  const [editTableName, setEditTableName] = useState<string>("crm_operator_education");
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

  // 특정 이력을 수정하기 위해 편집 폼에 로드하는 함수
  const handleLoadRecordForEdit = (tableName: string, record: any) => {
    setEditTableName(tableName);
    // 기존 데이터 복사 (id 값 및 필드 값 전체 바인딩)
    setEditFormData({ ...record });
    // 편집 탭('edit')으로 즉시 전환
    setActive360Tab("edit");
  };

  // 폼 리셋 헬퍼 함수
  const reset360EditForm = (tableName: string) => {
    setEditTableName(tableName);

    const defaultDataMap: Record<string, Record<string, any>> = {
      crm_operator_education: { school_name: "", major: "", degree: "학사", entrance_date: "", graduation_date: "", status: "졸업" },
      crm_operator_licenses: { license_name: "", issuer: "", license_no: "", acquisition_date: "", expiry_date: "없음" },
      crm_operator_careers: { company_name: "", department: "", job_title: "", join_date: "", retire_date: "", assigned_task: "", leaving_reason: "이직" },
      crm_operator_salaries: { payment_year_month: new Date().toISOString().substring(0, 7), base_salary: 3000000, bonus_amount: 0, weekly_holiday_allowance: 0, overtime_allowance: 0, meal_allowance: 100000, deduction_amount: 300000, net_salary: 2800000, payment_date: new Date().toISOString().split('T')[0], status: "지급완료" },
      crm_operator_promotions: { change_date: new Date().toISOString().split('T')[0], prev_dept: "", next_dept: "", prev_role: "", next_role: "", promotion_reason: "" },
      crm_operator_awards: { record_date: new Date().toISOString().split('T')[0], type: "AWARD", title: "", content: "", authority: "대표이사", remarks: "없음" },
      crm_operator_family_events: { event_date: new Date().toISOString().split('T')[0], relation: "본인", type: "결혼", congratulation_money: 500000, wreath_provided: 0 },
      crm_operator_medical: { diagnosis_name: "", treatment_start_date: "", treatment_end_date: "", hospital_name: "", sick_leave_days: 0, work_limitations: "없음" },
      crm_operator_incidents: { occurred_date: new Date().toISOString().split('T')[0], severity: "LOW", title: "", description: "", status: "진행중", outcome: "조치 예정" },
      crm_operator_reputations: { evaluation_date: new Date().toISOString().split('T')[0], evaluator_id: "익명", source_type: "INTERNAL", score: 5.0, positive_feedback: "", constructive_feedback: "없음" },
      crm_operator_families: { relation_type: "자녀", name: "", birth_date: "", phone_number: "N/A", is_dependent: 1, remarks: "없음" },
      crm_operator_job_history: { assignment_date: new Date().toISOString().split('T')[0], job_description: "", prev_job_description: "없음", is_current: 1 },
      crm_operator_projects: { project_name: "", role_in_project: "", start_date: "", end_date: "진행중", contribution_rate: 100, performance_score: 90, performance_evaluation: "우수", outcome_link: "없음" }
    };

    setEditFormData(defaultDataMap[tableName] || {});
  };

  // 선택된 직원이 바뀔 때 폼 데이터도 초기화
  useEffect(() => {
    reset360EditForm(editTableName);
  }, [selected360OperatorId]);

  // 수정 여부 감지
  const getIs360Modified = () => {
    if (!editFormData || Object.keys(editFormData).length === 0) return false;
    
    if (editTableName === 'crm_operator_education' && !editFormData.school_name) return false;
    if (editTableName === 'crm_operator_licenses' && !editFormData.license_name) return false;
    if (editTableName === 'crm_operator_careers' && !editFormData.company_name) return false;
    if (editTableName === 'crm_operator_projects' && !editFormData.project_name) return false;
    if (editTableName === 'crm_operator_incidents' && !editFormData.title) return false;
    if (editTableName === 'crm_operator_reputations' && !editFormData.positive_feedback) return false;
    if (editTableName === 'crm_operator_families' && !editFormData.name) return false;

    return true;
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected360OperatorId) return;
    await handleSubmit360Upsert(editTableName, selected360OperatorId, editFormData);
    reset360EditForm(editTableName);
  };

  // 현재 선택된 직원 데이터 탐색
  const current360 = comprehensiveProfiles.find(
    (p) => String(p.operator_id) === String(selected360OperatorId)
  );

  // 임직원 기본 인적사항 메타데이터 매핑
  const pf = current360?.profile;

  // 360 타임라인 이벤트 추출 및 정렬
  const timelineEvents: any[] = [];
  if (current360) {
    if (current360.education) {
      current360.education.forEach((edu: any) => {
        if (edu.entrance_date) {
          timelineEvents.push({
            date: edu.entrance_date,
            title: `${edu.school_name} 입학 🎓`,
            category: 'EDUCATION',
            type: 'ENTRANCE',
            details: `${edu.degree} 과정 (${edu.major})`,
          });
        }
        if (edu.graduation_date) {
          timelineEvents.push({
            date: edu.graduation_date,
            title: `${edu.school_name} ${edu.status} 🎓`,
            category: 'EDUCATION',
            type: edu.status === '졸업' ? 'GRADUATION' : 'STATUS_CHANGE',
            details: `${edu.degree} 과정 전공: ${edu.major}`,
          });
        }
      });
    }

    if (current360.careers) {
      current360.careers.forEach((car: any) => {
        if (car.join_date) {
          timelineEvents.push({
            date: car.join_date,
            title: `${car.company_name} 입사 🏢`,
            category: 'CAREER',
            type: 'JOIN',
            details: `${car.department} / 최종직급: ${car.job_title}`,
          });
        }
        if (car.retire_date) {
          timelineEvents.push({
            date: car.retire_date,
            title: `${car.company_name} 퇴사 ➡️`,
            category: 'CAREER',
            type: 'RETIRE',
            details: `${car.department} / 사유: ${car.leaving_reason}`,
          });
        }
      });
    }

    if (current360.promotions) {
      current360.promotions.forEach((pro: any) => {
        if (pro.change_date) {
          timelineEvents.push({
            date: pro.change_date,
            title: `부서발령 및 승진 🚀`,
            category: 'PROMOTION',
            type: 'CHANGE',
            details: `[이전] ${pro.prev_dept} ${pro.prev_role} ➡️ [변경] ${pro.next_dept} ${pro.next_role} (${pro.promotion_reason})`,
          });
        }
      });
    }

    if (current360.awards) {
      current360.awards.forEach((awd: any) => {
        if (awd.record_date) {
          timelineEvents.push({
            date: awd.record_date,
            title: `${awd.title} 수여 🏆`,
            category: 'AWARD',
            type: awd.type,
            details: `${awd.content} (${awd.authority})`,
          });
        }
      });
    }

    if (current360.incidents) {
      current360.incidents.forEach((inc: any) => {
        if (inc.occurred_date) {
          timelineEvents.push({
            date: inc.occurred_date,
            title: `${inc.title} ⚠️`,
            category: 'INCIDENT',
            type: inc.severity,
            details: inc.description,
          });
        }
      });
    }

    if (current360.projects) {
      current360.projects.forEach((prj: any) => {
        if (prj.start_date) {
          timelineEvents.push({
            date: prj.start_date,
            title: `${prj.project_name} 프로젝트 참여 🪐`,
            category: 'PROJECT',
            type: 'START',
            details: `역할: ${prj.role_in_project} (기여도: ${prj.contribution_rate}%)`,
          });
        }
      });
    }

    timelineEvents.sort((a, b) => b.date.localeCompare(a.date));
  }

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
    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-4.5 bg-indigo-500 rounded-full"></span>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            임직원 360도 종합 프로필 관제
            <span className="text-[10px] text-slate-400 font-bold">Comprehensive HR Vault</span>
          </h3>
        </div>

        {/* 직원 선택기 */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">대상 임직원</label>
          <select
            value={selected360OperatorId}
            onChange={(e) => handleSelect360Employee(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none cursor-pointer"
          >
            <option value="">임직원을 선택해 주세요...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.employee_number ? `(${emp.employee_number})` : ''} ({getRoleKorean(emp.role)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {comprehensiveLoading ? (
        <div className="py-20 text-center animate-pulse text-xs text-slate-400 font-bold">
          임직원 360도 전수 이력을 복원하고 있습니다...
        </div>
      ) : current360 ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* 6단 스마트 탭 전환형 이력 상세 보드 (8 cols) */}
          <div className="xl:col-span-8 space-y-6">
            {/* 탭 내비게이션 */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto gap-1">
              {[
                { id: 'basic', label: '📋 기본/학력/경력' },
                { id: 'attendance', label: '📅 근무/근태' },
                { id: 'salary', label: '💰 급여/상여' },
                { id: 'project', label: '🪐 프로젝트/역량' },
                { id: 'life', label: '🏥 신상/가족/평판/사건' },
                { id: 'edit', label: '✍️ 실시간 에디터' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive360Tab(t.id)}
                  className={`px-3 py-2 text-[10.5px] font-black rounded-xl cursor-pointer transition-all shrink-0 border-0 ${
                    active360Tab === t.id ? 'bg-white text-indigo-750 shadow-xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 탭 본문 */}
            <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 min-h-[400px]">
              {/* TAB 1: 기본/학력/경력 */}
              {active360Tab === 'basic' && (
                <div className="space-y-6">
                  {/* 기본 프로필 */}
                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                      임직원 기본 인적정보
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-650">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">부서/직급</span>
                        <span className="text-slate-800 font-black">
                          {pf?.department || '미정'} / {getRoleKorean(current360.role)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">공식 입사일</span>
                        <span className="text-slate-850 font-black">{pf?.hire_date || '미정'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">출퇴근 통근 구역</span>
                        <span className="text-slate-850 font-black">{pf?.commute_area || '미정'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">비상 백업자</span>
                        <span className="text-slate-850 font-black">
                          {(() => {
                            const found = employees.find((e) => String(e.id) === String(pf?.backup_operator_id));
                            if (!found) return '지정 없음';
                            return `${found.name} ${found.employee_number ? `(${found.employee_number})` : ''}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 학력사항 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        학력사항 (Education)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">총 {current360.education?.length || 0}건</span>
                    </h5>

                    {!current360.education || current360.education.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        기록된 학력사항이 없습니다. 에디터 탭에서 추가해 주세요.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {current360.education.map((edu: any) => (
                          <div
                            key={edu.id}
                            className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-3xs flex justify-between items-start group"
                          >
                            <div className="space-y-1">
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-650 font-black text-[8px]">{edu.degree}</span>
                              <h6 className="text-xs font-black text-slate-800 mt-1">{edu.school_name}</h6>
                              <p className="text-[10px] text-slate-500 font-bold">전공: {edu.major}</p>
                              <p className="text-[9px] text-slate-400 font-bold">
                                기간: {edu.entrance_date} ~ {edu.graduation_date} ({edu.status})
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
                              <button
                                onClick={() => handleLoadRecordForEdit('crm_operator_education', edu)}
                                className="p-1 text-slate-350 hover:text-indigo-600 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="수정하기"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete360Record('crm_operator_education', edu.id)}
                                className="p-1 text-slate-350 hover:text-rose-500 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="삭제하기"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 자격면허 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        자격증 및 전문 면허
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">총 {current360.licenses?.length || 0}건</span>
                    </h5>

                    {!current360.licenses || current360.licenses.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        취득 및 등록된 자격증이 없습니다.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {current360.licenses.map((lic: any) => (
                          <div
                            key={lic.id}
                            className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-3xs flex justify-between items-start group"
                          >
                            <div className="space-y-1">
                              <h6 className="text-xs font-black text-slate-850">{lic.license_name}</h6>
                              <p className="text-[10px] text-slate-500 font-bold">발행기관: {lic.issuer} | 번호: {lic.license_no}</p>
                              <p className="text-[9px] text-slate-400 font-bold">
                                취득일: {lic.acquisition_date} (만료일: {lic.expiry_date || '없음'})
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
                              <button
                                onClick={() => handleLoadRecordForEdit('crm_operator_licenses', lic)}
                                className="p-1 text-slate-350 hover:text-indigo-600 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="수정하기"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete360Record('crm_operator_licenses', lic.id)}
                                className="p-1 text-slate-350 hover:text-rose-500 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="삭제하기"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 경력사항 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        이전 회사 경력사항
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">총 {current360.careers?.length || 0}건</span>
                    </h5>

                    {!current360.careers || current360.careers.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        과거 경력정보가 명부에 기록되지 않았습니다.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {current360.careers.map((car: any) => (
                          <div
                            key={car.id}
                            className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs flex justify-between items-start group"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-xs font-semibold text-slate-650">
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">회사/부서</span>
                                <h6 className="text-xs font-black text-slate-800">
                                  {car.company_name} <span className="text-[10px] text-slate-450 font-normal">({car.department})</span>
                                </h6>
                                <p className="text-[9.5px] text-slate-450">최종 직급: {car.job_title}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">담당업무</span>
                                <p className="text-[10.5px] text-slate-755 font-bold leading-normal">{car.assigned_task}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">재직기간 및 퇴사사유</span>
                                <p className="text-[10px] text-slate-800 font-mono">
                                  {car.join_date} ~ {car.retire_date}
                                </p>
                                <p className="text-[9.5px] text-rose-600">퇴사 사유: {car.leaving_reason}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
                              <button
                                onClick={() => handleLoadRecordForEdit('crm_operator_careers', car)}
                                className="p-1 text-slate-350 hover:text-indigo-600 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="수정하기"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete360Record('crm_operator_careers', car.id)}
                                className="p-1 text-slate-355 hover:text-rose-500 rounded hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0 border-0 bg-transparent"
                                title="삭제하기"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: 근무/근태 */}
              {active360Tab === 'attendance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs text-center">
                      <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider">정상 근무 시간</span>
                      <span className="text-lg font-black text-emerald-600 block mt-1">160시간</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs text-center">
                      <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider">누적 지각 횟수</span>
                      <span className="text-lg font-black text-amber-600 block mt-1">1회</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs text-center">
                      <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider">누적 결근 횟수</span>
                      <span className="text-lg font-black text-rose-600 block mt-1">0회</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs text-center">
                      <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider">소모 연차 일수</span>
                      <span className="text-lg font-black text-indigo-650 block mt-1">3.5일</span>
                    </div>
                  </div>

                  {/* 담당업무 변동이력 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        담당 업무 변동 이력 (Job Assignment History)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">총 {current360.jobHistory?.length || 0}건</span>
                    </h5>

                    {!current360.jobHistory || current360.jobHistory.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        기록된 담당업무 변동이력이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {current360.jobHistory.map((job: any) => (
                          <div
                            key={job.id}
                            className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs flex justify-between items-start group"
                          >
                            <div className="space-y-2 text-xs font-semibold text-slate-650 w-full">
                              <div className="flex items-center justify-between">
                                <span className="text-[9.5px] text-slate-400 font-bold font-mono">발령 지정일: {job.assignment_date}</span>
                                {job.is_current === 1 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-650 font-black text-[9px]">
                                    현재 담당 업무 🟢
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[9px]">
                                    이전 담당 업무
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-2 rounded bg-indigo-50/20 border border-indigo-100/50">
                                  <span className="block font-black text-[8px] text-indigo-750 uppercase tracking-widest mb-1">
                                    지정 담당 업무
                                  </span>
                                  <p className="text-slate-800 font-bold leading-normal">{job.job_description}</p>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100/50">
                                  <span className="block font-black text-[8px] text-slate-400 uppercase tracking-widest mb-1">
                                    이전 담당 업무 (인수인계)
                                  </span>
                                  <p className="text-slate-500 leading-normal">{job.prev_job_description || '없음 (신규 발령)'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
                              <button
                                onClick={() => handleLoadRecordForEdit('crm_operator_job_history', job)}
                                className="p-1 text-slate-350 hover:text-indigo-600 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="수정하기"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete360Record('crm_operator_job_history', job.id)}
                                className="p-1 text-slate-355 hover:text-rose-500 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="삭제하기"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: 급여/상여 */}
              {active360Tab === 'salary' && (
                <div className="space-y-6">
                  {/* 급여 실지급액 추이 차트 */}
                  <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-3xs space-y-4">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span>📈 월별 실지급액 추이 분석 (최근 6개월)</span>
                      <span className="text-[9px] text-slate-400 font-bold">비과세 식대 10만 원 자동 공제 연산 반영</span>
                    </h5>

                    {!current360.salaries || current360.salaries.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6">
                        급여 지급 이력이 없어 차트를 표현할 수 없습니다.
                      </p>
                    ) : (
                      <div className="flex items-end justify-around h-32 pt-4 px-2 border-b border-slate-150">
                        {current360.salaries.slice(-6).map((sal: any) => {
                          const heightPercent = Math.min(100, Math.max(10, (sal.net_salary / 5000000) * 100));
                          return (
                            <div key={sal.id} className="flex flex-col items-center gap-1.5 w-12 group relative">
                              <span className="absolute -top-6 scale-0 group-hover:scale-100 bg-slate-900 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow-md transition-all z-20">
                                {sal.net_salary?.toLocaleString()}원
                              </span>
                              <div
                                className="w-4 bg-indigo-600 rounded-t group-hover:bg-indigo-700 transition-all shadow-inner"
                                style={{ height: `${heightPercent}px` }}
                              ></div>
                              <span className="text-[9.5px] font-black font-mono text-slate-500 mt-1">{sal.payment_year_month}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 급여상여 리스트 상세 테이블 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        월별 상세 급여/상여 지급 이력 대장
                      </span>
                    </h5>

                    {!current360.salaries || current360.salaries.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        지급된 월별 급여 명세가 존재하지 않습니다.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-3xs">
                        <table className="w-full text-left border-collapse text-xs font-semibold">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[9px] text-slate-400 uppercase tracking-widest font-black">
                              <th className="py-2.5 px-3">지급 연월</th>
                              <th className="py-2.5 px-3 text-right">기본급</th>
                              <th className="py-2.5 px-3 text-right text-indigo-600">특별 상여</th>
                              <th className="py-2.5 px-3 text-right">주휴 수당</th>
                              <th className="py-2.5 px-3 text-right text-rose-500">세금/공제</th>
                              <th className="py-2.5 px-3 text-right text-indigo-750 bg-indigo-50/10 font-black">실지급액</th>
                              <th className="py-2.5 px-3 text-center">지급일자 (상태)</th>
                              <th className="py-2.5 px-2 text-center">작업</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-650 font-mono">
                            {current360.salaries.map((sal: any) => (
                              <tr key={sal.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-2.5 px-3 font-black text-slate-800">{sal.payment_year_month}</td>
                                <td className="py-2.5 px-3 text-right">{sal.base_salary?.toLocaleString()}원</td>
                                <td className="py-2.5 px-3 text-right font-black text-indigo-650">+{sal.bonus_amount?.toLocaleString()}원</td>
                                <td className="py-2.5 px-3 text-right text-slate-500">+{sal.weekly_holiday_allowance?.toLocaleString()}원</td>
                                <td className="py-2.5 px-3 text-right text-rose-500">-{sal.deduction_amount?.toLocaleString()}원</td>
                                <td className="py-2.5 px-3 text-right font-black text-indigo-750 bg-indigo-50/10">
                                  {sal.net_salary?.toLocaleString()}원
                                </td>
                                <td className="py-2.5 px-3 text-center font-sans font-bold">
                                  {sal.payment_date} ({sal.status})
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleLoadRecordForEdit('crm_operator_salaries', sal)}
                                      className="p-1 text-slate-350 hover:text-indigo-600 rounded transition-all cursor-pointer border-0 bg-transparent"
                                      title="수정하기"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete360Record('crm_operator_salaries', sal.id)}
                                      className="p-1 text-slate-355 hover:text-rose-500 rounded transition-all cursor-pointer border-0 bg-transparent"
                                      title="삭제하기"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: 프로젝트/역량 */}
              {active360Tab === 'project' && (
                <div className="space-y-6">
                  {/* 역량 태그 */}
                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs space-y-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">실시간 전산 태그 역량</h5>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pf?.skills ? (
                        pf.skills.split(',').map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100/50 text-indigo-750 font-black text-[10px] tracking-tight shadow-3xs"
                          >
                            🌌 {skill.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">
                          등록된 역량 키워드가 없습니다. 명부 폼에서 추가해 주세요.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 참여 프로젝트 목록 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        참여 프로젝트 이력 및 기여도/성과지표
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">총 {current360.projects?.length || 0}건</span>
                    </h5>

                    {!current360.projects || current360.projects.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        참여 중이거나 이력이 남은 프로젝트가 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {current360.projects.map((prj: any) => (
                          <div
                            key={prj.id}
                            className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs space-y-3 relative group"
                          >
                            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleLoadRecordForEdit('crm_operator_projects', prj)}
                                className="p-1 text-slate-355 hover:text-indigo-600 rounded transition-all cursor-pointer border-0 bg-transparent"
                                title="수정하기"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete360Record('crm_operator_projects', prj.id)}
                                className="p-1 text-slate-355 hover:text-rose-500 rounded transition-all cursor-pointer border-0 bg-transparent"
                                title="삭제하기"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <div className="space-y-1">
                                <h6 className="text-xs font-black text-indigo-900">{prj.project_name}</h6>
                                <p className="text-[10px] text-slate-450 font-bold">
                                  역할: {prj.role_in_project} | 기간: {prj.start_date} ~ {prj.end_date}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">성과점수</span>
                                <span className="px-2.5 py-0.8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-650 font-black font-mono text-[10px]">
                                  {prj.performance_score} / 100
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1 block">
                              <div className="flex justify-between text-[9px] font-black text-slate-455">
                                <span>업무 기여/참여도</span>
                                <span>{prj.contribution_rate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all"
                                  style={{ width: `${prj.contribution_rate}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-lg text-[10px] leading-relaxed text-slate-600 font-semibold">
                              <span className="block font-black text-[8.5px] text-slate-400 uppercase tracking-widest mb-1">
                                인사 참모 정성적 성과평가 기술서
                              </span>
                              {prj.performance_evaluation}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: 신상/가족/평판/사건사고 */}
              {active360Tab === 'life' && (
                <div className="space-y-6">
                  {/* 부양 가족 명단 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        비상 연락처 및 부양 가족 명단 (Families)
                      </span>
                    </h5>

                    {!current360.families || current360.families.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        가족 관련 정보가 저장되어 있지 않습니다.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {current360.families.map((fam: any) => {
                          let ageStr = 'N/A';
                          if (fam.birth_date && fam.birth_date !== 'N/A') {
                            try {
                              const birth = new Date(fam.birth_date);
                              const today = new Date();
                              let age = today.getFullYear() - birth.getFullYear();
                              const m = today.getMonth() - birth.getMonth();
                              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                                age--;
                              }
                              ageStr = `만 ${age}세`;
                            } catch (e) {}
                          }

                          return (
                            <div
                              key={fam.id}
                              className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-3xs flex justify-between items-start group"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-100 text-emerald-650 font-black text-[8px]">
                                    {fam.relation_type}
                                  </span>
                                  {fam.is_dependent === 1 && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-100/50 text-indigo-650 font-black text-[8px]">
                                      소득공제 부양가족 🟢
                                    </span>
                                  )}
                                </div>
                                <h6 className="text-xs font-black text-slate-800">
                                  {fam.name}{' '}
                                  <span className="text-[10px] text-slate-450 font-mono font-normal">
                                    ({fam.birth_date} / {ageStr})
                                  </span>
                                </h6>
                                <p className="text-[9.5px] text-slate-500 font-bold">📞 비상 연락처: {fam.phone_number}</p>
                                {fam.remarks && (
                                  <p className="text-[9px] text-indigo-650 bg-indigo-50/40 px-2 py-0.5 rounded-md leading-normal font-semibold">
                                    💡 특이사항: {fam.remarks}
                                  </p>
                                )}
                              </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
                              <button
                                onClick={() => handleLoadRecordForEdit('crm_operator_families', fam)}
                                className="p-1 text-slate-350 hover:text-indigo-600 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="수정하기"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete360Record('crm_operator_families', fam.id)}
                                className="p-1 text-slate-350 hover:text-rose-500 rounded hover:bg-slate-50 cursor-pointer border-0 bg-transparent"
                                title="삭제하기"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 사건사고 */}
                  <div className="space-y-3 relative">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-rose-500 rounded-full animate-pulse"></span>
                        🚨 [보안 격리] 대내외 사건사고 및 법무 징계 이력 대장
                      </span>
                    </h5>

                    {!current360.incidents || current360.incidents.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        대내외 사건사고 및 법무 징계 이력이 깨끗합니다 ✨
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {current360.incidents.map((inc: any) => {
                          const isMasked = String(inc.title).includes('🔒');

                          return (
                            <div
                              key={inc.id}
                              className={`border rounded-xl p-4 shadow-3xs flex justify-between items-start group transition-all relative overflow-hidden ${
                                isMasked
                                  ? 'bg-slate-100/50 border-slate-200'
                                  : inc.severity === 'HIGH'
                                  ? 'bg-rose-50/30 border-rose-150'
                                  : 'bg-white border-slate-100'
                              }`}
                            >
                              <div className="space-y-2 text-xs font-semibold text-slate-655 w-full">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9.5px] text-slate-400 font-bold font-mono">발생일자: {inc.occurred_date}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-black text-[8px] ${
                                        inc.severity === 'HIGH'
                                          ? 'bg-rose-100 text-rose-700'
                                          : inc.severity === 'MEDIUM'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-slate-150 text-slate-700'
                                      }`}
                                    >
                                      위험등급: {inc.severity}
                                    </span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-black text-[9px]">
                                    상태: {inc.status}
                                  </span>
                                </div>

                                <div>
                                  <h6 className="text-xs font-black text-slate-800 flex items-center gap-1">
                                    {isMasked && <span className="text-indigo-650">🔒</span>}
                                    {inc.title}
                                  </h6>
                                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">{inc.description}</p>
                                </div>

                                {!isMasked && (
                                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100 text-[9.5px] font-semibold text-slate-650">
                                    <span className="block font-black text-[8px] text-slate-400 uppercase tracking-widest mb-0.5">
                                      조치 결과 및 최종 판결
                                    </span>
                                    {inc.outcome}
                                  </div>
                                )}
                              </div>

                              {!isMasked && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
                                  <button
                                    onClick={() => handleLoadRecordForEdit('crm_operator_incidents', inc)}
                                    className="p-1 text-slate-350 hover:text-indigo-600 rounded transition-all cursor-pointer border-0 bg-transparent"
                                    title="수정하기"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete360Record('crm_operator_incidents', inc.id)}
                                    className="p-1 text-slate-350 hover:text-rose-500 rounded transition-all cursor-pointer border-0 bg-transparent"
                                    title="삭제하기"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 무기명 동료 평판 */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                        동료 및 부서장 다차원 무기명 평판 피드백 (Reputations)
                      </span>
                    </h5>

                    {!current360.reputations || current360.reputations.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6 bg-white border border-slate-100 rounded-xl">
                        사내외 피드백 데이터가 존재하지 않습니다.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {current360.reputations.map((rep: any) => (
                          <div key={rep.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs space-y-2.5 relative group">
                            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleLoadRecordForEdit('crm_operator_reputations', rep)}
                                className="p-1 text-slate-355 hover:text-indigo-600 rounded transition-all cursor-pointer border-0 bg-transparent"
                                title="수정하기"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDelete360Record('crm_operator_reputations', rep.id)}
                                className="p-1 text-slate-355 hover:text-rose-500 rounded transition-all cursor-pointer border-0 bg-transparent"
                                title="삭제하기"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            <div className="flex justify-between items-center text-[9.5px]">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-655 font-black text-[8px]">
                                  평가출처:{' '}
                                  {rep.source_type === 'INTERNAL'
                                    ? '사내 동료평가'
                                    : rep.source_type === 'MANAGER'
                                    ? '인사 부서장평가'
                                    : '바이어/외부평가'}
                                </span>
                                <span className="text-slate-400 font-mono">평가일자: {rep.evaluation_date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-amber-500 text-[10.5px]">★</span>
                                <span className="font-mono font-black text-slate-800">{rep.score?.toFixed(1)} / 5.0</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] leading-relaxed font-semibold">
                              <div className="p-2.5 rounded bg-indigo-50/20 border border-indigo-100/50">
                                <span className="block font-black text-[8px] text-indigo-755 uppercase tracking-widest mb-0.5">
                                  🌟 장점 및 기여 성과
                                </span>
                                <p className="text-slate-700">{rep.positive_feedback}</p>
                              </div>
                              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                                <span className="block font-black text-[8px] text-slate-400 uppercase tracking-widest mb-0.5">
                                  💡 보완 및 개선점 권고
                                </span>
                                <p className="text-slate-505">{rep.constructive_feedback || '없음'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: 실시간 에디터 */}
              {active360Tab === 'edit' && (
                <div className="space-y-4">
                  <h5 className="text-xs font-black text-slate-800 flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span>✍️ 360도 임직원 통합 라이프사이클 정보 Upsert 기기</span>
                      <span className="text-[9.5px] text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded font-black font-sans">
                        트랜잭션 폼
                      </span>
                      {editFormData.id && (
                        <span className="text-[9.5px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-black">
                          현재 기록 수정 중 ✏️
                        </span>
                      )}
                    </div>
                    {editFormData.id && (
                      <button
                        type="button"
                        onClick={() => reset360EditForm(editTableName)}
                        className="text-[9px] font-black text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors border-0 cursor-pointer"
                      >
                        수정 취소 (신규 등록 전환)
                      </button>
                    )}
                  </h5>

                  <form onSubmit={onFormSubmit} className="space-y-4 text-xs font-bold text-slate-650">
                    <div className="space-y-1 block">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest block">기록 변경/추가 영역 선택</label>
                      <select
                        value={editTableName}
                        onChange={(e) => reset360EditForm(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-850 cursor-pointer text-xs"
                      >
                        <option value="crm_operator_education">1. 학력사항 (Education)</option>
                        <option value="crm_operator_licenses">2. 자격증/면허 (Licenses)</option>
                        <option value="crm_operator_careers">3. 이전경력 (Careers)</option>
                        <option value="crm_operator_salaries">4. 월 급여상여 지급 내역 (Salaries)</option>
                        <option value="crm_operator_promotions">5. 부서발령/승진 (Promotions)</option>
                        <option value="crm_operator_awards">6. 사내 상벌/징계 (Awards)</option>
                        <option value="crm_operator_family_events">7. 경조사 지원금 (Family Events)</option>
                        <option value="crm_operator_medical">8. 병가/병력/의료 (Medical)</option>
                        <option value="crm_operator_incidents">9. 대내외 사건사고 (Incidents) [보안]</option>
                        <option value="crm_operator_reputations">10. 다차원 평판 피드백 (Reputations)</option>
                        <option value="crm_operator_families">11. 부양 가족 인적사항 (Families)</option>
                        <option value="crm_operator_job_history">12. 담당 실무 변경이력 (Job History)</option>
                        <option value="crm_operator_projects">13. 참여 프로젝트 실적 (Projects)</option>
                      </select>
                    </div>

                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-3xs space-y-3.5">
                      {editTableName === 'crm_operator_education' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">학교명</label>
                              <input
                                type="text"
                                value={editFormData.school_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, school_name: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 서울대학교"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">전공학과</label>
                              <input
                                type="text"
                                value={editFormData.major || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, major: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 경영학"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">학위 구분</label>
                              <select
                                value={editFormData.degree || '학사'}
                                onChange={(e) => setEditFormData({ ...editFormData, degree: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value="고졸">고졸</option>
                                <option value="전문학사">전문학사</option>
                                <option value="학사">학사</option>
                                <option value="석사">석사</option>
                                <option value="박사">박사</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">졸업 상태</label>
                              <select
                                value={editFormData.status || '졸업'}
                                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value="졸업">졸업</option>
                                <option value="수료">수료</option>
                                <option value="중퇴">중퇴</option>
                                <option value="재학">재학</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">입학일자</label>
                              <input
                                type="date"
                                value={editFormData.entrance_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, entrance_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">졸업일자</label>
                              <input
                                type="date"
                                value={editFormData.graduation_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, graduation_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_licenses' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">자격 및 면허명</label>
                            <input
                              type="text"
                              value={editFormData.license_name || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, license_name: e.target.value })}
                              className="w-full p-2 border rounded-lg text-xs"
                              placeholder="예: 정보처리기사"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">발행/발급 기관</label>
                              <input
                                type="text"
                                value={editFormData.issuer || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, issuer: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 한국산업인력공단"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">자격 및 면허 일련번호</label>
                              <input
                                type="text"
                                value={editFormData.license_no || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, license_no: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 20-4455-98"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">취득 연월일</label>
                              <input
                                type="date"
                                value={editFormData.acquisition_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, acquisition_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">자격 만료일</label>
                              <input
                                type="text"
                                value={editFormData.expiry_date || '없음'}
                                onChange={(e) => setEditFormData({ ...editFormData, expiry_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="없음 또는 YYYY-MM-DD"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_careers' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">직전 직장회사명</label>
                              <input
                                type="text"
                                value={editFormData.company_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: CJ대한통운"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">소속 부서</label>
                              <input
                                type="text"
                                value={editFormData.department || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 물류기획팀"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">최종 직급</label>
                              <input
                                type="text"
                                value={editFormData.job_title || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 대리, 과장"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">퇴사 사유</label>
                              <input
                                type="text"
                                value={editFormData.leaving_reason || '이직'}
                                onChange={(e) => setEditFormData({ ...editFormData, leaving_reason: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">입사 연월일</label>
                              <input
                                type="date"
                                value={editFormData.join_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, join_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">퇴사 연월일</label>
                              <input
                                type="date"
                                value={editFormData.retire_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, retire_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">과거 주력 담당업무 기술</label>
                            <input
                              type="text"
                              value={editFormData.assigned_task || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, assigned_task: e.target.value })}
                              className="w-full p-2 border rounded-lg text-xs"
                              placeholder="예: SCM 물류 전산 기획 및 재고관리"
                            />
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_salaries' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">지급 연월</label>
                              <input
                                type="month"
                                value={editFormData.payment_year_month || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, payment_year_month: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">실지급일자</label>
                              <input
                                type="date"
                                value={editFormData.payment_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, payment_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">기본급 (원)</label>
                              <input
                                type="number"
                                value={editFormData.base_salary || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, base_salary: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">상여금 (원)</label>
                              <input
                                type="number"
                                value={editFormData.bonus_amount || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, bonus_amount: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">주휴수당 (원)</label>
                              <input
                                type="number"
                                value={editFormData.weekly_holiday_allowance || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, weekly_holiday_allowance: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">연장근무수당</label>
                              <input
                                type="number"
                                value={editFormData.overtime_allowance || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, overtime_allowance: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">비과세식대 (원)</label>
                              <input
                                type="number"
                                value={editFormData.meal_allowance || 100000}
                                onChange={(e) => setEditFormData({ ...editFormData, meal_allowance: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">4대보험 공제 (원)</label>
                              <input
                                type="number"
                                value={editFormData.deduction_amount || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, deduction_amount: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-indigo-750 font-black block mb-1">최종 예상 실수령액 (원)</label>
                              <input
                                type="number"
                                value={editFormData.net_salary || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, net_salary: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border border-indigo-300 rounded-lg bg-indigo-50/20 font-black text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">지급 상태</label>
                              <select
                                value={editFormData.status || '지급완료'}
                                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value="지급완료">지급완료</option>
                                <option value="지급대기">지급대기</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_promotions' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">발령 일자</label>
                              <input
                                type="date"
                                value={editFormData.change_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, change_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">발령 사유</label>
                              <input
                                type="text"
                                value={editFormData.promotion_reason || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, promotion_reason: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 정기 인사평가 반영"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">이전 부서</label>
                              <input
                                type="text"
                                value={editFormData.prev_dept || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, prev_dept: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 구매팀"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">변경 부서</label>
                              <input
                                type="text"
                                value={editFormData.next_dept || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, next_dept: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 구매전략팀"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">이전 직급</label>
                              <input
                                type="text"
                                value={editFormData.prev_role || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, prev_role: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 사원"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">변경 직급</label>
                              <input
                                type="text"
                                value={editFormData.next_role || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, next_role: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 대리"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_awards' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">상벌/징계 일자</label>
                              <input
                                type="date"
                                value={editFormData.record_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, record_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">구분</label>
                              <select
                                value={editFormData.type || 'AWARD'}
                                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value="AWARD">포상 (AWARD)</option>
                                <option value="PENALTY">징계/감봉 (PENALTY)</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">상벌 명칭</label>
                              <input
                                type="text"
                                value={editFormData.title || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 우수사원 포상, 경고 처분"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">수여/시행 주체</label>
                              <input
                                type="text"
                                value={editFormData.authority || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, authority: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 대표이사, 공장장"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">세부 내용</label>
                            <textarea
                              value={editFormData.content || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                              rows={2}
                              className="w-full p-2 border rounded-lg resize-none text-xs"
                              placeholder="포상 기여 사유 혹은 징계 경위를 기입합니다."
                            />
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">비고 및 부상 내역</label>
                            <input
                              type="text"
                              value={editFormData.remarks || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                              className="w-full p-2 border rounded-lg text-xs"
                              placeholder="예: 포상금 50만원 수여"
                            />
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_family_events' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">경조 일자</label>
                              <input
                                type="date"
                                value={editFormData.event_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, event_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">경조 구분</label>
                              <input
                                type="text"
                                value={editFormData.type || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 결혼, 장례, 칠순"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">대상 가족 관계</label>
                              <input
                                type="text"
                                value={editFormData.relation || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, relation: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 본인, 모친, 부친"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">경조금 지급액 (원)</label>
                              <input
                                type="number"
                                value={editFormData.congratulation_money || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, congratulation_money: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">화환/조화 제공 여부</label>
                              <select
                                value={editFormData.wreath_provided || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, wreath_provided: parseInt(e.target.value) })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value={0}>미제공</option>
                                <option value={1}>화환/조화 제공</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_medical' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">병명 / 상해 진단명</label>
                              <input
                                type="text"
                                value={editFormData.diagnosis_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, diagnosis_name: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 급성 맹장염, 디스크 탈출증"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">요양 병원/의료기관</label>
                              <input
                                type="text"
                                value={editFormData.hospital_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, hospital_name: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 인천성모병원"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">치료 시작일</label>
                              <input
                                type="date"
                                value={editFormData.treatment_start_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, treatment_start_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">치료 종료일</label>
                              <input
                                type="date"
                                value={editFormData.treatment_end_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, treatment_end_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">총 병가/요양 일수</label>
                              <input
                                type="number"
                                value={editFormData.sick_leave_days || 0}
                                onChange={(e) => setEditFormData({ ...editFormData, sick_leave_days: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">복직 후 현장 근무 제한 사항</label>
                            <input
                              type="text"
                              value={editFormData.work_limitations || '없음'}
                              onChange={(e) => setEditFormData({ ...editFormData, work_limitations: e.target.value })}
                              className="w-full p-2 border rounded-lg text-xs"
                              placeholder="예: 수술 부위 회복을 위해 2주간 중량물 운반 금지 조치"
                            />
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_incidents' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">발생 일자</label>
                              <input
                                type="date"
                                value={editFormData.occurred_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, occurred_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">위험 등급 분류</label>
                              <select
                                value={editFormData.severity || 'LOW'}
                                onChange={(e) => setEditFormData({ ...editFormData, severity: e.target.value })}
                                className="w-full p-2 border rounded-lg font-black text-xs cursor-pointer"
                              >
                                <option value="LOW">LOW (단순 갈등 및 업무적 애로)</option>
                                <option value="MEDIUM">MEDIUM (회사 이미지/영업 손실 우려)</option>
                                <option value="HIGH">HIGH (민형사 소송 및 법무 분쟁 리스크)</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">사건사고 타이틀</label>
                            <input
                              type="text"
                              value={editFormData.title || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                              className="w-full p-2 border rounded-lg font-bold text-xs"
                              placeholder="예: 계약 보증 분쟁 해결 지원"
                            />
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">발생 경위 및 상황 설명 (민감)</label>
                            <textarea
                              value={editFormData.description || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                              rows={3}
                              className="w-full p-2.5 border rounded-lg resize-none leading-relaxed text-xs"
                              placeholder="RAG와 최고운영자만 공유 가능한 세부 경위를 상세히 기입합니다."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">현재 진행 상태</label>
                              <select
                                value={editFormData.status || '진행중'}
                                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value="진행중">진행중</option>
                                <option value="합의완료">합의완료</option>
                                <option value="종결">종결</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">최종 조치 및 판결 결과</label>
                              <input
                                type="text"
                                value={editFormData.outcome || '조치 예정'}
                                onChange={(e) => setEditFormData({ ...editFormData, outcome: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 상호 대화로 합의 종결"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_reputations' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">평가 일자</label>
                              <input
                                type="date"
                                value={editFormData.evaluation_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, evaluation_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">평가자 식별</label>
                              <input
                                type="text"
                                value={editFormData.evaluator_id || '익명'}
                                onChange={(e) => setEditFormData({ ...editFormData, evaluator_id: e.target.value })}
                                className="w-full p-2 border rounded-lg font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">평가 출처 구분</label>
                              <select
                                value={editFormData.source_type || 'INTERNAL'}
                                onChange={(e) => setEditFormData({ ...editFormData, source_type: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value="INTERNAL">동료 평판 (INTERNAL)</option>
                                <option value="MANAGER">부서장/인사평가 (MANAGER)</option>
                                <option value="EXTERNAL">바이어/외부고객 (EXTERNAL)</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">정량적 평점 (1.0 ~ 5.0)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              value={editFormData.score || 5.0}
                              onChange={(e) => setEditFormData({ ...editFormData, score: parseFloat(e.target.value) || 0 })}
                              className="w-full p-2 border rounded-lg text-amber-600 font-mono font-black text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">🌟 사내외 평판 장점 및 강점 기술</label>
                            <textarea
                              value={editFormData.positive_feedback || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, positive_feedback: e.target.value })}
                              rows={2}
                              className="w-full p-2 border rounded-lg resize-none text-xs"
                              placeholder="실제 동료들의 칭찬이나 기여 공헌을 입력합니다."
                            />
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">💡 보완할 점 및 개선 권고사항</label>
                            <textarea
                              value={editFormData.constructive_feedback || '없음'}
                              onChange={(e) => setEditFormData({ ...editFormData, constructive_feedback: e.target.value })}
                              rows={2}
                              className="w-full p-2 border rounded-lg resize-none text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_families' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">관계</label>
                              <select
                                value={editFormData.relation_type || '자녀'}
                                onChange={(e) => setEditFormData({ ...editFormData, relation_type: e.target.value })}
                                className="w-full p-2 border rounded-lg font-black text-xs cursor-pointer"
                              >
                                <option value="배우자">배우자</option>
                                <option value="자녀">자녀 (가족수당 연동)</option>
                                <option value="부친">부친</option>
                                <option value="모친">모친</option>
                                <option value="형제자매">형제자매</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">가족 성명</label>
                              <input
                                type="text"
                                value={editFormData.name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="w-full p-2 border rounded-lg font-bold text-xs"
                                placeholder="성함을 기입하세요"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">생년월일 (YYYY-MM-DD)</label>
                              <input
                                type="date"
                                value={editFormData.birth_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">비상 연락처</label>
                              <input
                                type="text"
                                value={editFormData.phone_number || 'N/A'}
                                onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">소득세 부양 여부</label>
                              <select
                                value={editFormData.is_dependent || 1}
                                onChange={(e) => setEditFormData({ ...editFormData, is_dependent: parseInt(e.target.value) })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value={1}>부양가족 적용</option>
                                <option value={0}>비부양가족</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">비고 및 생애주기 메모</label>
                              <input
                                type="text"
                                value={editFormData.remarks || '없음'}
                                onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 입학 등 메모..."
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_job_history' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">실무 변경/발령일</label>
                              <input
                                type="date"
                                value={editFormData.assignment_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, assignment_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">현재 담당 여부</label>
                              <select
                                value={editFormData.is_current || 1}
                                onChange={(e) => setEditFormData({ ...editFormData, is_current: parseInt(e.target.value) })}
                                className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                              >
                                <option value={1}>현재 담당 업무 적용</option>
                                <option value={0}>과거 변경 이력</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">신규 담당 실무 설명</label>
                            <textarea
                              value={editFormData.job_description || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, job_description: e.target.value })}
                              rows={2}
                              className="w-full p-2 border rounded-lg resize-none text-xs"
                              placeholder="예: 공장 1라인 공정 총괄 및 무재해 현장 안전 관리자"
                            />
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">직전 담당 실무</label>
                            <input
                              type="text"
                              value={editFormData.prev_job_description || '없음'}
                              onChange={(e) => setEditFormData({ ...editFormData, prev_job_description: e.target.value })}
                              className="w-full p-2 border rounded-lg text-xs"
                              placeholder="예: 생산라인 기계 장비 오퍼레이팅"
                            />
                          </div>
                        </div>
                      )}

                      {editTableName === 'crm_operator_projects' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">참여 프로젝트명</label>
                            <input
                              type="text"
                              value={editFormData.project_name || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, project_name: e.target.value })}
                              className="w-full p-2 border rounded-lg font-bold text-xs"
                              placeholder="예: 전사 SCM 인벤토리 최적화"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">프로젝트 내 역할</label>
                              <input
                                type="text"
                                value={editFormData.role_in_project || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, role_in_project: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                                placeholder="예: 데이터베이스 엔지니어링"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">산출물 증빙 링크</label>
                              <input
                                type="text"
                                value={editFormData.outcome_link || '없음'}
                                onChange={(e) => setEditFormData({ ...editFormData, outcome_link: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">기여율/참여율 (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editFormData.contribution_rate || 100}
                                onChange={(e) => setEditFormData({ ...editFormData, contribution_rate: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">성과 점수 (1 ~ 100)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editFormData.performance_score || 90}
                                onChange={(e) => setEditFormData({ ...editFormData, performance_score: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-lg font-mono font-black text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 block">
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">참여 시작일</label>
                              <input
                                type="date"
                                value={editFormData.start_date || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] text-slate-400 block mb-1">참여 종료일</label>
                              <input
                                type="text"
                                value={editFormData.end_date || '진행중'}
                                onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9.5px] text-slate-400 block mb-1">기여도 상세 기술서</label>
                            <textarea
                              value={editFormData.performance_evaluation || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, performance_evaluation: e.target.value })}
                              rows={3}
                              className="w-full p-2.5 border rounded-lg resize-none leading-relaxed text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {!['crm_operator_education', 'crm_operator_licenses', 'crm_operator_careers', 'crm_operator_salaries', 'crm_operator_promotions', 'crm_operator_awards', 'crm_operator_family_events', 'crm_operator_medical', 'crm_operator_incidents', 'crm_operator_reputations', 'crm_operator_families', 'crm_operator_job_history', 'crm_operator_projects'].includes(editTableName) && (
                        <div className="p-4 bg-slate-50 rounded text-center text-slate-400 text-xs">
                          🛠️ 이 테이블은 360 기본 연산에 따른 기본값 자동 Upsert를 지원합니다.
                          <textarea
                            value={JSON.stringify(editFormData, null, 2)}
                            onChange={(e) => {
                              try {
                                setEditFormData(JSON.parse(e.target.value));
                              } catch (err) {}
                            }}
                            rows={5}
                            className="w-full p-2 bg-white border border-slate-200 mt-2 font-mono text-[10px] text-slate-800 rounded text-xs resize-none"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitLoading || !getIs360Modified()}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 border-0"
                    >
                      <Send size={12} />
                      360도 인사 이력 저장 및 AI RAG 실시간 융합
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* 우측 타임라인 (4 cols) */}
          <div className="xl:col-span-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
              ⏳ 연대기적 임직원 라이프사이클 타임라인
            </h4>

            {timelineEvents.length === 0 ? (
              <p className="text-center text-[10px] text-slate-400 font-bold py-16">
                등록된 역사적 라이프사이클 이벤트가 없습니다.
              </p>
            ) : (
              <div className="relative pl-4 border-l-2 border-indigo-100 space-y-5 py-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {timelineEvents.map((evt, eIdx) => (
                  <div key={eIdx} className="relative space-y-1 text-xs">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs"></span>

                    <div className="flex justify-between items-center text-[9px] font-black font-mono">
                      <span className="text-indigo-650">{evt.date}</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold scale-90">
                        {evt.category}
                      </span>
                    </div>

                    <h6 className="text-[10.5px] font-black text-slate-800">{evt.title}</h6>
                    <p className="text-[9.5px] text-slate-500 font-semibold leading-relaxed">{evt.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-xs">
          임직원을 선택하시면 6단 탭 기반 360도 라이프사이클 정보와 역사적 수직 타임라인을 정밀 분석합니다.
        </div>
      )}
    </div>
  );
};
