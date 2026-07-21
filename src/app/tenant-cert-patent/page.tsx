"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  FileCheck,
  Award,
  Calendar as CalendarIcon,
  FolderPlus,
  Upload,
  UserCheck,
  Sparkles,
  Search,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  FileText,
  Building2,
  Tag,
  ArrowUpRight,
  Filter,
  Check
} from "lucide-react";
import { usePersistedState } from "@/hooks/usePersistedState";

export default function TenantCertPatentPage() {
  // 상태 보존 훅 (usePersistedState)
  const [activeTab, setActiveTab, isRestoredTab] = usePersistedState<string>("cert_patent_active_tab", "calendar");
  const [searchQuery, setSearchQuery, isRestoredSearch] = usePersistedState<string>("cert_patent_search_query", "");
  const [selectedFolderId, setSelectedFolderId, isRestoredFolder] = usePersistedState<string>("cert_patent_selected_folder", "ALL");

  // 일반 로컬 UI 상태
  const [folders, setFolders] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [patents, setPatents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 모달 상태
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateCertModalOpen, setIsCreateCertModalOpen] = useState(false);
  const [isCreatePatentModalOpen, setIsCreatePatentModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<any>(null);
  const [assigneeName, setAssigneeName] = useState("");

  // 폼 입력 상태
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  
  const [certForm, setCertForm] = useState({
    cert_name: "",
    cert_number: "",
    issuer: "",
    issue_date: "",
    expire_date: "",
    renewal_status: "VALID"
  });

  const [patentForm, setPatentForm] = useState({
    ip_type: "PATENT",
    title: "",
    application_number: "",
    registration_number: "",
    applicant: "",
    registration_date: "",
    next_annual_fee_date: "",
    annual_fee_amount: "150000"
  });

  // 데이터 로드 API
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cert-patent");
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
        setCertificates(data.certificates || []);
        setPatents(data.patents || []);
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("Fetch Data Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 하이드레이션 복원이 마쳐진 후에 데이터 조회
    if (isRestoredTab && isRestoredSearch && isRestoredFolder) {
      fetchData();
    }
  }, [isRestoredTab, isRestoredSearch, isRestoredFolder]);

  // AI Daily Scanner 모의 트리거
  const handleTriggerAiScan = async (folderId?: number) => {
    try {
      const res = await fetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger_ai_scan",
          payload: {
            folder_id: folderId || (selectedFolderId !== "ALL" ? Number(selectedFolderId) : null),
            title: "신규 서류 스캔 - 갱신 및 연차료 검토",
            file_name: "인증_등록증_파싱_문서.pdf",
            task_type: "CERTIFICATE"
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("AI Daily Scanner가 완료되었습니다! 분석된 할 일이 캘린더 대시보드에 제안되었습니다.");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 폴더 생성
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          payload: { name: newFolderName, description: newFolderDesc }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateFolderModalOpen(false);
        setNewFolderName("");
        setNewFolderDesc("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 인증서 생성
  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_certificate",
          payload: {
            ...certForm,
            folder_id: selectedFolderId !== "ALL" ? selectedFolderId : null
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateCertModalOpen(false);
        setCertForm({ cert_name: "", cert_number: "", issuer: "", issue_date: "", expire_date: "", renewal_status: "VALID" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 특허 생성
  const handleCreatePatent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_patent",
          payload: {
            ...patentForm,
            folder_id: selectedFolderId !== "ALL" ? selectedFolderId : null
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreatePatentModalOpen(false);
        setPatentForm({ ip_type: "PATENT", title: "", application_number: "", registration_number: "", applicant: "", registration_date: "", next_annual_fee_date: "", annual_fee_amount: "150000" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 최고관리자의 직원 할 일 배정 실행
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForAssign || !assigneeName.trim()) return;

    try {
      const res = await fetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_task",
          payload: {
            taskId: selectedTaskForAssign.id,
            assignedTo: assigneeName.trim(),
            assignedBy: "최고관리자"
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`'${assigneeName}' 담당자에게 할 일이 성공적으로 배정되었습니다. 모바일 포털에서 확인할 수 있습니다.`);
        setIsAssignModalOpen(false);
        setSelectedTaskForAssign(null);
        setAssigneeName("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 태스크 상태 뱃지 레벨
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AI_SUGGESTED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> AI 제안 (배정대기)</span>;
      case "ASSIGNED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"><UserCheck className="w-3 h-3 text-indigo-500" /> 배정완료</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 처리완료</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">대기중</span>;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* 상단 웅장한 헤더 (표준 헤더 규격 적용) */}
      <div className="bg-white border-b border-slate-200/80 px-6 md:px-10 py-7 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-600" />
              인증서 · 특허 기한 관리 AI 센터
            </h1>
            <p className="text-slate-500 mt-2 text-sm pl-11">
              테넌트 회사의 각종 ISO/KC 인증서, 특허 및 지식재산권을 AI가 매일 자동 스캔하여 캘린더에 수집하고 최고관리자가 담당 직원에게 할 일을 배정합니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTriggerAiScan()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              AI Daily Scanner 실행
            </button>
            <button
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <FolderPlus className="w-4 h-4 text-slate-500" />
              새 태스크 폴더
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        {/* 상단 탭 네비게이션 */}
        <div className="flex items-center justify-between border-b border-slate-200 mb-6 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "calendar"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              전사 기한 캘린더 & AI 배정
              {tasks.filter(t => t.status === 'AI_SUGGESTED').length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-amber-400 text-slate-900 rounded-full font-extrabold">
                  {tasks.filter(t => t.status === 'AI_SUGGESTED').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("certificates")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "certificates"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Award className="w-4 h-4" />
              인증서 대장 ({certificates.length})
            </button>
            <button
              onClick={() => setActiveTab("patents")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "patents"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileCheck className="w-4 h-4" />
              특허 및 지식재산권 ({patents.length})
            </button>
            <button
              onClick={() => setActiveTab("folders")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "folders"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              태스크 폴더 센터 ({folders.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="검색어 입력..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 md:w-64"
              />
            </div>
          </div>
        </div>

        {/* 탭 1: 전사 기한 캘린더 & AI 할 일 배정 센터 */}
        {activeTab === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측: 전사 캘린더 대시보드 뷰 */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    전사 기한 마일스톤 달력
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">인증서 만료일, 특허 연차료 납부 및 AI 추출 일정이 통합 렌더링됩니다.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> AI 제안</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span> 배정됨</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 완료</span>
                </div>
              </div>

              {/* 월별 기한 그리드 카드 뷰 */}
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm font-medium">등록되거나 AI 파싱된 기한 일정이 없습니다.</p>
                    <p className="text-xs text-slate-400 mt-1">'AI Daily Scanner 실행' 버튼을 눌러 문서를 스캔해보세요.</p>
                  </div>
                ) : (
                  tasks
                    .filter(t => !searchQuery || t.title.includes(searchQuery) || t.description?.includes(searchQuery))
                    .map((task: any) => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          task.status === "AI_SUGGESTED"
                            ? "bg-amber-50/50 border-amber-200/80 hover:border-amber-400"
                            : task.status === "ASSIGNED"
                            ? "bg-indigo-50/40 border-indigo-100 hover:border-indigo-300"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${
                              task.status === "AI_SUGGESTED"
                                ? "bg-amber-100 text-amber-800"
                                : task.status === "ASSIGNED"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                  {task.due_date || '기한 미정'}
                                </span>
                                {getStatusBadge(task.status)}
                              </div>
                              <h3 className="text-base font-bold text-slate-800 mt-1">{task.title}</h3>
                              <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {task.status === "AI_SUGGESTED" && (
                              <button
                                onClick={() => {
                                  setSelectedTaskForAssign(task);
                                  setIsAssignModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                담당자 배정
                              </button>
                            )}
                            {task.assigned_to && (
                              <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl font-medium">
                                담당: <strong className="text-indigo-600">{task.assigned_to}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* 우측: 최고관리자 AI 스캔 결과 & 담당자 승인 피드 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  AI 분석 미배정 할 일 목록
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  AI가 매일 스캔한 문서에서 추출된 할 일입니다. 최고관리자가 담당 직원을 지정하면 모바일 포털로 전송됩니다.
                </p>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {tasks.filter(t => t.status === 'AI_SUGGESTED').length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      모든 AI 제안 건에 대한 담당자 배정이 완료되었습니다.
                    </div>
                  ) : (
                    tasks
                      .filter(t => t.status === 'AI_SUGGESTED')
                      .map((task: any) => (
                        <div key={task.id} className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
                          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
                            <span>📄 {task.source_file_name || '문서 스캔'}</span>
                            <span className="text-amber-600 font-bold">{task.due_date}까지</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{task.description}</p>
                          <button
                            onClick={() => {
                              setSelectedTaskForAssign(task);
                              setIsAssignModalOpen(true);
                            }}
                            className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            직원에게 할 일 배정하기
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/60 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  모바일 포털 연동 안내
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  여기서 배정된 '할 일'은 담당 직원이 모바일 포털(<code>/m</code>)에 로그인하면 '내 할 일' 카드 위젯으로 즉시 노출됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 인증서 대장 */}
        {activeTab === "certificates" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  보유 인증서 목록
                </h2>
                <p className="text-xs text-slate-500 mt-1">ISO, KC, HACCP, 벤처기업 등 회사의 각종 인증서를 관리합니다.</p>
              </div>
              <button
                onClick={() => setIsCreateCertModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                신규 인증서 추가
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">인증서명</th>
                    <th className="px-4 py-3">인증번호</th>
                    <th className="px-4 py-3">발급기관</th>
                    <th className="px-4 py-3">발급일</th>
                    <th className="px-4 py-3">만료일자</th>
                    <th className="px-4 py-3">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        등록된 인증서가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-800">{cert.cert_name}</td>
                        <td className="px-4 py-3.5 font-mono text-xs">{cert.cert_number || "-"}</td>
                        <td className="px-4 py-3.5">{cert.issuer || "-"}</td>
                        <td className="px-4 py-3.5">{cert.issue_date || "-"}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">{cert.expire_date || "-"}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {cert.renewal_status || '유효'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 탭 3: 특허 대장 */}
        {activeTab === "patents" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  특허 및 지식재산권 대장
                </h2>
                <p className="text-xs text-slate-500 mt-1">특허, 상표, 디자인 및 실용신안 연차료 및 권리 기한을 추적합니다.</p>
              </div>
              <button
                onClick={() => setIsCreatePatentModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                신규 특허/지식재산권 추가
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">구분</th>
                    <th className="px-4 py-3">명칭</th>
                    <th className="px-4 py-3">출원/등록번호</th>
                    <th className="px-4 py-3">출원인</th>
                    <th className="px-4 py-3">다음 연차료 납부일</th>
                    <th className="px-4 py-3">납부예정액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        등록된 특허/지식재산권이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    patents.map((pat) => (
                      <tr key={pat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-indigo-600">
                          {pat.ip_type === 'PATENT' ? '특허' : pat.ip_type === 'TRADEMARK' ? '상표' : '지식재산'}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">{pat.title}</td>
                        <td className="px-4 py-3.5 font-mono text-xs">{pat.registration_number || pat.application_number || "-"}</td>
                        <td className="px-4 py-3.5">{pat.applicant || "-"}</td>
                        <td className="px-4 py-3.5 font-semibold text-amber-700">{pat.next_annual_fee_date || "-"}</td>
                        <td className="px-4 py-3.5 font-mono">
                          {pat.annual_fee_amount ? `${Number(pat.annual_fee_amount).toLocaleString()} 원` : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 탭 4: 태스크 폴더 센터 */}
        {activeTab === "folders" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-600" />
                  태스크 폴더 & AI 문서 파싱 센터
                </h2>
                <p className="text-xs text-slate-500 mt-1">폴더별로 서류를 업로드하면 AI가 매일 자동 스캔하여 할 일을 도출합니다.</p>
              </div>
              <button
                onClick={() => setIsCreateFolderModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                태스크 폴더 생성
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {folders.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  생성된 태스크 폴더가 없습니다.
                </div>
              ) : (
                folders.map((f) => (
                  <div key={f.id} className="p-5 border border-slate-200 rounded-2xl hover:shadow-md transition-all bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{f.created_at}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800">{f.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{f.description || "설명 없음"}</p>
                    <button
                      onClick={() => handleTriggerAiScan(f.id)}
                      className="mt-4 w-full py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      문서 파싱 & AI 스캔 실행
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 모달 1: 담당자 배정 모달 */}
      {isAssignModalOpen && selectedTaskForAssign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              직원에게 '할 일' 배정
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              AI가 추출한 항목: <strong className="text-slate-800">{selectedTaskForAssign.title}</strong>
            </p>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">담당 직원 이름 / 사번</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동 (또나 사번 EMP-001)"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  배정 확정 (모바일 전송)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 2: 태스크 폴더 생성 모달 */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <FolderPlus className="w-5 h-5 text-indigo-600" />
              신규 태스크 폴더 생성
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">폴더 명칭</label>
                <input
                  type="text"
                  required
                  placeholder="예: ISO인증 서류함, 특허 연차료 관리"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">폴더 설명</label>
                <textarea
                  rows={3}
                  placeholder="폴더 관리 목적 및 설명..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  폴더 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 3: 인증서 수동 추가 모달 */}
      {isCreateCertModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-indigo-600" />
              신규 인증서 추가
            </h3>
            <form onSubmit={handleCreateCertificate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">인증서 명칭</label>
                <input
                  type="text"
                  required
                  placeholder="예: ISO 9001, KC 전기용품 안전인증"
                  value={certForm.cert_name}
                  onChange={(e) => setCertForm({ ...certForm, cert_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">인증 번호</label>
                <input
                  type="text"
                  placeholder="인증서 고유 번호"
                  value={certForm.cert_number}
                  onChange={(e) => setCertForm({ ...certForm, cert_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">발급기관</label>
                  <input
                    type="text"
                    placeholder="예: 한국표준협회"
                    value={certForm.issuer}
                    onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">만료일자</label>
                  <input
                    type="date"
                    required
                    value={certForm.expire_date}
                    onChange={(e) => setCertForm({ ...certForm, expire_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateCertModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 4: 특허 추가 모달 */}
      {isCreatePatentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              신규 특허/지식재산권 추가
            </h3>
            <form onSubmit={handleCreatePatent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">구분</label>
                <select
                  value={patentForm.ip_type}
                  onChange={(e) => setPatentForm({ ...patentForm, ip_type: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="PATENT">특허</option>
                  <option value="UTILITY_MODEL">실용신안</option>
                  <option value="TRADEMARK">상표</option>
                  <option value="DESIGN">디자인</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">명칭</label>
                <input
                  type="text"
                  required
                  placeholder="특허/지식재산권 명칭"
                  value={patentForm.title}
                  onChange={(e) => setPatentForm({ ...patentForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">등록번호</label>
                  <input
                    type="text"
                    placeholder="10-1234567-0000"
                    value={patentForm.registration_number}
                    onChange={(e) => setPatentForm({ ...patentForm, registration_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">다음 연차료 납부일</label>
                  <input
                    type="date"
                    required
                    value={patentForm.next_annual_fee_date}
                    onChange={(e) => setPatentForm({ ...patentForm, next_annual_fee_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreatePatentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  특허 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
