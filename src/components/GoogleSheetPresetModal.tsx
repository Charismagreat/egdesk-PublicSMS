"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Bookmark, Star, Trash2, Edit2, Check, X, Plus, ExternalLink, Loader2, List, Save, Sparkles, Layers, FileSpreadsheet
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface GoogleSheetPreset {
  id: string;
  title: string;
  url: string;
  sheetName?: string;
  isDefault?: boolean;
  domain?: string;
  createdAt: string;
  updatedAt: string;
}

interface GoogleSheetPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  currentUrl?: string;
  currentSheetName?: string;
  availableSheets?: string[];
  spreadsheetTitle?: string;
  initialMode?: "save" | "list";
  onSelectPreset: (preset: { url: string; sheetName?: string; title: string }) => void;
  onPresetsUpdated?: (presets: GoogleSheetPreset[]) => void;
}

export default function GoogleSheetPresetModal({
  isOpen,
  onClose,
  domain = "default",
  currentUrl = "",
  currentSheetName = "",
  availableSheets = [],
  spreadsheetTitle = "",
  initialMode = "save",
  onSelectPreset,
  onPresetsUpdated
}: GoogleSheetPresetModalProps) {
  const [activeTab, setActiveTab] = useState<"save" | "list">(initialMode);
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Save Form State
  const [inputTitle, setInputTitle] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [inputSheetName, setInputSheetName] = useState("");
  const [inputIsDefault, setInputIsDefault] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const fetchPresets = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/shared/google-sheets/presets?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets || []);
        if (onPresetsUpdated) onPresetsUpdated(data.presets || []);
      }
    } catch (e) {
      console.error("Failed to load presets:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setInputUrl(currentUrl || "");
      const initialTab = currentSheetName || (availableSheets.length > 0 ? availableSheets[0] : "");
      setInputSheetName(initialTab);
      
      const defaultTitle = spreadsheetTitle && initialTab 
        ? `${spreadsheetTitle} (${initialTab})` 
        : initialTab 
        ? `${initialTab} 데이터 대장` 
        : "";
      setInputTitle(defaultTitle);
      
      setInputIsDefault(false);
      setStatusMsg(null);
      setEditingId(null);
      fetchPresets();
    }
  }, [isOpen, initialMode, currentUrl, currentSheetName, availableSheets, spreadsheetTitle]);

  if (!isOpen) return null;

  const handleTabChange = (newTab: string) => {
    setInputSheetName(newTab);
    if (!inputTitle || (spreadsheetTitle && inputTitle.startsWith(spreadsheetTitle))) {
      setInputTitle(spreadsheetTitle ? `${spreadsheetTitle} (${newTab})` : `${newTab} 대장`);
    }
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) {
      setStatusMsg({ type: "error", text: "시트 별칭/이름을 입력해 주세요." });
      return;
    }
    if (!inputUrl.trim()) {
      setStatusMsg({ type: "error", text: "구글 시트 URL을 입력해 주세요." });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          domain,
          preset: {
            title: inputTitle.trim(),
            url: inputUrl.trim(),
            sheetName: inputSheetName.trim(),
            isDefault: inputIsDefault
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setPresets(data.presets || []);
        if (onPresetsUpdated) onPresetsUpdated(data.presets || []);
        setStatusMsg({ type: "success", text: `'[${inputTitle.trim()}]' 탭 프리셋이 성공적으로 저장되었습니다.` });
        setTimeout(() => {
          setActiveTab("list");
          setStatusMsg(null);
        }, 800);
      } else {
        setStatusMsg({ type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "서버 통신 오류가 발생했습니다." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (presetId: string, title: string) => {
    if (!window.confirm(`정말로 '${title}' 시트 설정을 삭제하시겠습니까?`)) return;

    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", domain, presetId })
      });
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets || []);
        if (onPresetsUpdated) onPresetsUpdated(data.presets || []);
      }
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const handleSetDefault = async (presetId: string) => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default", domain, presetId })
      });
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets || []);
        if (onPresetsUpdated) onPresetsUpdated(data.presets || []);
      }
    } catch (err) {
      alert("기본 시트 변경 실패");
    }
  };

  const handleRename = async (presetId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", domain, presetId, newTitle: editingTitle.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets || []);
        if (onPresetsUpdated) onPresetsUpdated(data.presets || []);
        setEditingId(null);
      }
    } catch (err) {
      alert("이름 변경 실패");
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                구글 스프레드시트 탭(Tab)별 주소록 관리자
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 전환 바 */}
        <div className="flex border-b border-slate-200/80 bg-slate-50 px-6 pt-3 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab("save"); setStatusMsg(null); }}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "save"
                ? "border-teal-600 text-teal-700 font-black"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Plus className="w-4 h-4" />
            새 탭 프리셋 저장
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("list"); setStatusMsg(null); }}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === "list"
                ? "border-teal-600 text-teal-700 font-black"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <List className="w-4 h-4" />
            등록된 탭 목록 ({presets.length})
          </button>
        </div>

        {/* 상태 피드백 메시지 */}
        {statusMsg && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* 탭 본문 */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-slate-600">
          {activeTab === "save" ? (
            <form onSubmit={handleSavePreset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-teal-600" /> 구글 스프레드시트 URL (필수)
                </label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 text-teal-600" /> 탭 프리셋 별칭 / 이름 (필수)
                </label>
                <input
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  placeholder="예: 2026년 7월 매입 세금계산서, 신한은행 법인계좌 입출금"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>탭 프리셋 저장</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  <span className="text-xs">저장된 탭 목록을 불러오는 중...</span>
                </div>
              ) : presets.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-2xl">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">등록된 탭 프리셋이 없습니다.</p>
                  <p className="text-[11px] text-slate-400">'새 탭 프리셋 저장' 탭에서 자주 쓰는 탭을 등록해 보세요.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("save")}
                    className="mt-2 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-black hover:bg-teal-100 cursor-pointer"
                  >
                    + 첫 탭 프리셋 등록하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {presets.map((preset) => {
                    const isEditing = editingId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="px-2.5 py-1 bg-white border border-teal-400 rounded-lg text-xs font-bold text-slate-800 flex-1 focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRename(preset.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRename(preset.id)}
                                  className="p-1 text-teal-600 hover:bg-teal-100 rounded-md cursor-pointer"
                                  title="저장"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                                  title="취소"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <h4 className="text-xs font-black text-slate-800 truncate">
                                  {preset.title}
                                </h4>
                                {preset.sheetName && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-200 shrink-0">
                                    <Layers className="w-3 h-3 text-teal-600" />
                                    탭: {preset.sheetName}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* 컨트롤 액션들 */}
                          <div className="flex items-center gap-1 shrink-0">
                            {!isEditing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(preset.id);
                                    setEditingTitle(preset.title);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                                  title="이름 수정"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(preset.id, preset.title)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* URL 및 탭 선택 액션 */}
                        <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                          <div className="truncate flex-1 font-mono text-[10.5px]">
                            <span className="text-slate-400">URL: </span>
                            {preset.url}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPreset({
                                url: preset.url,
                                sheetName: preset.sheetName,
                                title: preset.title
                              });
                              onClose();
                            }}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                          >
                            <span>이 탭 선택</span>
                            <span className="text-[10px]">➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
