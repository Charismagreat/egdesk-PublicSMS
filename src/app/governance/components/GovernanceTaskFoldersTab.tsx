"use client";

import React, { useState } from "react";
import { 
  FolderOpen, RotateCcw, UserCheck, FileText, 
  Trash2, ExternalLink, Paperclip, CheckCircle2, Sparkles, Loader2, Bot
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface GovernanceTaskFoldersTabProps {
  taskFolders: any[];
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  folderFiles: any[];
  loadTaskFolders: () => void;
  handleDeleteFolderFile: (fileId: string) => void;
  handleOpenDocumentModal: (title: string, url: string, rawText?: string) => void;
  onRefreshEvents?: () => void;
}

export default function GovernanceTaskFoldersTab({
  taskFolders,
  selectedFolderId,
  setSelectedFolderId,
  folderFiles,
  loadTaskFolders,
  handleDeleteFolderFile,
  handleOpenDocumentModal,
  onRefreshEvents,
}: GovernanceTaskFoldersTabProps) {
  const [extractingFileId, setExtractingFileId] = useState<string | null>(null);

  const selectedFolder = taskFolders.find((f) => String(f.id) === String(selectedFolderId));

  const handleExtractTasksFromFile = async (file: any) => {
    setExtractingFileId(file.id);
    try {
      const res = await apiFetch("/api/governance?action=extract_folder_file_tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: file.id,
          file_name: file.content_text || file.file_name || "수집 서류",
          raw_text: file.ai_analysis || file.content_text,
          folder_name: selectedFolder?.title || selectedFolder?.name || "태스크 폴더"
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "✅ 서류에서 '담당자 할 일' 및 'AI 자율 대행 할 일'이 추출되어 관제 대상 피드로 수록되었습니다.");
        if (onRefreshEvents) onRefreshEvents();
      } else {
        alert("추출 중 오류: " + (data.error || "실패"));
      }
    } catch (e) {
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setExtractingFileId(null);
    }
  };

  const getCreatorDisplayName = (rawBy?: string | null) => {
    if (!rawBy) return '최고관리자';
    const val = String(rawBy).trim();
    if (val === 'guest' || val === 'admin' || val === 'SUPER_ADMIN_DEV' || val === 'SUPER_ADMIN') return '최고관리자';
    if (val === 'guest-1' || val === 'guest-dev') return '김직원';
    if (val === 'guest-2') return '이대리';
    return val;
  };

  return (
    <div className="space-y-4">
      {/* 폴더 관제 헤더 컨트롤바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-600" />
            <span>전사 임직원 태스크 폴더 & 현장 수집자료 실시간 파일 관제</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            임직원이 수집한 서류 파일에서 담당자 수행 할 일과 AI 자율 대행 할 일을 AI가 찾아내어 메인 관제 피드로 자동 수록합니다.
          </p>
        </div>
        <button
          onClick={loadTaskFolders}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-2xl text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>목록 새로고침</span>
        </button>
      </div>

      {/* 폴더 선택 그리드 & 파일 리스트 메인 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 폴더 리스트 영역 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-2 text-left">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">활성 업무 태스크 폴더 ({taskFolders.length})</h4>
          {taskFolders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">생성된 태스크 폴더가 없습니다.</p>
          ) : (
            taskFolders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-300 shadow-2xs"
                      : "bg-slate-50/50 border-slate-200/60 hover:bg-slate-100/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                    <div className="min-w-0">
                      <span className={`text-xs font-bold block truncate ${isSelected ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                        {folder.title || folder.name || `폴더 #${folder.id}`}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <UserCheck className="w-3 h-3" />
                        <span>생성자: {getCreatorDisplayName(folder.created_by)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 파일 수집 내역 및 미리보기 관제 영역 */}
        <div className="col-span-2 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>수집 및 업로드된 파일 내역</span>
            </h4>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-md border border-indigo-100">
              실물 서류 열람 및 관제 조치 가능
            </span>
          </div>

          {!selectedFolderId ? (
            <div className="py-16 text-center space-y-2">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">좌측에서 관제할 업무 태스크 폴더를 선택해 주세요.</p>
            </div>
          ) : folderFiles.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">이 폴더에 저장된 파일이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {folderFiles.map((file) => (
                <div key={file.id} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-100/60 text-indigo-700 shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[280px]">
                          {file.content_text || file.file_name || `첨부파일 #${file.id}`}
                        </span>
                        
                        {/* 💡 AI 판독 상태 뱃지 시각화 */}
                        {file.content_text?.includes('한도 초과') || file.ai_analysis?.includes('429') || file.content_text?.includes('자정 배치') ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>한도초과 (자정 재시도 대기 ⚠️)</span>
                          </span>
                        ) : file.ai_analysis || file.content_text?.includes('파독') || file.content_text?.includes('판독') ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>AI 판독 완료 🟢</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>미처리 (자정 배치 대기 🟡)</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        등록일시: {file.created_at || '최근'} | 수집자: {file.created_by || '임직원'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={extractingFileId === file.id}
                      onClick={() => handleExtractTasksFromFile(file)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                      title="AI가 수집 서류에서 '담당자 할 일' 및 'AI 자율 대행 할 일'을 찾아내어 메인 관제 피드로 자동 등록합니다."
                    >
                      {extractingFileId === file.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>AI 할 일 추출 & 관제 수록 🔍</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDocumentModal(
                        file.content_text || '수집 자료 미리보기',
                        file.file_url || `/api/shared/files?tableName=crm_snaptask_items&rowId=${file.id}&columnName=file_url`,
                        file.ai_analysis || file.content_text
                      )}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <span>미리보기</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFolderFile(file.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                      title="해당 수집 파일 통제 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
