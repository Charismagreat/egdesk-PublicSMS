"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Plus, Search, Edit2, Trash2, Shield, Check, X, AlertTriangle, Key, FileSpreadsheet, Globe, Clock 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";
import EmployeeBatchUploadModal from "./EmployeeBatchUploadModal";
import EmployeeGoogleSheetsUploadModal from "./EmployeeGoogleSheetsUploadModal";

export default function EmployeeManagementTabContent() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // 엑셀 일괄 등록 모달 상태
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  // 🌐 구글 시트 연동 모달 상태
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  
  // 로그인한 오너(본인) 정보 저장
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 브라우저 탭 보존 상태
  const [searchQuery, setSearchQuery, isSearchRestored] = usePersistedState("employees_search", "");
  const [currentPage, setCurrentPage, isPageRestored] = usePersistedState("employees_page", 1);
  const itemsPerPage = 8;

  // 모달 제어 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  
  // 모달 폼 필드 상태
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("EMPLOYEE");
  const [formEmpNumber, setFormEmpNumber] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formWorkStartTime, setFormWorkStartTime] = useState("09:00");
  const [formWorkEndTime, setFormWorkEndTime] = useState("18:00");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 토스트 메시지 알림
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMsg("");
    }, 3000);
  };

  // 1. 현재 로그인 세션 및 사업장 목록 조회
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [formWorkplaceId, setFormWorkplaceId] = useState<string>("");

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await apiFetch("/api/auth/me");
        const json = await res.json();
        if (json.success) {
          setCurrentUser(json);
        }

        const wpRes = await apiFetch("/api/workplaces?action=list");
        const wpJson = await wpRes.json();
        if (wpJson.success) {
          setWorkplaces(wpJson.workplaces || []);
        }
      } catch (err) {
        console.error("❌ 유저 및 사업장 확인 에러:", err);
      }
    }
    loadCurrentUser();
  }, []);

  // 선택된 계정 ID 목록 상태
  const [selectedIds, setSelectedIds] = useState<any[]>([]);

  // 2. 직원 데이터 패칭 함수
  const fetchEmployees = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setSelectedIds([]); // 목록 새로고침 시 선택 상태 초기화
    try {
      const res = await apiFetch("/api/employees");
      const json = await res.json();
      if (json.success) {
        setEmployees(json.employees || []);
      } else {
        setErrorMsg(json.error || "직원 데이터를 불러오지 못했습니다.");
      }
    } catch (err: any) {
      setErrorMsg("서버와의 통신 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 복원 완료 여부 및 변경 상태에 따른 동적 페칭 가드
  const isRestored = isSearchRestored && isPageRestored;
  useEffect(() => {
    if (!isRestored) return; // 하이드레이션 및 세션 복원 이전엔 리턴 가드
    fetchEmployees();
  }, [isRestored]);

  // 4. 모달 열기 제어
  const openAddModal = () => {
    setEditingEmployee(null);
    setFormUsername("");
    setFormPassword("");
    setFormName("");
    setFormRole("EMPLOYEE");
    setFormEmpNumber("");
    setFormPhone("");
    setFormDepartment("");
    const mainWp = workplaces.find(w => w.is_main === 'Y') || workplaces[0];
    setFormWorkplaceId(mainWp ? String(mainWp.id) : "");
    setFormWorkStartTime("09:00");
    setFormWorkEndTime("18:00");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setFormUsername(emp.username);
    setFormPassword(""); // 비밀번호는 리셋 변경 시에만 입력받음
    setFormName(emp.name);
    setFormRole(emp.role);
    setFormEmpNumber(emp.employee_number || "");
    setFormPhone(emp.phone || "");
    setFormDepartment(emp.department || "");
    setFormWorkplaceId(emp.workplace_id ? String(emp.workplace_id) : "");
    setFormWorkStartTime((emp.work_start_time || "09:00:00").substring(0, 5));
    setFormWorkEndTime((emp.work_end_time || "18:00:00").substring(0, 5));
    setFormError("");
    setIsModalOpen(true);
  };

  // 5. 직원 등록 및 수정 핸들러
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const isEdit = !!editingEmployee;
    const url = "/api/employees";
    const method = isEdit ? "PUT" : "POST";
    
    const payload: any = {
      name: formName.trim(),
      newRole: formRole,
      employee_number: formEmpNumber.trim(),
      phone: formPhone.trim(),
      department: formDepartment.trim(),
      workplace_id: formWorkplaceId ? parseInt(formWorkplaceId) : null,
      work_start_time: formWorkStartTime ? `${formWorkStartTime}:00` : "09:00:00",
      work_end_time: formWorkEndTime ? `${formWorkEndTime}:00` : "18:00:00",
    };

    if (isEdit) {
      payload.id = editingEmployee.id;
      if (formPassword.trim()) {
        payload.password = formPassword;
      }
    } else {
      payload.username = formUsername.trim();
      payload.password = formPassword;
    }

    try {
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      
      if (json.success) {
        showToast(
          isEdit ? "✓ 직원 정보가 성공적으로 수정되었습니다." : "✓ 신규 직원이 안전하게 등록되었습니다.",
          "success"
        );
        setIsModalOpen(false);
        fetchEmployees();
      } else {
        setFormError(json.error || "작업 도중 오류가 발생했습니다.");
      }
    } catch (err) {
      setFormError("서버와의 요청 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. 직원 단일 소프트 삭제 (퇴사 처리)
  const handleDeleteEmployee = async (emp: any) => {
    if (emp.username === "admin") {
      showToast("기본 어드민 계정은 삭제할 수 없습니다.", "error");
      return;
    }
    
    if (currentUser && emp.username === currentUser.username) {
      showToast("자기 자신(오너) 계정은 리스트에서 삭제할 수 없습니다.", "error");
      return;
    }

    const confirmDel = window.confirm(
      `정말로 [${emp.name}] 직원을 퇴사 처리(삭제)하시겠습니까?\n해당 사용자는 즉시 로그인이 차단되며 명부에서 숨김 처리됩니다.`
    );
    if (!confirmDel) return;

    try {
      const res = await apiFetch(`/api/employees?id=${emp.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✓ [${emp.name}] 직원의 퇴사(소프트 삭제) 처리가 완료되었습니다.`, "success");
        fetchEmployees();
      } else {
        showToast(json.error || "퇴사 처리에 실패했습니다.", "error");
      }
    } catch (err) {
      showToast("서버 오류로 인해 퇴사 처리를 완료하지 못했습니다.", "error");
    }
  };

  // 7. 검색 필터 및 페이지네이션 연산
  const filteredEmployees = employees.filter((emp) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.username.toLowerCase().includes(term) ||
      (emp.employee_number || "").toLowerCase().includes(term) ||
      (emp.phone || "").includes(term) ||
      (emp.department || "").toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const displayedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 삭제 가능한 (어드민 / 오너본인 제외) 현재 화면의 직원들
  const deletableDisplayedEmployees = displayedEmployees.filter(
    emp => emp.username !== 'admin' && !(currentUser && emp.username === currentUser.username)
  );

  // 체크박스 선택/해제 로직
  const handleToggleSelectAll = () => {
    const deletableIds = deletableDisplayedEmployees.map(e => e.id);
    const isAllSelected = deletableIds.every(id => selectedIds.includes(id));

    if (isAllSelected) {
      // 현재 페이지의 삭제 가능 항목 선택 해제
      setSelectedIds(prev => prev.filter(id => !deletableIds.includes(id)));
    } else {
      // 현재 페이지의 삭제 가능 항목 전체 선택
      const newSelected = Array.from(new Set([...selectedIds, ...deletableIds]));
      setSelectedIds(newSelected);
    }
  };

  const handleToggleSelect = (id: any) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 8. 복수 직원 선택 일괄 삭제 (퇴사 처리)
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmDel = window.confirm(
      `선택한 총 ${selectedIds.length}명의 직원 계정을 정말로 퇴사(일괄 삭제) 처리하시겠습니까?\n해당 사용자들은 즉시 로그인이 차단되며 명부에서 숨김 처리됩니다.`
    );
    if (!confirmDel) return;

    try {
      const res = await apiFetch(`/api/employees?ids=${selectedIds.join(",")}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✓ 선택한 ${json.count || selectedIds.length}명의 직원이 성공적으로 일괄 퇴사 처리되었습니다.`, "success");
        setSelectedIds([]);
        fetchEmployees();
      } else {
        showToast(json.error || "일괄 퇴사 처리에 실패했습니다.", "error");
      }
    } catch (err) {
      showToast("서버 통신 오류로 일괄 퇴사 처리를 완료하지 못했습니다.", "error");
    }
  };

  const isAllDisplayedSelected = 
    deletableDisplayedEmployees.length > 0 &&
    deletableDisplayedEmployees.every(e => selectedIds.includes(e.id));

  return (
    <div className="w-full text-slate-800 relative space-y-6">
      
      {/* 🔔 실시간 플로팅 토스트 컴포넌트 */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-55 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg border text-sm font-bold animate-bounce ${
          toastType === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-250/70" 
            : "bg-rose-50 text-rose-800 border-rose-250/70"
        }`}>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 📂 메인 직원 명부 카드 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        
        {/* 상단 타이틀 및 신규 등록 버튼 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6 text-left">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>🏢 임직원 계정 관리</span>
              </h3>
              {currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.username === 'admin' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                  🔑 시스템 운영자 관제 모드
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-black">
                  👑 테넌트 최고관리자 전용 모드
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-1">
              테넌트 최고관리자로서 본인 회원사에 소속된 임직원 계정을 직접 등록하고 근무 권한을 제어합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
              title="엑셀 또는 CSV 표준 작성 양식을 업로드하여 다수의 직원 계정을 일괄 등록합니다."
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>📊 엑셀 일괄 등록</span>
            </button>
            <button
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/90 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
              title="구글 스프레드시트의 직원 표준 양식을 실시간 연동하여 일괄 등록합니다."
            >
              <Globe className="w-4 h-4 text-teal-600" />
              <span>🌐 구글 시트 연동</span>
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black border-none cursor-pointer shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              신규 직원 등록
            </button>
          </div>
        </div>

        {/* 🔍 검색 바 및 검색 정보 요약 + 일괄 삭제 컨트롤 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="이름, 아이디, 사원번호 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 border-none bg-transparent hover:text-slate-655 cursor-pointer text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 복수 선택 일괄 삭제 버튼 */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>선택된 {selectedIds.length}명 일괄 삭제</span>
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 text-left">
            {selectedIds.length > 0 && (
              <span className="text-rose-600 font-extrabold mr-3">선택됨: {selectedIds.length}명</span>
            )}
            검색된 인원: <span className="text-indigo-600 font-bold">{filteredEmployees.length}</span>명 / 매장 총 인원: <span className="text-slate-700 font-bold">{employees.length}</span>명
          </div>
        </div>

        {/* 리스트 테이블 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50/30 border border-slate-100 rounded-2xl">
            <div className="w-7 h-7 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-[11px] font-bold mt-2.5">직원 명부를 불러오고 있습니다...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-16 bg-rose-50/20 border border-rose-100 rounded-2xl text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-rose-700 font-black text-xs">{errorMsg}</p>
            <button
              onClick={fetchEmployees}
              className="mt-3 px-3.5 py-1.5 border border-slate-200 bg-white rounded-xl text-[11px] font-bold hover:bg-slate-50 cursor-pointer transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : displayedEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 border border-slate-100 rounded-2xl text-center">
            <Users className="w-12 h-12 text-slate-350 mb-2.5" />
            <p className="text-slate-500 font-black text-xs">등록된 직원 계정이 없거나 검색 결과가 없습니다.</p>
            <p className="text-slate-400 text-[10px] mt-0.5">상단의 [신규 직원 등록] 단추를 통해 매장 직원을 등록해 보세요.</p>
          </div>
        ) : (
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-600 font-black">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllDisplayedSelected}
                        onChange={handleToggleSelectAll}
                        disabled={deletableDisplayedEmployees.length === 0}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        title="현재 페이지의 모든 대상 선택/해제"
                      />
                    </th>
                    <th className="py-3.5 px-4 w-28">사원번호</th>
                    <th className="py-3.5 px-4">성명</th>
                    <th className="py-3.5 px-4">아이디</th>
                    <th className="py-3.5 px-4 w-32">권한 등급</th>
                    <th className="py-3.5 px-4 w-32">부서</th>
                    <th className="py-3.5 px-4">전화번호</th>
                    <th className="py-3.5 px-4 w-36">출퇴근 기준시각</th>
                    <th className="py-3.5 px-4 w-40">등록일</th>
                    <th className="py-3.5 px-4 text-right w-28">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {displayedEmployees.map((emp) => {
                    const isMe = currentUser && emp.username === currentUser.username;
                    const isSystemAdmin = emp.username === "admin";
                    const isDeletable = !isMe && !isSystemAdmin;
                    const isChecked = selectedIds.includes(emp.id);

                    return (
                      <tr 
                        key={emp.id} 
                        className={`transition-colors ${isChecked ? "bg-indigo-50/40" : "hover:bg-slate-50/40"}`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(emp.id)}
                            disabled={!isDeletable}
                            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            title={isMe ? "자기 자신은 선택할 수 없습니다." : isSystemAdmin ? "어드민은 선택할 수 없습니다." : "선택"}
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-semibold">
                          {emp.employee_number || "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{emp.name}</span>
                            {isMe && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-extrabold rounded-full border border-blue-100">
                                오너 본인
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600">{emp.username}</td>
                        <td className="py-3.5 px-4">
                          {emp.role === "SUPER_ADMIN" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-orange-700 text-[10px] font-black rounded-lg border border-orange-200/50">
                              <Shield className="w-2.5 h-2.5 text-orange-500" />
                              최고관리자
                            </span>
                          ) : emp.role === "SUB_OPERATOR" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-100">
                              부운영자
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg border border-slate-200">
                              일반 직원
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.department || "-"}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">{emp.phone || "-"}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50/80 text-indigo-700 font-mono text-[11px] font-bold rounded-lg border border-indigo-100">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {emp.work_start_time || "09:00"} ~ {emp.work_end_time || "18:00"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[10px] font-semibold">
                          {emp.created_at ? new Date(emp.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-550 hover:text-slate-800 border-none bg-transparent cursor-pointer transition-colors"
                              title="정보 수정"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteEmployee(emp)}
                              disabled={!isDeletable}
                              className={`p-1.5 rounded-xl border-none bg-transparent transition-colors ${
                                !isDeletable
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                              }`}
                              title={isMe ? "자기 자신은 퇴사 처리할 수 없습니다." : "퇴사 처리"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이징 */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-1 bg-slate-50/50">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                      currentPage === p
                        ? "bg-indigo-650 text-white border-indigo-655 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📁 직원 등록/수정 전용 카드 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up text-left">
            
            {/* 모달 헤더 */}
            <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-black text-slate-800">
                  {editingEmployee ? "직원 정보 수정" : "신규 직원 등록"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/50 rounded-full border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 바디 폼 */}
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              
              {/* 에러 메시지 */}
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200/70 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. 아이디 입력 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">로그인 아이디 (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="예: gildong123"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  disabled={!!editingEmployee}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 2. 비밀번호 입력 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-600">비밀번호 (Password)</label>
                  {editingEmployee && (
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                      <Key className="w-3 h-3" />
                      입력 시에만 비밀번호 변경 적용
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required={!editingEmployee}
                  placeholder={editingEmployee ? "변경할 경우에만 새로 입력하세요" : "로그인 비밀번호 입력"}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 3. 사원번호 입력 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">사원번호</label>
                <input
                  type="text"
                  required
                  placeholder="예: EMP-003"
                  value={formEmpNumber}
                  onChange={(e) => setFormEmpNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 4. 성명 입력 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">성명 (이름)</label>
                <input
                  type="text"
                  required
                  placeholder="실명 입력"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 부서명 입력 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">부서명</label>
                <input
                  type="text"
                  placeholder="예: 영업부, 개발팀 등"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 소속 사업장 / 현장 선택 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">소속 사업장 / 현장</label>
                <select
                  value={formWorkplaceId}
                  onChange={(e) => setFormWorkplaceId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors font-bold text-slate-700"
                >
                  <option value="">-- 소속 사업장 미지정 (기본 본사) --</option>
                  {workplaces.map((wp) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.name} {wp.is_main === 'Y' ? '(본사)' : ''} - {wp.address || '주소 미입력'}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. 전화번호 입력 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">휴대폰 번호</label>
                <input
                  type="tel"
                  placeholder="예: 010-1234-5678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 6. 권한 등급 선택 */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 mb-1.5">권한 등급</label>
                
                {editingEmployee && editingEmployee.role === "SUPER_ADMIN" ? (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200/50 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>최고관리자 (오너) 권한은 강등할 수 없습니다.</span>
                  </div>
                ) : (
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white cursor-pointer transition-colors"
                  >
                    <option value="EMPLOYEE">일반 직원 (기본)</option>
                    <option value="SUB_OPERATOR">부운영자</option>
                  </select>
                )}
              </div>

              {/* 7. 출퇴근 기준 시간 설정 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 mb-1.5">출근 기준 시각</label>
                  <input
                    type="time"
                    required
                    value={formWorkStartTime}
                    onChange={(e) => setFormWorkStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 mb-1.5">퇴근 기준 시각</label>
                  <input
                    type="time"
                    required
                    value={formWorkEndTime}
                    onChange={(e) => setFormWorkEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* 모달 하단 버튼 */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                  {isSubmitting ? "저장 중..." : "저장 완료"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 직원 계정 엑셀 일괄 등록 모달 */}
      <EmployeeBatchUploadModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={() => {
          showToast("🎉 직원 계정 일괄 등록이 완료되었습니다.", "success");
          fetchEmployees();
        }}
        workplaces={workplaces}
      />

      {/* 🌐 직원 계정 구글 스프레드시트 연동 등록 모달 */}
      <EmployeeGoogleSheetsUploadModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        onSuccess={() => {
          showToast("🎉 구글 시트 연동을 통해 직원 계정이 일괄 등록되었습니다.", "success");
          fetchEmployees();
        }}
        workplaces={workplaces}
      />

    </div>
  );
}
