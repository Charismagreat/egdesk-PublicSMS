"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { 
  FolderOpen, Plus, FileText, Camera, Receipt, MessageSquare, 
  Send, Trash2, Calendar, User, ArrowRight, Loader2, Link, FileUp, X, CheckCircle2, Edit2
} from "lucide-react";

interface TaskFolder {
  id: number;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
}

interface TaskFolderItem {
  id: number;
  folder_id: number;
  type: string;
  tags?: string;
  title: string;
  content: string;
  file_name?: string;
  file_size?: string;
  file_url?: string;
  created_at: string;
}

export default function TaskFoldersPage() {
  const [folders, setFolders] = useState<TaskFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  // 영속화된 선택 폴더 ID 상태
  const [activeFolderId, setActiveFolderId, isFolderIdRestored] = usePersistedState<string>('egdesk_active_task_folder_id', '');

  // 폴더 내부 수집자료 상태
  const [items, setItems] = useState<TaskFolderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // 폴더 생성 모달 및 입력 상태
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  // 최고관리자 전용 관제 및 필터 상태
  const [session, setSession] = useState<any>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState("ALL");

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setSession(data.payload);
      }
    } catch (e) {
      console.error("Failed to fetch session:", e);
    }
  };

  // 수집자료 등록 폼 상태
  const [newItemTags, setNewItemTags] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState("");
  const [itemFile, setItemFile] = useState<File | null>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  // 폴더 목록 조회
  const fetchFolders = async () => {
    try {
      setFoldersLoading(true);
      const res = await fetch("/api/task-folders?action=list");
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
        // 선택된 폴더가 없으면 첫 번째 폴더 자동 선택
        if (!activeFolderId && data.folders?.length > 0) {
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
      const res = await fetch(`/api/task-folders?action=items&folderId=${folderId}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch folder items:", e);
    } finally {
      setItemsLoading(false);
    }
  };

  // 초기 로드 및 영속화 복원 Guard
  useEffect(() => {
    fetchSession();
    fetchFolders();
  }, []);

  useEffect(() => {
    if (isFolderIdRestored && activeFolderId) {
      fetchFolderItems(activeFolderId);
    }
  }, [activeFolderId, isFolderIdRestored]);

  // 폴더 생성 처리
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch("/api/task-folders?action=create_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, description: newFolderDesc })
      });
      const data = await res.json();
      if (data.success) {
        setIsFolderModalOpen(false);
        setNewFolderName("");
        setNewFolderDesc("");
        fetchFolders();
      } else {
        alert("폴더 생성 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 수집자료 등록 처리
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolderId || !newItemTitle.trim()) {
      alert("폴더와 자료 제목을 확인해주세요.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append('folderId', activeFolderId);
      fd.append('tags', newItemTags);
      fd.append('title', newItemTitle);
      fd.append('content', newItemContent);
      if (itemFile) {
        fd.append('file', itemFile);
      }

      const res = await fetch("/api/task-folders?action=create_item", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        setNewItemTags("");
        setNewItemTitle("");
        setNewItemContent("");
        setItemFile(null);
        fetchFolderItems(activeFolderId);
      } else {
        alert("자료 등록 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 폴더 삭제 처리
  const handleDeleteFolder = async (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("이 폴더와 폴더에 수집된 모든 자료가 삭제됩니다. 계속하시겠습니까?")) {
      return;
    }

    try {
      const res = await fetch("/api/task-folders?action=delete_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId })
      });
      const data = await res.json();
      if (data.success) {
        if (activeFolderId === String(folderId)) {
          setActiveFolderId("");
        }
        fetchFolders();
      } else {
        alert("폴더 삭제 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 수집자료 삭제 처리
  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm("이 자료를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const res = await fetch("/api/task-folders?action=delete_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId })
      });
      const data = await res.json();
      if (data.success) {
        fetchFolderItems(activeFolderId);
      } else {
        alert("자료 삭제 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 수집자료 제목 수정 처리
  const handleUpdateItemTitle = async (itemId: number, currentTitle: string) => {
    const newTitle = prompt("✏️ 변경할 제목을 입력해 주세요:", currentTitle);
    if (newTitle === null) return;
    if (!newTitle.trim()) {
      alert("제목은 공란으로 설정할 수 없습니다.");
      return;
    }

    try {
      const res = await fetch("/api/task-folders?action=update_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          title: newTitle.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchFolderItems(activeFolderId);
      } else {
        alert("제목 수정 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  // 수집자료 태그 수정 처리
  const handleUpdateItemTags = async (itemId: number, currentTags: string) => {
    const newTags = prompt("🏷️ 변경할 태그를 쉼표(,)로 구분하여 입력해 주세요:\n(예: 미팅, 중요, 피드백)", currentTags);
    if (newTags === null) return;

    try {
      const res = await fetch("/api/task-folders?action=update_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          tags: newTags.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchFolderItems(activeFolderId);
      } else {
        alert("태그 수정 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };



  // 타입별 수집자료 데코레이션 헬퍼
  const getItemIcon = (type: string) => {
    switch (type) {
      case "conversation":
        return <MessageSquare className="w-4 h-4 text-sky-500" />;
      case "receipt":
        return <Receipt className="w-4 h-4 text-emerald-555" />;
      case "photo":
        return <Camera className="w-4 h-4 text-indigo-500" />;
      case "proposal":
        return <FileText className="w-4 h-4 text-amber-555" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getItemBadgeClass = (type: string) => {
    switch (type) {
      case "conversation":
        return "bg-sky-50 text-sky-700 border-sky-100";
      case "receipt":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "photo":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "proposal":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
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

  const selectedFolder = folders.find(f => String(f.id) === activeFolderId);

  // 최고관리자 전용 직원 필터링 필터 적용
  const filteredFolders = folders.filter(f => {
    if (session?.role !== 'SUPER_ADMIN' || selectedUserFilter === 'ALL') {
      return true;
    }
    const creator = f.created_by || '현장 모바일';
    return creator === selectedUserFilter;
  });

  // 직원별 폴더 분포 통계 계산
  const userStats = folders.reduce((acc: {[key: string]: number}, f) => {
    const creator = f.created_by || '현장 모바일';
    acc[creator] = (acc[creator] || 0) + 1;
    return acc;
  }, {});

  // 유니크 직원 목록
  const uniqueUsers = Object.keys(userStats);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 w-full px-4 md:px-8 py-8">
      
      {/* 1. 표준 헤더 타이틀 영역 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <FolderOpen className="w-8 h-8 text-indigo-600 shrink-0" />
          <span>태스크 폴더 관리 AI</span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm pl-11">
          특정 영업 대상사 또는 프로젝트별로 대화록, 영수증, 현장 사진, 제안서 등의 자료를 수집하여 통합 관리하고 모바일 상신 자료로 즉시 활용합니다.
        </p>
      </div>

      {/* 2. 최고관리자 전용 직원별 태스크 폴더 통합 관제 대시보드 */}
      {session?.role === 'SUPER_ADMIN' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm mb-6 text-left space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h3 className="text-sm font-black text-slate-800 tracking-tight">실시간 전사 직원별 폴더 관제 현황판</h3>
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
      )}

      {/* 3. 2컬럼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* A. 좌측 컬럼: 폴더 목록 관리 */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800">폴더 목록 ({filteredFolders.length})</h2>
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition border-none shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 폴더</span>
            </button>
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
                  <button
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
                      {/* 최고관리자인 경우 상신자(작성자) 표시 배지 추가 */}
                      {session?.role === 'SUPER_ADMIN' && (
                        <div className="pt-1 flex">
                          <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-black border ${
                            isActive 
                              ? 'bg-white/10 text-slate-200 border-white/20' 
                              : 'bg-slate-100 text-slate-500 border-slate-200/60'
                          }`}>
                            상신자: {f.created_by || '현장 모바일'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDeleteFolder(f.id, e)}
                        className={`p-1.5 rounded-lg border-none bg-transparent hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition opacity-0 group-hover:opacity-100 cursor-pointer ${
                          isActive ? "hover:bg-white/10 text-rose-400 hover:text-rose-300" : ""
                        }`}
                        title="폴더 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ArrowRight className={`w-4 h-4 transition-transform ${isActive ? "translate-x-1" : "opacity-40"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* B. 우측 컬럼: 폴더 상세 정보 수집 타임라인 및 자료 등록 */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedFolder ? (
            <>
              {/* 폴더 기본 소개 카드 */}
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/40 border border-indigo-200/50 rounded-3xl p-6 shadow-2xs text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md">Task Folder</span>
                  <span className="text-[11px] font-bold text-indigo-750">{selectedFolder.created_at} 생성</span>
                </div>
                <h2 className="text-xl font-black text-slate-800 mt-2">{selectedFolder.name}</h2>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{selectedFolder.description || "설명이 입력되지 않았습니다."}</p>
              </div>

              {/* 영업 마케팅 정보 수집하기 폼 */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 text-left flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>이 폴더에 영업 정보 및 마케팅 문서 수집 등록</span>
                </h3>

                <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 유형 선택 */}
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">태그 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={newItemTags}
                      onChange={(e) => setNewItemTags(e.target.value)}
                      placeholder="예: 미팅, 영업처, 접대"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* 제목 입력 */}
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">자료 제목</label>
                    <input
                      type="text"
                      value={newItemTitle}
                      onChange={(e) => setNewItemTitle(e.target.value)}
                      placeholder="예: 미팅 대화 기록, 발주 증빙서류 등"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition"
                      required
                    />
                  </div>

                  {/* 본문 / 설명 */}
                  <div className="md:col-span-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">본문 설명 및 메모</label>
                    <textarea
                      value={newItemContent}
                      onChange={(e) => setNewItemContent(e.target.value)}
                      placeholder="수집자료 요약, 담당자와 나눈 피드백 등을 자유롭게 정리해 두세요..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500 transition resize-none"
                    />
                  </div>

                  {/* 실제 실물 파일 업로드 연동 */}
                  <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 text-left">
                      <FileUp className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">실물 첨부자료 업로드 (사진/영상/문서)</span>
                        {itemFile ? (
                          <span className="text-xs font-extrabold text-indigo-700 truncate max-w-[250px] block">
                            📄 {itemFile.name} ({(itemFile.size / 1024).toFixed(1)} KB)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold block">선택된 실물 파일 없음</span>
                        )}
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={itemFileInputRef}
                      onChange={(e) => setItemFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />

                    {itemFile ? (
                      <button
                        type="button"
                        onClick={() => {
                          setItemFile(null);
                          if (itemFileInputRef.current) {
                            itemFileInputRef.current.value = "";
                          }
                        }}
                        className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-rose-500 rounded-lg cursor-pointer transition shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => itemFileInputRef.current?.click()}
                        className="bg-white hover:bg-slate-100 text-indigo-650 text-[10px] font-black px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition shadow-2xs shrink-0"
                      >
                        파일 선택
                      </button>
                    )}
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>자료 수집 등록</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* 수집된 자료 리스트 타임라인 */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 text-left">
                <h3 className="text-sm font-black text-slate-800">
                  수집된 영업 마케팅 정보 목록 ({items.length})
                </h3>

                {itemsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-bold">자료를 불러오는 중...</span>
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <span className="text-xs font-bold block">이 폴더에 수집된 정보가 아직 없습니다.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="border border-slate-200/60 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition duration-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shadow-3xs">
                              {getItemIcon(item.type || 'conversation')}
                            </div>
                            <div>
                              <span 
                                onClick={() => handleUpdateItemTitle(item.id, item.title)}
                                className="font-extrabold text-sm text-slate-800 hover:text-indigo-650 hover:underline cursor-pointer transition flex items-center gap-1.5 leading-tight"
                                title="제목 편집"
                              >
                                <span>{item.title}</span>
                                <Edit2 className="w-3 h-3 text-slate-350 shrink-0" />
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{item.created_at}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {item.tags ? (
                              <div 
                                onClick={() => handleUpdateItemTags(item.id, item.tags || "")}
                                className="flex gap-1 flex-wrap cursor-pointer hover:opacity-80 transition"
                                title="태그 편집"
                              >
                                {item.tags.split(',').map((t, idx) => {
                                  const trimmed = t.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <span key={idx} className="text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md">
                                      #{trimmed}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span 
                                onClick={() => handleUpdateItemTags(item.id, "")}
                                className="text-[9px] font-black bg-slate-50 text-slate-400 border border-slate-100 px-2 py-0.5 rounded-md cursor-pointer hover:bg-slate-100 transition"
                                title="태그 등록"
                              >
                                태그없음
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 rounded-lg border-none bg-transparent hover:bg-rose-500/10 text-rose-455 hover:text-rose-600 transition cursor-pointer"
                              title="자료 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {item.content && (
                          <p className="text-xs text-slate-655 mt-3 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                            {item.content}
                          </p>
                        )}

                        {item.file_name && item.file_url && (
                          <div 
                            onClick={() => {
                              if (item.file_url) {
                                window.open(item.file_url, '_blank');
                              }
                            }}
                            className="mt-2.5 p-2 bg-indigo-50/20 hover:bg-indigo-100/40 border border-indigo-100/40 rounded-xl flex items-center justify-between text-[11px] text-indigo-700 font-bold cursor-pointer transition active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Link className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[250px]">{item.file_name}</span>
                              <span className="text-[9px] text-slate-400">({item.file_size})</span>
                            </div>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              item.file_size === 'URL 링크'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-indigo-100/50 text-indigo-800'
                            }`}>
                              {item.file_size === 'URL 링크' ? 'URL 링크' : '스토리지 연동됨'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center text-slate-400 shadow-sm">
              <FolderOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-base font-black text-slate-700">활성화된 폴더가 없습니다.</h3>
              <p className="text-xs text-slate-400 mt-2">좌측 목록에서 분석할 태스크 폴더를 선택하거나 새 폴더를 생성하세요.</p>
            </div>
          )}

        </div>

      </div>

      {/* 3. 신규 폴더 생성 팝업 모달 */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-scale-in text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-slate-800">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-sm">새 태스크 폴더 생성</span>
              </div>
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">폴더 이름</label>
                <input 
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="예: 효성전기 영업"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">폴더 목적 및 설명</label>
                <textarea 
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="폴더에 수집할 정보 대상과 영업 방향을 간략히 요약하세요..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-[11px] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-[11px] border-none transition shadow-sm cursor-pointer"
                >
                  폴더 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
