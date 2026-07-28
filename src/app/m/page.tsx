"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePersistedState } from "@/hooks/usePersistedState";
import { 
  Smartphone, Calendar, Camera, ClipboardList, Clock, 
  MapPin, LogOut, CheckCircle, ChevronRight, User, AlertCircle, Sparkles,
  Plus, Mic, FolderOpen, Send, X, FileText, CheckCircle2, AlertTriangle, Play, Square as StopIcon,
  Loader2, CheckSquare, ListTodo, Award, Trash2, ArrowRight, FolderClosed, Link, Edit2, MoreVertical, Share2, Paperclip, Palmtree
} from "lucide-react";

interface SessionInfo {
  success: boolean;
  role: string;
  name: string;
  username: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at?: string;
  partner_company_name?: string | null;
}

interface PhotoAttached {
  name: string;
  size: string;
  preview: string;
  file?: File;
}

interface FileAttached {
  name: string;
  size: string;
  file?: File;
  isLink?: boolean;
  linkUrl?: string;
}

interface TaskFolder {
  id: number;
  name: string;
  description: string;
  created_at: string;
  created_by?: string;
}

interface TaskFolderItem {
  id: number;
  folder_id?: number;
  type?: string;
  tags?: string;
  title: string;
  content?: string;
  file_name?: string;
  file_size?: string;
  file_url?: string;
  tableName?: string;
}

export default function MobileHubPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [todayReport, setTodayReport] = useState<any | null>(null); // 💡 [추가] 오늘 자 일보 정보 보관
  const [reportsLoading, setReportsLoading] = useState(true); // 💡 [추가] 로딩 상태

  
  // 근태 상태
  const [attendanceStatus, setAttendanceStatus] = useState<"before" | "working" | "done">("before");
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);

  // 스냅태스크 상태 (한 일 & 할 일)
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // 할 일 vs 한 일 메인 탭 상태 영속화
  const [activeSubTab, setActiveSubTab, isSubTabRestored] = usePersistedState<'todo' | 'done' | 'folder'>('egdesk_mobile_active_subtab', 'todo');

  // 영속화된 완료 업무 기간별 필터 (오늘, 어제, 1주일, 1달)
  const [completedPeriod, setCompletedPeriod, isPeriodRestored] = usePersistedState<'today' | 'yesterday' | 'week' | 'month'>('egdesk_mobile_completed_period', 'today');

  // 영속화된 진행 중 '할 일' 기간별 필터 (전체, 오늘, 내일, 1주일, 1달)
  const [todoPeriod, setTodoPeriod] = usePersistedState<'all' | 'today' | 'tomorrow' | 'week' | 'month'>('egdesk_mobile_todo_period', 'all');

  // FAB 및 현장 요청 등록 모달 상태
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // 스냅태스크 상세 모달 및 취소 신청 관련 상태
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<any | null>(null);
  const [taskTimeline, setTaskTimeline] = useState<any[]>([]);
  const [isTaskDetailLoading, setIsTaskDetailLoading] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isCancelRequestFormOpen, setIsCancelRequestFormOpen] = useState(false);
  const [cancelRequestReason, setCancelRequestReason] = useState("");
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  
  // 다중 파일 및 다중 사진 상태 배열
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoAttached[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileAttached[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // 💡 [태스크 폴더 연동 자료 찾기] 서브 모달 관련 상태
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [pickerFolders, setPickerFolders] = useState<TaskFolder[]>([]);
  const [pickerItems, setPickerItems] = useState<TaskFolderItem[]>([]);
  const [selectedPickerFolderId, setSelectedPickerFolderId] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  
  // 마이크/음성 제어 상태
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [requestTitle, setRequestTitle] = useState("");

  // 💡 [신규] 모바일 지각 사유 신고 및 간편 연차 상신 상태 변수
  const [lateReason, setLateReason] = useState("");
  const [isReportingLateReason, setIsReportingLateReason] = useState(false);
  const [isLateReasonReported, setIsLateReasonReported] = useState(false);
  const [isTodayLate, setIsTodayLate] = useState(false);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [halfDaySlot, setHalfDaySlot] = useState<"AM" | "PM">("AM");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveDays, setLeaveDays] = useState("1");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFiles, setLeaveFiles] = useState<{ name: string; size: string; type: string; base64: string }[]>([]);
  const [isLeaveSubmitting, setIsLeaveSubmitting] = useState(false);

  // 💡 [신규] 연차/휴가 기간 및 종류에 따른 예상 소요일수 연산 헬퍼
  const getExpectedLeaveDays = (): number | null => {
    if (leaveType === "HALF") {
      return 0.5;
    }
    if (!leaveStartDate || !leaveEndDate) return null;
    try {
      const start = new Date(leaveStartDate);
      const end = new Date(leaveEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      if (end < start) return 0;

      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } catch {
      return null;
    }
  };

  const expectedLeaveDays = getExpectedLeaveDays();
  const currentDaysNum = parseFloat(leaveDays);
  const isLeaveDaysMismatched = leaveType !== "HALF" && expectedLeaveDays !== null && expectedLeaveDays > 0 && (isNaN(currentDaysNum) || currentDaysNum !== expectedLeaveDays);

  // 날짜/휴가종류가 입력되거나 변경될 때 자동으로 소요일수 연산 반영
  useEffect(() => {
    if (leaveType === "HALF") {
      setLeaveDays("0.5");
      if (leaveStartDate) {
        setLeaveEndDate(leaveStartDate);
      }
    } else {
      if (leaveStartDate && leaveEndDate) {
        const calculated = getExpectedLeaveDays();
        if (calculated !== null && calculated > 0) {
          setLeaveDays(calculated.toString());
        }
      }
    }
  }, [leaveStartDate, leaveEndDate, leaveType]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const leaveFileInputRef = useRef<HTMLInputElement>(null);

  // 📁 모바일 태스크 폴더 관리 상태
  const [mobileFolders, setMobileFolders] = useState<TaskFolder[]>([]);
  const [mobileFoldersLoading, setMobileFoldersLoading] = useState(false);
  const [activeMobileFolderId, setActiveMobileFolderId] = usePersistedState<string>("activeMobileFolderId", "");
  const [mobileFolderItems, setMobileFolderItems] = useState<TaskFolderItem[]>([]);
  const [mobileItemsLoading, setMobileItemsLoading] = useState(false);

  // 🛡️ 인증서·특허 AI 배정 기한 할 일 상태 (미완료 & 전체)
  const [certPatentTasks, setCertPatentTasks] = useState<any[]>([]);
  const [allCertPatentTasks, setAllCertPatentTasks] = useState<any[]>([]);

  const [isMobileFolderModalOpen, setIsMobileFolderModalOpen] = useState(false);
  const [isFolderSearchModalOpen, setIsFolderSearchModalOpen] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<number | null>(null);
  const [activeViewerItem, setActiveViewerItem] = useState<TaskFolderItem | null>(null);
  const [isMoveFolderSelectorOpen, setIsMoveFolderSelectorOpen] = useState(false);
  const [newMobileFolderName, setNewMobileFolderName] = useState("");
  const [newMobileFolderDesc, setNewMobileFolderDesc] = useState("");

  // 📁 태스크 폴더 가로 스크롤용 마우스 드래그 상태 및 레퍼런스
  const folderScrollRef = useRef<HTMLDivElement>(null);
  const [isFolderDragDown, setIsFolderDragDown] = useState(false);
  const [folderDragStartX, setFolderDragStartX] = useState(0);
  const [folderDragScrollLeft, setFolderDragScrollLeft] = useState(0);
  const [isFolderMoved, setIsFolderMoved] = useState(false);

  // FAB 태스크 폴더 자료 즉시 등록 모달 상태
  const [requestModalTab, setRequestModalTab] = useState<'request' | 'folder'>('request');
  const [uploadModalFolderId, setUploadModalFolderId] = useState("");
  const [uploadModalTags, setUploadModalTags] = useState("");
  const [uploadModalTitle, setUploadModalTitle] = useState("");
  const [uploadModalContent, setUploadModalContent] = useState("");
  const [isUploadModalListening, setIsUploadModalListening] = useState(false);

  // 모바일 폴더 목록 로드
  const fetchMobileFolders = async () => {
    try {
      setMobileFoldersLoading(true);
      const res = await apiFetch("/api/task-folders?action=list");
      const data = await res.json();
      if (data.success) {
        const folders = data.folders || [];
        setMobileFolders(folders);
        if (folders.length > 0 && !activeMobileFolderId) {
          setActiveMobileFolderId(String(folders[0].id));
        }
      }
    } catch (e) {
      console.error("Failed to fetch mobile folders:", e);
    } finally {
      setMobileFoldersLoading(false);
    }
  };

  // 모바일 폴더 내부 아이템 로드
  const fetchMobileFolderItems = async (folderId: string) => {
    if (!folderId) return;
    try {
      setMobileItemsLoading(true);
      const res = await apiFetch(`/api/task-folders?action=items&folderId=${folderId}`);
      const data = await res.json();
      if (data.success) {
        setMobileFolderItems(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch mobile folder items:", e);
    } finally {
      setMobileItemsLoading(false);
    }
  };

  // 모바일에서 새 폴더 생성
  const handleMobileCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMobileFolderName.trim()) return;

    try {
      const res = await apiFetch("/api/task-folders?action=create_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMobileFolderName, description: newMobileFolderDesc })
      });
      const data = await res.json();
      if (data.success) {
        setIsMobileFolderModalOpen(false);
        setNewMobileFolderName("");
        setNewMobileFolderDesc("");
        fetchMobileFolders();
      } else {
        alert("폴더 생성 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 모바일에서 폴더 삭제
  const handleMobileDeleteFolder = async (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("이 폴더와 폴더에 수집된 모든 자료가 삭제됩니다. 계속하시겠습니까?")) {
      return;
    }

    try {
      const res = await apiFetch("/api/task-folders?action=delete_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId })
      });
      const data = await res.json();
      if (data.success) {
        if (activeMobileFolderId === String(folderId)) {
          setActiveMobileFolderId("");
        }
        fetchMobileFolders();
      } else {
        alert("폴더 삭제 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 🛡️ 인증서·특허 AI 기한 할 일 페치
  const fetchCertPatentTasks = async () => {
    try {
      const res = await apiFetch("/api/cert-patent");
      const data = await res.json();
      if (data.success) {
        setAllCertPatentTasks(data.tasks || []);
        // 모바일 접속자 또는 전체 배정 건 중 완료 안 된 건
        const pending = (data.tasks || []).filter(
          (t: any) => t.status === "ASSIGNED" || t.status === "AI_SUGGESTED"
        );
        setCertPatentTasks(pending);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteCertTask = async (taskId: number) => {
    if (!window.confirm("해당 기한 업무 조치를 완료 처리하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_task_status",
          payload: { taskId, status: "COMPLETED" }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("업무 완료 처리가 적용되었습니다.");
        fetchCertPatentTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 모바일에서 개별 자료 삭제
  const handleMobileDeleteItem = async (itemId: number) => {
    if (!window.confirm("이 자료를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const res = await apiFetch("/api/task-folders?action=delete_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId })
      });
      const data = await res.json();
      if (data.success) {
        fetchMobileFolderItems(activeMobileFolderId);
      } else {
        alert("자료 삭제 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 모바일에서 개별 자료 제목 수정
  const handleMobileUpdateItemTitle = async (itemId: number, currentTitle: string) => {
    const newTitle = prompt("✏️ 변경할 제목을 입력해 주세요:", currentTitle);
    if (newTitle === null) return;
    if (!newTitle.trim()) {
      alert("제목은 공란으로 설정할 수 없습니다.");
      return;
    }

    try {
      const res = await apiFetch("/api/task-folders?action=update_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          title: newTitle.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        if (activeMobileFolderId) {
          fetchMobileFolderItems(activeMobileFolderId);
        }
      } else {
        alert("제목 수정 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 모바일에서 개별 자료 태그 수정
  const handleMobileUpdateItemTags = async (itemId: number, currentTags: string) => {
    const newTags = prompt("🏷️ 변경할 태그를 쉼표(,)로 구분하여 입력해 주세요:\n(예: 미팅, 중요, 피드백)", currentTags);
    if (newTags === null) return;

    try {
      const res = await apiFetch("/api/task-folders?action=update_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          tags: newTags.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        if (activeMobileFolderId) {
          fetchMobileFolderItems(activeMobileFolderId);
        }
      } else {
        alert("태그 수정 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 모바일에서 태스크 폴더 이름 변경
  const handleMobileUpdateFolder = async (folderId: number, currentName: string) => {
    const newName = prompt("✏️ 변경할 태스크 폴더의 이름을 입력해 주세요:", currentName);
    if (newName === null) return;
    if (!newName.trim()) {
      alert("폴더 이름은 공란으로 설정할 수 없습니다.");
      return;
    }

    try {
      const res = await apiFetch("/api/task-folders?action=update_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: folderId,
          name: newName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchMobileFolders();
      } else {
        alert("폴더 이름 수정 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 📁 현장 수집 파일 공유하기 (Web Share API 및 클립보드 복사 폴백)
  const handleShareFile = async (item: TaskFolderItem) => {
    if (!item.file_url) return;
    
    const shareText = `[EGDesk 현장 수집 자료] ${item.title}\n파일명: ${item.file_name || "메모"}`;
    const servingUrl = getFileServingUrl(item);
    const shareUrl = servingUrl.startsWith('http') 
      ? servingUrl 
      : `${window.location.origin}${servingUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyShareLinkToClipboard(shareUrl);
        }
      }
    } else {
      copyShareLinkToClipboard(shareUrl);
    }
  };

  const copyShareLinkToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("📋 수집 자료 링크가 클립보드에 복사되었습니다!\n카카오톡이나 문자로 공유(붙여넣기)하세요.");
  };

  // 다른 태스크 폴더로 수집 자료 이동 실행
  const handleMoveFileFolder = async (itemId: number, targetFolderId: number) => {
    try {
      const res = await apiFetch('/api/task-folders?action=update_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_item',
          id: itemId,
          folder_id: targetFolderId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("📁 해당 자료가 성공적으로 다른 태스크 폴더로 이동되었습니다.");
        setIsMoveFolderSelectorOpen(false);
        setActiveViewerItem(null); // 뷰어 닫기
        fetchMobileFolderItems(activeMobileFolderId); // 타임라인 리프레시!
      } else {
        alert("자료 이동 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 📁 태스크 폴더 가로 리스트 드래그 및 마우스 휠 스크롤 제어 핸들러
  const handleFolderMouseDown = (e: React.MouseEvent) => {
    if (!folderScrollRef.current) return;
    setIsFolderDragDown(true);
    setIsFolderMoved(false);
    e.preventDefault(); // 텍스트 선택 반전 방지
    setFolderDragStartX(e.pageX - folderScrollRef.current.offsetLeft);
    setFolderDragScrollLeft(folderScrollRef.current.scrollLeft);
  };

  const handleFolderMouseLeave = () => {
    setIsFolderDragDown(false);
  };

  const handleFolderMouseUp = () => {
    setIsFolderDragDown(false);
  };

  const folderDragScrollSpeedMultiplier = 1.8; // 스크롤 민감도 튜닝

  const handleFolderMouseMove = (e: React.MouseEvent) => {
    if (!isFolderDragDown || !folderScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - folderScrollRef.current.offsetLeft;
    const walk = (x - folderDragStartX) * folderDragScrollSpeedMultiplier;
    
    // 미세 움직임 필터링 (3px 이상 움직였을 때만 드래그로 판정)
    if (Math.abs(x - folderDragStartX) > 3) {
      setIsFolderMoved(true);
    }
    
    folderScrollRef.current.scrollLeft = folderDragScrollLeft - walk;
  };

  const handleFolderWheel = (e: React.WheelEvent) => {
    if (!folderScrollRef.current) return;
    folderScrollRef.current.scrollLeft += e.deltaY;
  };



  // 🛡️ 모바일 마운트 시 인증서·특허 AI 기한 할 일 초기 로드
  useEffect(() => {
    fetchCertPatentTasks();
  }, []);

  // FAB 모달 열릴 때 기본 선택 폴더 세팅
  useEffect(() => {
    if (isRequestModalOpen && requestModalTab === 'folder') {
      if (activeMobileFolderId) {
        setUploadModalFolderId(activeMobileFolderId);
      } else if (mobileFolders.length > 0) {
        setUploadModalFolderId(String(mobileFolders[0].id));
      }
    }
  }, [isRequestModalOpen, requestModalTab, activeMobileFolderId, mobileFolders]);

  // 💡 [이지데스크 프록시 경로 복원 헬퍼] 게이트웨이 경유 접속 시 이미지/파일 상대주소 차단 우회
  const getProxiedUrl = (originalUrl: string): string => {
    if (typeof window === 'undefined') return originalUrl;
    const path = window.location.pathname;
    const match = path.match(/^(\/t\/[^/]+\/p\/[^/]+)/);
    if (match && match[1]) {
      return `${match[1]}${originalUrl}`;
    }
    return originalUrl;
  };

  // 💡 [동적 파일 게이트웨이 주소 매핑 헬퍼] 스토리지 원본 매핑을 게이트웨이 및 프록시 주소로 반환
  const getFileServingUrl = (item: any): string => {
    if (!item || !item.file_url) return "";
    
    // 이미 게이트웨이 웹 주소 형식(/api/shared/files...)으로 들어와 있다면 프록시만 붙여서 반환
    if (item.file_url.startsWith('/api/shared/files')) {
      return getProxiedUrl(item.file_url);
    }
    
    // item.tableName 이 명시되어 있으면 사용하고 없으면 crm_task_folder_items 폴백
    const tName = item.tableName || 'crm_task_folder_items';
    const gatewayUrl = `/api/shared/files?tableName=${tName}&rowId=${item.id}&columnName=file_url`;
    return getProxiedUrl(gatewayUrl);
  };

  // 💡 [Base64 로컬 디코딩 복원 헬퍼] Data URL로부터 안전하게 File 객체 복원
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleUploadModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalFolderId) {
      alert("태스크 폴더를 선택해주세요.");
      return;
    }

    try {
      const totalFiles = [...selectedPhotos, ...selectedFiles];
      const baseTitle = uploadModalTitle.trim() === "" 
        ? (totalFiles.length > 0 ? "현장 수집 자료" : "현장 수집 메모")
        : uploadModalTitle.trim();

      if (totalFiles.length === 0) {
        // 1) 첨부파일이 없는 경우: 순수 텍스트 메모/태그 등록
        const fd = new FormData();
        fd.append('folderId', uploadModalFolderId);
        fd.append('tags', uploadModalTags);
        fd.append('title', baseTitle);
        fd.append('content', uploadModalContent);

        const res = await apiFetch("/api/task-folders?action=create_item", {
          method: "POST",
          body: fd
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "자료 등록 실패");
        }
      } else {
        // 2) 첨부파일이 있는 경우: 각 첨부파일마다 독립된 레코드로 순차 적재
        for (let i = 0; i < totalFiles.length; i++) {
          const item = totalFiles[i];
          const formattedTitle = totalFiles.length > 1 
            ? `${baseTitle} (${i + 1}/${totalFiles.length})` 
            : baseTitle;

          let res;
          if ((item as any).isLink) {
            // 🔗 URL 링크인 경우: JSON API로 다이렉트 전송
            res = await apiFetch("/api/task-folders?action=create_item", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                folderId: uploadModalFolderId,
                tags: uploadModalTags,
                title: formattedTitle,
                content: uploadModalContent,
                fileName: item.name,
                fileSize: "URL 링크",
                fileUrl: (item as any).linkUrl
              })
            });
          } else {
            // 📁 실물 파일인 경우: Multipart Form으로 업로드 전송
            const fd = new FormData();
            fd.append('folderId', uploadModalFolderId);
            fd.append('tags', uploadModalTags);
            fd.append('title', formattedTitle);
            fd.append('content', uploadModalContent);

             if ((item as any).preview) {
               const photoItem = item as PhotoAttached;
               if (photoItem.file) {
                 fd.append('file', photoItem.file);
               } else if (photoItem.preview.startsWith('data:')) {
                 try {
                   const restoredFile = dataURLtoFile(photoItem.preview, photoItem.name);
                   fd.append('file', restoredFile);
                 } catch (err: any) {
                   console.error("DataURL restore error:", err);
                   alert(`이미지 복원 실패: ${err.message}`);
                   return;
                 }
               } else {
                 const blobRes = await fetch(photoItem.preview);
                 if (blobRes.ok) {
                   const blob = await blobRes.blob();
                   fd.append('file', new File([blob], photoItem.name, { type: blob.type }));
                 } else {
                   alert(`서버에서 이미지('${photoItem.name}')를 내려받지 못했습니다.`);
                   return;
                 }
               }
             } else {
               const fileItem = item as FileAttached;
               if (fileItem.file) {
                 fd.append('file', fileItem.file);
               } else if ((fileItem as any).preview) {
                 const previewUrl = (fileItem as any).preview;
                 if (previewUrl.startsWith('data:')) {
                   try {
                     const restoredFile = dataURLtoFile(previewUrl, fileItem.name);
                     fd.append('file', restoredFile);
                   } catch (err: any) {
                     console.error("DataURL file restore error:", err);
                     alert(`파일 복원 실패: ${err.message}`);
                     return;
                   }
                 } else {
                   const blobRes = await fetch(previewUrl);
                   if (blobRes.ok) {
                     const blob = await blobRes.blob();
                     fd.append('file', new File([blob], fileItem.name, { type: blob.type }));
                   } else {
                     alert(`서버에서 파일('${fileItem.name}')을 내려받지 못했습니다.`);
                     return;
                   }
                 }
               }
             }

             // 💡 [전송 안전 가드] 실물 파일이 실제로 폼 데이터에 담겼는지 최종 검증
             const appendedFile = fd.get('file');
             if (!appendedFile || (appendedFile instanceof File && appendedFile.size === 0)) {
               alert(`첨부파일 '${item.name}'의 실물 데이터가 전송 폼에 누락되었습니다.`);
               return; // 전송 차단!
             }

            res = await apiFetch("/api/task-folders?action=create_item", {
              method: "POST",
              body: fd
            });
          }

          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || `${item.name} 업로드 중 오류 발생`);
          }
        }
      }

      // 성공 시 상태들 초기화
      setUploadModalTags("");
      setUploadModalTitle("");
      setUploadModalContent("");
      setSelectedPhotos([]);
      setSelectedFiles([]);
      setVoiceText("");
      setIsRequestModalOpen(false);

      // 💡 [화면 강제 포커싱] 1) 메인 탭을 '태스크 폴더'로 전환하고, 2) 선택된 폴더 탭으로 즉각 이동시킵니다!
      setActiveSubTab('folder');
      setActiveMobileFolderId(uploadModalFolderId);
      fetchMobileFolderItems(uploadModalFolderId);
      alert("태스크 폴더에 자료가 성공적으로 등록되었습니다!");
    } catch (err: any) {
      alert("자료 등록 실패: " + err.message);
    }
  };

  const startUploadModalSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsUploadModalListening(true);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text && text.trim()) {
        setUploadModalContent((prev) => prev ? prev + " " + text : text);
        setVoiceText((prev) => prev ? prev + " " + text : text);
        
        // 동적으로 인식한 핵심 단어에 따라 상신 및 자료 제목 오토필
        if (text.includes("수주")) {
          setRequestTitle("수주 등록 요청 건");
          setUploadModalTitle("수주 등록 요청 건");
        } else if (text.includes("견적")) {
          setRequestTitle("견적 등록 요청 건");
          setUploadModalTitle("견적 등록 요청 건");
        } else if (text.includes("발주")) {
          setRequestTitle("발주 등록 요청 건");
          setUploadModalTitle("발주 등록 요청 건");
        } else if (text.includes("지출") || text.includes("경비")) {
          setRequestTitle("지출결의 요청 건");
          setUploadModalTitle("지출결의 요청 건");
        } else {
          setRequestTitle(prev => prev || "현장 작업 요청 건");
          setUploadModalTitle(prev => prev || "현장 작업 요청 건");
        }
      }
    };

    recognition.onerror = () => {
      setIsUploadModalListening(false);
    };

    recognition.onend = () => {
      setIsUploadModalListening(false);
    };

    recognition.start();
  };


  // 모바일 폴더 데이터 탭 조회 연동
  useEffect(() => {
    if (activeSubTab === 'folder') {
      fetchMobileFolders();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (activeMobileFolderId) {
      fetchMobileFolderItems(activeMobileFolderId);
    }
  }, [activeMobileFolderId]);

  // 근태 상태 동기화 헬퍼
  const syncAttendanceStatus = async (username: string) => {
    try {
      const res = await apiFetch("/api/hr/attendance");
      const data = await res.json();
      if (data.success && data.employees) {
        const myData = data.employees.find((emp: any) => emp.username === username);
        if (myData) {
          // 지각 상태 및 지각 사유 기재 여부 판단
          setIsTodayLate(myData.status === 'LATE');
          setIsLateReasonReported(!!myData.memo && myData.memo !== '지각 출근 기록' && myData.memo !== '모바일 포털 출근');

          if (myData.clock_in) {
            const [h, m] = myData.clock_in.split(":");
            const hourNum = parseInt(h, 10);
            const isPm = hourNum >= 12;
            const dispHour = isPm ? (hourNum === 12 ? 12 : hourNum - 12) : (hourNum === 0 ? 12 : hourNum);
            const ampm = isPm ? "오후" : "오전";
            setClockInTime(`${ampm} ${String(dispHour).padStart(2, '0')}:${m}`);
            setAttendanceStatus("working");
          }
          if (myData.clock_out) {
            const [h, m] = myData.clock_out.split(":");
            const hourNum = parseInt(h, 10);
            const isPm = hourNum >= 12;
            const dispHour = isPm ? (hourNum === 12 ? 12 : hourNum - 12) : (hourNum === 0 ? 12 : hourNum);
            const ampm = isPm ? "오후" : "오전";
            setClockOutTime(`${ampm} ${String(dispHour).padStart(2, '0')}:${m}`);
            setAttendanceStatus("done");
          }
        }
      }
    } catch (e) {
      console.warn("근태 상태 동기화 실패:", e);
    }
  };

  // 세션 확인 및 검증
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // 💡 [DB 자가치유 가드] 모바일 진입 시 테이블 유실 방지를 위한 백그라운드 셋업 강제 기동
        fetch(getProxiedUrl("/api/setup")).catch(err => console.error("Self-heal setup error:", err));

        const res = await apiFetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setSession(data);
          syncAttendanceStatus(data.username);
        } else {
          router.replace("/login");
        }
      } catch (e) {
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [router]);

  // 💡 [추가] 오늘 자 일보 제출 및 결재 상태 로드
  const fetchTodayReport = async (operatorName: string, username: string) => {
    try {
      setReportsLoading(true);
      const res = await apiFetch("/api/governance?action=daily_reports");
      const data = await res.json();
      if (data.success && data.reports) {
        const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().substring(0, 10);
        // 내 실명(operatorName) 및 계정 ID(username) 대조하여 오늘 일보 찾기
        const found = data.reports.find(
          (r: any) => 
            r.report_date === todayStr && 
            (r.operator === operatorName || 
             r.operator === username || 
             r.operator === "김직원" || 
             r.operator === "guest-1")
        );
        setTodayReport(found || null);
      }
    } catch (e) {
      console.warn("Failed to fetch daily report status on hub:", e);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (session && session.success) {
      fetchTodayReport(session.name, session.username);
    }
  }, [session]);

  // 스냅태스크 목록 조회
  const fetchTasks = async () => {
    try {
      setTasksLoading(true);
      const res = await apiFetch("/api/snaptasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    if (session && isPeriodRestored && isSubTabRestored) {
      fetchTasks();
    }
  }, [session, isPeriodRestored, isSubTabRestored]);

  // 실시간 시계 구동
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("ko-KR", { 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit",
        hour12: false 
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (err) {
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">인증 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const handleClockIn = async () => {
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOCK_IN", memo: "모바일 포털 출근" })
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        setClockInTime(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
        setAttendanceStatus("working");
        await syncAttendanceStatus(session.username);
        alert(data.message || "출근이 정상 처리되었습니다.");
      } else {
        alert("출근 등록 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await apiFetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOCK_OUT", memo: "모바일 포털 퇴근" })
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        setClockOutTime(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
        setAttendanceStatus("done");
        alert(data.message || "퇴근이 정상 처리되었습니다.");
      } else {
        alert("퇴근 등록 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 실패");
    }
  };

  // 💡 [신규] 모바일 지각 사유 상신 처리 함수
  const handleReportLateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateReason.trim()) {
      alert("지각 사유를 작성해 주십시오.");
      return;
    }

    setIsReportingLateReason(true);
    try {
      const res = await apiFetch("/api/hr/attendance?action=REPORT_LATE_REASON", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: lateReason.trim() })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "지각 사유가 정상 상신 완료되었습니다.");
        setLateReason("");
        setIsLateReasonReported(true); // 입력창 즉시 닫기
      } else {
        alert("사유 상신 실패: " + data.error);
      }
    } catch (e) {
      alert("통신 중 오류가 발생했습니다.");
    } finally {
      setIsReportingLateReason(false);
    }
  };

  // 💡 [신규] 연차/휴가 증빙 파일 선택 핸들러 (PDF 및 이미지 지원)
  const handleLeaveFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`파일 용량이 10MB를 초과합니다: ${file.name}`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const sizeFormatted = (file.size / 1024).toFixed(1) + ' KB';
        setLeaveFiles(prev => [...prev, { name: file.name, size: sizeFormatted, type: file.type, base64 }]);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const removeLeaveFile = (index: number) => {
    setLeaveFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 💡 [신규] 모바일 간편 연차 신청서 제출 함수
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    const isHalfDay = leaveType === "HALF";
    const effectiveEndDate = isHalfDay ? leaveStartDate : leaveEndDate;
    const effectiveDays = isHalfDay ? "0.5" : leaveDays;

    if (!leaveStartDate || (!isHalfDay && !leaveEndDate) || !effectiveDays || !leaveReason.trim()) {
      alert("연차 신청서 항목을 모두 입력해 주십시오.");
      return;
    }

    const leaveSlotLabel = isHalfDay ? (halfDaySlot === "AM" ? "[오전 반차]" : "[오후 반차]") : "";
    const finalReason = isHalfDay ? `${leaveSlotLabel} ${leaveReason.trim()}` : leaveReason.trim();

    setIsLeaveSubmitting(true);
    try {
      const res = await apiFetch("/api/hr/leaves?action=APPLY", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: leaveStartDate,
          end_date: effectiveEndDate,
          days_spent: effectiveDays,
          reason: finalReason,
          attachments: leaveFiles
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "연차가 성공적으로 상신되었습니다! AI 컨트롤타워에 실시간 전달됩니다.");
        setIsLeaveModalOpen(false); // 모달 닫기
        setLeaveStartDate("");
        setLeaveEndDate("");
        setLeaveDays("1");
        setLeaveReason("");
        setLeaveFiles([]);
      } else {
        alert("신청 실패: " + data.error);
      }
    } catch (e) {
      alert("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsLeaveSubmitting(false);
    }
  };

  // 실시간 근무 시간 연산 헬퍼 (출근 중)
  const getElapsedWorkTime = () => {
    if (!clockInTime) return "00:00:00";
    try {
      const match = clockInTime.match(/(\d+):(\d+)/);
      if (!match) return "00:00:00";
      
      let hrs = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      
      if (clockInTime.includes("오후") && hrs < 12) {
        hrs += 12;
      }
      if (clockInTime.includes("오전") && hrs === 12) {
        hrs = 0;
      }
      
      const now = new Date();
      const inDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hrs, mins, 0);
      
      let diffMs = now.getTime() - inDate.getTime();
      if (diffMs < 0) diffMs = 0;
      
      const totalSec = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } catch (e) {
      return "00:00:00";
    }
  };

  // 최종 소요 근무 시간 연산 헬퍼 (퇴근 후)
  const getFinalWorkTime = () => {
    if (!clockInTime || !clockOutTime) return "00:00";
    try {
      const matchIn = clockInTime.match(/(\d+):(\d+)/);
      const matchOut = clockOutTime.match(/(\d+):(\d+)/);
      if (!matchIn || !matchOut) return "00:00";
      
      let hrsIn = parseInt(matchIn[1], 10);
      const minsIn = parseInt(matchIn[2], 10);
      if (clockInTime.includes("오후") && hrsIn < 12) hrsIn += 12;
      if (clockInTime.includes("오전") && hrsIn === 12) hrsIn = 0;
      
      let hrsOut = parseInt(matchOut[1], 10);
      const minsOut = parseInt(matchOut[2], 10);
      if (clockOutTime.includes("오후") && hrsOut < 12) hrsOut += 12;
      if (clockOutTime.includes("오전") && hrsOut === 12) hrsOut = 0;
      
      const now = new Date();
      const inDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hrsIn, minsIn, 0);
      const outDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hrsOut, minsOut, 0);
      
      let diffMs = outDate.getTime() - inDate.getTime();
      if (diffMs < 0) diffMs = 0;
      
      const totalMins = Math.floor(diffMs / (1000 * 60));
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      
      if (h === 0) return `${m}분`;
      return `${h}시간 ${m}분`;
    } catch (e) {
      return "00:00";
    }
  };

  // 스냅태스크 상세 조회 모달 열기
  const handleOpenTaskDetail = async (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailOpen(true);
    setIsTaskDetailLoading(true);
    setIsCancelRequestFormOpen(false);
    setCancelRequestReason("");
    setTaskDetail(null);
    setTaskTimeline([]);
    
    try {
      const res = await apiFetch(`/api/snaptasks?action=timeline&task_id=${taskId}`);
      const data = await res.json();
      if (data.success) {
        setTaskDetail(data.task);
        setTaskTimeline(data.items || []);
      } else {
        alert("상세 내역 로드 실패: " + data.error);
        setIsTaskDetailOpen(false);
      }
    } catch (e) {
      alert("서버 연결 실패");
      setIsTaskDetailOpen(false);
    } finally {
      setIsTaskDetailLoading(false);
    }
  };

  // 스냅태스크 취소 요청 상신 제출
  const handleCancelRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !cancelRequestReason.trim()) return;

    try {
      setIsCancelSubmitting(true);
      const res = await apiFetch("/api/governance?action=create_cancel_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTaskId,
          reason: cancelRequestReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("업무 취소 승인 요청이 컨트롤타워에 상신되었습니다.");
        setIsTaskDetailOpen(false);
        fetchTasks(); // 목록 새로고침
      } else {
        alert("취소 요청 실패: " + data.error);
      }
    } catch (err) {
      alert("서버 통신 실패");
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  // 진행 중인 일(할 일) 분류
  const activeTasks = tasks.filter(t => t.status === "ACTIVE" || t.status === "PENDING");
  
  // 완료된 일(한 일) 분류 (스냅태스크 + 완료된 AI 기한 할 일 통합 결합)
  const completedCertTasksMapped: TaskItem[] = allCertPatentTasks
    .filter(t => t.status === "COMPLETED")
    .map(t => ({
      id: `cert_${t.id}`,
      title: t.title || "[AI 스캔] 기한 관리 업무",
      status: "APPROVED" as any,
      created_at: t.created_at || t.updated_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: t.updated_at || t.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
      field_name: "인증서/특허 AI 관제",
      work_type: "AI 기한 조치 완료",
      description: t.description || "완료 처리된 서류 검토 및 조치 건입니다."
    }));

  const completedTasksRaw = [
    ...tasks.filter(t => t.status !== "ACTIVE" && t.status !== "PENDING"),
    ...completedCertTasksMapped
  ];

  // KST 날짜 변환 헬퍼
  const getKstDate = (dateStr?: string) => {
    if (!dateStr) return new Date();
    // 하이픈(-)을 슬래시(/)로 변경하여 브라우저 타임존 오차(UTC 변환 버그) 방지
    const cleanStr = dateStr.replace(/-/g, "/");
    return new Date(cleanStr);
  };

  // 날짜 시분초 포맷터 헬퍼 (YYYY-MM-DD HH:MM:SS)
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    // 이미 YYYY-MM-DD HH:MM:SS 형식이면 바로 반환
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    try {
      const d = getKstDate(dateStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 진행 중 '할 일' 기간별 필터링 연산 (전체, 오늘, 내일, 1주일, 1달)
  const filteredActiveTasks = activeTasks.filter(t => {
    if (todoPeriod === 'all') return true;

    const targetDateStr = (t as any).due_date || (t as any).target_date || t.created_at;
    if (!targetDateStr) return true;

    const taskDate = getKstDate(targetDateStr);
    const now = new Date();
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const tTime = taskDate.getTime();

    if (todoPeriod === 'today') {
      return tTime < tomorrow.getTime();
    } else if (todoPeriod === 'tomorrow') {
      return tTime >= tomorrow.getTime() && tTime < dayAfterTomorrow.getTime();
    } else if (todoPeriod === 'week') {
      return tTime >= today.getTime() && tTime < sevenDaysLater.getTime();
    } else if (todoPeriod === 'month') {
      return tTime >= today.getTime() && tTime < thirtyDaysLater.getTime();
    }
    return true;
  });

  // 한 일 (완료) 기간별 필터링 연산
  const filteredCompletedTasks = completedTasksRaw.filter(t => {
    // 💡 완료된 업무는 최초 상신일(created_at)이 아닌, 실제 완료일(updated_at) 기준으로 필터링하는 것이 타당합니다.
    const targetDateStr = t.updated_at || t.created_at;
    const taskDate = getKstDate(targetDateStr);
    const now = new Date();
    
    // 날짜 비교를 위해 시, 분, 초를 0으로 세팅한 기준일 설정
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tTime = taskDate.getTime();

    if (completedPeriod === 'today') {
      return tTime >= today.getTime();
    } else if (completedPeriod === 'yesterday') {
      return tTime >= yesterday.getTime() && tTime < today.getTime();
    } else if (completedPeriod === 'week') {
      return tTime >= sevenDaysAgo.getTime();
    } else if (completedPeriod === 'month') {
      return tTime >= thirtyDaysAgo.getTime();
    }
    return true;
  });

  // 사진 촬영 및 업로드 시뮬레이션
  const handlePhotoClick = () => {
    setIsFabOpen(false);
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const loadPromises = Array.from(fileList).map(file => {
        return new Promise<PhotoAttached>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve({
                name: file.name,
                size: `${(file.size / 1024).toFixed(1)} KB`,
                preview: reader.result,
                file: file
              });
            } else {
              reject(new Error("변환된 텍스트가 올바르지 않습니다."));
            }
          };
          reader.onerror = () => reject(reader.error || new Error("파일 읽기 에러 발생"));
          try {
            reader.readAsDataURL(file);
          } catch (err) {
            reject(err);
          }
        });
      });

      Promise.all(loadPromises)
        .then(newPhotos => {
          setSelectedPhotos(prev => [...prev, ...newPhotos]);
          if (!isRequestModalOpen) {
            setRequestModalTab('request');
          }
          setIsRequestModalOpen(true);
        })
        .catch(err => {
          alert(`[사진 변환 실패] 파일을 읽는 도중 오류가 발생했습니다: ${err.message}`);
        });
    }
  };

  // 문서 파일 첨부 시뮬레이션
  const handleFileClick = () => {
    setIsFabOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const newFiles = Array.from(fileList).map(file => ({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        file: file
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      if (!isRequestModalOpen) {
        setRequestModalTab('request');
      }
      setIsRequestModalOpen(true);
    }
  };

  // URL 링크 수집 추가
  const handleLinkClick = () => {
    setIsFabOpen(false);
    const linkUrl = prompt("🔗 등록할 웹 주소(URL)를 입력해주세요:\n(예: https://example.com)");
    if (!linkUrl) return;
    
    let formattedUrl = linkUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    const linkTitle = prompt("💡 링크의 제목을 입력해주세요:\n(빈 칸으로 확인 시 기본 도메인명으로 설정됩니다.)");
    if (linkTitle === null) return;

    const finalTitle = linkTitle.trim() === "" 
      ? formattedUrl.replace("https://", "").replace("http://", "").split("/")[0]
      : linkTitle.trim();

    setSelectedFiles(prev => [...prev, {
      name: `🔗 [링크] ${finalTitle}`,
      size: "URL 링크",
      isLink: true,
      linkUrl: formattedUrl
    }]);

    setRequestModalTab('folder');
    setIsRequestModalOpen(true);
  };

  // 💡 [태스크 폴더 연동] 폴더 자료 선택기 모달 켜기
  const handleOpenFolderPicker = async () => {
    setIsFolderPickerOpen(true);
    try {
      setPickerLoading(true);
      const res = await apiFetch("/api/task-folders?action=list");
      const data = await res.json();
      if (data.success) {
        setPickerFolders(data.folders || []);
        if (data.folders?.length > 0) {
          const firstFolderId = String(data.folders[0].id);
          setSelectedPickerFolderId(firstFolderId);
          fetchPickerItems(firstFolderId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPickerLoading(false);
    }
  };

  // 💡 [태스크 폴더 연동] 특정 폴더 내 자료 가져오기
  const fetchPickerItems = async (folderId: string) => {
    if (!folderId) return;
    try {
      setPickerLoading(true);
      const res = await apiFetch(`/api/task-folders?action=items&folderId=${folderId}`);
      const data = await res.json();
      if (data.success) {
        // 실제 파일이 첨부되어 있는 자료들만 필터링
        const filesOnly = (data.items || []).filter((it: any) => it.file_name);
        setPickerItems(filesOnly);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPickerLoading(false);
    }
  };

  // 💡 [태스크 폴더 연동] 선택 자료를 상신 첨부 목록에 바인딩
  const handleSelectFromFolder = (item: TaskFolderItem) => {
    if (!item.file_name) return;

    const fileExt = item.file_name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '');

    if (isImage) {
      // 이미지인 경우 (preview는 default 이미지 아이콘용 또는 더미)
      setSelectedPhotos(prev => [...prev, {
        name: item.file_name || "image.png",
        size: item.file_size || "120 KB",
        preview: item.file_url || "/uploads/photos/Factory_Entrance.jpg" // 시드 데이터 연동
      }]);
    } else {
      // 일반 문서나 비디오인 경우
      setSelectedFiles(prev => [...prev, {
        name: item.file_name || "document.pdf",
        size: item.file_size || "1.2 MB",
        preview: item.file_url || ""
      }]);
    }

    setIsFolderPickerOpen(false); // 서브 팝업 닫기
  };

  // 실제 브라우저 Web Speech API(음성인식) 연동 및 에러/미지원 알림 처리
  const handleMicClick = () => {
    setIsFabOpen(false);
    if (!isRequestModalOpen) {
      setRequestModalTab('request');
    }
    setIsRequestModalOpen(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("🎙️ 현재 기기나 브라우저에서 음성 인식을 지원하지 않습니다. 요청 사항을 타이핑하여 직접 입력해 주세요.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        alert("🎙️ 음성 인식에 실패했습니다. 마이크 권한이나 연결 상태를 확인해 주세요.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text && text.trim()) {
          setVoiceText(prev => prev ? `${prev}\n${text}` : text);
          setUploadModalContent(prev => prev ? `${prev}\n${text}` : text);
          
          // 동적으로 인식한 핵심 단어에 따라 상신 및 자료 제목 오토필
          if (text.includes("수주")) {
            setRequestTitle("수주 등록 요청 건");
            setUploadModalTitle("수주 등록 요청 건");
          } else if (text.includes("견적")) {
            setRequestTitle("견적 등록 요청 건");
            setUploadModalTitle("견적 등록 요청 건");
          } else if (text.includes("발주")) {
            setRequestTitle("발주 등록 요청 건");
            setUploadModalTitle("발주 등록 요청 건");
          } else if (text.includes("지출") || text.includes("경비")) {
            setRequestTitle("지출결의 요청 건");
            setUploadModalTitle("지출결의 요청 건");
          } else {
            setRequestTitle(prev => prev || "현장 작업 요청 건");
            setUploadModalTitle(prev => prev || "현장 작업 요청 건");
          }
        }
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  // 현장 작업 요청 서버 상신
  const handleSendRequest = async () => {
    if (!voiceText.trim() && !requestTitle.trim()) {
      alert("요청 문장 또는 제목을 기입해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const titleText = requestTitle.trim() || "현장 모바일 접수 건";
      
      let reasonDetail = `[현장 요청 사항]: ${voiceText}\n`;
      
      if (selectedPhotos.length > 0) {
        reasonDetail += `[첨부 사진 ${selectedPhotos.length}건]:\n` + 
          selectedPhotos.map((p, idx) => `  ${idx + 1}. ${p.name} (${p.size})`).join('\n') + '\n';
      }
      
      if (selectedFiles.length > 0) {
        reasonDetail += `[첨부 파일 ${selectedFiles.length}건]:\n` + 
          selectedFiles.map((f, idx) => `  ${idx + 1}. ${f.name} (${f.size})`).join('\n') + '\n';
      }

      // 첨부 파일들을 Base64 데이터로 로드
      const filesToUpload: { name: string; base64: string; type: string }[] = [];

      // 1. 사진 파일 취합 (이미 preview에 base64가 들어있음)
      for (const photo of selectedPhotos) {
        filesToUpload.push({
          name: photo.name,
          base64: photo.preview,
          type: photo.file.type
        });
      }

      // 2. 일반 문서 파일 Base64 변환
      for (const fileObj of selectedFiles) {
        const file = fileObj.file;
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("파일 변환 실패"));
          reader.readAsDataURL(file);
        });
        filesToUpload.push({
          name: file.name,
          base64: base64,
          type: file.type
        });
      }

      const res = await apiFetch("/api/governance?action=create_mobile_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleText,
          reason: reasonDetail,
          voiceText: voiceText,
          files: filesToUpload
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("현장 작업 요청이 AI 컨트롤타워에 성공적으로 전달되었으며 할 일(스냅태스크)이 생성되었습니다.");
        
        // 모달 상태 초기화
        setIsRequestModalOpen(false);
        setSelectedPhotos([]);
        setSelectedFiles([]);
        setVoiceText("");
        setRequestTitle("");
        
        // 💡 [화면 리다이렉트 포커싱] 메인화면의 '할 일(todo)' 서브 탭으로 이동시킵니다.
        setActiveSubTab('todo');
        
        fetchTasks(); // 타임라인 리프레시
      } else {
        alert("상신에 실패했습니다: " + data.error);
      }
    } catch (e: any) {
      alert("서버 전송 중 에러가 발생했습니다: " + (e.message || "알 수 없는 오류"));
    } finally {
      setIsLoading(false);
    }
  };

  // 첨부 항목 개별 삭제 핸들러
  const removePhoto = (idx: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-sans relative overflow-x-hidden">
      {/* 백그라운드 그라데이션 장식 */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>

      <div className="max-w-md mx-auto px-4 pt-4 relative z-10">
        
        {/* 1. 상단 프로필 헤더 (콤팩트화) */}
        <div className="flex items-center justify-between mb-4 bg-white/60 backdrop-blur-xs border border-slate-200/40 rounded-2xl p-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8.5 h-8.5 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shadow-xs shrink-0 ring-2 ring-indigo-50">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-slate-800 text-sm">{session.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 📅 모바일 간편 연차신청 텍스트 버튼 */}
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              title="간편 연차 신청"
              aria-label="간편 연차 신청"
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1 text-xs font-black transition-all active:scale-95 shrink-0"
            >
              <span>연차신청</span>
            </button>
            {/* 🚪 로그아웃 아이콘 버튼 */}
            <button 
              onClick={handleLogout}
              title="로그아웃"
              aria-label="로그아웃"
              className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-xl transition duration-200 shadow-2xs cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. 콤팩트화된 가로형 실시간 근태 체크 위젯 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 mb-4 flex items-center justify-between">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span className="font-mono font-extrabold text-xl text-slate-800 tracking-wider">
                {currentTime || "00:00:00"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-405 mt-1 font-bold">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
              <span>본사 (KST)</span>
            </div>
          </div>

          <div className="shrink-0">
            {attendanceStatus === "before" && (
              <button 
                onClick={handleClockIn}
                className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer border-none"
              >
                출근 등록
              </button>
            )}
            {attendanceStatus === "working" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-mono shadow-3xs">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
                  <span>근무 {getElapsedWorkTime()}</span>
                </span>
                <button 
                  onClick={handleClockOut}
                  className="px-4 py-2.5 bg-slate-800 text-white text-xs font-black rounded-xl shadow-xs hover:bg-slate-900 active:scale-95 transition-all cursor-pointer border-none"
                >
                  퇴근 등록
                </button>
              </div>
            )}
            {attendanceStatus === "done" && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black px-3 py-2 rounded-xl flex items-center gap-1 shadow-3xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>근무 완료 ({clockInTime}~{clockOutTime}, 총 {getFinalWorkTime()})</span>
              </div>
            )}
          </div>
        </div>

        {/* ⚠️ 지각 사유 간편 상신 폼 */}
        {isTodayLate && !isLateReasonReported && (
          <form onSubmit={handleReportLateReason} className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 mb-4 text-left animate-scale-in">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black text-amber-950">금일 지각 근태 사유 상신 요구됨</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="지각 사유를 기입하세요 (예: 대중교통 지연)"
                className="flex-1 bg-white border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isReportingLateReason}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-350 text-white text-xs font-black rounded-xl border-none cursor-pointer shadow-3xs"
              >
                {isReportingLateReason ? "상신 중..." : "제출"}
              </button>
            </div>
          </form>
        )}

        {/* 📋 일일 업무 보고 작성 단독 바로가기 단추 (결재 상태 연동 버전) */}
        {!todayReport ? (
          // A. 아직 미제출 상태
          <div 
            onClick={() => router.push('/m/daily-report')}
            className="bg-white border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/5 rounded-2xl shadow-xs p-3.5 mb-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm animate-scale-in"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center shadow-3xs shrink-0">
                <FileText className="w-4 h-4 text-indigo-600 animate-pulse" />
              </div>
              <div className="text-left">
                <span className="font-extrabold text-slate-800 text-xs block leading-tight">일일 업무 보고서</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        ) : todayReport.status === 'SUBMITTED' ? (
          // B. 결재 대기 중 (SUBMITTED)
          <div 
            onClick={() => router.push('/m/daily-report')}
            className="bg-amber-50/40 border border-amber-200 text-amber-800 rounded-2xl shadow-xs p-3.5 mb-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-100/70 text-amber-700 rounded-xl flex items-center justify-center shadow-3xs shrink-0">
                <Clock className="w-4 h-4 text-amber-600 animate-spin-slow" />
              </div>
              <div className="text-left space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 text-xs block leading-tight">일일 업무 보고서 (결재 대기)</span>
                  <span className="bg-amber-100 text-amber-850 text-[8px] px-1.5 py-0.5 rounded-md font-extrabold">제출 완료</span>
                </div>
                <span className="text-[9px] text-slate-500 font-bold block">오늘 일보가 대표자 결재함에 대기 중입니다. (클릭 시 수정 가능)</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </div>
        ) : todayReport.status === 'APPROVED' ? (
          // C. 대표자 결재 승인 완료 (APPROVED)
          <div 
            onClick={() => router.push('/m/daily-report')}
            className="bg-emerald-50/40 border border-emerald-250 text-emerald-800 rounded-2xl shadow-xs p-3.5 mb-4 flex flex-col gap-2 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-100/70 text-emerald-700 rounded-xl flex items-center justify-center shadow-3xs shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-left space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-800 text-xs block leading-tight">일일 업무 보고서 (승인 완료)</span>
                    <span className="bg-emerald-100 text-emerald-850 text-[8px] px-1.5 py-0.5 rounded-md font-extrabold">최종 승인</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold block">오늘의 일보가 대표자에 의해 승인되었습니다. (수정 불가)</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600" />
            </div>
            {todayReport.comment && (
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5 text-[9.5px] font-bold text-slate-700 leading-normal flex items-start gap-1">
                <span className="text-emerald-700 shrink-0">💬 대표자 의견:</span>
                <span className="text-slate-650 font-semibold">{todayReport.comment}</span>
              </div>
            )}
          </div>
        ) : (
          // D. 반려됨 (REJECTED)
          <div 
            onClick={() => router.push('/m/daily-report')}
            className="bg-rose-50/40 border border-rose-250 text-rose-800 rounded-2xl shadow-xs p-3.5 mb-4 flex flex-col gap-2 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-rose-100/75 text-rose-700 rounded-xl flex items-center justify-center shadow-3xs shrink-0 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                </div>
                <div className="text-left space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-800 text-xs block leading-tight text-rose-750">일일 업무 보고서 (반려/보완)</span>
                    <span className="bg-rose-100 text-rose-850 text-[8px] px-1.5 py-0.5 rounded-md font-extrabold">재작성 필요</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-bold block">일보 보완 요청이 왔습니다. 클릭하여 수정한 뒤 다시 상신하세요.</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-600" />
            </div>
            {todayReport.comment && (
              <div className="bg-white/85 border border-rose-100 rounded-xl p-2.5 text-[9.5px] font-bold text-slate-700 leading-normal flex items-start gap-1">
                <span className="text-rose-700 shrink-0">💬 반려 사유:</span>
                <span className="text-slate-650 font-semibold">{todayReport.comment}</span>
              </div>
            )}
          </div>
        )}

        {/* 3. 할 일 vs 한 일 vs 태스크 폴더 메인 가로 탭 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-1 flex mb-4">
          <button
            onClick={() => setActiveSubTab('todo')}
            className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'todo'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-655 bg-transparent'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>할 일 ({filteredActiveTasks.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('done')}
            className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'done'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-655 bg-transparent'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>한 일 ({filteredCompletedTasks.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('folder')}
            className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'folder'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-655 bg-transparent'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>태스크 폴더</span>
          </button>
        </div>

        {/* 4. 메인 콘텐츠 리스트 뷰 영역 */}
        <div className="space-y-4 min-h-[300px]">
          
          {/* A. 할 일 리스트 영역 */}
          {activeSubTab === 'todo' && (
            <div className="space-y-3">
              {/* 진행중 할 일 기간별 필터 스위치 */}
              <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl text-[10px] font-black text-slate-600 shadow-2xs border border-slate-200/30">
                <button 
                  onClick={() => setTodoPeriod('all')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${todoPeriod === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  전체
                </button>
                <button 
                  onClick={() => setTodoPeriod('today')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${todoPeriod === 'today' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  오늘
                </button>
                <button 
                  onClick={() => setTodoPeriod('tomorrow')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${todoPeriod === 'tomorrow' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  내일
                </button>
                <button 
                  onClick={() => setTodoPeriod('week')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${todoPeriod === 'week' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  1주일
                </button>
                <button 
                  onClick={() => setTodoPeriod('month')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${todoPeriod === 'month' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  1달
                </button>
              </div>

              {/* 🛡️ 인증서·특허 AI 기한 배정 할 일 섹션 */}
              {certPatentTasks.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-4 shadow-md mb-2">
                  <div className="flex items-center justify-between mb-3 border-b border-indigo-700/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      <span className="text-xs font-black tracking-tight text-indigo-100">
                        인증서·특허 AI 기한 할 일 ({certPatentTasks.length}건)
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                      D-Day 모니터링
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {certPatentTasks.map((ct) => (
                      <div
                        key={ct.id}
                        className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-center justify-between text-left"
                      >
                        <div className="space-y-1 pr-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-indigo-200 font-bold">
                            <span className="bg-indigo-600/60 px-1.5 py-0.5 rounded text-white">{ct.due_date || '기한임박'}</span>
                            <span>•</span>
                            <span>{ct.assigned_to ? `담당: ${ct.assigned_to}` : '배정대기'}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{ct.title}</h4>
                          <p className="text-[10px] text-slate-300 line-clamp-1">{ct.description}</p>
                        </div>
                        <button
                          onClick={() => handleCompleteCertTask(ct.id)}
                          className="shrink-0 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          완료
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tasksLoading ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-xs font-bold">할 일 목록 불러오는 중...</span>
                </div>
              ) : filteredActiveTasks.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-500 shadow-xs">
                  <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <span className="text-xs font-bold block">
                    {todoPeriod === 'all' ? '할 일에 등록된 업무가 없습니다.' : "해당 기간에 '할 일'에 등록된 업무가 없습니다."}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredActiveTasks.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => handleOpenTaskDetail(t.id)}
                      className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between hover:border-slate-350 hover:bg-slate-50/30 transition duration-200 cursor-pointer"
                    >
                      <div className="space-y-1 text-left">
                        <span className="text-xs font-black text-slate-800 block line-clamp-2 leading-relaxed">{t.title}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                          <span className="font-mono text-indigo-600">{t.id}</span>
                          <span>•</span>
                          <span>{t.created_at}</span>
                          {session?.role === 'SUPER_ADMIN' && (
                            <>
                              <span>•</span>
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight shadow-3xs">
                                작성: {(t as any).created_by || (t as any).updated_by || '현장 모바일'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100/60 px-2 py-0.5 rounded-md shrink-0">
                        진행중
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* B. 한 일 리스트 영역 */}
          {activeSubTab === 'done' && (
            <div className="space-y-3">
              
              {/* 완료업무 기간별 필터 스위치 */}
              <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl text-[10px] font-black text-slate-600 shadow-2xs border border-slate-200/30">
                <button 
                  onClick={() => setCompletedPeriod('today')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${completedPeriod === 'today' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  오늘
                </button>
                <button 
                  onClick={() => setCompletedPeriod('yesterday')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${completedPeriod === 'yesterday' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  어제
                </button>
                <button 
                  onClick={() => setCompletedPeriod('week')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${completedPeriod === 'week' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  1주일
                </button>
                <button 
                  onClick={() => setCompletedPeriod('month')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${completedPeriod === 'month' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  1달
                </button>
              </div>

              {tasksLoading ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span className="text-xs font-bold">완료 목록 불러오는 중...</span>
                </div>
              ) : filteredCompletedTasks.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-500 shadow-xs">
                  <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <span className="text-xs font-bold block">해당 기간에 &apos;한 일&apos;에 등록된 업무가 없습니다.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredCompletedTasks.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => handleOpenTaskDetail(t.id)}
                      className="bg-white/70 border border-slate-200/50 rounded-2xl p-4 shadow-2xs flex items-center justify-between opacity-85 hover:border-slate-350 hover:bg-slate-50/40 transition duration-200 cursor-pointer"
                    >
                      <div className="space-y-1 text-left">
                        <span className="text-xs font-semibold text-slate-655 block line-through line-clamp-2 leading-relaxed">{t.title}</span>
                        <div className="flex flex-col gap-0.5 text-[9px] text-slate-400 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-500">{t.id}</span>
                            <span>•</span>
                            <span>등록: {formatDateTime(t.created_at)}</span>
                            {session?.role === 'SUPER_ADMIN' && (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight ml-1.5 shadow-3xs">
                                작성: {(t as any).created_by || (t as any).updated_by || '현장 모바일'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-600/80 font-black">
                            <span>완료: {formatDateTime(t.updated_at)}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100/60 px-2 py-0.5 rounded-md shrink-0">
                        완료됨
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* C. 모바일 태스크 폴더 리스트 및 상세 수집 영역 */}
          {activeSubTab === 'folder' && (
            <div className="space-y-4 text-left">
              {/* 폴더 생성 헤더 위젯 */}
              <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div 
                  onClick={() => {
                    setIsFolderSearchModalOpen(true);
                    setFolderSearchQuery("");
                  }}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition duration-150 active:scale-[0.98]"
                  title="전체 태스크 폴더 검색/목록 보기"
                >
                  <FolderOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-slate-800 block flex items-center gap-1">
                      <span>태스크 폴더 목록 ({mobileFolders.length})</span>
                      <Edit2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileFolderModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer border-none shadow-3xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 폴더</span>
                </button>
              </div>

              {/* 📁 폴더 선택기 */}
              {mobileFoldersLoading ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-xs font-bold">폴더 목록 로딩 중...</span>
                </div>
              ) : mobileFolders.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 shadow-xs border-dashed border-slate-250">
                  <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <span className="text-xs font-bold block">생성된 태스크 폴더가 없습니다.</span>
                  <span className="text-[10px] text-slate-400 block mt-1">새 폴더 생성 단추를 이용해 현장 폴더를 추가해 보세요.</span>
                </div>
              ) : (
                <div 
                  ref={folderScrollRef}
                  onMouseDown={handleFolderMouseDown}
                  onMouseLeave={handleFolderMouseLeave}
                  onMouseUp={handleFolderMouseUp}
                  onMouseMove={handleFolderMouseMove}
                  onWheel={handleFolderWheel}
                  className="flex gap-2 overflow-x-auto pb-2 no-scrollbar select-none cursor-grab active:cursor-grabbing scroll-smooth"
                >
                  {mobileFolders.map(f => {
                    const isSelected = String(f.id) === activeMobileFolderId;
                    return (
                      <div
                        key={f.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isFolderMoved) return;
                          setActiveMobileFolderId(String(f.id));
                        }}
                        title={f.name}
                        className={`px-4 py-3 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 group relative shrink-0 outline-none ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="flex flex-col items-start gap-0.5">
                          <span className="flex items-center gap-1 font-extrabold text-xs">
                            📁 {f.name.length > 8 ? `${f.name.slice(0, 8)}...` : f.name}
                            <span className={isSelected ? 'text-indigo-300 font-bold' : 'text-slate-400 font-bold'}>
                              ({isSelected ? mobileFolderItems.length : (f as any).item_count ?? 0})
                            </span>
                          </span>
                          {session?.role === 'SUPER_ADMIN' && f.created_by && (
                            <span className={`text-[8px] px-1 py-0.2 rounded font-black tracking-tight ${
                              isSelected ? 'bg-white/20 text-white/90' : 'bg-slate-100 text-slate-500'
                            }`}>
                              소유: {f.created_by}
                            </span>
                          )}
                        </span>
                        {/* 폴더 제어 영역 */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {activeFolderMenuId === f.id ? (
                            // 더보기가 열렸을 때: 인라인으로 수정/삭제 칩 단추 제공 (절대 잘리지 않음)
                            <div className="flex items-center gap-1 animate-scale-in">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMobileUpdateFolder(f.id, f.name);
                                }}
                                className={`px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] flex items-center justify-center ${
                                  isSelected ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-250 text-indigo-750'
                                }`}
                                title="폴더 이름 수정"
                              >
                                ✏️
                              </span>
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMobileDeleteFolder(f.id, e);
                                }}
                                className={`px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] flex items-center justify-center ${
                                  isSelected ? 'bg-white/10 hover:bg-rose-500/20 text-rose-300' : 'bg-slate-100 hover:bg-rose-500/10 text-rose-600'
                                }`}
                                title="폴더 삭제"
                              >
                                🗑️
                              </span>
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFolderMenuId(null);
                                }}
                                className={`px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] font-black flex items-center justify-center ${
                                  isSelected ? 'bg-white/10 hover:bg-white/20 text-white/70' : 'bg-slate-100 hover:bg-slate-250 text-slate-400'
                                }`}
                                title="메뉴 닫기"
                              >
                                ✕
                              </span>
                            </div>
                          ) : (
                            // 평소 상태: 더보기 (점 3개) 버튼만 심플하게 노출
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFolderMenuId(f.id);
                              }}
                              className={`p-1 rounded-lg hover:bg-slate-150 text-slate-400 hover:text-indigo-600 transition cursor-pointer ${
                                isSelected ? 'hover:bg-white/10 text-slate-300 hover:text-white' : ''
                              }`}
                              title="폴더 관리 메뉴 열기"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 📂 선택된 폴더 상세 정보 수집 타임라인 */}
              {activeMobileFolderId ? (
                <div className="space-y-4">
                  


                  {/* 수집된 자료 리스트 */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
                    {mobileItemsLoading ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-[10px] font-bold">자료 읽어오는 중...</span>
                      </div>
                    ) : mobileFolderItems.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        <CheckCircle2 className="w-8 h-8 text-slate-200 mx-auto mb-1.5" />
                        <span className="text-[10px] font-bold block">이 폴더에 수집된 정보가 아직 없습니다.</span>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {mobileFolderItems.map(item => (
                          <div key={item.id} className="border border-slate-200/60 rounded-xl p-3 shadow-3xs flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-1">
                              <span 
                                onClick={() => handleMobileUpdateItemTitle(item.id, item.title)}
                                className="font-extrabold text-xs text-slate-800 truncate cursor-pointer hover:text-indigo-600 hover:underline transition flex items-center gap-1 min-w-0"
                                title="제목 편집"
                              >
                                <span>{item.title}</span>
                                <Edit2 className="w-2.5 h-2.5 text-slate-350 shrink-0" />
                              </span>
                              
                              <div className="flex items-center gap-1 shrink-0">
                                {item.tags ? (
                                  <div 
                                    onClick={() => handleMobileUpdateItemTags(item.id, item.tags || "")}
                                    className="flex gap-1 flex-wrap shrink-0 cursor-pointer hover:opacity-80 transition"
                                    title="태그 편집"
                                  >
                                    {item.tags.split(',').map((t, idx) => {
                                      const trimmed = t.trim();
                                      if (!trimmed) return null;
                                      return (
                                        <span key={idx} className="text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                                          #{trimmed}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span 
                                    onClick={() => handleMobileUpdateItemTags(item.id, "")}
                                    className="text-[8px] font-black bg-slate-50 text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded-md shrink-0 cursor-pointer hover:bg-slate-100 transition"
                                    title="태그 등록"
                                  >
                                    태그없음
                                  </span>
                                )}
                                <button
                                  onClick={() => handleMobileDeleteItem(item.id)}
                                  className="p-1 rounded-lg border-none bg-transparent hover:bg-rose-500/10 text-rose-455 hover:text-rose-600 transition cursor-pointer"
                                  title="자료 삭제"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            
                            {item.content && (
                              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100 whitespace-pre-wrap">
                                {item.content}
                              </p>
                            )}

                            {item.file_name && item.file_url && (
                              <div 
                                onClick={() => setActiveViewerItem(item)}
                                className="p-1.5 bg-indigo-50/20 hover:bg-indigo-100/40 border border-indigo-100/40 rounded-lg flex items-center justify-between text-[10px] text-indigo-700 font-bold cursor-pointer transition active:scale-98"
                              >
                                <span className="truncate max-w-[180px] flex items-center gap-1">
                                  {item.file_size === 'URL 링크' ? (
                                    <Link className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  ) : (
                                    <span className="shrink-0">📄</span>
                                  )}
                                  <span>{item.file_name}</span>
                                </span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                                  item.file_size === 'URL 링크' 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : 'bg-indigo-100/50 text-indigo-800'
                                }`}>
                                  {item.file_size === 'URL 링크' ? 'URL 링크' : '스토리지'}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
                  <FolderOpen className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <span className="text-xs font-bold block">조회된 활성화 폴더가 없습니다.</span>
                  <span className="text-[10px] text-slate-405 block mt-1">상단 가로 리스트에서 추가할 폴더를 선택해 주세요.</span>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 숨겨진 파일 및 사진 업로드 인풋 */}
      <input 
        type="file" 
        multiple
        ref={photoInputRef}
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />
      <input 
        type="file" 
        multiple
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 하단 플로팅 액션 버튼 (FAB) - 메인 화면용 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
        {isFabOpen && (
          <div className="flex items-center gap-3 mb-4 animate-scale-in">
            <button 
              onClick={handlePhotoClick}
              className="w-12 h-12 bg-white text-indigo-600 rounded-full shadow-lg border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 transition active:scale-90 cursor-pointer animate-fade-in"
              title="사진 촬영(다중)"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button 
              onClick={handleMicClick}
              className="w-14 h-14 bg-gradient-to-tr from-rose-500 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 transition active:scale-90 cursor-pointer animate-pulse animate-fade-in"
              title="말로 작업 요청"
            >
              <Mic className="w-6 h-6" />
            </button>

            <button 
              onClick={handleFileClick}
              className="w-12 h-12 bg-white text-emerald-600 rounded-full shadow-lg border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 transition active:scale-90 cursor-pointer animate-fade-in"
              title="파일 첨부(다중)"
            >
              <FileText className="w-5 h-5" />
            </button>

            <button 
              onClick={handleLinkClick}
              className="w-12 h-12 bg-white text-amber-600 rounded-full shadow-lg border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 transition active:scale-90 cursor-pointer animate-fade-in"
              title="URL 링크 등록"
            >
              <Link className="w-5 h-5" />
            </button>
          </div>
        )}

        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition duration-300 active:scale-95 cursor-pointer ${
            isFabOpen 
              ? "bg-slate-800 rotate-45" 
              : "bg-gradient-to-r from-indigo-600 to-indigo-500"
          }`}
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* AI 작업 상신 입력 확인 팝업 모달 */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-scale-in text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setRequestModalTab('request');
                    setIsRecording(false);
                  }}
                  className={`pb-2 text-xs font-black transition relative cursor-pointer border-none bg-transparent ${
                    requestModalTab === 'request' 
                      ? 'text-indigo-600' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    작업 요청
                  </span>
                  {requestModalTab === 'request' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-fade-in" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRequestModalTab('folder')}
                  className={`pb-2 text-xs font-black transition relative cursor-pointer border-none bg-transparent ${
                    requestModalTab === 'folder' 
                      ? 'text-indigo-600' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    태스크에 등록
                  </span>
                  {requestModalTab === 'folder' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-fade-in" />
                  )}
                </button>
              </div>

              <button 
                onClick={() => {
                  setIsRequestModalOpen(false);
                  setIsRecording(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-650 border-none bg-transparent cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestModalTab === 'request' ? (
              <>
                {isRecording && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-center space-y-2">
                    <div className="flex justify-center items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                      <span className="text-xs font-black text-rose-600">음성을 인식하는 중...</span>
                    </div>
                    <p className="text-[11px] text-slate-500">"수주 등록해 주세요" 등 명령을 말해보세요.</p>
                  </div>
                )}

                {!isRecording && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">상신 제목</label>
                      <input 
                        type="text"
                        value={requestTitle}
                        onChange={(e) => setRequestTitle(e.target.value)}
                        placeholder="수주 등록 요청 건"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 block">요청 사항 (음성 변환)</label>
                        <button 
                          onClick={handleMicClick}
                          className="text-[9px] font-black text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg flex items-center gap-1 border-none cursor-pointer transition-colors animate-pulse"
                          title="말로 작업 재지시"
                        >
                          <Mic className="w-3 h-3 text-rose-600" />
                          <span>음성 인식</span>
                        </button>
                      </div>
                      <textarea 
                        value={voiceText}
                        onChange={(e) => setVoiceText(e.target.value)}
                        placeholder="음성 명령 또는 타이핑하여 지시하세요..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 block">
                          첨부 자료 목록 ({selectedPhotos.length + selectedFiles.length}건)
                        </label>
                        
                        <div className="flex gap-1.5">
                          <button 
                            onClick={handlePhotoClick}
                            className="text-[9px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 border-none cursor-pointer transition-colors"
                            title="사진 추가 촬영"
                          >
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            <span>사진 추가</span>
                          </button>
                          <button 
                            onClick={handleFileClick}
                            className="text-[9px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1 border-none cursor-pointer transition-colors"
                            title="문서 파일 추가"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-emerald-655" />
                            <span>파일 추가</span>
                          </button>
                          <button 
                            onClick={handleOpenFolderPicker}
                            className="text-[9px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 border-none cursor-pointer transition-colors"
                            title="태스크 폴더에서 찾아오기"
                          >
                            <FolderClosed className="w-3.5 h-3.5 text-amber-600" />
                            <span>폴더 연동</span>
                          </button>
                        </div>
                      </div>

                      {(selectedPhotos.length > 0 || selectedFiles.length > 0) ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2.5 max-h-[180px] overflow-y-auto shadow-inner">
                          {selectedPhotos.map((photo, index) => (
                            <div key={`photo_${index}`} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/40 last:border-0 gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img 
                                  src={photo.preview} 
                                  onClick={() => setPreviewImageUrl(photo.preview)}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-3xs shrink-0 cursor-zoom-in hover:brightness-95 transition-all" 
                                  alt="photo thumbnail"
                                />
                                <div className="min-w-0 text-left">
                                  <span className="font-extrabold text-slate-700 block truncate leading-tight">{photo.name}</span>
                                  <span className="text-[9px] text-slate-405 font-bold block mt-0.5">{photo.size}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => removePhoto(index)}
                                className="text-rose-500 hover:text-rose-750 border-none bg-transparent cursor-pointer p-1 shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}

                          {selectedFiles.map((file, index) => {
                            const ext = file.name.split('.').pop()?.toLowerCase();
                            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');

                            return (
                              <div key={`file_${index}`} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/40 last:border-0 gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {file.isLink ? (
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-200 shadow-3xs">
                                      <Link className="w-4 h-4" />
                                    </div>
                                  ) : isVideo ? (
                                    <div className="w-10 h-10 rounded-lg bg-slate-850 flex items-center justify-center text-white shrink-0 border border-slate-700 shadow-3xs relative">
                                      <Play className="w-3.5 h-3.5 fill-white text-white animate-pulse" />
                                      <span className="absolute bottom-0 right-0 text-[6px] font-black bg-indigo-600 px-1 rounded-sm text-white scale-85 origin-bottom-right">VIDEO</span>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/60 shadow-3xs">
                                      <FileText className="w-5 h-5 text-slate-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0 text-left">
                                    <span className={`font-extrabold block truncate leading-tight ${file.isLink ? 'text-amber-950' : isVideo ? 'text-indigo-950' : 'text-slate-700'}`}>
                                      {file.name}
                                    </span>
                                    <span className={`text-[9px] font-bold block mt-0.5 ${file.isLink ? 'text-amber-700' : 'text-slate-405'}`}>{file.size}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => removeFile(index)}
                                  className="text-rose-500 hover:text-rose-750 border-none bg-transparent cursor-pointer p-1 shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/40 rounded-2xl p-4 text-center text-[10px] text-slate-400 font-bold">
                          첨부된 자료가 없습니다. 추가 단추로 등록해보세요.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2.5 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsRequestModalOpen(false);
                      setSelectedPhotos([]);
                      setSelectedFiles([]);
                      setVoiceText("");
                      setRequestTitle("");
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-600 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-[11px] transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSendRequest}
                    disabled={isRecording || (voiceText.trim() === "" && selectedPhotos.length === 0 && selectedFiles.length === 0)}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-extrabold px-4 py-2.5 rounded-xl text-[11px] border-none flex items-center gap-1 transition shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>AI 관제 상신</span>
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleUploadModalSubmit} className="space-y-3.5">
                {/* 폴더 선택 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">대상 태스크 폴더</label>
                  <select
                    value={uploadModalFolderId}
                    onChange={(e) => setUploadModalFolderId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition"
                    required
                  >
                    <option value="">폴더를 선택해 주세요</option>
                    {mobileFolders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>

                {/* 제목 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">자료 제목</label>
                  <input 
                    type="text"
                    value={uploadModalTitle}
                    onChange={(e) => setUploadModalTitle(e.target.value)}
                    placeholder="예: 미팅 피드백 공유"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* 태그 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">태그 (쉼표 구분)</label>
                  <input 
                    type="text"
                    value={uploadModalTags}
                    onChange={(e) => setUploadModalTags(e.target.value)}
                    placeholder="예: 미팅, 계약, 강남"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* 본문 메모 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-400 block">메모 설명</label>
                    <button
                      type="button"
                      onClick={startUploadModalSpeech}
                      className={`flex items-center gap-1 text-[9px] font-black border border-none rounded-lg px-2 py-0.5 transition cursor-pointer ${
                        isUploadModalListening 
                          ? 'bg-rose-500 text-white animate-pulse' 
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <Mic className="w-2.5 h-2.5" />
                      <span>{isUploadModalListening ? "음성 인식 중..." : "말로 작성"}</span>
                    </button>
                  </div>
                  <textarea 
                    value={uploadModalContent}
                    onChange={(e) => setUploadModalContent(e.target.value)}
                    placeholder="요약 메모 및 피드백 내용 등을 적어주세요..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                {/* 다중 첨부파일 아카이브 표시 리스트 및 모달 내 직접 추가 단추 배치 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 block">
                      첨부 자료 목록 ({selectedPhotos.length + selectedFiles.length}건)
                    </label>
                    
                    <div className="flex gap-1.5">
                      <button 
                        type="button"
                        onClick={handlePhotoClick}
                        className="text-[9px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 border-none cursor-pointer transition-colors"
                        title="사진 추가 촬영"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>사진 추가</span>
                      </button>
                      <button 
                        type="button"
                        onClick={handleFileClick}
                        className="text-[9px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1 border-none cursor-pointer transition-colors"
                        title="문서 파일 추가"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-655" />
                        <span>파일 추가</span>
                      </button>
                      <button 
                        type="button"
                        onClick={handleOpenFolderPicker}
                        className="text-[9px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 border-none cursor-pointer transition-colors"
                        title="태스크 폴더에서 찾아오기"
                      >
                        <FolderClosed className="w-3.5 h-3.5 text-amber-600" />
                        <span>폴더 연동</span>
                      </button>
                    </div>
                  </div>

                  {(selectedPhotos.length > 0 || selectedFiles.length > 0) ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2.5 max-h-[180px] overflow-y-auto shadow-inner">
                      {selectedPhotos.map((photo, index) => (
                        <div key={`photo_${index}`} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/40 last:border-0 gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img 
                              src={photo.preview} 
                              onClick={() => setPreviewImageUrl(photo.preview)}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-3xs shrink-0 cursor-zoom-in hover:brightness-95 transition-all" 
                              alt="photo thumbnail"
                            />
                            <div className="min-w-0 text-left">
                              <span className="font-extrabold text-slate-700 block truncate leading-tight">{photo.name}</span>
                              <span className="text-[9px] text-slate-405 font-bold block mt-0.5">{photo.size}</span>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="text-rose-500 hover:text-rose-750 border-none bg-transparent cursor-pointer p-1 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {selectedFiles.map((file, index) => {
                        const ext = file.name.split('.').pop()?.toLowerCase();
                        const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');

                        return (
                          <div key={`file_${index}`} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-200/40 last:border-0 gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {file.isLink ? (
                                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-200 shadow-3xs">
                                  <Link className="w-4 h-4" />
                                </div>
                              ) : isVideo ? (
                                <div className="w-10 h-10 rounded-lg bg-slate-850 flex items-center justify-center text-white shrink-0 border border-slate-700 shadow-3xs relative">
                                  <Play className="w-3.5 h-3.5 fill-white text-white animate-pulse" />
                                  <span className="absolute bottom-0 right-0 text-[6px] font-black bg-indigo-600 px-1 rounded-sm text-white scale-85 origin-bottom-right">VIDEO</span>
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/60 shadow-3xs">
                                  <FileText className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0 text-left">
                                <span className={`font-extrabold block truncate leading-tight ${file.isLink ? 'text-amber-950' : isVideo ? 'text-indigo-950' : 'text-slate-700'}`}>
                                  {file.name}
                                </span>
                                <span className={`text-[9px] font-bold block mt-0.5 ${file.isLink ? 'text-amber-700' : 'text-slate-405'}`}>{file.size}</span>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-rose-500 hover:text-rose-750 border-none bg-transparent cursor-pointer p-1 shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 border border-slate-200/40 rounded-2xl p-4 text-center text-[10px] text-slate-400 font-bold">
                      첨부된 자료가 없습니다. 추가 단추로 등록해보세요.
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="bg-white hover:bg-slate-50 text-slate-655 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-[11px] transition cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-[11px] border-none transition shadow-sm cursor-pointer"
                  >
                    등록 완료
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 💡 [신규 서브 팝업] 태스크 폴더 자료 찾기 및 첨부 연동 모달 */}
      {isFolderPickerOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-scale-in text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-slate-800">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-sm">태스크 폴더 자료 연동</span>
              </div>
              <button 
                onClick={() => setIsFolderPickerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 폴더 선택기 */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">태스크 폴더 선택</label>
              <select
                value={selectedPickerFolderId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPickerFolderId(val);
                  fetchPickerItems(val);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 transition"
              >
                <option value="">폴더를 선택해 주세요</option>
                {pickerFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>

            {/* 폴더 내 첨부용 자료 목록 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block">가져올 자료 선택 (터치)</label>
              
              {pickerLoading ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-xs font-bold">파일 불러오는 중...</span>
                </div>
              ) : pickerItems.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-2xl font-bold">
                  이 폴더에 첨부된 수집자료(파일)가 없습니다.
                </div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {pickerItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectFromFolder(item)}
                      className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200/60 rounded-xl text-left transition duration-200 flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 text-left">
                        <span className="text-xs font-extrabold text-slate-750 block truncate leading-tight">
                          {item.file_name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                          {item.title} ({item.file_size})
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsFolderPickerOpen(false)}
                className="bg-white hover:bg-slate-50 text-slate-600 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-[11px] transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 모바일 신규 폴더 생성 팝업 모달 */}
      {isMobileFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xs w-full p-4 space-y-4 animate-scale-in text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-slate-800">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-xs">새 태스크 폴더 생성</span>
              </div>
              <button 
                onClick={() => setIsMobileFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMobileCreateFolder} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-slate-405 block mb-1">폴더 이름</label>
                <input 
                  type="text"
                  value={newMobileFolderName}
                  onChange={(e) => setNewMobileFolderName(e.target.value)}
                  placeholder="예: 강남 대리점 미팅"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-405 block mb-1">폴더 설명</label>
                <textarea 
                  value={newMobileFolderDesc}
                  onChange={(e) => setNewMobileFolderDesc(e.target.value)}
                  placeholder="폴더 목적과 정보 수집 방향을 기재하세요..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMobileFolderModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 font-bold px-3 py-2 rounded-lg border border-slate-200 text-[10px] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-2 rounded-lg text-[10px] border-none transition shadow-sm cursor-pointer"
                >
                  폴더 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* 📸 썸네일 이미지 전체화면 확대 라이트박스 뷰어 */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button 
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 cursor-pointer transition"
            title="닫기 (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img 
            src={previewImageUrl} 
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/5 animate-scale-in" 
            alt="full preview"
            onClick={(e) => e.stopPropagation()} // 이미지 클릭 시 닫히지 않도록 방지
          />
        </div>
      )}

      {/* 📁 전체 태스크 폴더 검색 및 선택 팝업 모달 */}
      {isFolderSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-scale-in text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-slate-800">
                <FolderOpen className="w-4.5 h-4.5 text-indigo-600" />
                <span className="font-extrabold text-sm text-slate-800">태스크 폴더 통합 검색</span>
              </div>
              <button 
                onClick={() => setIsFolderSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* 검색창 */}
            <div className="relative">
              <input 
                type="text"
                value={folderSearchQuery}
                onChange={(e) => setFolderSearchQuery(e.target.value)}
                placeholder="검색할 폴더명을 입력하세요..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              {folderSearchQuery && (
                <button
                  onClick={() => setFolderSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-350 hover:text-slate-550 border-none bg-transparent cursor-pointer"
                  title="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 폴더 리스트 목록 */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {(() => {
                const filtered = mobileFolders.filter(f => 
                  f.name.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
                  (f.description && f.description.toLowerCase().includes(folderSearchQuery.toLowerCase()))
                );

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <span className="text-xs font-bold">일치하는 태스크 폴더가 없습니다.</span>
                    </div>
                  );
                }

                return filtered.map(f => {
                  const isCurrentSelected = String(f.id) === activeMobileFolderId;
                  return (
                    <div 
                      key={f.id}
                      onClick={() => {
                        setActiveMobileFolderId(String(f.id));
                        setIsFolderSearchModalOpen(false);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 active:scale-[0.985] ${
                        isCurrentSelected
                          ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900 shadow-3xs font-extrabold'
                          : 'bg-slate-50/30 hover:bg-slate-50 border-slate-150 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate" title={f.name}>
                          📁 {f.name.length > 8 ? `${f.name.slice(0, 8)}...` : f.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {activeFolderMenuId === f.id ? (
                            // 더보기가 열렸을 때: 인라인으로 수정/삭제 칩 단추 제공 (절대 잘리지 않음)
                            <div className="flex items-center gap-1 animate-scale-in">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMobileUpdateFolder(f.id, f.name);
                                }}
                                className="px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] flex items-center justify-center bg-slate-100 hover:bg-slate-250 text-indigo-750"
                                title="폴더 이름 수정"
                              >
                                ✏️
                              </span>
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMobileDeleteFolder(f.id, e);
                                }}
                                className="px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] flex items-center justify-center bg-slate-100 hover:bg-rose-500/10 text-rose-600"
                                title="폴더 삭제"
                              >
                                🗑️
                              </span>
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFolderMenuId(null);
                                }}
                                className="px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] font-black flex items-center justify-center bg-slate-100 hover:bg-slate-250 text-slate-400"
                                title="메뉴 닫기"
                              >
                                ✕
                              </span>
                            </div>
                          ) : (
                            // 평소 상태: 더보기 (점 3개) 버튼만 심플하게 노출
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFolderMenuId(f.id);
                              }}
                              className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                              title="폴더 관리 메뉴 열기"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </span>
                          )}

                          {isCurrentSelected && (
                            <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-md shrink-0">
                              현재 선택됨
                            </span>
                          )}
                        </div>
                      </div>
                      {f.description && (
                        <p className="text-[10px] text-slate-400 font-medium truncate pl-5">
                          {f.description}
                        </p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsFolderSearchModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold px-4 py-2 rounded-xl border-none text-[10px] transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 통합 파일 뷰어 및 공유 팝업 모달 */}
      {activeViewerItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-[70] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-scale-in text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5 text-slate-800 min-w-0">
                <span className="text-xs shrink-0">📁</span>
                <span className="font-extrabold text-xs truncate max-w-[200px]" title={activeViewerItem.title}>
                  {activeViewerItem.title}
                </span>
              </div>
              <button 
                onClick={() => {
                  setActiveViewerItem(null);
                  setIsMoveFolderSelectorOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer transition"
                title="닫기"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* 미디어 뷰어 영역 */}
            <div className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl p-4 overflow-hidden min-h-[160px] max-h-[50vh]">
              {(() => {
                const url = activeViewerItem.file_url || "";
                const name = (activeViewerItem.file_name || "").toLowerCase();
                const isLink = activeViewerItem.file_size === "URL 링크";

                if (!url) {
                  return (
                    <div className="text-center p-4 space-y-2">
                      <span className="text-2xl block">⚠️</span>
                      <span className="text-[10px] text-slate-450 font-bold block">연결된 첨부 파일 경로가 올바르지 않습니다.</span>
                    </div>
                  );
                }

                if (isLink) {
                  return (
                    <div className="text-center p-4 space-y-3">
                      <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                        <Link className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block max-w-[250px] truncate mx-auto">
                          {activeViewerItem.file_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[250px] mt-1 select-all">
                          {url}
                        </span>
                      </div>
                      <button
                        onClick={() => window.open(url, '_blank')}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2 rounded-xl text-[10px] border-none transition shadow-3xs cursor-pointer inline-flex items-center gap-1 active:scale-98"
                      >
                        <span>웹페이지 새 창으로 이동</span>
                        <span>➔</span>
                      </button>
                    </div>
                  );
                }

                const isImage = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp');
                const isVideo = name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.webm');
                const isPdf = name.endsWith('.pdf');

                if (isImage) {
                  return (
                    <img 
                      src={getFileServingUrl(activeViewerItem)} 
                      className="max-w-full max-h-[45vh] object-contain rounded-xl shadow-2xs cursor-zoom-in"
                      alt={activeViewerItem.file_name}
                      onClick={() => {
                        setPreviewImageUrl(getFileServingUrl(activeViewerItem));
                        setActiveViewerItem(null);
                      }}
                    />
                  );
                }

                if (isVideo) {
                  return (
                    <video 
                      src={getFileServingUrl(activeViewerItem)} 
                      controls 
                      className="max-w-full max-h-[45vh] rounded-xl shadow-2xs"
                    />
                  );
                }

                if (isPdf) {
                  return (
                    <iframe 
                      src={getFileServingUrl(activeViewerItem)} 
                      className="w-full h-[45vh] rounded-xl border-none shadow-2xs bg-white"
                      title={activeViewerItem.file_name}
                    />
                  );
                }

                return (
                  <div className="text-center p-4 space-y-3">
                    <span className="text-4xl block">📄</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-[250px] mx-auto">
                        {activeViewerItem.file_name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                        ({activeViewerItem.file_size})
                      </span>
                    </div>
                    <button
                      onClick={() => window.open(getFileServingUrl(activeViewerItem), '_blank')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-[10px] border-none transition shadow-3xs cursor-pointer inline-flex items-center gap-1 active:scale-98"
                    >
                      <span>파일 내려받기 / 열기</span>
                      <span>➔</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* 다른 폴더 선택 영역 */}
            {isMoveFolderSelectorOpen && activeViewerItem.tableName !== 'crm_snaptask_items' && (
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3 space-y-2 animate-scale-in">
                <span className="text-[9px] font-black text-slate-500 block">이동할 대상 태스크 폴더 선택:</span>
                <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {mobileFolders
                    .filter(f => String(f.id) !== activeMobileFolderId) // 현재 폴더 제외
                    .map(f => (
                      <div
                        key={f.id}
                        onClick={() => handleMoveFileFolder(activeViewerItem.id, f.id)}
                        className="p-2 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 text-slate-700 hover:text-indigo-900 text-[10px] font-extrabold flex items-center justify-between cursor-pointer transition active:scale-[0.985]"
                      >
                        <span className="truncate max-w-[180px]">📁 {f.name}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                    ))}
                  {mobileFolders.filter(f => String(f.id) !== activeMobileFolderId).length === 0 && (
                    <span className="text-[9px] text-slate-400 font-bold block py-2 text-center">이동 가능한 다른 폴더가 없습니다.</span>
                  )}
                </div>
              </div>
            )}

            {/* 조작 및 공유 버튼 */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              {activeViewerItem.tableName === 'crm_snaptask_items' ? (
                <button
                  onClick={() => {
                    const url = getFileServingUrl(activeViewerItem);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = activeViewerItem.file_name || 'download';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-3.5 py-2.5 rounded-xl text-[10px] border border-indigo-100/50 transition cursor-pointer flex items-center gap-1 active:scale-98"
                  title="파일 내려받기"
                >
                  <span>📥 다운로드</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsMoveFolderSelectorOpen(!isMoveFolderSelectorOpen)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-3.5 py-2.5 rounded-xl text-[10px] border border-indigo-100/50 transition cursor-pointer flex items-center gap-1 active:scale-98"
                  title="다른 태스크 폴더로 이동"
                >
                  <span>📁 이동</span>
                </button>
              )}
              <button
                onClick={() => handleShareFile(activeViewerItem)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-[10px] border-none transition shadow-3xs cursor-pointer flex items-center gap-1.5 active:scale-98"
                title="외부 공유하기 (네이티브/링크 복사)"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>공유</span>
              </button>
              <button
                onClick={() => {
                  setActiveViewerItem(null);
                  setIsMoveFolderSelectorOpen(false);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold px-3.5 py-2.5 rounded-xl border-none text-[10px] transition cursor-pointer active:scale-98"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 5. 스냅태스크 상세 내역 & 취소 요청 모달 */}
      {isTaskDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col p-6 shadow-xl border border-slate-200/80 scrollbar-thin">
            
            {/* 헤더 */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/65 px-2 py-0.5 rounded-md font-mono">
                  {selectedTaskId}
                </span>
                <h3 className="text-base font-black text-slate-800 leading-tight">
                  {taskDetail ? taskDetail.title : "업무 상세 내역"}
                </h3>
              </div>
              <button 
                onClick={() => setIsTaskDetailOpen(false)}
                className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 border-none cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 본문 콘텐츠 */}
            <div className="flex-grow py-4 space-y-4 text-left">
              {isTaskDetailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-bold">상세 내역을 로딩하고 있습니다...</span>
                </div>
              ) : (
                <>
                  {/* 스냅태스크 상태 표시 */}
                  {taskDetail && (
                    <div className="flex flex-col gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px]">진행 상태</span>
                          <span className={`font-black text-[10px] px-2 py-0.5 rounded-md border inline-block mt-0.5 ${
                            taskDetail.status === 'ACTIVE'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : taskDetail.status === 'PENDING_APPROVAL'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {taskDetail.status === 'ACTIVE' 
                              ? '진행중' 
                              : taskDetail.status === 'PENDING_APPROVAL' 
                                ? '취소 승인 대기' 
                                : '완료됨'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 font-bold block text-[10px]">작업 등록 일시</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">{formatDateTime(taskDetail.created_at)}</span>
                        </div>
                      </div>
                      {taskDetail.status !== 'ACTIVE' && taskDetail.status !== 'PENDING_APPROVAL' && (
                        <div className="border-t border-slate-200/60 pt-2.5 flex justify-between items-center">
                          <span className="text-emerald-700 font-bold text-[10px]">작업 완료 일시</span>
                          <span className="font-semibold text-emerald-700">{formatDateTime(taskDetail.updated_at || taskDetail.created_at)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 타임라인 및 첨부 파일 */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">타임라인 이력 / 수집 자료</span>
                    
                    <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                      {(() => {
                        const mainItem = taskTimeline.find(item => item.content_text?.includes('[요청 사유]'));
                        const attachments = taskTimeline.filter(item => item.content_text?.includes('[상신 첨부]'));
                        const displayTimeline = taskTimeline.filter(item => {
                          if (item.content_text?.includes('[상신 첨부]')) {
                            return false;
                          }
                          return true;
                        });

                        return displayTimeline.map((item, index) => {
                          const isMainCard = item.id === mainItem?.id;
                          return (
                            <div 
                              key={item.id || index}
                              className="bg-white border border-slate-150 rounded-2xl p-4.5 space-y-2 shadow-2xs"
                            >
                              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                <span>이력 #{index + 1}</span>
                                <span>{item.created_at}</span>
                              </div>
                              
                              <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                                {item.content_text}
                              </p>

                              {isMainCard && attachments.length > 0 && (
                                <div className="pt-2.5 border-t border-slate-100 mt-2 space-y-2">
                                  <span className="text-[10px] font-black text-slate-450 block">첨부 파일 목록 ({attachments.length}건)</span>
                                  {attachments.map((fileItem, fIdx) => (
                                    <div key={fileItem.id || fIdx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[180px]">
                                        📎 {fileItem.content_text?.replace('[상신 첨부] ', '') || '첨부 파일'}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const fileName = fileItem.content_text?.replace('[상신 첨부] ', '') || '첨부 파일';
                                          setActiveViewerItem({
                                            id: fileItem.id,
                                            file_url: fileItem.file_url || `/api/shared/files?tableName=crm_snaptask_items&rowId=${fileItem.id}&columnName=file_url`,
                                            file_name: fileName,
                                            file_size: '파일 첨부',
                                            title: fileName,
                                            tableName: 'crm_snaptask_items'
                                          });
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] border-none transition cursor-pointer active:scale-95 shadow-3xs"
                                      >
                                        파일 열기
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {!isMainCard && item.file_url && (
                                <div className="pt-2 border-t border-slate-100 mt-2 flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">
                                    📎 {item.content_text?.replace('[상신 첨부] ', '') || '첨부 파일'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const fileName = item.content_text?.replace('[상신 첨부] ', '') || '첨부 파일';
                                      setActiveViewerItem({
                                        id: item.id,
                                        file_url: item.file_url || `/api/shared/files?tableName=crm_snaptask_items&rowId=${item.id}&columnName=file_url`,
                                        file_name: fileName,
                                        file_size: '파일 첨부',
                                        title: fileName,
                                        tableName: 'crm_snaptask_items'
                                      });
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] border-none transition cursor-pointer active:scale-95 shadow-3xs"
                                  >
                                    파일 열기
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                      {taskTimeline.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl">
                          기록된 상세 이력이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 취소 승인 요청 폼 분기 */}
                  {taskDetail && taskDetail.status === 'ACTIVE' && (
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      {!isCancelRequestFormOpen ? (
                        <button
                          onClick={() => setIsCancelRequestFormOpen(true)}
                          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-black py-3 rounded-2xl border border-rose-100 transition cursor-pointer text-xs active:scale-98 shadow-3xs flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>업무 취소 상신 요청</span>
                        </button>
                      ) : (
                        <form onSubmit={handleCancelRequestSubmit} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 animate-scale-in">
                          <span className="text-[10px] font-black text-slate-500 block">⚠️ 취소 요청 사유를 기입해 주십시오:</span>
                          <textarea
                            value={cancelRequestReason}
                            onChange={(e) => setCancelRequestReason(e.target.value)}
                            required
                            placeholder="컨트롤타워 승인에 동반될 취소 사유를 구체적으로 작성해 주십시오."
                            rows={3}
                            className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-medium bg-white"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={isCancelSubmitting}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl border-none text-xs transition cursor-pointer flex items-center justify-center gap-1 active:scale-[0.97]"
                            >
                              {isCancelSubmitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span>상신 제출</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCancelRequestFormOpen(false)}
                              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-2.5 rounded-xl border-none text-xs transition cursor-pointer active:scale-[0.97]"
                            >
                              닫기
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* 이미 취소 승인 대기 상태인 경우 뱃지 안내 */}
                  {taskDetail && taskDetail.status === 'PENDING_APPROVAL' && (
                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-bold p-4.5 rounded-2xl flex items-start gap-2 leading-relaxed">
                      <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block mb-0.5 text-indigo-900">취소 승인 대기 중</span>
                        <span>최고관리자가 컨트롤타워에서 사유 검토 후 최종 결재 처리를 진행하고 있습니다. 잠시만 기다려 주십시오.</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 푸터 닫기 */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsTaskDetailOpen(false)}
                className="bg-slate-900 text-white font-black px-5 py-2.5 rounded-xl text-xs hover:bg-slate-800 border-none transition active:scale-[0.97] cursor-pointer"
              >
                상세 닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📅 [신규] 모바일 간편 연차/휴가 신청서 모달 */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto text-left animate-scale-in">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="text-sm font-black text-slate-800">간편 연차 신청</h3>
              </div>
              <button 
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 border-none cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 입력 폼 */}
            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs font-bold text-slate-800">
              <div>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-extrabold text-slate-800 cursor-pointer"
                >
                  <option value="ANNUAL">연차 휴가 (1일 소모)</option>
                  <option value="HALF">반차 휴가 (0.5일 소모)</option>
                  <option value="SICK">병가 신청 (유/무급)</option>
                  <option value="SPECIAL">특별 휴가 (경조사 등)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-450 block">{leaveType === "HALF" ? "반차 일자" : "시작 일자"}</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => {
                      setLeaveStartDate(e.target.value);
                      if (leaveType === "HALF") setLeaveEndDate(e.target.value);
                    }}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-extrabold text-slate-850"
                  />
                </div>

                {leaveType === "HALF" ? (
                  <div className="space-y-1">
                    <label className="text-slate-450 block">반차 구분</label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 h-[46px] items-center">
                      <button
                        type="button"
                        onClick={() => setHalfDaySlot("AM")}
                        className={`h-full text-[11px] font-black rounded-lg transition border-none cursor-pointer flex items-center justify-center gap-0.5 ${
                          halfDaySlot === "AM" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-200/60"
                        }`}
                      >
                        오전 반차 ☀️
                      </button>
                      <button
                        type="button"
                        onClick={() => setHalfDaySlot("PM")}
                        className={`h-full text-[11px] font-black rounded-lg transition border-none cursor-pointer flex items-center justify-center gap-0.5 ${
                          halfDaySlot === "PM" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-200/60"
                        }`}
                      >
                        오후 반차 🌙
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-slate-450 block">종료 일자</label>
                    <input
                      type="date"
                      required
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-extrabold text-slate-855"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-450 block">소요 일수 (계산/기재)</label>
                  {isLeaveDaysMismatched && expectedLeaveDays !== null && (
                    <button
                      type="button"
                      onClick={() => setLeaveDays(expectedLeaveDays.toString())}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold underline cursor-pointer border-none bg-transparent"
                    >
                      기간 기준 자동 맞춤 ({expectedLeaveDays}일)
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  readOnly={leaveType === "HALF"}
                  value={leaveType === "HALF" ? "0.5" : leaveDays}
                  onChange={(e) => {
                    if (leaveType !== "HALF") setLeaveDays(e.target.value);
                  }}
                  placeholder="예: 1 또는 0.5"
                  className={`w-full p-3 rounded-xl border focus:outline-none font-extrabold transition-all duration-200 ${
                    leaveType === "HALF"
                      ? "bg-indigo-50/60 border-indigo-200 text-indigo-900 cursor-not-allowed"
                      : isLeaveDaysMismatched
                      ? "border-2 border-rose-500 bg-rose-50/40 text-rose-700 focus:border-rose-600 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-855 focus:border-indigo-500"
                  }`}
                />
                {isLeaveDaysMismatched && expectedLeaveDays !== null && (
                  <p className="text-[11px] text-rose-600 font-extrabold flex items-center gap-1 mt-1 leading-tight">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>선택 기간({expectedLeaveDays}일)과 입력 일수({leaveDays || 0}일)가 다릅니다.</span>
                  </p>
                )}
                {expectedLeaveDays === 0 && (
                  <p className="text-[11px] text-rose-600 font-extrabold flex items-center gap-1 mt-1 leading-tight">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>종료 일자가 시작 일자보다 앞설 수 없습니다.</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 block">사유</label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="신청 사유를 작성하세요 (예: 개인 사정으로 인한 연차 신청)"
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-semibold text-slate-800 leading-relaxed bg-white"
                />
              </div>

              {/* 📎 증빙 문서 및 사진 첨부 영역 */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-450 block text-[11px]">📎 증빙 문서 및 사진 (PDF, 이미지)</label>
                  <button
                    type="button"
                    onClick={() => leaveFileInputRef.current?.click()}
                    className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-2.5 py-1 rounded-lg transition border border-indigo-200/60 cursor-pointer flex items-center gap-1"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>파일/사진 첨부</span>
                  </button>
                  <input
                    ref={leaveFileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleLeaveFileSelect}
                  />
                </div>

                {leaveFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {leaveFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 px-2.5 rounded-xl border border-slate-200/80 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {file.type.includes('pdf') ? (
                            <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          )}
                          <span className="font-bold text-slate-700 truncate max-w-[180px]">{file.name}</span>
                          <span className="text-[9px] text-slate-400 font-normal">({file.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLeaveFile(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition cursor-pointer border-none bg-transparent"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 제출 제어 */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl border-none cursor-pointer text-xs transition active:scale-97"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLeaveSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-black py-3 rounded-xl border-none cursor-pointer text-xs transition flex items-center justify-center gap-1 active:scale-97 shadow-3xs"
                >
                  {isLeaveSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>제출</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
