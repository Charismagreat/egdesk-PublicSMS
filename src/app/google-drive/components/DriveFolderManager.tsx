"use client";

import React, { useState } from "react";
import { FolderGit2, Plus, Trash2, ExternalLink, Loader2, Folder, Check, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DriveFolderManagerProps {
  folders: any[];
  onRefresh: () => void;
}

export default function DriveFolderManager({ folders, onRefresh }: DriveFolderManagerProps) {
  const [folderInput, setFolderInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderInput.trim()) return;

    setIsAdding(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/google-drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderInput: folderInput.trim(), initialize: true, snapshot: true })
      });

      const data = await res.json();
      if (data.success) {
        setFolderInput("");
        setStatusMsg({ type: 'success', text: "✅ 감시 대상 폴더가 성공적으로 등록 및 동기화 초기화되었습니다." });
        onRefresh();
      } else {
        setStatusMsg({ type: 'error', text: data.error || "폴더 등록에 실패했습니다." });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `오류 발생: ${err.message}` });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("이 폴더의 실시간 감시를 중단하시겠습니까?")) return;

    setDeletingId(folderId);
    try {
      const res = await apiFetch(`/api/google-drive/folders?folderId=${encodeURIComponent(folderId)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error("Delete folder error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">감시 대상 드라이브 폴더 목록</h3>
            <p className="text-xs text-slate-500 mt-0.5">지정된 구글 드라이브 폴더의 신규 업로드 및 파일 변경 사항을 실시간 수집합니다.</p>
          </div>
        </div>
      </div>

      {/* 새 폴더 추가 폼 */}
      <form onSubmit={handleAddFolder} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
        <label className="text-xs font-bold text-slate-700 block">
          구글 드라이브 폴더 URL 또는 Folder ID 등록
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/1aBcDeFg... 또는 Folder ID"
            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <button
            type="submit"
            disabled={isAdding || !folderInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>폴더 추가 및 감시 시작</span>
          </button>
        </div>
        {statusMsg && (
          <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusMsg.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </form>

      {/* 등록된 폴더 카드 리스트 */}
      {folders.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400">
          <Folder className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium">현재 등록된 감시 대상 폴더가 없습니다.</p>
          <p className="text-[11px] text-slate-400 mt-1">상단 입력창에 구글 드라이브 폴더 링크를 입력하여 감시를 시작하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {folders.map((f: any, idx: number) => {
            const folderId = typeof f === "string" ? f : f.id || f.folderId || `folder-${idx}`;
            const folderName = typeof f === "string" ? `Folder (${f.substring(0, 10)}...)` : f.name || f.title || folderId;
            const driveUrl = typeof f === "string" 
              ? `https://drive.google.com/drive/folders/${folderId}` 
              : f.url || f.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;

            return (
              <div
                key={folderId}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-200 transition-all flex items-center justify-between shadow-3xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-xs truncate" title={folderName}>
                      {folderName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]" title={folderId}>
                      ID: {folderId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="구글 드라이브에서 열기"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteFolder(folderId)}
                    disabled={deletingId === folderId}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="감시 해제"
                  >
                    {deletingId === folderId ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
