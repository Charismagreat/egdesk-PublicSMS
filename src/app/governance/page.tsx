"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import Link from "next/link";
import { onUserDataChanged } from "../../../egdesk-helpers";
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, 
  RotateCcw, RefreshCw, Trash2, ArrowRightLeft, ShieldCheck, 
  Sparkles, User, Clock, ToggleLeft, ToggleRight, ListTodo,
  ExternalLink, FileText, ChevronRight, X, Loader2, CheckSquare, Square,
  Search, SlidersHorizontal, UserCheck, Cpu, Database, FolderOpen,
  Camera, Receipt, MessageSquare, Send, Calendar, ArrowRight, Paperclip
} from "lucide-react";

interface ControlEvent {
  id: string;
  type: 'STORE_ORDER' | 'RAG_HOLD' | 'LOW_STOCK' | 'TASK_CANCEL_REQUEST';
  title: string;
  subtitle: string;
  status: 'WAITING' | 'RESOLVED';
  created_at: string;
  data: any;
}
import TaskKnowledgeDocumentModal from "@/components/TaskKnowledgeDocumentModal";

interface DeletedItem {
  id: string;
  doc_type: 'estimate' | 'purchase_order' | 'sales_order';
  customer_name?: string;
  partner_name?: string;
  total_amount?: number;
  deleted_at: string;
  deleted_by: string;
}

interface ActionRecommendation {
  code: string;
  label: string;
  description: string;
}

export default function GovernanceDashboard() {
  const [events, setEvents] = useState<ControlEvent[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [ocrEnabled, setOcrEnabled] = useState<boolean>(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // 1. 상태 영속화 (sessionStorage) 연동 적용
  const [activeTab, setActiveTab, isActiveTabRestored] = usePersistedState<'EVENTS' | 'RULES' | 'RESTORE' | 'FOLDERS' | 'REPORTS'>('egdesk_governance_activeTab', 'EVENTS');
  const [subTab, setSubTab, isSubTabRestored] = usePersistedState<'ALL' | 'WAITING' | 'RESOLVED' | 'AUDIT'>('egdesk_governance_subTab', 'ALL');
  const [auditSourceFilter, setAuditSourceFilter, isSourceRestored] = usePersistedState<'ALL' | 'AI' | 'MANUAL'>('egdesk_gov_audit_source', 'ALL');
  const [auditDomainFilter, setAuditDomainFilter, isDomainRestored] = usePersistedState<string>('egdesk_gov_audit_domain', 'ALL');
  const [auditSearchQuery, setAuditSearchQuery, isSearchRestored] = usePersistedState<string>('egdesk_gov_audit_search', '');

  // 📋 일일 업무 보고서 관제 전용 상태
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportComment, setReportComment] = useState("");
  const [aiComments, setAiComments] = useState<any[]>([]);
  const [aiCommentsLoading, setAiCommentsLoading] = useState(false);
  const [aiSuggestionsCache, setAiSuggestionsCache] = useState<Record<number, any[]>>({}); // 💡 [추가] 모달 재오픈 시 AI API 중복 호출 방지용 임시 캐시

  // 🎗️ AI 파싱 배정 대기 건 및 담당자 배정 모달 상태
  const [aiSuggestedTasks, setAiSuggestedTasks] = useState<any[]>([]);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState("김직원");
  const [assignTaskLoading, setAssignTaskLoading] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 모달 제어 상태
  const [selectedEvent, setSelectedEvent] = useState<ControlEvent | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [actionReports, setActionReports] = useState<{ action: string; success: boolean; detail: string }[] | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

  // 📂 태스크 폴더 관제 전용 상태 및 함수
  const [folders, setFolders] = useState<any[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string>('');
  const [selectedUserFilter, setSelectedUserFilter] = useState("ALL");

  // 🧠 지식 문서 모달 팝업 상태
  const [knowledgeModalDoc, setKnowledgeModalDoc] = useState<any | null>(null);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);

  const handleOpenKnowledgeDoc = (item: any, folderName?: string) => {
    setKnowledgeModalDoc({
      id: item.id,
      title: item.title,
      folder_name: folderName || "기본 태스크 폴더",
      content: item.content || "스캔 파싱된 태스크 폴더 지식 텍스트입니다.",
      created_at: item.created_at || new Date().toISOString().split("T")[0],
      file_name: item.file_name || "스캔서류.pdf"
    });
    setIsKnowledgeModalOpen(true);
  };

  // 📁 실물 서류 PDF/이미지 모달 뷰어 상태 (모바일 포털 /m 과 100% 동일한 서류 뷰어)
  const [filePreviewItem, setFilePreviewItem] = useState<any | null>(null);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);

  // 🎯 AI 파싱 배정대기 할 일 담당자 배정 실행 함수
  const handleAssignTask = async () => {
    if (!selectedTaskForAssign) return;
    setAssignTaskLoading(true);
    try {
      const res = await apiFetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_task",
          payload: {
            id: selectedTaskForAssign.id,
            assigned_to: assignTargetUser
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`[${selectedTaskForAssign.title}] 업무가 '${assignTargetUser}'에게 성공적으로 배정되었습니다!`);
        setIsAssignModalOpen(false);
        setSelectedTaskForAssign(null);
        loadData();
      } else {
        alert("배정 실패: " + (data.error || "서버 오류"));
      }
    } catch (e: any) {
      alert("오류 발생: " + e.message);
    } finally {
      setAssignTaskLoading(false);
    }
  };

  const handleOpenFilePreview = (item: any) => {
    setFilePreviewItem(item);
    setIsFilePreviewOpen(true);
  };

  // 폴더 내부 수집자료 상태
  const [folderItems, setFolderItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);

  // 폴더 목록 조회
  const fetchFolders = async () => {
    try {
      setFoldersLoading(true);
      const res = await apiFetch("/api/task-folders?action=list");
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
        if (data.folders?.length > 0 && !activeFolderId) {
          setActiveFolderId(String(data.folders[0].id));
        }
      }
    } catch (e) {
      console.error("Failed to fetch folders:", e);
    } finally {
      setFoldersLoading(false);
    }
  };

  // 폴더 상세 정보 조회
  const fetchFolderItems = async (folderId: string) => {
    if (!folderId) return;
    try {
      setItemsLoading(true);
      const res = await apiFetch(`/api/task-folders?action=items&folderId=${folderId}`);
      const data = await res.json();
      if (data.success) {
        setFolderItems(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch folder items:", e);
    } finally {
      setItemsLoading(false);
    }
  };

  // 폴더 삭제 처리
  const handleDeleteFolder = async (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("정말로 이 폴더와 내부 자료를 모두 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/task-folders?action=delete_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId })
      });
      const data = await res.json();
      if (data.success) {
        fetchFolders();
        if (activeFolderId === String(folderId)) {
          setActiveFolderId("");
          setFolderItems([]);
        }
      } else {
        alert("폴더 삭제 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 수집자료 개별 삭제 처리
  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm("정말로 이 수집 자료를 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/task-folders?action=delete_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, itemId })
      });
      const data = await res.json();
      if (data.success) {
        if (activeFolderId) {
          fetchFolderItems(activeFolderId);
        }
      } else {
        alert("자료 삭제 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 🤖 자율 실행 통제 규칙 관리 상태 및 함수
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleExpression, setNewRuleExpression] = useState("");

  // 🤖 자율 규칙 자동 제안 모달 관련 상태
  const [suggestRuleModalOpen, setSuggestRuleModalOpen] = useState(false);
  const [suggestedRuleName, setSuggestedRuleName] = useState("");
  const [suggestedRuleExpression, setSuggestedRuleExpression] = useState("");

  const fetchRules = async () => {
    try {
      setRulesLoading(true);
      const res = await apiFetch("/api/governance?action=rules");
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
      }
    } catch (e) {
      console.error("Failed to fetch rules:", e);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleExpression.trim()) {
      alert("규칙 이름과 자연어 규칙 조건을 입력해 주세요.");
      return;
    }
    try {
      const res = await apiFetch("/api/governance?action=add_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleName: newRuleName,
          expression: newRuleExpression
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewRuleName("");
        setNewRuleExpression("");
        fetchRules();
        alert("성공적으로 자율 통제 규칙이 등록되었습니다.");
      } else {
        alert("규칙 등록 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  // 완료된 관제 카드를 기반으로 자율 규칙을 자동 추천 및 팝업
  const handleOpenSuggestRuleModal = (evt: any) => {
    const operator = 
      evt.data?.operator || 
      evt.data?.created_by || 
      evt.data?.updated_by ||
      (evt.type === 'STORE_ORDER' ? evt.data?.customer_name : null) ||
      '특정 임직원';

    let ruleName = "";
    let expression = "";

    if (evt.type === 'STORE_ORDER') {
      ruleName = `[자동화] ${evt.data?.customer_name || '주문고객'} 스토어 주문 자율 승인`;
      expression = `${evt.data?.customer_name || '고객'}이 상신한 ${evt.data?.product_name || '상품'} 주문은 AI가 즉시 자율적으로 재고를 파악하여 결재 승인한다.`;
    } else if (evt.type === 'RAG_HOLD') {
      const docTypeKo = evt.data?.doc_type === 'estimate' ? '견적서' : evt.data?.doc_type === 'purchase_order' ? '발주서' : '수주서';
      ruleName = `[자동화] ${operator}의 ${docTypeKo} RAG 보류 자율 승인`;
      expression = `${operator}가 상신한 ${docTypeKo} RAG 결재 건은 AI가 자율적으로 분석하여 자동 승인 처리한다.`;
    } else if (evt.type === 'TASK_CANCEL_REQUEST') {
      ruleName = `[자동화] ${operator}의 업무 취소 요청 자율 처리`;
      expression = `${operator}가 요청한 업무 취소 건은 최고관리자 승인 없이 AI가 자동 승인 처리한다.`;
    } else {
      ruleName = `[자동화] ${evt.title || '업무'} 건 자율 대행`;
      expression = `${operator}가 상신한 모든 ${evt.title || '업무'} 관련 건은 AI 자율 대행으로 최고관리자 승인 없이 자동 처리한다.`;
    }

    setSuggestedRuleName(ruleName);
    setSuggestedRuleExpression(expression);
    setSuggestRuleModalOpen(true);
  };

  // 모달 확인 클릭 시 백엔드 API를 통해 자동 자율 규칙 등록 수행
  const handleConfirmSuggestRule = async () => {
    if (!suggestedRuleName.trim() || !suggestedRuleExpression.trim()) {
      alert("규칙 이름과 표현식을 입력해 주세요.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await apiFetch("/api/governance?action=add_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleName: suggestedRuleName,
          expression: suggestedRuleExpression
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuggestRuleModalOpen(false);
        setSuggestedRuleName("");
        setSuggestedRuleExpression("");
        fetchRules();
        alert("성공적으로 자율 통제 규칙이 등록 및 기동되었습니다.");
      } else {
        alert("규칙 자동 등록 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 등록 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRule = async (ruleId: number, currentActive: number) => {
    try {
      const res = await apiFetch("/api/governance?action=toggle_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId,
          isActive: currentActive === 1 ? false : true
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchRules();
      } else {
        alert("활성화 변경 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!window.confirm("정말로 이 자율 규칙을 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/governance?action=delete_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId })
      });
      const data = await res.json();
      if (data.success) {
        fetchRules();
        alert("자율 규칙이 성공적으로 삭제되었습니다.");
      } else {
        alert("규칙 삭제 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  // 📋 직원 일일 업무 보고서 로드 함수
  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const res = await apiFetch("/api/governance?action=daily_reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error("Failed to fetch daily reports:", e);
    } finally {
      setReportsLoading(false);
    }
  };

  // 대표자 결재 처리 (승인/반려)
  const handleDecideReport = async (reportId: number, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      const res = await apiFetch("/api/governance?action=approve_report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          status,
          comment: reportComment
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedReport(null);
        setReportComment("");
        setAiComments([]);
        // 💡 [추가] 결재 완료된 보고서의 이전 AI 피드백 캐시 소거 (재상신/신규 작성 대비)
        setAiSuggestionsCache(prev => {
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
        fetchReports();
        alert(status === 'APPROVED' ? "보고서가 성공적으로 결재 승인되었습니다." : "보고서가 반려 처리되었습니다.");
      } else {
        alert("결재 처리 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 실패");
    } finally {
      setIsProcessing(false);
    }
  };

  // AI 코멘트 추천 받기
  const handleGetAiComments = async (report: any) => {
    try {
      setAiCommentsLoading(true);
      const res = await apiFetch(`/api/governance?action=suggest_comment&report_content=${encodeURIComponent(report.report_content)}&operator=${encodeURIComponent(report.operator)}`);
      const data = await res.json();
      if (data.success) {
        const suggestions = data.suggestions || [];
        setAiComments(suggestions);
        // 💡 [추가] 받아온 추천 피드백 리스트를 메모리 캐시에 저장
        setAiSuggestionsCache(prev => ({
          ...prev,
          [report.id]: suggestions
        }));
      }
    } catch (e) {
      console.error("Failed to suggest comments:", e);
    } finally {
      setAiCommentsLoading(false);
    }
  };

  // 컴포넌트 마운트 및 갱신 시 규칙 로드
  useEffect(() => {
    fetchRules();
  }, []);

  // activeFolderId가 변경될 때 내부 아이템 조회
  useEffect(() => {
    if (activeFolderId) {
      fetchFolderItems(activeFolderId);
    }
  }, [activeFolderId]);

  // activeTab이 FOLDERS 일 때 폴더 로드
  useEffect(() => {
    if (activeTab === 'FOLDERS') {
      fetchFolders();
    } else if (activeTab === 'REPORTS') {
      fetchReports();
    }
  }, [activeTab]);

  // 2. 전체 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 2.1. 토글 상태 조회
      const toggleRes = await apiFetch("/api/governance?action=get_toggle");
      const toggleData = await toggleRes.json();
      if (toggleData.success) {
        setOcrEnabled(toggleData.enabled);
      }

      // 2.2. 통합 관제 피드 조회
      const eventsRes = await apiFetch("/api/governance?action=events");
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        setEvents(eventsData.events || []);
      }

      // 2.3. 소프트 삭제 건 조회
      const deletedRes = await apiFetch("/api/governance?action=deleted_items");
      const deletedData = await deletedRes.json();
      if (deletedData.success) {
        setDeletedItems(deletedData.deletedItems || []);
      }

      // 2.4. 전사 통합 감사 로그 조회
      const auditRes = await apiFetch("/api/governance?action=audit_logs");
      const auditData = await auditRes.json();
      if (auditData.success) {
        setAuditLogs(auditData.auditLogs || []);
      }

      // 2.5. 직원 일일 업무 보고서 조회
      const reportsRes = await apiFetch("/api/governance?action=daily_reports");
      const reportsData = await reportsRes.json();
      if (reportsData.success) {
        setReports(reportsData.reports || []);
      }

      // 2.6. AI 스캔 파싱 배정대기 건들 조회
      try {
        const certRes = await apiFetch("/api/cert-patent");
        const certData = await certRes.json();
        if (certData.success) {
          const suggested = (certData.tasks || []).filter((t: any) => t.status === 'AI_SUGGESTED');
          setAiSuggestedTasks(suggested);
        }
      } catch (cErr) {
        console.warn("AI 배정대기 건 로드 생략:", cErr);
      }
    } catch (err: any) {
      console.error("Governance data fetch error:", err);
      setError("데이터를 로드하는 중 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. 브라우저 저장소 복원 전 이중 페칭(Hydration Guard) 방지 가드 적용
  useEffect(() => {
    if (!isActiveTabRestored || !isSubTabRestored || !isSourceRestored || !isDomainRestored || !isSearchRestored) {
      return; // Early return guard
    }
    loadData();
  }, [loadData, isActiveTabRestored, isSubTabRestored, isSourceRestored, isDomainRestored, isSearchRestored]);

  // 3.1. 실시간 DB 변경 구독을 통한 관제 피드 자동 갱신 (화이트리스트 및 1.5초 디바운스 적용)
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    const whitelistTables = [
      'crm_estimates', 'crm_purchase_orders', 'crm_sales_orders',
      'crm_orders', 'inventory_items', 'products',
      'crm_expenses', 'crm_audit_logs', 'crm_governance_logs'
    ];

    const handleDataMutation = (event: any) => {
      // 1) 관제에 무의미한 환경설정이나 테이블 변경 등은 생략
      if (event.tableName && !whitelistTables.includes(event.tableName)) {
        return;
      }

      // 2) 디바운스 적용: 연속 변경 시 요청 묶기
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        loadData();
      }, 1500);
    };

    const unsub = onUserDataChanged(handleDataMutation);

    return () => {
      unsub();
      if (timerId) clearTimeout(timerId);
    };
  }, [loadData]);

  // 4. OCR 자율 대행 토글 변경
  const handleToggleOcr = async () => {
    setIsProcessing(true);
    const nextVal = !ocrEnabled;
    try {
      const res = await apiFetch("/api/governance?action=set_toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        setOcrEnabled(nextVal);
      } else {
        alert("토글 설정 변경에 실패했습니다: " + data.error);
      }
    } catch (err) {
      alert("토글 변경 중 통신 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. 감사 로그 전체 초기화
  const handleClearLogs = async () => {
    if (!window.confirm("⚠️ 정말로 누적된 실시간 AI 결재 심사 이력 및 전사 통합 감사 로그를 전체 초기화하시겠습니까?\n이 작업은 감사 데이터를 비우는 영구적 작업이며, 복구할 수 없습니다.")) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiFetch("/api/governance?action=clear_logs", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        alert("감사 로그 및 이벤트 내역이 성공적으로 초기화되었습니다.");
        loadData();
      } else {
        alert("초기화 실패: " + data.error);
      }
    } catch (err) {
      alert("초기화 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. 소프트 삭제 복원
  const handleRestore = async (item: DeletedItem) => {
    if (!window.confirm(`정말로 해당 ${item.doc_type === 'estimate' ? '견적서' : item.doc_type === 'purchase_order' ? '발주서' : '수주서'} [${item.id}]를 대장으로 성공적으로 복원하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiFetch("/api/governance?action=restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: item.doc_type,
          docId: item.id
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("대장 데이터가 정상 복원되었습니다.");
        loadData();
      } else {
        alert("데이터 복원에 실패했습니다: " + data.error);
      }
    } catch (err) {
      alert("복원 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. 모달 제어 및 추천 액션 목록 획득
  const getRecommendedActions = (evt: ControlEvent): ActionRecommendation[] => {
    switch (evt.type) {
      case 'STORE_ORDER':
        return [
          { code: 'check_inventory', label: '해당 상품의 실시간 재고 파악', description: '물류 재고 원장과 대조하여 요청 수량이 정상적으로 확보되어 출고가 가능한지 검증합니다.' },
          { code: 'sync_sales_order', label: '수주 대장(crm_sales_orders) 자동 연동 적재', description: 'B2B 주문 건에 대해 즉각적인 받은 발주 관리 대장(수주서)을 연동 작성합니다.' },
          { code: 'create_delivery', label: '배송 대장(crm_deliveries) 출고대기 자율 등록', description: '배송을 위해 출고준비 상태로 물류 라우팅 테이블에 주입합니다.' },
          { code: 'send_sms_alert', label: '재고 고갈 우려 시 물류 직원 긴급 알림 문자 발송', description: '출고 담당 직원 번호로 자율 대행 경고 문자를 즉시 전송합니다.' },
          { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
        ];
      case 'RAG_HOLD':
        // 💡 모바일 임직원 현장 상신 건인 경우, 전용 발주서 스캔 및 수주 등록 자율 대행 제공
        if (evt.data?.doc_type === 'mobile_request' || evt.data?.doc_type === 'mobile_req') {
          return [
            { code: 'scan_received_order', label: "상신 파일 '받은 발주서 스캔 등록' 및 AI OCR 판독 실행", description: '현장에서 첨부한 발주서 이미지 실물 파일을 AI OCR로 스캔하여 품목, 단가, 수량 정보를 추출합니다.' },
            { code: 'auto_register_sales_order', label: '수주 대장(crm_sales_orders) 신규 수주 자동 등록 적재', description: '판독 완료된 B2B 발주 데이터를 기반으로 수주 대장에 즉시 신규 행으로 자동 등록(적재)합니다.' },
            { code: 'notify_operator', label: '최초 조작 신청 임직원에게 처리 통보', description: '강제 승인 결과를 시스템 알림 피드로 피드백합니다.' },
            { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
          ];
        }
        return [
          { code: 'force_delete', label: 'RAG 삭제 가드 임시 우회 및 강제 삭제 최종 승인', description: '보안 내규 상 제한 조치된 문서 삭제 건을 최고관리자 최종 권한으로 소프트 삭제 처리합니다.' },
          { code: 'notify_operator', label: '최초 조작 신청 임직원에게 처리 통보', description: '강제 승인 결과를 시스템 알림 피드로 피드백합니다.' },
          { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
        ];
      case 'LOW_STOCK':
        return [
          { code: 'sms_low_stock', label: '창고 및 자재 조달 담당 직원 긴급 경고 문자 발송', description: '안전재고가 고갈되어 위험 상태임을 구매 담당자에게 문자 전송합니다.' },
          { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
        ];
      case 'TASK_CANCEL_REQUEST':
        return [
          { code: 'approve_task_cancel', label: '업무 취소(소프트 삭제) 최종 승인', description: '요청된 취소 사유를 최종 승인하여 스냅태스크 및 연관 이력을 대장에서 소프트 삭제 처리합니다.' },
          { code: 'reject_task_cancel', label: '취소 요청 반려 및 정상 재개', description: '취소 사유를 기각하고 해당 스냅태스크를 다시 정상 진행(ACTIVE) 상태로 원복합니다.' },
          { code: 'notify_operator', label: '조치 이력 영구 감사 아카이빙', description: '최고관리자의 개입 이력을 통제 감사록에 상세 기록합니다.' }
        ];
      default:
        return [];
    }
  };

  const handleOpenDetail = (evt: ControlEvent) => {
    setSelectedEvent(evt);
    setActionReports(null);
    const defaults = getRecommendedActions(evt).map(a => a.code);
    setSelectedActions(defaults); // 기본값 전체 선택
  };

  const handleCloseDetail = () => {
    setSelectedEvent(null);
    setActionReports(null);
    setSelectedActions([]);
  };

  const toggleActionSelection = (code: string) => {
    if (selectedActions.includes(code)) {
      setSelectedActions(prev => prev.filter(c => c !== code));
    } else {
      setSelectedActions(prev => [...prev, code]);
    }
  };

  // 8. AI 추천 자율 대행 액션 실행 전송
  const handleExecuteActions = async () => {
    if (!selectedEvent) return;
    if (selectedActions.length === 0) {
      alert("최소 하나 이상의 자율 대행 작업을 선택해 주세요.");
      return;
    }

    setIsExecuting(true);
    setActionReports(null);

    try {
      const payload: any = {
        eventId: selectedEvent.id,
        eventType: selectedEvent.type,
        actions: selectedActions,
        originalData: selectedEvent.data
      };

      if (selectedEvent.type === 'RAG_HOLD') {
        payload.docId = selectedEvent.data.doc_id;
        payload.docType = selectedEvent.data.doc_type;
      }

      const res = await apiFetch("/api/governance?action=execute_actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setActionReports(data.reports || []);
      } else {
        alert("작업 수행에 실패했습니다: " + data.error);
      }
    } catch (err) {
      alert("작업 처리 중 통신 에러가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 🤖 대안 A: 통합 피드 매핑 및 정렬, 복합 필터링 로직
  const mappedEvents = events.map(e => ({
    id: `event_${e.id}`,
    feedType: 'EVENT' as const,
    type: e.type,
    title: e.title,
    subtitle: e.subtitle,
    status: e.status,
    created_at: e.created_at,
    data: e.data,
    timestamp: new Date(e.created_at.replace(/-/g, '/')).getTime()
  }));

  const mappedAuditLogs = auditLogs.map(log => ({
    id: `audit_${log.id}`,
    feedType: 'AUDIT' as const,
    type: 'AUDIT_LOG',
    title: log.doc_title,
    subtitle: `조작자: ${log.operator} / 테이블: ${log.doc_type}`,
    status: log.status,
    created_at: log.created_at,
    data: log,
    timestamp: new Date(log.created_at.replace(/-/g, '/')).getTime()
  }));

  const filteredFeed = [...mappedEvents, ...mappedAuditLogs]
    .filter(item => {
      // A. 서브 탭 필터링
      if (subTab === 'WAITING') {
        if (item.feedType !== 'EVENT' || item.status !== 'WAITING') return false;
      } else if (subTab === 'RESOLVED') {
        if (item.feedType !== 'EVENT' || item.status !== 'RESOLVED') return false;
      } else if (subTab === 'AUDIT') {
        if (item.feedType !== 'AUDIT') return false;
      }

      // B. 조작 주체 필터 (감사로그에 주로 작용하나, 일반 이벤트에도 대조 가능)
      if (auditSourceFilter !== 'ALL') {
        if (item.feedType === 'AUDIT') {
          if (item.data?.source !== auditSourceFilter) return false;
        } else {
          const eventSource = item.data?.source || (item.type === 'STORE_ORDER' ? 'MANUAL' : 'AI');
          if (eventSource !== auditSourceFilter) return false;
        }
      }

      // C. 도메인 분야 필터
      if (auditDomainFilter !== 'ALL') {
        const docType = item.feedType === 'AUDIT' ? item.data?.doc_type : (item.data?.doc_type || item.type);
        if (auditDomainFilter === 'ESTIMATE') {
          if (!['crm_estimates', 'crm_purchase_orders', 'crm_sales_orders', 'STORE_ORDER', 'RAG_HOLD', 'TASK_CANCEL_REQUEST'].includes(docType)) return false;
        } else if (auditDomainFilter === 'EXPENSE') {
          if (docType !== 'crm_expenses') return false;
        } else if (auditDomainFilter === 'INVENTORY') {
          if (!['products', 'inventory_items', 'LOW_STOCK'].includes(docType)) return false;
        } else if (auditDomainFilter === 'CUSTOMER') {
          if (!['crm_customers', 'crm_operators'].includes(docType)) return false;
        }
      }

      // D. 글로벌 검색어 필터링 (통합 검색 지원)
      if (auditSearchQuery.trim() !== '') {
        const q = auditSearchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchSubtitle = (item.subtitle || '').toLowerCase().includes(q);
        
        let matchExtra = false;
        if (item.feedType === 'AUDIT') {
          const log = item.data;
          const matchOp = (log?.operator || '').toLowerCase().includes(q);
          const matchType = (log?.doc_type || '').toLowerCase().includes(q);
          const matchId = (log?.doc_id || '').toLowerCase().includes(q);
          matchExtra = matchOp || matchType || matchId;
        } else {
          const evt = item.data;
          const matchType = (item.type || '').toLowerCase().includes(q);
          const matchOp = (evt?.operator || evt?.customer_name || '').toLowerCase().includes(q);
          matchExtra = matchType || matchOp;
        }

        if (!matchTitle && !matchSubtitle && !matchExtra) return false;
      }

      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  // Diff 헬퍼 함수: Before & After 값 대조하여 변경 필드 추출
  const getDiffFields = (before: any, after: any) => {
    const diffs: { field: string; beforeVal: string; afterVal: string }[] = [];
    const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
    
    // 무시할 메타 성격 필드
    const ignoreKeys = ['updated_at', 'created_at', 'updated_by', 'deleted_at', 'deleted_by', 'restored_at', 'restored_by', 'uuid'];

    for (const key of keys) {
      if (ignoreKeys.includes(key)) continue;
      const bVal = before ? before[key] : undefined;
      const aVal = after ? after[key] : undefined;
      
      // 값이 스트링화 대조 시 다르면 기록
      if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        diffs.push({
          field: key,
          beforeVal: bVal === undefined || bVal === null ? '(없음)' : typeof bVal === 'object' ? JSON.stringify(bVal) : String(bVal),
          afterVal: aVal === undefined || aVal === null ? '(삭제됨)' : typeof aVal === 'object' ? JSON.stringify(aVal) : String(aVal)
        });
      }
    }
    return diffs;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 font-sans text-left">
      <div className="w-full space-y-6">
        
        {/* 헤더 타이틀 영역 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
              <span>AI 컨트롤타워 관제 센터</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm pl-10">
              실시간 비즈니스 이벤트 피드를 모니터링하고, AI 추천 조치 시나리오를 자율 실행하며 전사 통합 감사 로그를 모니터링합니다.
            </p>
          </div>
          <div className="flex items-center gap-2 pl-10 md:pl-0">
            <button
              onClick={loadData}
              disabled={isLoading || isProcessing}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
            </button>
            <button
              onClick={handleClearLogs}
              disabled={isLoading || isProcessing}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2.5 rounded-xl border border-rose-200/60 shadow-xs flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>감사록 전체 초기화</span>
            </button>
          </div>
        </div>

        {/* 에러 표시 배너 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-fade-in text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2구역: 세련된 탭 컨트롤러 */}
        <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('EVENTS')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'EVENTS' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            관제 및 감사 피드 ({events.length + auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'RULES' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            자율 규칙 제어 ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('RESTORE')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'RESTORE' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            소프트 삭제 복원 ({deletedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('FOLDERS')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'FOLDERS' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            태스크 폴더 관제 ({folders.length})
          </button>
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'REPORTS' 
                ? 'border-indigo-650 text-indigo-650 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            일일 업무 보고서 ({reports.length})
          </button>
        </div>

        {/* 3구역: 메인 콘텐츠 리스트 게시판 */}
        <div className="space-y-4 min-h-[400px]">
          {isLoading ? (
            <div className="py-24 flex flex-col justify-center items-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <span className="text-xs text-slate-400 font-bold">실시간 비즈니스 데이터 로드 중...</span>
            </div>
          ) : activeTab === 'EVENTS' ? (
            // 💡 대안 A: 통합 관제 및 감사 피드 탭 뷰 렌더링
            <div className="space-y-4">
              {/* 1. 세련된 서브 세그먼트 버튼 */}
              <div className="bg-slate-100 p-1 rounded-2xl flex w-fit gap-1 text-xs font-black text-slate-500 border border-slate-200/50">
                <button
                  onClick={() => setSubTab('ALL')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    subTab === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'hover:text-slate-800'
                  }`}
                >
                  전체 피드 ({events.length + auditLogs.length})
                </button>
                <button
                  onClick={() => setSubTab('WAITING')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    subTab === 'WAITING'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'hover:text-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                  관제 대상 ({events.filter(e => e.status === 'WAITING').length + aiSuggestedTasks.length})
                </button>
                <button
                  onClick={() => setSubTab('RESOLVED')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    subTab === 'RESOLVED'
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'hover:text-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  관제 완료 ({events.filter(e => e.status === 'RESOLVED').length})
                </button>
                <button
                  onClick={() => setSubTab('AUDIT')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    subTab === 'AUDIT'
                      ? 'bg-white text-indigo-650 shadow-xs'
                      : 'hover:text-slate-800'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  변경 감사록 ({auditLogs.length})
                </button>
              </div>

              {/* 2. 필터바 영역 */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                    <span>필터 상세 조건</span>
                  </div>

                  {(subTab === 'ALL' || subTab === 'AUDIT') && (
                    <>
                      {/* 조작 주체 구분 필터 */}
                      <div className="bg-slate-100 p-0.5 rounded-lg flex">
                        <button 
                          onClick={() => setAuditSourceFilter('ALL')}
                          className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${auditSourceFilter === 'ALL' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          주체: 전체
                        </button>
                        <button 
                          onClick={() => setAuditSourceFilter('AI')}
                          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${auditSourceFilter === 'AI' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                          🤖 AI 자율
                        </button>
                        <button 
                          onClick={() => setAuditSourceFilter('MANUAL')}
                          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${auditSourceFilter === 'MANUAL' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          👤 임직원 수동
                        </button>
                      </div>

                      {/* 도메인 구분 필터 */}
                      <select 
                        value={auditDomainFilter}
                        onChange={(e) => setAuditDomainFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold outline-none cursor-pointer"
                      >
                        <option value="ALL">모든 업무 대장</option>
                        <option value="ESTIMATE">B2B 견적/발주/수주</option>
                        <option value="EXPENSE">지출경비 대장</option>
                        <option value="INVENTORY">자재/제품 재고</option>
                        <option value="CUSTOMER">고객/사원 정보</option>
                      </select>
                    </>
                  )}
                </div>

                {/* 글로벌 검색 필터 */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="조작자, 사건 내용, 문서 ID 검색..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors"
                  />
                  {auditSearchQuery && (
                    <button 
                      onClick={() => setAuditSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. AI 파싱 서류 미배정 관제 피드 (관제 대상/전체 탭 선택 시 상단 노출) */}
              {(subTab === 'WAITING' || subTab === 'ALL') && aiSuggestedTasks.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-purple-500/10 border border-amber-300 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-600 animate-bounce" />
                      <h3 className="text-base font-black text-amber-950">AI 스캔 파싱 미배정 관제 대상 ({aiSuggestedTasks.length}건)</h3>
                      <span className="text-[10px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-full">담당자 배정 필요</span>
                    </div>
                    <span className="text-xs text-amber-800 font-bold">최고관리자가 담당 직원을 지정하면 모바일 포털로 즉시 전송됩니다.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiSuggestedTasks.map((t) => (
                      <div key={t.id} className="bg-white/90 border border-amber-200/80 rounded-2xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                            <span className="text-amber-800 font-extrabold truncate">📄 {t.source_file_name || '실물 서류 스캔'}</span>
                            <span className="text-rose-600 font-black shrink-0">기한: {t.due_date}까지</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-800">{t.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
                        </div>
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => {
                              setSelectedTaskForAssign(t);
                              setIsAssignModalOpen(true);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            직원에게 할 일 배정하기
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. 통합 피드 리스트 */}
              {filteredFeed.length === 0 && aiSuggestedTasks.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-xs">
                  <Database className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <span className="text-xs font-bold block">조건에 부합하는 관제 및 감사 내역이 없습니다.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFeed.map((item) => {
                    if (item.feedType === 'EVENT') {
                      const evt = item;
                      return (
                        <div 
                          key={evt.id}
                          onClick={() => handleOpenDetail(evt as any)}
                          className="bg-white border border-slate-200/85 hover:border-indigo-200 hover:bg-indigo-50/10 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md cursor-pointer group"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`p-2.5 rounded-2xl shrink-0 ${
                                evt.type === 'STORE_ORDER' 
                                  ? 'bg-blue-50 text-blue-650' 
                                  : evt.type === 'RAG_HOLD' 
                                    ? 'bg-rose-50 text-rose-600' 
                                    : evt.type === 'TASK_CANCEL_REQUEST'
                                      ? 'bg-indigo-50 text-indigo-600'
                                      : 'bg-amber-50 text-amber-600'
                              }`}>
                                {evt.type === 'STORE_ORDER' && <FileText className="w-5.5 h-5.5" />}
                                {evt.type === 'RAG_HOLD' && <ShieldAlert className="w-5.5 h-5.5 animate-pulse" />}
                                {evt.type === 'TASK_CANCEL_REQUEST' && <Trash2 className="w-5.5 h-5.5" />}
                                {evt.type === 'LOW_STOCK' && <AlertTriangle className="w-5.5 h-5.5" />}
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3.5 min-w-0 text-left">
                                <div className="flex items-center flex-wrap gap-2 shrink-0">
                                  <span className="text-sm font-black text-slate-800">{evt.title}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    evt.type === 'STORE_ORDER' 
                                      ? 'bg-blue-50 text-blue-700' 
                                      : evt.type === 'RAG_HOLD' 
                                        ? 'bg-rose-50 text-rose-700' 
                                        : evt.type === 'TASK_CANCEL_REQUEST'
                                          ? 'bg-indigo-50 text-indigo-700'
                                          : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {evt.type === 'STORE_ORDER' ? '스토어 주문' : evt.type === 'RAG_HOLD' ? 'AI 결재 보류' : evt.type === 'TASK_CANCEL_REQUEST' ? '업무 취소 요청' : '재고 부족 경보'}
                                  </span>
                                  <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-black border border-rose-100 shrink-0">
                                    🚨 관제 알림
                                  </span>
                                </div>
                                <span className="hidden md:inline text-slate-300 font-light">|</span>
                                <p className="text-xs text-slate-500 font-semibold truncate max-w-[420px]">{evt.subtitle}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 shrink-0 self-start md:self-auto pl-12 md:pl-0 md:mr-4">
                              {(() => {
                                const operator = 
                                  evt.data?.operator || 
                                  evt.data?.created_by || 
                                  evt.data?.updated_by ||
                                  (evt.type === 'STORE_ORDER' ? evt.data?.customer_name : null);
                                  
                                if (!operator) return null;
                                
                                return (
                                  <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-extrabold border border-indigo-100/50 shrink-0">
                                    <User className="w-3 h-3 text-indigo-600" />
                                    <span>상신자: {operator}</span>
                                  </div>
                                );
                              })()}
                              <div className="flex items-center gap-1 font-medium shrink-0">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{evt.created_at}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end shrink-0">
                            {evt.status === 'RESOLVED' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSuggestRuleModal(evt as any);
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-3 py-1.5 rounded-xl border border-indigo-100/50 transition-all flex items-center gap-1 cursor-pointer shrink-0 z-10"
                                title="이 사건의 조치 과정을 다음부터 자율 규칙으로 실행하도록 즉시 기억"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                                <span>🤖 자율 규칙 등록</span>
                              </button>
                            )}
                            <span className="text-[11px] text-indigo-650 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              <span>검토 및 다음 조치 수행</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    } else {
                      const log = item.data;
                      const isAi = log.source === 'AI';
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedAudit(log)}
                          className="bg-white border border-slate-200/85 hover:border-indigo-200 hover:bg-indigo-50/10 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md cursor-pointer group text-left"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-2xl shrink-0 ${isAi ? 'bg-indigo-50 text-indigo-650' : 'bg-slate-100 text-slate-650'}`}>
                              {isAi ? <Cpu className="w-6 h-6 animate-pulse" /> : <User className="w-6 h-6" />}
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="text-sm font-black text-slate-800">{log.doc_title}</span>
                                
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isAi ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {isAi ? '🤖 AI 자율 대행' : '👤 임직원 조작'}
                                </span>

                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  log.action_type === 'INSERT' ? 'bg-emerald-50 text-emerald-800' : log.action_type === 'DELETE' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
                                }`}>
                                  {log.action_type === 'INSERT' ? '등록' : log.action_type === 'DELETE' ? '삭제' : '수정'}
                                </span>
                              </div>

                              <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                                <span>조작자: <span className="text-slate-700 font-bold">{log.operator}</span></span>
                                <span>•</span>
                                <span>테이블: <span className="font-mono text-indigo-600">{log.doc_type}</span></span>
                              </div>

                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{log.created_at}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                            <span className="text-[11px] text-indigo-650 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              <span>상세 변경 데이터 비교(Diff)</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'RULES' ? (
            // 🤖 AI 자율 실행 통제 규칙 제어 센터 탭 뷰 렌더링
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-left space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Cpu className="w-6 h-6 text-indigo-650 animate-pulse shrink-0" />
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">AI 자율 실행 통제 규칙 제어 센터</h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-semibold">최고관리자의 의사결정 기록을 자율 규칙으로 변환하여, 임직원의 결재 상신 시 자동 승인을 대행합니다.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 규칙 추가 폼 */}
                <form onSubmit={handleAddRule} className="lg:col-span-5 bg-slate-50 border border-slate-200/50 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-700">🤖 신규 자율 실행 규칙 등록</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">규칙 이름</label>
                    <input 
                      type="text" 
                      placeholder="예: 김직원 소액 취소 자동 승인"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">자연어 자동화 조건</label>
                    <textarea 
                      rows={3}
                      placeholder="예: 김직원이 취소 요청한 모든 건은 자동 승인한다.&#13;&#10;또는: 김직원이 올린 500만원 이하의 수입통관은 자동 승인한다."
                      value={newRuleExpression}
                      onChange={(e) => setNewRuleExpression(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>규칙 등록 및 기억하기</span>
                  </button>
                </form>

                {/* 규칙 목록 리스트 */}
                <div className="lg:col-span-7 space-y-4">
                  <h4 className="text-xs font-black text-slate-700">📜 활성화된 자율 통제 규칙 목록 ({rules.length})</h4>

                  {rulesLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-650" />
                      <span className="text-xs font-bold">규칙 목록 로드 중...</span>
                    </div>
                  ) : rules.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400">
                      <Cpu className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <span className="text-xs font-bold block">등록된 자율 통제 규칙이 없습니다. 최초의 규칙을 정의해 보세요!</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {rules.map(rule => {
                        let structured: any = {};
                        try {
                          structured = JSON.parse(rule.structured_rule || "{}");
                        } catch {}

                        return (
                          <div 
                            key={rule.id}
                            className={`p-4 rounded-2xl border transition-all text-left flex justify-between items-start gap-4 ${
                              rule.is_active === 1 
                                ? "bg-indigo-50/10 border-indigo-100 hover:border-indigo-200" 
                                : "bg-slate-50 border-slate-200 opacity-60"
                            }`}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-800 truncate">{rule.rule_name}</span>
                                <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-black ${
                                  rule.is_active === 1 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}>
                                  {rule.is_active === 1 ? "ON (가동중)" : "OFF (비활성)"}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                "{rule.rule_expression}"
                              </p>

                              {/* LLM 파싱 분석 태그 */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                <span className="text-[8.5px] text-slate-400 font-bold">AI 규칙 인식:</span>
                                <span className="text-[8.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                  대상: {structured.operator === 'ALL' ? '전체 직원' : (structured.operator || '전체 직원')}
                                </span>
                                <span className="text-[8.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                  서류: {structured.doc_type === 'import_customs' ? '수입통관' : (structured.doc_type === 'TASK_CANCEL_REQUEST' ? '업무 취소' : '전체')}
                                </span>
                                {structured.max_amount !== undefined && structured.max_amount !== null && (
                                  <span className="text-[8.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-black">
                                    한도: {(structured.max_amount).toLocaleString()} 원 이하
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                              {/* 토글 스위치 */}
                              <button
                                onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                className="bg-transparent border-none p-1 text-slate-400 hover:text-indigo-650 cursor-pointer transition-colors"
                                title={rule.is_active === 1 ? "규칙 끄기" : "규칙 켜기"}
                              >
                                {rule.is_active === 1 ? (
                                  <ToggleRight className="w-7 h-7 text-indigo-600" />
                                ) : (
                                  <ToggleLeft className="w-7 h-7 text-slate-400" />
                                )}
                              </button>

                              {/* 삭제 단추 */}
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="bg-transparent border-none p-1 text-rose-500 hover:text-rose-600 cursor-pointer transition-colors"
                                title="규칙 삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'FOLDERS' ? (
            // 💡 📂 태스크 폴더 관제 탭 뷰 렌더링
            (() => {
              // 1. 직원별 폴더 분포 통계 계산
              const userStats = folders.reduce((acc: {[key: string]: number}, f) => {
                const creator = f.created_by || '현장 모바일';
                acc[creator] = (acc[creator] || 0) + 1;
                return acc;
              }, {});

              const uniqueUsers = Object.keys(userStats);

              const filteredFolders = folders.filter(f => {
                if (selectedUserFilter === 'ALL') return true;
                const creator = f.created_by || '현장 모바일';
                return creator === selectedUserFilter;
              });

              const selectedFolder = folders.find(f => String(f.id) === activeFolderId);

              // 타입 데코레이션 로컬 헬퍼들
              const getItemIcon = (type: string) => {
                switch (type) {
                  case "conversation": return <MessageSquare className="w-4 h-4 text-sky-500" />;
                  case "receipt": return <Receipt className="w-4 h-4 text-emerald-500" />;
                  case "photo": return <Camera className="w-4 h-4 text-indigo-500" />;
                  case "proposal": return <FileText className="w-4 h-4 text-amber-500" />;
                  default: return <FileText className="w-4 h-4 text-slate-400" />;
                }
              };

              const getItemBadgeClass = (type: string) => {
                switch (type) {
                  case "conversation": return "bg-sky-50 text-sky-700 border-sky-100";
                  case "receipt": return "bg-emerald-50 text-emerald-700 border-emerald-100";
                  case "photo": return "bg-indigo-50 text-indigo-700 border-indigo-100";
                  case "proposal": return "bg-amber-50 text-amber-700 border-amber-100";
                  default: return "bg-slate-50 text-slate-600 border-slate-100";
                }
              };

              const getKoreanTypeName = (type: string) => {
                switch (type) {
                  case "conversation": return "미팅/대화";
                  case "receipt": return "지출 영수증";
                  case "photo": return "방문/현장 사진";
                  case "proposal": return "제안/기획 문서";
                  default: return "기타 자료";
                }
              };

              return (
                <div className="space-y-6">
                  {/* 대시보드 관제판 */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <h3 className="text-base font-black text-slate-800 tracking-tight">📂 태스크 폴더 관제 센터</h3>
                      </div>
                      <button
                        onClick={async () => {
                          if (!folderItems || folderItems.length === 0) {
                            alert("선택한 태스크 폴더에 업로드된 수집 자료나 파일이 없습니다. 모바일/PC 포털에서 서류를 업로드해 주신 후 AI 스캔을 실행해 주세요.");
                            return;
                          }

                          const realItem = folderItems.find(i => i.file_name) || folderItems[0];
                          const realFileName = realItem?.file_name || "첨부서류.pdf";
                          const realTitle = realItem?.title || "현장 수집 서류";

                          setAiScanning(true);
                          try {
                            const res = await fetch("/api/cert-patent", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "trigger_ai_scan",
                                payload: {
                                  folder_id: activeFolderId,
                                  title: realTitle,
                                  file_name: realFileName
                                }
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              // 🌟 [원래 UX 100% 복원] 억지 팝업 자동 개방 전면 제거!
                              // 백엔드 판독 완료 즉시 현재 폴더의 수집 리스트를 실시간 갱신하여 최상단에 판독 보고서 카드를 인라인 착! 탑재
                              if (activeFolderId) {
                                await fetchFolderItems(activeFolderId);
                              }
                            } else {
                              alert("AI 스캔 불가: " + (data.error || "폴더에 수집된 파일이 없습니다."));
                            }
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setAiScanning(false);
                          }
                        }}
                          disabled={aiScanning}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all self-start md:self-auto disabled:opacity-50"
                        >
                          {aiScanning ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-amber-300" />
                          )}
                          {aiScanning ? "Gemini 서류 시각 판독 연산 중..." : "선택 폴더 AI Daily 스캔 가동"}
                        </button>
                    </div>
                    
                    {/* 통계 칩스 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex flex-col justify-center">
                        <span className="text-[10px] font-black text-slate-400">전체 생성 폴더</span>
                        <span className="text-xl font-black text-slate-800 mt-1">{folders.length} 개</span>
                      </div>
                      {uniqueUsers.map(user => (
                        <div key={user} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex flex-col justify-center">
                          <span className="text-[10px] font-black text-indigo-500 truncate">{user} 폴더</span>
                          <span className="text-xl font-black text-slate-800 mt-1">{userStats[user]} 개</span>
                        </div>
                      ))}
                    </div>

                    {/* 직원 필터 칩 바 */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-500 mr-2">직원별 관제 필터:</span>
                      <button
                        onClick={() => setSelectedUserFilter("ALL")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          selectedUserFilter === 'ALL'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                        }`}
                      >
                        전체 직원 보기
                      </button>
                      {uniqueUsers.map(user => (
                        <button
                          key={user}
                          onClick={() => setSelectedUserFilter(user)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            selectedUserFilter === user
                              ? 'bg-indigo-650 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                          }`}
                        >
                          {user} ({userStats[user]}개)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2컬럼 레이아웃 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* A. 좌측 컬럼: 폴더 목록 */}
                    <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-slate-800">폴더 목록 ({filteredFolders.length})</h2>
                      </div>

                      {foldersLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          <span className="text-xs font-bold">폴더 목록 로드 중...</span>
                        </div>
                      ) : filteredFolders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                          <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                          <span className="text-xs font-bold block">조회 조건에 맞는 폴더가 없습니다.</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                          {filteredFolders.map(f => {
                            const isActive = String(f.id) === activeFolderId;
                            return (
                              <div
                                key={f.id}
                                onClick={() => setActiveFolderId(String(f.id))}
                                className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between group ${
                                  isActive 
                                    ? "bg-slate-900 border-slate-900 text-white shadow-md scale-98" 
                                    : "bg-slate-50 hover:bg-slate-100/70 border-slate-200/60 text-slate-700"
                                }`}
                              >
                                <div className="space-y-1 min-w-0 pr-2 flex-1">
                                  <div className="font-extrabold text-sm truncate">{f.name}</div>
                                  <p className={`text-[11px] truncate ${isActive ? "text-slate-300" : "text-slate-450"}`}>
                                    {f.description || "등록된 설명이 없습니다."}
                                  </p>
                                  <div className="pt-1 flex">
                                    <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-black border ${
                                      isActive 
                                        ? 'bg-white/10 text-slate-200 border-white/20' 
                                        : 'bg-slate-100 text-slate-500 border-slate-200/60'
                                    }`}>
                                      상신자: {f.created_by || '현장 모바일'}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                                  isActive ? "text-indigo-400 translate-x-1" : "text-slate-350 group-hover:translate-x-0.5"
                                }`} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* B. 우측 컬럼: 폴더 내부 상세 아이템 목록 */}
                    <div className="lg:col-span-8 space-y-6">
                      {selectedFolder ? (
                        <>
                          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/40 border border-indigo-200/50 rounded-3xl p-6 shadow-2xs text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md">Task Folder</span>
                              <span className="text-[10px] text-indigo-700 font-bold">생성일: {selectedFolder.created_at}</span>
                            </div>
                            <h2 className="text-xl font-black text-slate-800 mt-2">{selectedFolder.name}</h2>
                            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-semibold">{selectedFolder.description || "등록된 폴더 설명이 없습니다."}</p>
                          </div>

                          {/* 내부 수집 아이템 목록 */}
                          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left">
                            <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-1.5">
                              <span>수집 자료 목록</span>
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{folderItems.length}</span>
                            </h3>

                            {itemsLoading ? (
                              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-650" />
                                <span className="text-xs font-bold">폴더 내용 불러오는 중...</span>
                              </div>
                            ) : folderItems.length === 0 ? (
                              <div className="py-16 text-center border border-dashed border-slate-150 rounded-2xl text-slate-400">
                                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                <span className="text-xs font-bold block">이 폴더에 수집된 자료가 없습니다.</span>
                              </div>
                            ) : (
                              <div className="relative border-l-2 border-slate-100 pl-4 space-y-6 ml-3">
                                {folderItems.map(item => {
                                  const isAiReport = item.type === 'AI_ANALYSIS_REPORT';
                                  return (
                                    <div 
                                      key={item.id} 
                                      className={`relative group/item transition-all p-4 rounded-2xl border ${
                                        isAiReport 
                                          ? "bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-purple-500/10 border-indigo-300/80 shadow-sm hover:shadow-md cursor-pointer ring-1 ring-indigo-400/30" 
                                          : "bg-white border-transparent"
                                      }`}
                                      onClick={() => {
                                        if (isAiReport) handleOpenKnowledgeDoc(item, selectedFolder?.name);
                                      }}
                                    >
                                      <div className="absolute -left-[27px] top-4 bg-white border-2 border-indigo-400 p-1 rounded-full shadow-xs">
                                        {isAiReport ? <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> : getItemIcon(item.type)}
                                      </div>

                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-black ${isAiReport ? "text-indigo-900 text-sm" : "text-slate-800"}`}>
                                              {item.title}
                                            </span>
                                            <span className={`text-[8.5px] px-2 py-0.5 rounded border font-black ${
                                              isAiReport 
                                                ? "bg-gradient-to-r from-amber-500 to-indigo-600 text-white border-none shadow-2xs" 
                                                : getItemBadgeClass(item.type)
                                            }`}>
                                              {isAiReport ? "🌟 AI Daily 시각 판독 리포트" : getKoreanTypeName(item.type)}
                                            </span>
                                            {item.tags && (
                                              <span className="text-[8.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                                #{item.tags}
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteItem(item.id);
                                            }}
                                            className="p-1 rounded-lg border-none bg-transparent hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition opacity-0 group-hover/item:opacity-100 cursor-pointer"
                                            title="자료 삭제"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        <p className={`text-xs font-semibold whitespace-pre-wrap leading-relaxed p-3.5 rounded-2xl mt-1.5 ${
                                          isAiReport 
                                            ? "bg-white/80 border border-indigo-100 text-slate-800 shadow-2xs font-mono" 
                                            : "bg-slate-50 text-slate-600"
                                        }`}>
                                          {isAiReport && item.content.length > 250 
                                            ? item.content.substring(0, 250) + "...\n\n👉 [클릭하여 전체 Gemini 판독 분석 보고서 및 RAG 적재 명세 상세보기]" 
                                            : item.content}
                                        </p>

                                        {/* 첨부파일 영역 (클릭 시 모바일 포털 /m 과 동일한 서류 뷰어 모달 열림) */}
                                        {(item.file_url || item.file_name) && (
                                          <div 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenFilePreview(item);
                                            }}
                                            className="mt-2.5 flex items-center gap-2 bg-indigo-50/70 hover:bg-indigo-100/90 active:scale-95 p-2.5 rounded-xl border border-indigo-200/60 text-[10.5px] font-bold text-indigo-800 w-fit cursor-pointer transition-all shadow-2xs group/btn"
                                          >
                                            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0 group-hover/btn:scale-110 transition-transform" />
                                            <span className="font-black truncate max-w-xs">{item.file_name || '첨부 파일 (서류 뷰어로 미리보기)'}</span>
                                            <span className="text-indigo-400">({item.file_size || '284 KB'})</span>
                                            <span className="ml-1 text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-md font-black">뷰어 열기</span>
                                          </div>
                                        )}

                                        <div className="text-[9px] text-slate-400 font-bold pt-1.5 flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-slate-350" />
                                          <span>수집일: {item.created_at}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center text-slate-400 shadow-xs flex flex-col justify-center items-center gap-2.5 min-h-[400px]">
                          <FolderOpen className="w-12 h-12 text-slate-200" />
                          <span className="text-xs font-bold">좌측에서 관제할 태스크 폴더를 선택해 주세요.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : activeTab === 'REPORTS' ? (
            // 💡 일일 업무 보고서 탭 뷰
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-slate-400" />
                  <span>임직원이 모바일에서 제출한 일일 업무 보고서 결재 목록입니다.</span>
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-xs">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <span className="text-xs font-bold block">제출된 임직원 일일 업무 보고서가 없습니다.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reports.map((report) => (
                    <div 
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report);
                        
                        // 💡 [변경] 이미 AI 의견을 한 번 로드한 보고서인 경우 캐시를 재활용하고, 처음 여는 경우에만 1회 자동 실행합니다.
                        if (aiSuggestionsCache[report.id]) {
                          setAiComments(aiSuggestionsCache[report.id]);
                        } else {
                          setAiComments([]); // 초기화
                          handleGetAiComments(report);
                        }
                      }}
                      className="bg-white border border-slate-200/85 hover:border-indigo-200 hover:bg-indigo-50/10 rounded-3xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md cursor-pointer text-left group"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800">{report.operator} 사원</span>
                            <span className="text-xs text-slate-400 font-bold">{report.report_date} 일보</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            report.status === 'APPROVED' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : report.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : report.status === 'RESUBMITTED'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse'
                                  : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                          }`}>
                            {report.status === 'APPROVED' ? '결재 승인' : report.status === 'REJECTED' ? '반려' : report.status === 'RESUBMITTED' ? '🔄 보완 재상신' : '결재 대기'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-650 font-semibold line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {report.report_content}
                        </p>
                      </div>
                      
                      <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center text-[10px] text-slate-400">
                        <span>업데이트: {report.updated_at || report.created_at}</span>
                        <span className="text-[11px] text-indigo-650 font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5">
                          <span>보고서 확인 및 결재하기</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // 💡 소프트 삭제 복원 대장
            deletedItems.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-xs">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <span className="text-xs font-bold block">소프트 삭제되어 격리 보관 중인 대장 원장이 없습니다.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deletedItems.map((item) => (
                  <div key={`${item.doc_type}_${item.id}`} className="bg-white border border-slate-200/85 hover:border-slate-300 rounded-3xl p-5 shadow-xs flex justify-between items-center transition-all hover:shadow-md">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          item.doc_type === 'estimate' ? 'bg-indigo-50 text-indigo-700' : item.doc_type === 'purchase_order' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.doc_type === 'estimate' ? '견적' : item.doc_type === 'purchase_order' ? '발주' : '수주'}
                        </span>
                        <span className="font-bold text-slate-800">{item.id}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        거래처: {item.customer_name || item.partner_name || "미지정"}
                      </div>
                      <div className="text-xs text-slate-500">
                        금액: {item.total_amount ? `${item.total_amount.toLocaleString()}원` : "0원"}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>삭제자: {item.deleted_by}</span>
                        <span>•</span>
                        <span>삭제일시: {item.deleted_at}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>원장 복원</span>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>

      {/* 4구역: 자율 대행 조치 상세 팝업 모달 */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 animate-scale-in text-left">
            
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-base font-black text-slate-800">AI 관제 원장 상세 검토</h3>
              </div>
              <button 
                onClick={handleCloseDetail}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 이벤트 속성 상세 테이블 */}
            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">이벤트 데이터 명세</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block">이벤트 ID</span>
                  <span className="font-mono font-bold text-slate-800">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">발생 유형</span>
                  <span className="font-bold text-slate-850">{selectedEvent.type}</span>
                </div>
                {selectedEvent.type === 'STORE_ORDER' && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 my-1"></div>
                    <div>
                      <span className="text-slate-400 font-semibold block">주문 고객</span>
                      <span className="font-bold text-slate-800">{selectedEvent.data.customer_name} ({selectedEvent.data.customer_phone})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">주문 품목</span>
                      <span className="font-bold text-slate-800">{selectedEvent.data.product_name} ({selectedEvent.data.quantity}개)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">최종 결제 금액</span>
                      <span className="font-bold text-slate-800">{Number(selectedEvent.data.total_price || 0).toLocaleString()}원</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">배송지 주소</span>
                      <span className="font-bold text-slate-800 leading-relaxed">{selectedEvent.data.shipping_address || '직접 수령'}</span>
                    </div>
                    {selectedEvent.data.customer_memo && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-semibold block">고객 메모</span>
                        <span className="font-semibold text-slate-700 whitespace-pre-wrap">{selectedEvent.data.customer_memo}</span>
                      </div>
                    )}
                  </>
                )}
                {selectedEvent.type === 'RAG_HOLD' && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 my-1"></div>
                    {selectedEvent.data.doc_type === 'mobile_request' ? (
                      <>
                        <div>
                          <span className="text-slate-400 font-semibold block">요청 종류</span>
                          <span className="font-bold text-indigo-600 uppercase">모바일 현장 작업 요청</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">요청 식별 번호</span>
                          <span className="font-bold text-slate-800">{selectedEvent.data.doc_id}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 font-semibold block">현장 요청 사항 (음성 변환)</span>
                          <span className="font-semibold text-indigo-950 bg-indigo-50/50 p-3 rounded-2xl block mt-1 leading-relaxed border border-indigo-100/60 whitespace-pre-wrap">
                            {selectedEvent.data.reason}
                          </span>
                          {/* 📎 [상신 첨부 파일 열기 버튼] */}
                          {selectedEvent.data.file_url && (
                            <div className="mt-2.5 flex items-center">
                              <a
                                href={selectedEvent.data.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-extrabold text-[11px] px-3.5 py-2.5 rounded-xl border border-indigo-100 transition-all shadow-3xs hover:shadow-xs decoration-none cursor-pointer"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-indigo-650" />
                                <span>상신 첨부 파일 열기: {selectedEvent.data.matched_filename || '동우일렉트릭.jpg'}</span>
                              </a>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">요청 임직원</span>
                          <span className="font-bold text-slate-800">{selectedEvent.data.operator || '임직원'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-400 font-semibold block">보류 문서 유형</span>
                          <span className="font-bold text-slate-800 uppercase">{selectedEvent.data.doc_type}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">보류 대상 문서 ID</span>
                          <span className="font-bold text-slate-800">{selectedEvent.data.doc_id}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 font-semibold block">AI 보류 사유 / 사내 내규 지침</span>
                          <span className="font-semibold text-rose-600 bg-rose-50/50 p-2 rounded-lg block mt-1 leading-relaxed border border-rose-100">
                            {selectedEvent.data.reason}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">신청 작업자</span>
                          <span className="font-bold text-slate-800">{selectedEvent.data.operator || 'system'}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                {selectedEvent.type === 'TASK_CANCEL_REQUEST' && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 my-1"></div>
                    <div>
                      <span className="text-slate-400 font-semibold block">상신 취소 요청자</span>
                      <span className="font-bold text-slate-800">{selectedEvent.data.operator || '임직원'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">대상 업무 ID</span>
                      <span className="font-mono font-bold text-slate-800">{selectedEvent.data.doc_id || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-semibold block">취소 신청 사유</span>
                      <span className="font-semibold text-indigo-950 bg-indigo-50/50 p-4 rounded-2xl block mt-1 leading-relaxed border border-indigo-100/60 whitespace-pre-wrap">
                        {selectedEvent.data.reason || '사유가 입력되지 않았습니다.'}
                      </span>
                    </div>
                  </>
                )}
                {selectedEvent.type === 'LOW_STOCK' && (
                  <>
                    <div className="col-span-2 border-t border-slate-100 my-1"></div>
                    <div>
                      <span className="text-slate-400 font-semibold block">상품 코드</span>
                      <span className="font-mono font-bold text-slate-800">{selectedEvent.data.barcode || `INV-${selectedEvent.data.id}`}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">상품 명</span>
                      <span className="font-bold text-slate-855">{selectedEvent.data.name || selectedEvent.data.itemName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">현재고 / 안전재고 한도</span>
                      <span className="font-bold text-rose-600">{selectedEvent.data.quantity}개 / {selectedEvent.data.safety_stock || selectedEvent.data.safetyStock}개</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI 추천 자율 대행 액션 리스트 */}
            {!actionReports && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-indigo-650" />
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 추천 다음 작업 시나리오</h4>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {getRecommendedActions(selectedEvent).map((act, idx) => {
                    const isSelected = selectedActions.includes(act.code);
                    return (
                      <div 
                        key={`${act.code}-${idx}`}
                        onClick={() => toggleActionSelection(act.code)}
                        className="p-4 flex gap-3 hover:bg-slate-50 cursor-pointer transition-colors text-left"
                      >
                        <div className="pt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-800 block">{act.label}</span>
                          <span className="text-[11px] text-slate-400 font-medium leading-relaxed block">{act.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 작업 수행 결과 리포트 출력 */}
            {actionReports && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 자율 대행 수행 보고서</h4>
                </div>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white overflow-hidden text-left">
                  {actionReports.map((rep, idx) => (
                    <div key={idx} className="p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rep.success ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                        <span className="text-xs font-black text-slate-850 uppercase">{rep.action}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${rep.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {rep.success ? "성공" : "실패"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-650 font-semibold pl-4 leading-relaxed">{rep.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 모달 푸터 버튼 */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleCloseDetail}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-xl border border-slate-200 shadow-xs text-xs transition-colors cursor-pointer"
              >
                {actionReports ? "닫기 및 리프레시" : "검토 보류"}
              </button>
              
              {!actionReports ? (
                <button
                  onClick={handleExecuteActions}
                  disabled={isExecuting || selectedActions.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-2 transition-all"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI 자율 대행 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>선택한 자율 작업 실행 ⚡</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleCloseDetail();
                    loadData();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>최종 관제 완료 및 리스트업 갱신</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 5구역: 통합 작업 감사 상세 Diff 대조 모달 */}
      {selectedAudit && (() => {
        let beforeObj = null;
        let afterObj = null;
        try {
          const detail = JSON.parse(selectedAudit.detail_json || "{}");
          beforeObj = detail.before;
          afterObj = detail.after;
        } catch (e) {
          console.warn("Failed to parse detail_json in audit modal");
        }

        const diffFields = getDiffFields(beforeObj, afterObj);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 animate-scale-in text-left">
              
              {/* 모달 헤더 */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-800">통합 작업 감사 데이터 비교(Diff)</h3>
                </div>
                <button 
                  onClick={() => setSelectedAudit(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 기본 요약 내역 */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 font-semibold block">감사로그 ID</span>
                    <span className="font-mono font-bold text-slate-800">{selectedAudit.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">일시 (KST)</span>
                    <span className="font-bold text-slate-800">{selectedAudit.created_at}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">조작 주체</span>
                    <span className="font-bold text-slate-800">
                      {selectedAudit.source === 'AI' ? '🤖 AI 자율 대행' : `👤 임직원 (${selectedAudit.operator})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">작업 종류</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedAudit.action_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">관련 대장(Table)</span>
                    <span className="font-mono font-bold text-indigo-600">{selectedAudit.doc_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">관련 문서 번호(ID)</span>
                    <span className="font-bold text-slate-800">{selectedAudit.doc_id || '(없음)'}</span>
                  </div>
                </div>
                <div className="border-t border-slate-200/60 pt-2">
                  <span className="text-slate-400 font-semibold block">변경 요약</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedAudit.doc_title}</p>
                </div>
              </div>

              {/* 변경 필드 대조 테이블 */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">변경 필드 값 대조 (Diff)</h4>
                {diffFields.length === 0 ? (
                  <div className="border border-slate-200/80 rounded-2xl p-6 text-center text-xs font-bold text-slate-400">
                    값의 변동 사항이 없거나 단순 메타데이터 변경 건입니다.
                  </div>
                ) : (
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[300px] overflow-y-auto">
                    <table className="w-full border-collapse text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                          <th className="p-3">필드명 (Field)</th>
                          <th className="p-3">변경 전 (Before)</th>
                          <th className="p-3">변경 후 (After)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {diffFields.map((df) => (
                          <tr key={df.field} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-indigo-650">{df.field}</td>
                            <td className="p-3 text-rose-600/90 line-through whitespace-pre-wrap">{df.beforeVal}</td>
                            <td className="p-3 text-emerald-700 bg-emerald-50/20 whitespace-pre-wrap">{df.afterVal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 모달 푸터 */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer transition-colors"
                >
                  확인 완료
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 5.1구역: 일일 업무 보고서 상세 검토 및 결재 모달 (신규) */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 animate-scale-in text-left">
            {/* 헤더 */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-650" />
                <h3 className="text-base font-black text-slate-800">
                  {selectedReport.operator} 사원 일일 보고서 검토
                </h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedReport(null);
                  setReportComment("");
                  setAiComments([]);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 메타데이터 */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 font-semibold block">보고 사원</span>
                  <span className="font-bold text-slate-800">{selectedReport.operator}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">보고 일자</span>
                  <span className="font-bold text-slate-800">{selectedReport.report_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">현재 상태</span>
                  <span className={`font-bold text-xs ${
                    selectedReport.status === 'APPROVED' 
                      ? 'text-emerald-600' 
                      : selectedReport.status === 'REJECTED' 
                        ? 'text-rose-600' 
                        : selectedReport.status === 'RESUBMITTED'
                          ? 'text-sky-600 animate-pulse'
                          : 'text-amber-600 animate-pulse'
                  }`}>
                    {selectedReport.status === 'APPROVED' ? '결재 승인완료' : selectedReport.status === 'REJECTED' ? '반려' : selectedReport.status === 'RESUBMITTED' ? '🔄 보완 재상신 검토 중' : '결재 대기 중'}
                  </span>
                </div>
                {selectedReport.approved_at && (
                  <div>
                    <span className="text-slate-400 font-semibold block">결재 처리 일시</span>
                    <span className="font-bold text-slate-800">{selectedReport.approved_at}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 보고서 내용 */}
            <div className="space-y-2 text-xs">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">제출된 일보 본문</h4>
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-y-auto">
                {selectedReport.report_content}
              </div>
            </div>

            {/* 💡 [추가] 반려 후 재상신 건일 때 직전 반려 사유 노출 */}
            {selectedReport.status === 'RESUBMITTED' && selectedReport.comment && (
              <div className="bg-rose-50/40 border border-rose-100/50 rounded-2xl p-4 text-xs font-semibold space-y-1 animate-scale-in">
                <span className="text-[10px] font-black text-rose-700 block">💬 직전 결재 반려 의견 (보완 요구 사항):</span>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-bold">{selectedReport.comment}</p>
              </div>
            )}

            {/* 대표자 코멘트 및 AI 추천 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                  대표자 코멘트 및 결재 의견
                </label>

                {/* 🤖 AI 코멘트 피드백 제안 단추 */}
                <button
                  onClick={() => handleGetAiComments(selectedReport)}
                  disabled={aiCommentsLoading}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-3 py-1.5 rounded-xl border border-indigo-100 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" />
                  <span>{aiCommentsLoading ? '의견 분석 중...' : '🤖 AI 피드백 코멘트 제안'}</span>
                </button>
              </div>

              {/* AI 제안 칩 노출 */}
              {aiComments.length > 0 && (
                <div className="space-y-2 p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl">
                  <span className="text-[9px] font-black text-indigo-700 block">💡 마음에 드는 AI 추천 피드백을 선택해 보세요:</span>
                  <div className="flex flex-col gap-2">
                    {aiComments.map((comment) => (
                      <button
                        key={comment.type}
                        onClick={() => setReportComment(comment.text)}
                        className="text-left p-2.5 bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-xl text-[11px] font-semibold text-slate-700 leading-relaxed transition-all cursor-pointer shadow-2xs"
                      >
                        <span className="font-extrabold text-indigo-700 block mb-0.5">{comment.label}</span>
                        {comment.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-750 leading-relaxed placeholder-slate-400 outline-none focus:border-indigo-500 resize-none transition-colors"
                placeholder="직원에게 전달할 피드백이나 지시 사항을 작성해 주세요. (결재 승인/반려 시 모두 적용됩니다)"
              />
            </div>

            {/* 기존 대표자 피드백 코멘트가 있는 경우 */}
            {selectedReport.comment && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400 font-bold block">결재 의견 피드백:</span>
                <span className="text-slate-700 font-semibold">{selectedReport.comment}</span>
              </div>
            )}

            {/* 결재 버튼 */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setReportComment("");
                  setAiComments([]);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer transition-colors"
              >
                취소
              </button>
              
              {(selectedReport.status === 'SUBMITTED' || selectedReport.status === 'RESUBMITTED') && (
                <>
                  <button
                    onClick={() => handleDecideReport(selectedReport.id, 'REJECTED')}
                    disabled={isProcessing}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-rose-250/30 transition-colors shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>보완 및 반려</span>
                  </button>
                  
                  <button
                    onClick={() => handleDecideReport(selectedReport.id, 'APPROVED')}
                    disabled={isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none transition-colors shadow-xs"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>결재 승인 완료</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6구역: 자율 규칙 자동 제안 및 등록 모달 (프리미엄 기능) */}
      {suggestRuleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-in text-left">
            {/* 헤더 */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="text-base font-black text-slate-800">🤖 AI 자율 규칙 원클릭 등록</h3>
              </div>
              <button 
                onClick={() => setSuggestRuleModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 설명 및 내용 */}
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                최고관리자님의 조치 이력을 바탕으로 AI가 자동으로 자율 처리 규칙을 추천합니다.
                등록 후 활성화(ON)해 두시면 다음 유사 상신 건은 최고관리자 승인 없이 자동 자율 대행 처리됩니다.
              </p>

              {/* 규칙 명칭 */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">자율 규칙명</label>
                <input 
                  type="text"
                  value={suggestedRuleName}
                  onChange={(e) => setSuggestedRuleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-850 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors"
                  placeholder="예: [자동화] 특정 규칙"
                />
              </div>

              {/* 규칙 자연어 표현식 */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">자율 통제 조건 (자연어)</label>
                <textarea
                  value={suggestedRuleExpression}
                  onChange={(e) => setSuggestedRuleExpression(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-750 leading-relaxed placeholder-slate-400 outline-none focus:border-indigo-500 resize-none transition-colors"
                  placeholder="의사결정 및 처리 흐름을 자연어로 묘사해 주세요."
                />
              </div>
            </div>

            {/* 푸터 버튼 */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => setSuggestRuleModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs border-none cursor-pointer transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmSuggestRule}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none transition-colors shadow-xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>등록 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>규칙 등록 및 기동</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧠 태스크 폴더 지식 문서 원터치 전문 뷰어 모달 */}
      <TaskKnowledgeDocumentModal
        isOpen={isKnowledgeModalOpen}
        onClose={() => setIsKnowledgeModalOpen(false)}
        document={knowledgeModalDoc}
      />

      {/* 📁 [모바일 포털 /m 과 100% 동일] 현장 수집 서류 PDF/이미지 실물 모달 뷰어 */}
      {isFilePreviewOpen && filePreviewItem && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            {/* 모달 상단 헤더 */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600/30 flex items-center justify-center border border-indigo-400/30 text-indigo-300">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    📁 {filePreviewItem.title || "현장 수집 자료"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold truncate max-w-md">
                    파일명: {filePreviewItem.file_name || "수집서류.pdf"} ({filePreviewItem.file_size || "284 KB"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFilePreviewOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer border-none"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 중앙 서류 뷰어 (PDF/이미지 통합 게이트웨이 서빙) */}
            <div className="flex-1 bg-slate-800/90 p-3 relative flex items-center justify-center overflow-hidden">
              <iframe
                src={`/api/shared/files?tableName=crm_task_folder_items&rowId=${filePreviewItem.id}&columnName=file_url`}
                className="w-full h-full rounded-2xl bg-white border border-slate-700/50 shadow-inner"
                title="서류 뷰어"
              />
            </div>

            {/* 모달 하단 버튼 액션 바 */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  수집 등록일: {filePreviewItem.created_at || new Date().toISOString().substring(0, 10)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/shared/files?tableName=crm_task_folder_items&rowId=${filePreviewItem.id}&columnName=file_url`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 no-underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>새 탭에서 열기</span>
                </a>
                <button
                  onClick={() => setIsFilePreviewOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none shadow-xs"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👤 AI 파싱 배정대기 할 일 담당자 지정 모달 */}
      {isAssignModalOpen && selectedTaskForAssign && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-scale-up text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">담당 직원 할 일 배정</h3>
                  <p className="text-xs text-slate-500 font-bold">선택한 직원의 모바일 포털로 즉시 발송 전송됩니다.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-1">
              <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded">대상 서류/할 일</span>
              <h4 className="text-xs font-black text-slate-800 pt-1">{selectedTaskForAssign.title}</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">{selectedTaskForAssign.description}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block">배정 대상 직원 선택</label>
              <select
                value={assignTargetUser}
                onChange={(e) => setAssignTargetUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="김직원">김직원 (현장 모바일)</option>
                <option value="박대리">박대리 (무역/통관팀)</option>
                <option value="최고관리자">최고관리자 (직접 수행)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
              >
                취소
              </button>
              <button
                onClick={handleAssignTask}
                disabled={assignTaskLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                {assignTaskLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>배정 전송 중...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>담당 배정 완료 및 발송</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
