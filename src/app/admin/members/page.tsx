"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePersistedState } from "@/hooks/usePersistedState";
import { 
  ShieldCheck, Users, Search, Plus, Edit, Trash2, Key, 
  RefreshCw, AlertTriangle, UserCheck, UserPlus, Phone, 
  ShieldAlert, Calendar, LayoutGrid, X
} from "lucide-react";

interface Member {
  id: number;
  username: string;
  name: string;
  role: string;
  employee_number: string | null;
  phone: string | null;
  tenant_id: string | null;
  created_at: string | null;
  deleted_at: string | null;
}

export default function MemberManagementPage() {
  const router = useRouter();

  // 1. 회원 권한 및 로그인 세션 가드 상태
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 2. usePersistedState를 활용한 상태 보존
  const [activeTab, setActiveTab, isActiveTabRestored] = usePersistedState<"all" | "owners" | "staff">("egdesk_admin_members_activeTab", "all");
  const [selectedTenantFilter, setSelectedTenantFilter, isTenantFilterRestored] = usePersistedState<string>("egdesk_admin_members_selectedTenant", "ALL");
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState<string>("egdesk_admin_members_searchQuery", "");
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState<number>("egdesk_admin_members_currentPage", 1);
  
  const isStateRestored = isActiveTabRestored && isTenantFilterRestored && isSearchQueryRestored && isCurrentPageRestored;

  // 3. 컴포넌트 내부 로컬 상태
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // 4. 입력 폼 상태
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"SUPER_ADMIN" | "SUB_OPERATOR" | "EMPLOYEE">("SUPER_ADMIN");
  const [formEmployeeNumber, setFormEmployeeNumber] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTenantId, setFormTenantId] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 최고관리자 권한 확인 검사
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await apiFetch("/api/auth/me");
        const json = await res.json();
        const role = String(json.role || '').toUpperCase();
        const username = String(json.username || '').toLowerCase();
        const isAllowed = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'TENANT_ADMIN', 'PRESIDENT', 'GUEST', 'ADMIN'].includes(role) || username === 'admin' || username === 'guest';

        if (json.success && isAllowed) {
          setCurrentUser(json);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        setIsAuthorized(false);
      } finally {
        setIsAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  // 미승인 유저 리다이렉트 처리
  useEffect(() => {
    if (!isAuthLoading && !isAuthorized) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading, isAuthorized, router]);

  // 회원 목록 동적 조회 호출 함수
  const fetchMembers = async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/operators");
      const json = await res.json();
      if (json.success) {
        setMembers(json.operators || []);
      } else {
        setError(json.error || "회원 목록을 가져오지 못했습니다.");
      }
    } catch (err: any) {
      setError(err.message || "서버 통신 중 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 권한 인증 및 브라우저 상태 복원 완료 시 데이터 패칭 진행
  useEffect(() => {
    if (isAuthorized && isStateRestored) {
      fetchMembers();
    }
  }, [isAuthorized, isStateRestored]);

  // 탭 변경 시 페이지 번호 1로 초기화 (세션 복원 후 정상 작동되도록 가드)
  useEffect(() => {
    if (isStateRestored) {
      setCurrentPage(1);
    }
  }, [activeTab, searchQuery, isStateRestored]);

  // 테넌트 ID 랜덤 생성 헬퍼
  const handleGenerateTenantId = () => {
    const randomStr = "tenant-" + Math.random().toString(36).substring(2, 10);
    setFormTenantId(randomStr);
  };

  // 신규 회원 등록 처리
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!formUsername || !formPassword || !formName || !formEmployeeNumber) {
      setFormError("아이디, 비밀번호, 이름, 사원번호는 필수 항목입니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername,
          password: formPassword,
          name: formName,
          newRole: formRole,
          employee_number: formEmployeeNumber,
          phone: formPhone,
          tenant_id: formRole === "SUPER_ADMIN" ? (formTenantId || "tenant-" + Date.now()) : formTenantId
        })
      });

      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        // 입력 폼 초기화
        setFormUsername("");
        setFormPassword("");
        setFormName("");
        setFormRole("SUPER_ADMIN");
        setFormEmployeeNumber("");
        setFormPhone("");
        setFormTenantId("");
        fetchMembers();
      } else {
        setFormError(json.error || "등록에 실패했습니다.");
      }
    } catch (err: any) {
      setFormError(err.message || "서버 통신 에러");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 회원 정보 수정 처리
  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setFormError("");

    if (!formName || !formEmployeeNumber) {
      setFormError("이름과 사원번호는 필수 항목입니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/operators", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedMember.id,
          password: formPassword, // 입력된 비밀번호가 있을 때만 변경 처리
          name: formName,
          newRole: formRole,
          employee_number: formEmployeeNumber,
          phone: formPhone,
          tenant_id: formTenantId
        })
      });

      const json = await res.json();
      if (json.success) {
        setShowEditModal(false);
        setFormPassword("");
        setSelectedMember(null);
        fetchMembers();
      } else {
        setFormError(json.error || "수정에 실패했습니다.");
      }
    } catch (err: any) {
      setFormError(err.message || "서버 통신 에러");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 회원 삭제(소프트 삭제) 처리
  const handleDeleteMember = async (id: number, username: string) => {
    if (username === "admin") {
      alert("플랫폼 최고관리자 계정은 정지/삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm(`[경고] 계정 "${username}"을 즉각 비활성화(정지) 처리하시겠습니까?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/operators?id=${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        fetchMembers();
      } else {
        alert("처리에 실패했습니다: " + json.error);
      }
    } catch (err: any) {
      alert("통신 오류: " + err.message);
    }
  };

  // 수정 모달 팝업 가동
  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setFormName(member.name);
    setFormRole(member.role as any);
    setFormEmployeeNumber(member.employee_number || "");
    setFormPhone(member.phone || "");
    setFormTenantId(member.tenant_id || "");
    setFormPassword("");
    setFormError("");
    setShowEditModal(true);
  };

  // 로딩 상태 렌더링
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">인증 자격을 검증하는 중입니다...</p>
        </div>
      </div>
    );
  }

  // 비승인 사용자 접근 차단 배너 렌더링
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full shadow-lg text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">접근 제한 안내</h2>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            이 페이지는 플랫폼 최고관리자(`admin`) 전용 보호 구역입니다.<br />
            일반 사장님(회원) 및 직원은 접근할 수 없습니다.
          </p>
          <p className="text-[10px] text-red-400 mt-6 font-semibold animate-pulse">
            3초 후 메인 대시보드로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  // 💡 테넌트 최고관리자 판별 헬퍼
  const isTenantOwner = (m: Member) => {
    const r = String(m.role || "").toUpperCase();
    const u = String(m.username || "").toLowerCase();
    return ["SUPER_ADMIN", "TENANT_ADMIN", "PRESIDENT", "GUEST"].includes(r) || u === "guest";
  };

  // 💡 등록된 테넌트 목록 추출 (테넌트 ID + 대표 사장님 성명)
  const tenantList = Array.from(
    new Set(members.map((m) => m.tenant_id).filter((t): t is string => Boolean(t && t.trim() !== "")))
  ).map((tId) => {
    const owner = members.find((m) => m.tenant_id === tId && isTenantOwner(m));
    return {
      tenant_id: tId,
      owner_name: owner ? owner.name : "미지정 대표",
      owner_username: owner ? owner.username : ""
    };
  });

  // 데이터 필터링 및 검색 로직
  const filteredMembers = members.filter((member) => {
    // 1. 탭 필터링
    if (activeTab === "owners") {
      // 테넌트 최고관리자 탭: 최고관리자 계정만 표출
      if (!isTenantOwner(member)) return false;
    } else if (activeTab === "staff") {
      // 부운영자/일반직원 탭: 부운영자 및 일반직원 계정만 표출
      if (isTenantOwner(member)) return false;

      // 💡 테넌트 선택 필터링 적용
      if (selectedTenantFilter !== "ALL") {
        if (member.tenant_id !== selectedTenantFilter) return false;
      }
    }

    // 2. 검색어 필터링
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const nameMatch = (member.name || "").toLowerCase().includes(q);
      const userMatch = (member.username || "").toLowerCase().includes(q);
      const tenantMatch = (member.tenant_id || "").toLowerCase().includes(q);
      const empMatch = (member.employee_number || "").toLowerCase().includes(q);
      return nameMatch || userMatch || tenantMatch || empMatch;
    }

    return true;
  });

  // 카운트 계산
  const ownerCount = members.filter((m) => isTenantOwner(m)).length;
  const staffCount = members.filter((m) => !isTenantOwner(m)).length;

  // 페이지네이션 변수
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const currentItems = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full bg-slate-50 min-h-screen px-4 md:px-8 py-8 text-left font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 상단 타이틀 영역 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-9 h-9 text-indigo-600 shrink-0" />
              <span>회원 관리 대장</span>
            </h1>
            <p className="text-slate-500 mt-2 text-xs font-semibold pl-1">
              플랫폼 가입 사장님(회원)들의 테넌트 식별자와 임직원 계정 명세를 전역적으로 모니터링하고 제어합니다.
            </p>
          </div>
          
          <button
            onClick={() => {
              setFormError("");
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>신규 사장님/직원 등록</span>
          </button>
        </div>

        {/* 에러 피드백 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* 메인 관제 보드 카드 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          
          {/* 상단 필터 및 검색 바 */}
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              {/* 탭바 */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "all"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  전체 구성원 ({members.length})
                </button>
                <button
                  onClick={() => setActiveTab("owners")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "owners"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  테넌트 최고관리자 ({ownerCount})
                </button>
                <button
                  onClick={() => setActiveTab("staff")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "staff"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  부운영자/일반직원 ({staffCount})
                </button>
              </div>

              {/* 💡 부운영자/일반직원 탭 활성화 시 테넌트 선택 드롭다운 필터 표출 */}
              {activeTab === "staff" && (
                <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/80 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700">
                  <span className="text-slate-400 shrink-0">🏢 소속 테넌트:</span>
                  <select
                    value={selectedTenantFilter}
                    onChange={(e) => {
                      setSelectedTenantFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent border-none focus:outline-none text-xs font-extrabold text-indigo-600 cursor-pointer max-w-xs truncate"
                  >
                    <option value="ALL">전체 테넌트 (전체 부운영자/일반직원)</option>
                    {tenantList.map((t) => (
                      <option key={t.tenant_id} value={t.tenant_id}>
                        {t.owner_name} 사장님 [{t.tenant_id}]
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 검색창 */}
            <div className="relative max-w-md w-full lg:w-80">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="아이디, 이름, 사원번호, 테넌트 검색..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700 placeholder-slate-400 transition-colors"
              />
            </div>

          </div>

          {/* 테이블 영역 */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                <span className="text-xs text-slate-450 font-semibold">데이터를 파싱하고 있습니다...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Users className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-semibold">등록된 정보가 없거나 검색 결과가 존재하지 않습니다.</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-bold tracking-wider uppercase">
                    <th className="p-4 pl-6 text-left">이름 / 아이디</th>
                    <th className="p-4 text-left">테넌트 식별자 (Tenant ID)</th>
                    <th className="p-4 text-left">역할 및 등급</th>
                    <th className="p-4 text-left">사원번호</th>
                    <th className="p-4 text-left">전화번호</th>
                    <th className="p-4 text-center">동작</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {currentItems.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            {member.name}
                            {member.username === "admin" && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black border border-rose-100">호스트</span>
                            )}
                            {member.role === "SUPER_ADMIN" && member.username !== "admin" && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">회원(사장)</span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{member.username}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-mono border border-slate-200">
                          {member.tenant_id || "default"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          {member.role === "SUPER_ADMIN" ? (
                            <span className="text-indigo-600 font-bold">최고관리자 (SUPER)</span>
                          ) : member.role === "SUB_OPERATOR" ? (
                            <span className="text-emerald-600">부운영자 (OPERATOR)</span>
                          ) : (
                            <span className="text-slate-500">일반 직원 (EMPLOYEE)</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {member.employee_number || "-"}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {member.phone || "-"}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                            title="정보 수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {member.username !== "admin" && (
                            <button
                              onClick={() => handleDeleteMember(member.id, member.username)}
                              className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                              title="정지/삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 페이지네이션 바 */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                이전
              </button>
              <span className="text-xs text-slate-500 font-semibold">
                {currentPage} / {totalPages} 페이지
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                다음
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 5. 회원 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-indigo-600" />
              <span>신규 회원/직원 추가 등록</span>
            </h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-750 text-[11px] font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">계정 유형</label>
                <select
                  value={formRole}
                  onChange={(e) => {
                    const selectedRole = e.target.value as any;
                    setFormRole(selectedRole);
                    if (selectedRole !== "SUPER_ADMIN") {
                      // 사장님이 아닌 경우 테넌트 ID 강제 비움
                      setFormTenantId("");
                    }
                  }}
                  className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700 bg-white"
                >
                  <option value="SUPER_ADMIN">소상공인 사장님 (회원)</option>
                  <option value="SUB_OPERATOR">매장 부운영자 (피고용 직원)</option>
                  <option value="EMPLOYEE">매장 일반직원 (피고용 직원)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">아이디</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.trim())}
                    placeholder="아이디"
                    className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">비밀번호</label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="비밀번호"
                    className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="실명 입력"
                    className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">사원번호</label>
                  <input
                    type="text"
                    required
                    value={formEmployeeNumber}
                    onChange={(e) => setFormEmployeeNumber(e.target.value.trim())}
                    placeholder="예: CEO-01"
                    className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">연락처</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value.trim())}
                  placeholder="예: 010-1234-5678"
                  className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                  <span>테넌트 ID (매장 식별키)</span>
                  {formRole === "SUPER_ADMIN" && (
                    <button
                      type="button"
                      onClick={handleGenerateTenantId}
                      className="text-indigo-600 hover:text-indigo-700 text-[9px] font-bold border-none bg-transparent cursor-pointer"
                    >
                      자동 생성
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  required={formRole !== "SUPER_ADMIN"}
                  value={formTenantId}
                  onChange={(e) => setFormTenantId(e.target.value.trim())}
                  placeholder={formRole === "SUPER_ADMIN" ? "사장님 단독 테넌트 (미입력 시 자동 할당)" : "소속될 사장님의 테넌트 ID 입력"}
                  className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
                >
                  {isSubmitting ? "등록 중..." : "등록 승인"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 회원 수정 모달 */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => {
                setShowEditModal(false);
                setSelectedMember(null);
              }}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Edit className="w-6 h-6 text-indigo-600" />
              <span>회원/직원 정보 수정</span>
            </h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-750 text-[11px] font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditMemberSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[11px] text-slate-500 font-semibold space-y-1">
                <p>계정 아이디: <span className="font-mono text-slate-800 font-bold">{selectedMember.username}</span></p>
                <p>테넌트 식별자: <span className="font-mono text-slate-800 font-bold">{selectedMember.tenant_id || "default"}</span></p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">비밀번호 변경 (미입력 시 기존 비밀번호 유지)</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="변경할 새 비밀번호 입력"
                  className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="실명 입력"
                    className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">사원번호</label>
                  <input
                    type="text"
                    required
                    value={formEmployeeNumber}
                    onChange={(e) => setFormEmployeeNumber(e.target.value.trim())}
                    placeholder="예: CEO-01"
                    className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">연락처</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value.trim())}
                  placeholder="예: 010-1234-5678"
                  className="w-full px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-2xl text-xs text-slate-700"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                  }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
                >
                  {isSubmitting ? "수정 중..." : "수정 승인"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
