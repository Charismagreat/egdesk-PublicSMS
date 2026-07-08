"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

// 공통 타입 임포트
import { Employee, CompanyEvent, LeaveRequest, Contract, Payroll, EmployeeProfile, BriefingHistory, EventType } from "./types";

// 서브 컴포넌트 임포트
import { MyCommuteStamp } from "./components/MyCommuteStamp";
import { AttendanceStats } from "./components/AttendanceStats";
import { CompanyCalendar } from "./components/CompanyCalendar";
import { AiBriefingMonitor } from "./components/AiBriefingMonitor";
import { LeaveApprovalBox } from "./components/LeaveApprovalBox";
import { PayrollContractCenter } from "./components/PayrollContractCenter";
import { BasicProfileEditor } from "./components/BasicProfileEditor";
import { ComprehensiveProfile360 } from "./components/ComprehensiveProfile360";

// 모달 컴포넌트 임포트
import { LeaveRequestModal } from "./components/LeaveRequestModal";
import { CalendarEventModal } from "./components/CalendarEventModal";
import { LeaveRejectModal } from "./components/LeaveRejectModal";
import { EventTypeMasterModal } from "./components/EventTypeMasterModal";
import { BriefingZoomModal } from "./components/BriefingZoomModal";

export default function HrAttendancePage() {
  // 1. 데이터 리스트 및 세션 상태
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyEvents, setCompanyEvents] = useState<CompanyEvent[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. 캘린더 탐색용 상태
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');

  // 3. 모달 열기/닫기 제어 상태
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
  const [isBriefingZoomed, setIsBriefingZoomed] = useState(false);

  // 4. 선택 식별자(ID) 상태
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [selected360OperatorId, setSelected360OperatorId] = useState<string>("");
  const [selectedProfileOperatorId, setSelectedProfileOperatorId] = useState("");
  const [selectedContractOperatorId, setSelectedContractOperatorId] = useState("");

  // 5. AI 업무 공백 모니터링 상태
  const [aiBriefing, setAiBriefing] = useState<any>({
    riskScore: 0,
    alertTitle: '로딩 중...',
    alertMessage: 'AI가 부서별 일정을 교차 예측하고 있습니다.',
    briefingText: '데이터를 분석하여 업무 공백 보고서를 자동 작성하고 있습니다.'
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [briefingHistories, setBriefingHistories] = useState<BriefingHistory[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [latestBriefing, setLatestBriefing] = useState<any>(null);

  // 6. 근로계약 및 급여정산 폼 상태
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [payrollYearMonth, setPayrollYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollLoading, setPayrollLoading] = useState(false);

  const [hourlyWage, setHourlyWage] = useState(10000);
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [allowHolidayPay, setAllowHolidayPay] = useState(1); 
  const [workDays, setWorkDays] = useState("월,화,수,목,금");
  const [contractMemo, setContractMemo] = useState("");

  // 7. 임직원 상세 인적사항 폼 상태
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [profileDept, setProfileDept] = useState("미정");
  const [profileHireDate, setProfileHireDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [profileCommute, setProfileCommute] = useState("인근 통근");
  const [profileSkills, setProfileSkills] = useState("일반 서무");
  const [profileBackup, setProfileBackup] = useState("none");
  const [profileLoading, setProfileLoading] = useState(false);

  // 8. 360도 종합 프로필 관제 상태
  const [comprehensiveProfiles, setComprehensiveProfiles] = useState<any[]>([]);
  const [comprehensiveLoading, setComprehensiveLoading] = useState<boolean>(false);
  const [isHighPrivilege, setIsHighPrivilege] = useState<boolean>(false);

  // 9. 일정 유형 마스터 관리 상태
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [typeError, setTypeError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 초기 조회
  useEffect(() => {
    fetchHrData();
  }, []);

  // 연월 또는 권한 세션 변경 시 인사/급여 데이터 조회
  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PRESIDENT') {
      fetchContractsAndPayroll();
    }
  }, [currentUser, payrollYearMonth]);

  // ==========================================
  // 🏛️ API 데이터 로드 및 조율 함수군
  // ==========================================

  // 전사 360도 프로필 조회
  const fetchComprehensiveProfiles = async () => {
    setComprehensiveLoading(true);
    try {
      const res = await fetch('/api/hr/profiles/comprehensive');
      const data = await res.json();
      if (data.success) {
        setComprehensiveProfiles(data.profiles || []);
        setIsHighPrivilege(data.isHighPrivilege || false);

        if (data.profiles && data.profiles.length > 0 && !selected360OperatorId) {
          setSelected360OperatorId(String(data.profiles[0].operator_id));
        }
      }
    } catch (err) {
      console.error('Comprehensive profiles fetch error:', err);
    } finally {
      setComprehensiveLoading(false);
    }
  };

  // 인사/급여/프로필 명부 조회
  const fetchContractsAndPayroll = async (ym?: string) => {
    const targetYM = ym || payrollYearMonth;
    setPayrollLoading(true);
    setProfileLoading(true);
    try {
      const contractsRes = await fetch('/api/hr/contracts');
      const contractsData = await contractsRes.json();
      if (contractsData.success) {
        setContracts(contractsData.contracts || []);
      }

      const payrollRes = await fetch(`/api/hr/contracts/calc?year_month=${targetYM}`);
      const payrollData = await payrollRes.json();
      if (payrollData.success) {
        setPayroll(payrollData.payroll || []);
      }

      const profilesRes = await fetch('/api/hr/profiles');
      const profilesData = await profilesRes.json();
      if (profilesData.success) {
        setProfiles(profilesData.profiles || []);
      }
    } catch (err) {
      console.error('인사/급여/프로필 데이터 수신 실패:', err);
    } finally {
      setPayrollLoading(false);
      setProfileLoading(false);
    }
  };

  // 일정 분류 유형 조회
  const fetchEventTypes = async () => {
    try {
      const res = await fetch('/api/hr/events/types');
      const data = await res.json();
      if (data.success) {
        setEventTypes(data.types || []);
      }
    } catch (err) {
      console.error('일정 유형 수신 중 오류:', err);
    }
  };

  // AI 업무 공백 RAG 분석 이력 조회
  const fetchBriefingHistories = async (autoBindFirst: boolean = false) => {
    try {
      const res = await fetch('/api/hr/ai-briefing');
      const data = await res.json();
      if (data.success) {
        const histories = data.histories || [];
        setBriefingHistories(histories);
        
        if (autoBindFirst && histories.length > 0) {
          const latest = histories[0];
          const latestState = {
            riskScore: latest.risk_score,
            alertTitle: latest.alert_title,
            alertMessage: latest.alert_message,
            briefingText: latest.briefing_text
          };
          setAiBriefing(latestState);
          setLatestBriefing(latestState);
        } else if (autoBindFirst && histories.length === 0) {
          triggerAiBriefing();
        }
      }
    } catch (e) {
      console.error('AI 분석 이력 수신 실패:', e);
    }
  };

  // 전사 공용 데이터 벌크 로드
  const fetchHrData = async () => {
    setLoading(true);
    setError(null);
    let loadedUser: any = null;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/hr/attendance?work_date=${todayStr}`);
      const data = await res.json();

      if (data.success) {
        setEmployees(data.employees || []);
        setCompanyEvents(data.companyEvents || []);
        setCurrentUser(data.currentUser);
        loadedUser = data.currentUser;
      } else {
        setError(data.error || '인사 데이터를 불러오지 못했습니다.');
      }

      const leavesRes = await fetch('/api/hr/leaves');
      const leavesData = await leavesRes.json();
      if (leavesData.success) {
        setLeaveRequests(leavesData.leaves || []);
      }

      await fetchComprehensiveProfiles();
      await fetchEventTypes();
    } catch (err) {
      setError('서버 연결 불안정 또는 네트워크 장애');
    } finally {
      setLoading(false);
      const hasPrivilege = loadedUser?.role === 'SUPER_ADMIN' || loadedUser?.role === 'PRESIDENT' || isHighPrivilege;
      if (hasPrivilege) {
        fetchBriefingHistories(true);
      } else {
        setAiBriefing({
          riskScore: 0,
          alertTitle: "🔒 인사-법무 리스크 차단",
          alertMessage: "본 영역은 최고운영자(SUPER_ADMIN) 및 사장님(PRESIDENT) 전용 보안 격리 항목입니다. 일반 부운영자(SUB_OPERATOR)의 접근이 차단됩니다.",
          briefingText: "보안 가이드에 따라 상세 분석안 열람 권한이 존재하지 않습니다."
        });
      }
    }
  };

  // ==========================================
  // ⚡ 사용자 클릭 액션 및 전송 핸들러군
  // ==========================================

  // 출퇴근 1초 스탬프 처리
  const handleClockStamp = async (action: 'CLOCK_IN' | 'CLOCK_OUT') => {
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        await fetchHrData();
        alert(data.message);
      } else {
        alert(data.error || '출퇴근 스탬프 처리에 실패했습니다.');
      }
    } catch (e: any) {
      alert('스탬프 통신 실패: ' + e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 연차 승인 및 반려 의사결정
  const handleLeaveDecision = async (id: string, action: 'APPROVE' | 'REJECT', rejectReason?: string) => {
    setSubmitLoading(true);
    try {
      const body: any = { action, leave_id: id };
      if (action === 'REJECT' && rejectReason) {
        body.reject_reason = rejectReason;
      }
      
      const res = await fetch('/api/hr/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        setIsRejectModalOpen(false);
        fetchHrData();
      } else {
        alert(data.error || '결재 처리에 실패했습니다.');
      }
    } catch (e: any) {
      alert('결재 통신 실패: ' + e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 실시간 AI 재분석 가동
  const triggerAiBriefing = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/hr/ai-briefing', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const resultState = {
          riskScore: data.riskScore || 0,
          alertTitle: data.alertTitle || '정상 가동중 🟢',
          alertMessage: data.alertMessage || '업무 공백 리스크가 극히 낮습니다.',
          briefingText: data.briefingText || '안정적인 전사 인사 근태 환경이 유지되고 있습니다.'
        };
        setAiBriefing(resultState);
        setLatestBriefing(resultState);
        setSelectedHistoryId("");
        await fetchBriefingHistories(false);
      }
    } catch (e) {
      console.error('AI 분석 실패:', e);
    } finally {
      setAiLoading(false);
    }
  };

  // RAG 분석 권고안 클립보드 복사
  const handleCopyBriefing = () => {
    if (!aiBriefing.briefingText) return;
    navigator.clipboard.writeText(aiBriefing.briefingText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error("복사 실패:", err);
    });
  };

  // AI 분석 이력 선택 스위칭
  const handleSelectHistory = (historyId: string) => {
    setSelectedHistoryId(historyId);
    if (!historyId) {
      if (latestBriefing) setAiBriefing(latestBriefing);
      return;
    }
    const matched = briefingHistories.find(h => String(h.id) === String(historyId));
    if (matched) {
      setAiBriefing({
        riskScore: matched.risk_score,
        alertTitle: matched.alert_title,
        alertMessage: matched.alert_message,
        briefingText: matched.briefing_text,
        isHistory: true,
        createdAt: matched.created_at
      });
      setIsBriefingZoomed(true);
    }
  };

  // 회사 일정 유형 생성
  const handleCreateEventType = async (typeName: string, colorTheme: string) => {
    setSubmitLoading(true);
    setTypeError(null);
    try {
      const res = await fetch('/api/hr/events/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          type_name: typeName,
          color_theme: colorTheme
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchEventTypes();
      } else {
        setTypeError(data.error || '유형 추가에 실패했습니다.');
      }
    } catch (err: any) {
      setTypeError('통신 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 일정 유형 삭제
  const handleDeleteEventType = async (typeKey: string) => {
    if (!confirm('이 일정 유형을 마스터 대장에서 삭제하시겠습니까?')) return;

    setSubmitLoading(true);
    setTypeError(null);
    try {
      const res = await fetch('/api/hr/events/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE',
          type_key: typeKey
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchEventTypes();
      } else {
        setTypeError(data.error);
      }
    } catch (err: any) {
      setTypeError('통신 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 회사 공유 일정 삭제
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('이 일정을 회사 공유 캘린더에서 정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch('/api/hr/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', event_id: id })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchHrData();
      } else {
        alert(data.error || '일정 삭제 실패');
      }
    } catch (e: any) {
      alert('삭제 통신 실패: ' + e.message);
    }
  };

  // 특정 직원 계약 불러오기
  const handleSelectEmployeeContract = (operatorId: string) => {
    setSelectedContractOperatorId(operatorId);
    const matched = contracts.find(c => String(c.operator_id) === String(operatorId));
    if (matched) {
      setHourlyWage(matched.hourly_wage || 10000);
      setWeeklyHours(matched.weekly_hours || 40);
      setAllowHolidayPay(matched.allow_weekly_holiday_paid !== undefined ? matched.allow_weekly_holiday_paid : 1);
      setWorkDays(matched.work_days || "월,화,수,목,금");
      setContractMemo(matched.contract_memo || "");
    } else {
      setHourlyWage(10000);
      setWeeklyHours(40);
      setAllowHolidayPay(1);
      setWorkDays("월,화,수,목,금");
      setContractMemo("");
    }
  };

  // 특정 직원 기본 프로필 불러오기
  const handleSelectEmployeeProfile = (operatorId: string) => {
    setSelectedProfileOperatorId(operatorId);
    const matched = profiles.find(p => String(p.operator_id) === String(operatorId));
    if (matched) {
      setProfileDept(matched.department || "미정");
      setProfileHireDate(matched.hire_date || new Date().toISOString().split('T')[0]);
      setProfileCommute(matched.commute_area || "인근 통근");
      setProfileSkills(matched.skills || "일반 서무");
      setProfileBackup(matched.backup_operator_id || "none");
    } else {
      setProfileDept("미정");
      setProfileHireDate(new Date().toISOString().split('T')[0]);
      setProfileCommute("인근 통근");
      setProfileSkills("일반 서무");
      setProfileBackup("none");
    }
  };

  // 근로계약 변경 저장 (Upsert)
  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractOperatorId) {
      alert('근무 조건을 변경할 직원을 선택해주세요.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/hr/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: selectedContractOperatorId,
          hourly_wage: hourlyWage,
          weekly_hours: weeklyHours,
          allow_weekly_holiday_paid: allowHolidayPay,
          work_days: workDays,
          contract_memo: contractMemo
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchContractsAndPayroll();
      } else {
        alert(data.error || '근로계약 갱신에 실패했습니다.');
      }
    } catch (err: any) {
      alert('통신 오류: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 인적사항 저장 (Upsert)
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileOperatorId) {
      alert('인적사항을 변경할 직원을 선택해주세요.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/hr/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: selectedProfileOperatorId,
          department: profileDept,
          hire_date: profileHireDate,
          commute_area: profileCommute,
          skills: profileSkills,
          backup_operator_id: profileBackup
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchContractsAndPayroll();
      } else {
        alert(data.error || '인적사항 갱신에 실패했습니다.');
      }
    } catch (err: any) {
      alert('통신 오류: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 360도 이력 저장 (Upsert)
  const handleSubmit360Upsert = async (tableName: string, operatorId: string, data: Record<string, any>) => {
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/hr/profiles/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPSERT',
          tableName,
          operator_id: operatorId,
          data
        })
      });
      const resData = await res.json();
      if (resData.success) {
        alert(resData.message);
        await fetchComprehensiveProfiles();
        triggerAiBriefing();
      } else {
        alert(resData.error || '이력 갱신에 실패했습니다.');
      }
    } catch (err: any) {
      alert('이력 통신 에러: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 360도 이력 삭제
  const handleDelete360Record = async (tableName: string, recordId: string) => {
    if (!confirm('선택하신 임직원 이력 레코드를 인사 명부에서 영구 삭제하시겠습니까?')) return;

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/hr/profiles/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE',
          tableName,
          operator_id: selected360OperatorId,
          deleteId: recordId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchComprehensiveProfiles();
        triggerAiBriefing();
      } else {
        alert(data.error || '이력 삭제에 실패했습니다.');
      }
    } catch (err: any) {
      alert('이력 삭제 에러: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 근로계약 변경 여부 감지
  const getIsContractModified = () => {
    if (!selectedContractOperatorId) return false;
    const original = contracts.find(c => String(c.operator_id) === String(selectedContractOperatorId));
    if (!original) {
      return hourlyWage !== 10000 || weeklyHours !== 40 || allowHolidayPay !== 1 || workDays !== "월,화,수,목,금" || contractMemo !== "";
    }
    return (
      original.hourly_wage !== hourlyWage ||
      original.weekly_hours !== weeklyHours ||
      original.allow_weekly_holiday_paid !== allowHolidayPay ||
      (original.work_days || "") !== workDays ||
      (original.contract_memo || "") !== contractMemo
    );
  };

  // 임직원 상세 프로필 변경 여부 감지
  const getIsProfileModified = () => {
    if (!selectedProfileOperatorId) return false;
    const original = profiles.find(p => String(p.operator_id) === String(selectedProfileOperatorId));
    if (!original) {
      return profileDept !== "미정" || profileHireDate !== new Date().toISOString().split('T')[0] || profileCommute !== "인근 통근" || profileSkills !== "일반 서무" || profileBackup !== "none";
    }
    return (
      (original.department || "미정") !== profileDept ||
      (original.hire_date || "") !== profileHireDate ||
      (original.commute_area || "인근 통근") !== profileCommute ||
      (original.skills || "일반 서무") !== profileSkills ||
      (original.backup_operator_id || "none") !== profileBackup
    );
  };

  // ==========================================
  // 🎨 컴포넌트 렌더링 영역
  // ==========================================

  if (loading && employees.length === 0) {
    return (
      <div className="py-20 text-center animate-pulse text-xs text-slate-400 font-bold">
        전사 인사 근태 데이터를 수립하고 있습니다... ⏳
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-xs text-rose-500 font-bold bg-rose-50 rounded-2xl border border-rose-100 p-6 max-w-sm mx-auto">
        ⚠️ {error}
      </div>
    );
  }

  // 오늘 통계 계산
  const totalEmployees = employees.length;
  const currentWorkingCount = employees.filter(e => e.clock_in && !e.clock_out).length;
  const lateCount = employees.filter(e => e.status === 'LATE').length;
  const leaveCount = employees.filter(e => e.status === 'LEAVE').length;
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'PENDING').length;

  const currentEmpRecord = employees.find(e => String(e.id) === String(currentUser?.id));

  return (
    <div className="space-y-8 animate-fade-in relative pb-16 text-slate-800">
      {/* 럭셔리 네온 아우라 백그라운드 */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -z-10"></div>

      {/* 1. 상단 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-200 relative z-10 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <Calendar className="w-8 h-8 text-indigo-650 mr-3" />
            근태 관리 AI
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            실시간 1초 출퇴근 타임스탬프와 주간/월간 전사 공유 캘린더, 그리고 Gemini AI 자율 인사 평가 및 마감 연계형 실시간 AI 전사 업무 분석 예보를 정밀 관제합니다.
          </p>
        </div>
      </div>

      {/* 2. 나의 오늘 출퇴근 간편 스탬프 카드 */}
      <MyCommuteStamp
        currentEmpRecord={currentEmpRecord}
        submitLoading={submitLoading}
        handleClockStamp={handleClockStamp}
        onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
      />

      {/* 3. 대시보드 5대 통계 스코어카드 */}
      <AttendanceStats
        totalEmployees={totalEmployees}
        currentWorkingCount={currentWorkingCount}
        lateCount={lateCount}
        leaveCount={leaveCount}
        pendingLeavesCount={pendingLeavesCount}
      />

      {/* 4. 메인 관제 보드 (캘린더 + AI 예보) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* 캘린더 영역 */}
        <CompanyCalendar
          currentCalendarDate={currentCalendarDate}
          calendarView={calendarView}
          setCalendarView={setCalendarView}
          handlePrevMonth={() => {
            if (calendarView === 'month') {
              setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
            } else {
              const prevWeek = new Date(currentCalendarDate);
              prevWeek.setDate(currentCalendarDate.getDate() - 7);
              setCurrentCalendarDate(prevWeek);
            }
          }}
          handleNextMonth={() => {
            if (calendarView === 'month') {
              setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
            } else {
              const nextWeek = new Date(currentCalendarDate);
              nextWeek.setDate(currentCalendarDate.getDate() + 7);
              setCurrentCalendarDate(nextWeek);
            }
          }}
          setIsEventModalOpen={setIsEventModalOpen}
          leaveRequests={leaveRequests}
          companyEvents={companyEvents}
          eventTypes={eventTypes}
          currentUser={currentUser}
          handleDeleteEvent={handleDeleteEvent}
        />

        {/* AI 예보 & 결재함 영역 */}
        <div className="space-y-6 xl:col-span-1 block">
          <AiBriefingMonitor
            aiBriefing={aiBriefing}
            aiLoading={aiLoading}
            isHighPrivilege={isHighPrivilege}
            currentUser={currentUser}
            briefingHistories={briefingHistories}
            selectedHistoryId={selectedHistoryId}
            handleSelectHistory={handleSelectHistory}
            triggerAiBriefing={triggerAiBriefing}
            handleCopyBriefing={handleCopyBriefing}
            copied={copied}
            setIsBriefingZoomed={setIsBriefingZoomed}
          />

          <LeaveApprovalBox
            leaveRequests={leaveRequests}
            pendingLeavesCount={pendingLeavesCount}
            currentUser={currentUser}
            handleLeaveDecision={handleLeaveDecision}
            setSelectedLeaveId={setSelectedLeaveId}
            setIsRejectModalOpen={setIsRejectModalOpen}
          />

          {/* 직원용 잔여 연차 안내 카드 */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm block">
            <div className="flex justify-between items-center bg-indigo-50/40 border border-indigo-105 p-4 rounded-2xl">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-indigo-750 uppercase tracking-wider block">나의 잔여 연차</span>
                <p className="text-[9px] text-slate-400 font-bold">올해 사용 가능한 유급 연차 잔액입니다.</p>
              </div>
              <span className="text-xl font-black text-indigo-700 font-mono flex items-baseline gap-0.5">
                {employees.find(e => e.id === currentUser?.id)?.remaining_leaves ?? 15} <span className="text-xs font-bold text-slate-400">일</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. 근로계약 & 실시간 급여 정산 관제 (관리자 전용) */}
      <PayrollContractCenter
        currentUser={currentUser}
        payrollYearMonth={payrollYearMonth}
        setPayrollYearMonth={setPayrollYearMonth}
        employees={employees}
        contracts={contracts}
        payroll={payroll}
        selectedContractOperatorId={selectedContractOperatorId}
        handleSelectEmployeeContract={handleSelectEmployeeContract}
        hourlyWage={hourlyWage}
        setHourlyWage={setHourlyWage}
        weeklyHours={weeklyHours}
        setWeeklyHours={setWeeklyHours}
        allowHolidayPay={allowHolidayPay}
        setAllowHolidayPay={setAllowHolidayPay}
        workDays={workDays}
        setWorkDays={setWorkDays}
        contractMemo={contractMemo}
        setContractMemo={setContractMemo}
        handleSubmitContract={handleSubmitContract}
        getIsContractModified={getIsContractModified}
        submitLoading={submitLoading}
        payrollLoading={payrollLoading}
      />

      {/* 6. 임직원 상세 인적사항 명부 대장 (관리자 전용) */}
      <BasicProfileEditor
        currentUser={currentUser}
        employees={employees}
        profiles={profiles}
        selectedProfileOperatorId={selectedProfileOperatorId}
        handleSelectEmployeeProfile={handleSelectEmployeeProfile}
        profileDept={profileDept}
        setProfileDept={setProfileDept}
        profileHireDate={profileHireDate}
        setProfileHireDate={setProfileHireDate}
        profileCommute={profileCommute}
        setProfileCommute={setProfileCommute}
        profileSkills={profileSkills}
        setProfileSkills={setProfileSkills}
        profileBackup={profileBackup}
        setProfileBackup={setProfileBackup}
        handleSubmitProfile={handleSubmitProfile}
        getIsProfileModified={getIsProfileModified}
        submitLoading={submitLoading}
        profileLoading={profileLoading}
      />

      {/* 7. 임직원 360도 Dynamic 프로필 관제 보드 (관리자 전용) */}
      <ComprehensiveProfile360
        currentUser={currentUser}
        employees={employees}
        comprehensiveProfiles={comprehensiveProfiles}
        selected360OperatorId={selected360OperatorId}
        handleSelect360Employee={setSelected360OperatorId}
        handleDelete360Record={handleDelete360Record}
        handleSubmit360Upsert={handleSubmit360Upsert}
        submitLoading={submitLoading}
        comprehensiveLoading={comprehensiveLoading}
      />

      {/* ==========================================
          🏛️ 팝업 모달 목록 마운트
          ========================================== */}
      
      {/* 모달 1: 휴가 신청서 작성 모달 */}
      <LeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        currentUser={currentUser}
        employees={employees}
        onSuccess={fetchHrData}
      />

      {/* 모달 2: 일정 등록 폼 모달 */}
      <CalendarEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        currentUser={currentUser}
        eventTypes={eventTypes}
        onSuccess={fetchHrData}
        onOpenTypeManager={() => setIsTypeManagerOpen(true)}
      />

      {/* 모달 3: 연차 결재 반려 사유 모달 */}
      <LeaveRejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        selectedLeaveId={selectedLeaveId}
        handleLeaveDecision={handleLeaveDecision}
        submitLoading={submitLoading}
      />

      {/* 모달 4: 일정 유형 동적 마스터 관리 모달 */}
      <EventTypeMasterModal
        isOpen={isTypeManagerOpen}
        onClose={() => setIsTypeManagerOpen(false)}
        eventTypes={eventTypes}
        handleCreateEventType={handleCreateEventType}
        handleDeleteEventType={handleDeleteEventType}
        submitLoading={submitLoading}
        typeError={typeError}
        setTypeError={setTypeError}
      />

      {/* 모달 5: AI 예보 상세 확대 돋보기 모달 */}
      <BriefingZoomModal
        isOpen={isBriefingZoomed}
        onClose={() => setIsBriefingZoomed(false)}
        aiBriefing={aiBriefing}
        briefingHistories={briefingHistories}
        isHighPrivilege={isHighPrivilege}
        currentUser={currentUser}
        handleCopyBriefing={handleCopyBriefing}
        copied={copied}
      />
    </div>
  );
}
