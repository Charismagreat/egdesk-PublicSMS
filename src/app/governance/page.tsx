"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import Link from "next/link";
import { onUserDataChanged } from "../../../egdesk-helpers";
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, 
  RotateCcw, RefreshCw, Trash2, ShieldCheck, 
  Sparkles, ListTodo, FileText, ChevronRight, X, 
  Search, UserCheck, FolderOpen, Calendar, Bot, Zap
} from "lucide-react";

import TaskKnowledgeDocumentModal from "@/components/TaskKnowledgeDocumentModal";
import GovernanceEventsTab from "./components/GovernanceEventsTab";
import GovernanceDetailModal from "./components/GovernanceDetailModal";
import GovernanceRulesTab from "./components/GovernanceRulesTab";
import GovernanceTaskFoldersTab from "./components/GovernanceTaskFoldersTab";
import GovernanceReportsTab from "./components/GovernanceReportsTab";
import GovernanceRestoreTab from "./components/GovernanceRestoreTab";
import TopDownCommandCenter from "./components/TopDownCommandCenter";

interface ControlEvent {
  id: string;
  type: 'STORE_ORDER' | 'RAG_HOLD' | 'LOW_STOCK' | 'TASK_CANCEL_REQUEST' | 'LEAVE_APPROVAL_REQUEST';
  title: string;
  subtitle: string;
  status: 'WAITING' | 'RESOLVED';
  created_at: string;
  due_date?: string | null;
  data: any;
}

interface DeletedItem {
  id: string;
  doc_type: 'estimate' | 'purchase_order' | 'sales_order';
  customer_name?: string;
  partner_name?: string;
  total_amount?: number;
  deleted_at: string;
  deleted_by: string;
}

export default function GovernanceDashboard() {
  // 메인 탭 persistence 적용 (기본값: EVENTS)
  const [activeTab, setActiveTab] = usePersistedState<'EVENTS' | 'RULES' | 'RESTORE' | 'FOLDERS' | 'REPORTS'>(
    'governance_activeTab',
    'EVENTS'
  );

  // 피드 관제 2차 서브 탭 persistence 적용
  const [subTab, setSubTab] = usePersistedState<'ALL' | 'WAITING' | 'SCHEDULED' | 'RESOLVED' | 'AUDIT'>(
    'governance_subTab',
    'ALL'
  );

  // 복합 필터 조건 persistence 적용
  const [filterOperator, setFilterOperator] = usePersistedState<string>('governance_filterOperator', 'ALL');
  const [filterDomain, setFilterDomain] = usePersistedState<string>('governance_filterDomain', 'ALL');
  const [searchQuery, setSearchQuery] = usePersistedState<string>('governance_searchQuery', '');

  // 상태값 선언
  const [events, setEvents] = useState<ControlEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [autoRules, setAutoRules] = useState<any[]>([]);
  const [taskFolders, setTaskFolders] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<any[]>([]);
  const [unassignedFilesCount, setUnassignedFilesCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ControlEvent | null>(null);
  const [eventDueDate, setEventDueDate] = useState<string>('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [actionReports, setActionReports] = useState<{ action: string; success: boolean; detail: string }[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // 서류 미리보기 모달 상태
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalTitle, setDocModalTitle] = useState("");
  const [docModalUrl, setDocModalUrl] = useState("");
  const [docModalText, setDocModalText] = useState("");

  // 자율 규칙 및 일일보고서 모달 상태
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleExpr, setNewRuleExpr] = useState("");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [assigneeMap, setAssigneeMap] = useState<{ [taskId: string]: string }>({});
  const [dueDateMap, setDueDateMap] = useState<{ [taskId: string]: string }>({});

  // 1. 전체 관제 데이터 페칭
  const safeFetchJson = async (url: string) => {
    try {
      const res = await apiFetch(url);
      if (!res.ok) return { success: false };
      return await res.json().catch(() => ({ success: false }));
    } catch {
      return { success: false };
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [evtData, delData, rulesData, unassignedData] = await Promise.all([
        safeFetchJson('/api/governance?action=events'),
        safeFetchJson('/api/governance?action=deleted_items'),
        safeFetchJson('/api/governance?action=get_auto_rules'),
        safeFetchJson('/api/governance?action=get_unassigned_customs_files')
      ]);

      if (evtData?.success) {
        setEvents(evtData.events || []);
        setAuditLogs(evtData.logs || []);
      }
      if (delData?.success) {
        setDeletedItems(delData.deletedItems || []);
      }
      if (rulesData?.success) {
        setAutoRules(rulesData.rules || []);
      }
      if (unassignedData && typeof unassignedData.count === 'number') {
        setUnassignedFilesCount(unassignedData.count);
      }
    } catch (err) {
      console.error("GovernanceDashboard loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. 태스크 폴더 데이터 페칭
  const loadTaskFolders = useCallback(async () => {
    try {
      const res = await apiFetch('/api/governance?action=get_task_folders');
      const data = await res.json();
      if (data.success) {
        setTaskFolders(data.folders || []);
        if (data.folders && data.folders.length > 0 && !selectedFolderId) {
          setSelectedFolderId(data.folders[0].id);
        }
      }
    } catch (err) {
      console.error("loadTaskFolders error:", err);
    }
  }, [selectedFolderId]);

  // 3. 폴더 내 파일 리스트 페칭
  const loadFolderFiles = useCallback(async (folderId: string) => {
    try {
      const res = await apiFetch(`/api/governance?action=get_folder_files&folder_id=${folderId}`);
      const data = await res.json();
      if (data.success) {
        setFolderFiles(data.files || []);
      }
    } catch (err) {
      console.error("loadFolderFiles error:", err);
    }
  }, []);

  // 4. 일일 보고서 및 사원 리스트 페칭
  const loadDailyReports = useCallback(async () => {
    try {
      const [repRes, opRes] = await Promise.all([
        apiFetch('/api/governance?action=daily_reports'),
        apiFetch('/api/governance?action=get_operators').catch(() => ({ json: async () => ({ operators: [] }) }))
      ]);
      const repData = await repRes.json();
      const opData = await opRes.json().catch(() => ({ operators: [] }));

      if (repData.success) {
        setDailyReports(repData.reports || []);
      }
      if (opData.success) {
        setOperators(opData.operators || []);
      }
    } catch (err) {
      console.error("loadDailyReports error:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadTaskFolders();
    loadDailyReports();

    // 실시간 무손실 스토리지 동기화 이벤트 수신
    const unsubscribe = onUserDataChanged(() => {
      loadData();
      loadTaskFolders();
      loadDailyReports();
    });
    return () => unsubscribe();
  }, [loadData, loadTaskFolders, loadDailyReports]);

  useEffect(() => {
    if (selectedFolderId) {
      loadFolderFiles(selectedFolderId);
    }
  }, [selectedFolderId, loadFolderFiles]);

  // 선택된 일일 보고서의 후속 추천 태스크 페칭
  useEffect(() => {
    if (selectedReport) {
      (async () => {
        try {
          const res = await apiFetch(`/api/governance?action=get_pending_tasks&report_id=${selectedReport.id}`);
          const data = await res.json();
          if (data.success) {
            setPendingTasks(data.tasks || []);
          }
        } catch (e) {
          console.error("get_pending_tasks error:", e);
        }
      })();
    }
  }, [selectedReport]);

  // 모달 닫기
  const handleCloseDetail = () => {
    setSelectedEvent(null);
    setSelectedActions([]);
    setActionReports(null);
    setEventDueDate('');
  };

  // 모달 오픈 핸들러
  const handleOpenDetail = (evt: ControlEvent) => {
    setSelectedEvent(evt);
    setEventDueDate(evt.due_date || '');
    const defaultCodes = (evt.data?.suggested_actions || [
      { code: "NOTIFY_USER" },
      { code: "LOG_AUDIT" }
    ]).map((a: any) => a.code);
    setSelectedActions(defaultCodes);
    setActionReports(null);
  };

  // 처리 일시 저장
  const handleSaveEventDueDate = async () => {
    if (!selectedEvent || !eventDueDate) {
      alert("지정할 처리 일시(due_date)를 선택해 주십시오.");
      return;
    }
    try {
      const res = await apiFetch("/api/governance?action=update_task_due_date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: selectedEvent.id,
          log_id: selectedEvent.data?.id,
          due_date: eventDueDate
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ " + (data.message || "처리 일시(마감일)가 바르게 저장되었습니다."));
        setSelectedEvent(prev => prev ? { ...prev, due_date: eventDueDate } : null);
        loadData();
      } else {
        alert("❌ 처리 일시 저장 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  };

  // 자율 액션 실행 및 동일 유형 AI 자율 자동 실행 규칙 등록
  const handleExecuteActions = async (options?: { saveAutoRule?: boolean }) => {
    if (!selectedEvent || selectedActions.length === 0) return;
    setIsExecuting(true);
    try {
      // 1. 자율 작업 실행
      const res = await apiFetch("/api/governance?action=execute_autonomous_actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          actions: selectedActions
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionReports(data.reports || []);

        // 2. [선택 시] 향후 동일 업무 AI 자율 자동 실행 규칙으로 등록
        if (options?.saveAutoRule) {
          const ruleTitle = `[자율 대행] ${(selectedEvent.title || '').replace(/^AI 결재 보류:\s*/g, '')} 자율 처리 규칙`;
          const ruleExpr = `업무 유형 '${selectedEvent.type}' 발생 시 자율 조치(${selectedActions.join(', ')}) 자동 처리`;
          await apiFetch('/api/governance?action=save_auto_rule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: ruleTitle,
              expression: ruleExpr
            })
          }).catch(() => {});
        }
      } else {
        alert("자율 액션 실행 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 취소 승인 / 기각 핸들러
  const handleApproveCancelRequest = async (evt: any) => {
    if (!window.confirm("📌 직원의 업무 취소 요청을 최종 승인하시겠습니까?\n\n승인 시 해당 상신 건과 수록 데이터가 완전 삭제 및 관제 완료 정돈됩니다.")) return;
    setIsExecuting(true);
    try {
      const cancelLogId = evt.data?.cancel_log?.id || (evt.type === 'TASK_CANCEL_REQUEST' ? evt.data?.id : null);
      const targetLogId = evt.data?.id;
      const targetDocId = evt.data?.doc_id;

      const res = await apiFetch("/api/governance?action=approve_cancel_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_id: targetLogId,
          cancel_log_id: cancelLogId,
          doc_id: targetDocId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ " + (data.message || "취소 요청이 최종 승인 처리되었습니다."));
        setSelectedEvent(null);
        loadData();
      } else {
        alert("❌ 승인 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRejectCancelRequest = async (evt: any) => {
    if (!window.confirm("📌 직원의 업무 취소 요청을 기각(반려)하시겠습니까?\n\n기각 시 기존 상신 건이 정상 진행 상태로 보존되어 관제 관리됩니다.")) return;
    setIsExecuting(true);
    try {
      const cancelLogId = evt.data?.cancel_log?.id || (evt.type === 'TASK_CANCEL_REQUEST' ? evt.data?.id : null);
      const targetLogId = evt.data?.id;

      const res = await apiFetch("/api/governance?action=reject_cancel_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_id: targetLogId,
          cancel_log_id: cancelLogId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ " + (data.message || "취소 요청이 성공적으로 기각되었습니다."));
        setSelectedEvent(null);
        loadData();
      } else {
        alert("❌ 기각 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 연차 승인 / 기각 핸들러
  const handleApproveLeave = async (leaveId: string) => {
    if (!window.confirm("정말로 이 휴가 신청서를 최종 결재 승인하시겠습니까?\n승인 시 해당 사원의 연차 잔액이 소모되며 근태 캘린더에 연동 적재됩니다.")) return;
    setIsExecuting(true);
    try {
      const res = await apiFetch("/api/governance?action=approve_leave_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leave_id: leaveId })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "성공적으로 승인 완료되었습니다.");
        setSelectedEvent(null);
        loadData();
      } else {
        alert("승인 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    const rejectReason = window.prompt("기각 사유를 작성해 주십시오:", "업무 일정 조율 필요");
    if (rejectReason === null) return;

    setIsExecuting(true);
    try {
      const res = await apiFetch("/api/governance?action=reject_leave_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leave_id: leaveId, reject_reason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "정상 반려 기각되었습니다.");
        setSelectedEvent(null);
        loadData();
      } else {
        alert("반려 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 항목 제어 액션 해제
  const handleRemoveAction = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    setSelectedActions(prev => prev.filter(c => c !== code));
  };

  // 서류 모달 열기
  const handleOpenDocumentModal = (title: string, url: string, rawText?: string) => {
    setDocModalTitle(title);
    setDocModalUrl(url);
    setDocModalText(rawText || "");
    setDocModalOpen(true);
  };

  // 복원 핸들러
  const handleRestore = async (item: DeletedItem) => {
    if (!window.confirm(`${item.doc_type} [${item.id}] 항목을 원래 대장 데이터로 복원하시겠습니까?`)) return;
    try {
      const res = await apiFetch("/api/governance?action=restore_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: item.doc_type, id: item.id })
      });
      const data = await res.json();
      if (data.success) {
        alert("성공적으로 원본 데이터가 복원되었습니다.");
        loadData();
      } else {
        alert("복원 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신하는 중 오류가 발생했습니다.");
    }
  };

  // 미배정 수입통관 서류 원터치 등록
  const handleQuickAssignCustomsDoc = async () => {
    if (!window.confirm("📄 미배정 수입 통관 실물 서류를 수입통관 대장에 즉시 자동 등록하고 관제 배정하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/governance?action=quick_assign_customs_doc", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("✅ " + (data.message || "수입 통관 대장에 성공적으로 등록 완료되었습니다."));
        loadData();
      } else {
        alert("❌ 등록 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  // 자율 규칙 추가/토글/삭제
  const handleCreateRule = async () => {
    if (!newRuleName || !newRuleExpr) {
      alert("규칙 이름과 표현식을 입력하세요.");
      return;
    }
    try {
      const res = await apiFetch("/api/governance?action=create_auto_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule_name: newRuleName, rule_expression: newRuleExpr })
      });
      const data = await res.json();
      if (data.success) {
        alert("신규 자율 규칙이 등록되었습니다.");
        setShowRuleModal(false);
        setNewRuleName("");
        setNewRuleExpr("");
        loadData();
      }
    } catch (e) {
      alert("서버 통신 오류");
    }
  };

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    try {
      const res = await apiFetch("/api/governance?action=toggle_auto_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive })
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (e) {}
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("정말로 이 자율 규칙을 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/governance?action=delete_auto_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (e) {}
  };

  // 태스크 폴더 파일 통제 삭제
  const handleDeleteFolderFile = async (fileId: string) => {
    if (!window.confirm("이 수집 자료 파일을 삭제 통제하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/governance?action=delete_folder_file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId })
      });
      const data = await res.json();
      if (data.success) {
        alert("정상 삭제되었습니다.");
        if (selectedFolderId) loadFolderFiles(selectedFolderId);
      }
    } catch (e) {}
  };

  // 추천 태스크 최종 승인 배정
  const handleApprovePendingTask = async (task: any) => {
    const assigneeId = assigneeMap[task.id];
    const dueDate = dueDateMap[task.id];
    setIsExecuting(true);
    try {
      const res = await apiFetch("/api/governance?action=approve_pending_task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          task_title: task.task_title,
          task_description: task.task_description,
          assignee_id: assigneeId,
          due_date: dueDate
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ " + (data.message || "추천 업무가 배정되었습니다."));
        if (selectedReport) {
          const resPending = await apiFetch(`/api/governance?action=get_pending_tasks&report_id=${selectedReport.id}`);
          const pData = await resPending.json();
          if (pData.success) setPendingTasks(pData.tasks || []);
        }
      }
    } catch (e) {
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsExecuting(false);
    }
  };

  // 통합 피드 매핑 및 필터링
  const mappedEvents = events.map(e => ({
    id: `event_${e.id}`,
    feedType: 'EVENT' as const,
    created_at: e.created_at,
    data: e
  }));

  const mappedAuditLogs = auditLogs.map(a => ({
    id: `audit_${a.id}`,
    feedType: 'AUDIT' as const,
    created_at: a.created_at,
    data: a
  }));

  const combinedFeed = [...mappedEvents, ...mappedAuditLogs].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filteredFeed = combinedFeed.filter(item => {
    if (subTab === 'WAITING') {
      if (item.feedType !== 'EVENT') return false;
      if (item.data.status !== 'WAITING') return false;
      if (item.data.due_date) return false;
    } else if (subTab === 'SCHEDULED') {
      if (item.feedType !== 'EVENT') return false;
      if (item.data.status !== 'WAITING') return false;
      if (!item.data.due_date) return false;
    } else if (subTab === 'RESOLVED') {
      if (item.feedType !== 'EVENT') return false;
      if (item.data.status !== 'RESOLVED') return false;
    } else if (subTab === 'AUDIT') {
      if (item.feedType !== 'AUDIT') return false;
    }

    if (filterOperator !== 'ALL') {
      const opStr = (item.data.data?.operator || item.data.operator || item.data.created_by || '').toUpperCase();
      if (filterOperator === 'AI' && !opStr.includes('AI') && !opStr.includes('SYSTEM')) return false;
      if (filterOperator === 'ADMIN' && !opStr.includes('SUPER_ADMIN') && !opStr.includes('ADMIN')) return false;
      if (filterOperator === 'USER' && (opStr.includes('AI') || opStr.includes('SUPER_ADMIN'))) return false;
    }

    if (filterDomain !== 'ALL') {
      if (item.feedType === 'EVENT') {
        const type = item.data.type;
        if (filterDomain === 'RAG_HOLD' && type !== 'RAG_HOLD' && type !== 'TASK_CANCEL_REQUEST') return false;
        if (filterDomain === 'STORE_ORDER' && type !== 'STORE_ORDER') return false;
        if (filterDomain === 'LOW_STOCK' && type !== 'LOW_STOCK') return false;
        if (filterDomain === 'LEAVE' && type !== 'LEAVE_APPROVAL_REQUEST') return false;
      }
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const title = (item.data.title || item.data.action_name || '').toLowerCase();
      const subtitle = (item.data.subtitle || item.data.details || '').toLowerCase();
      const operator = (item.data.data?.operator || item.data.operator || item.data.created_by || '').toLowerCase();
      const docId = String(item.data.data?.doc_id || item.data.id || '').toLowerCase();

      if (!title.includes(query) && !subtitle.includes(query) && !operator.includes(query) && !docId.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const allFeedCount = combinedFeed.length;
  const waitingCount = events.filter(e => e.status === 'WAITING' && !e.due_date).length;
  const scheduledCount = events.filter(e => e.status === 'WAITING' && Boolean(e.due_date)).length;
  const resolvedCount = events.filter(e => e.status === 'RESOLVED').length;
  const auditLogsCount = auditLogs.length;

  const resetFilters = () => {
    setFilterOperator('ALL');
    setFilterDomain('ALL');
    setSearchQuery('');
  };

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 text-slate-800 bg-slate-50/50 min-h-screen">
      
      {/* 1구역: 대시보드 타이틀 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100/60">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>AI 자율 거버넌스 컨트롤타워 관제 센터</span>
                <span className="text-xs bg-rose-100 text-rose-700 font-extrabold px-2.5 py-0.5 rounded-full border border-rose-200">
                  실시간 자율 통제 활성
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                실시간 비즈니스 이벤트 피드를 모니터링하고, AI 추천 조치 시나리오를 자율 실행하며 전사 통합 감사 로그를 모니터링합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors border-none cursor-pointer"
            title="실시간 모니터링 수동 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={async () => {
              if (window.confirm("감사 및 관제 이력을 초기화하시겠습니까?")) {
                await apiFetch('/api/governance?action=clear_logs', { method: 'POST' });
                loadData();
              }
            }}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-xs border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>감사록 전체 초기화</span>
          </button>
        </div>
      </div>

      {/* 1.5구역: 대표자 AI 자율 명령 센터 (Top-down Command) */}
      <TopDownCommandCenter operators={operators} onCommandExecuted={loadData} />

      {/* 2구역: 1차 메인 관제 영역 선택 탭 바 */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('EVENTS')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'EVENTS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>관제 및 감사 피드 ({allFeedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('RULES')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'RULES'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>자율 실행 규칙 ({autoRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RESTORE')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'RESTORE'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>소프트 삭제 복원 ({deletedItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('FOLDERS')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'FOLDERS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>태스크 폴더 관제 ({taskFolders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'REPORTS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>일일 업무 보고서 ({dailyReports.length})</span>
        </button>
      </div>

      {/* 3구역: 메인 탭별 독립 서브 컴포넌트 뷰 동적 렌더링 */}
      {activeTab === 'EVENTS' && (
        <GovernanceEventsTab
          subTab={subTab}
          setSubTab={setSubTab}
          filteredFeed={filteredFeed}
          allFeedCount={allFeedCount}
          waitingCount={waitingCount}
          scheduledCount={scheduledCount}
          resolvedCount={resolvedCount}
          auditLogsCount={auditLogsCount}
          filterOperator={filterOperator}
          setFilterOperator={setFilterOperator}
          filterDomain={filterDomain}
          setFilterDomain={setFilterDomain}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          resetFilters={resetFilters}
          unassignedFilesCount={unassignedFilesCount}
          handleQuickAssignCustomsDoc={handleQuickAssignCustomsDoc}
          handleOpenDetail={handleOpenDetail}
          handleOpenDocumentModal={handleOpenDocumentModal}
        />
      )}

      {activeTab === 'RULES' && (
        <GovernanceRulesTab
          autoRules={autoRules}
          showRuleModal={showRuleModal}
          setShowRuleModal={setShowRuleModal}
          newRuleName={newRuleName}
          setNewRuleName={setNewRuleName}
          newRuleExpr={newRuleExpr}
          setNewRuleExpr={setNewRuleExpr}
          handleCreateRule={handleCreateRule}
          handleToggleRule={handleToggleRule}
          handleDeleteRule={handleDeleteRule}
        />
      )}

      {activeTab === 'RESTORE' && (
        <GovernanceRestoreTab
          deletedItems={deletedItems}
          handleRestore={handleRestore}
        />
      )}

      {activeTab === 'FOLDERS' && (
        <GovernanceTaskFoldersTab
          taskFolders={taskFolders}
          selectedFolderId={selectedFolderId}
          setSelectedFolderId={setSelectedFolderId}
          folderFiles={folderFiles}
          loadTaskFolders={loadTaskFolders}
          handleDeleteFolderFile={handleDeleteFolderFile}
          handleOpenDocumentModal={handleOpenDocumentModal}
          onRefreshEvents={loadData}
        />
      )}

      {activeTab === 'REPORTS' && (
        <GovernanceReportsTab
          dailyReports={dailyReports}
          loadDailyReports={loadDailyReports}
          selectedReport={selectedReport}
          setSelectedReport={setSelectedReport}
          pendingTasks={pendingTasks}
          assigneeMap={assigneeMap}
          setAssigneeMap={setAssigneeMap}
          dueDateMap={dueDateMap}
          setDueDateMap={setDueDateMap}
          operators={operators}
          isExecuting={isExecuting}
          handleApproveReport={() => {}}
          handleApprovePendingTask={handleApprovePendingTask}
        />
      )}

      {/* 4구역: 관제 원장 상세 검토 & 취소 결재 모달 (공통 서브 컴포넌트) */}
      <GovernanceDetailModal
        selectedEvent={selectedEvent}
        eventDueDate={eventDueDate}
        setEventDueDate={setEventDueDate}
        handleSaveEventDueDate={handleSaveEventDueDate}
        handleCloseDetail={handleCloseDetail}
        selectedActions={selectedActions}
        setSelectedActions={setSelectedActions}
        actionReports={actionReports}
        isExecuting={isExecuting}
        handleExecuteActions={handleExecuteActions}
        handleApproveLeave={handleApproveLeave}
        handleRejectLeave={handleRejectLeave}
        handleApproveCancelRequest={handleApproveCancelRequest}
        handleRejectCancelRequest={handleRejectCancelRequest}
        handleRemoveAction={handleRemoveAction}
        handleOpenDocumentModal={handleOpenDocumentModal}
        loadData={loadData}
      />

      {/* 5구역: 첨부 서류 미리보기 공통 모달 */}
      <TaskKnowledgeDocumentModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        document={docModalOpen ? {
          id: `doc-${Date.now()}`,
          title: docModalTitle || '첨부 서류 미리보기',
          file_path: docModalUrl,
          content: docModalText,
          ai_summary: docModalText
        } : null}
      />
    </div>
  );
}
