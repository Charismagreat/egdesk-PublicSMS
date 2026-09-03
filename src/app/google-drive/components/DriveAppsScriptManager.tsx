"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Code, Play, Clock, RefreshCw, Layers, CheckCircle2, AlertCircle, FileCode, Wrench, Sparkles, ArrowRight, Trash2, X, AlertTriangle, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import NewAppsScriptModal from "./NewAppsScriptModal";

export default function DriveAppsScriptManager() {
  const [projects, setProjects] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 새 프로젝트 추가 / 수정 모달 상태
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editTargetProject, setEditTargetProject] = useState<any | null>(null);

  // 삭제 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteGoogleSheet, setDeleteGoogleSheet] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAppsScriptData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/google-drive/apps-script");
      if (!res.ok) return;
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        return;
      }

      if (data?.success) {
        setProjects(data.projects || []);
        setTriggers(data.triggers || []);
      }
    } catch (err) {
      console.error("Fetch Apps Script data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppsScriptData();
  }, []);

  // 삭제 모달 열기 핸들러
  const handleOpenDeleteModal = (proj: any) => {
    setDeleteTarget(proj);
    setDeleteGoogleSheet(false);
  };

  // 삭제 실행 핸들러
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await apiFetch("/api/google-drive/apps-script", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: deleteTarget.id,
          scriptId: deleteTarget.scriptId,
          spreadsheetId: deleteTarget.spreadsheetId || deleteTarget.containerId,
          deleteGoogleSheet: deleteGoogleSheet
        })
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (data?.success) {
        setAlertMessage({ type: "success", text: data.message || "프로젝트가 성공적으로 삭제되었습니다." });
        setDeleteTarget(null);
        fetchAppsScriptData();
      } else {
        setAlertMessage({ type: "error", text: data?.error || "프로젝트 삭제에 실패했습니다." });
      }
    } catch (err: any) {
      setAlertMessage({ type: "error", text: err.message || "삭제 중 오류가 발생했습니다." });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 알림 배너 */}
      {alertMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold ${
          alertMessage.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
            : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          <div className="flex items-center gap-2">
            {alertMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{alertMessage.text}</span>
          </div>
          <button onClick={() => setAlertMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ⚡ AI 시트 자동화 주입기 프로모 배너 */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">NEW</span>
            <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Google Apps Script 자동 주입 AI (SheetBot)</span>
            </h3>
          </div>
          <p className="text-xs text-indigo-100 leading-relaxed">
            내 구글 시트 URL을 넣으면 이지데스크가 사본을 복제하고, 자연어 요구사항을 바탕으로 Apps Script를 직접 주입해 드립니다.
          </p>
        </div>

        <Link
          href="/apps-script/generator"
          className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 text-indigo-900 font-extrabold text-xs rounded-2xl transition-all shadow-sm shrink-0 text-decoration-none active:scale-95"
        >
          <span>🚀 AI 시트 자동 주입기 열기</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 1. Apps Script 상태 헤더 카드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">연동 Google Apps Script(GAS) 관리</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                구글 워크스페이스 내의 커스텀 앱스 스크립트 프로젝트, 자동화 트리거 및 서버리스 함수를 관제합니다.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAppsScriptData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">연동된 GAS 프로젝트</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{projects.length}</span>
              <span className="text-xs font-bold text-slate-500">개</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">활성 실행 트리거</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600 tracking-tight">{triggers.length}</span>
              <span className="text-xs font-bold text-slate-500">개 가동 중</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">MCP 연동 상태</span>
            <span className="font-bold text-emerald-600 text-xs block mt-1">
              apps_script 엔진 연결 준비 완료
            </span>
          </div>
        </div>
      </div>

      {/* 2. 연동 프로젝트 목록 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-600" />
            연동된 Apps Script 프로젝트 목록
          </h4>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 프로젝트 추가</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 🌟 [➕ 새 프로젝트 추가] 점선 카드 */}
          <div
            onClick={() => setIsNewProjectModalOpen(true)}
            className="p-5 rounded-2xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-400/90 transition-all cursor-pointer flex flex-col justify-between gap-3 group text-left min-h-[110px]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-xs group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="font-extrabold text-xs text-indigo-950 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <span>새 프로젝트 추가</span>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </h5>
                <p className="text-[11px] text-indigo-900/70 leading-relaxed">
                  구글 시트 URL을 등록하고 자연어로 Apps Script 코드를 자동 주입합니다.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] font-bold text-indigo-600">
              <span>원스톱 AI 주입 시작하기</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 기존 연동 프로젝트 목록 */}
          {projects.map((p, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  p.isTrashed 
                    ? "bg-slate-50/60 border-slate-200/60 opacity-60 hover:opacity-100" 
                    : "bg-white border-indigo-100 shadow-xs hover:border-indigo-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h5 className={`font-bold text-xs truncate ${p.isTrashed ? "text-slate-500 line-through" : "text-slate-800"}`} title={p.name}>
                      {p.name || `Project-${idx}`}
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                        ID: {p.scriptId || p.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.isTrashed ? (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <span>🗑️ 휴지통 (삭제됨)</span>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditTargetProject(p);
                            setIsNewProjectModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-lg border border-amber-200/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title="기존 코드를 보존하며 새로운 기능을 이어서 수정/추가합니다."
                        >
                          <span>✏️ 이어서 수정</span>
                        </button>

                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>정상 연결 (Active)</span>
                        </span>
                      </>
                    )}

                    <button
                      onClick={() => handleOpenDeleteModal(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="프로젝트 삭제 / 목록에서 제거"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {p.spreadsheetUrl && (
                  <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 text-[10px]">연결 시트:</span>
                    <a 
                      href={p.spreadsheetUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className={`text-[10px] font-medium flex items-center gap-1 hover:underline ${
                        p.isTrashed ? "text-slate-400" : "text-indigo-600"
                      }`}
                    >
                      <span>구글 시트 열기</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
      </div>

      {/* 3. 스마트 프로젝트 삭제 컨펌 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-800">Apps Script 프로젝트 삭제</h3>
              </div>
              <button 
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">대상 프로젝트:</div>
                <div className="text-xs font-extrabold text-slate-800 break-all">{deleteTarget.name}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate">ID: {deleteTarget.scriptId || deleteTarget.id}</div>
              </div>

              {deleteTarget.isTrashed ? (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span>💡 구글 드라이브 휴지통 상태 확인됨</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    연결된 구글 시트 파일이 이미 구글 드라이브 휴지통에 있습니다. 이지데스크 연동 목록에서 즉시 제거합니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    이 프로젝트를 이지데스크 관리 목록에서 제거합니다. 삭제 옵션을 선택해 주세요:
                  </p>

                  <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={deleteGoogleSheet} 
                      onChange={(e) => setDeleteGoogleSheet(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-rose-700">구글 드라이브의 원본 시트 파일도 함께 휴지통으로 삭제</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        체크 시 구글 드라이브 상의 원본 스프레드시트 파일도 함께 휴지통으로 이동합니다. (체크 해제 시 연동 목록에서만 제거)
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>삭제 처리 중...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleteTarget.isTrashed ? "목록에서 제거" : deleteGoogleSheet ? "시트와 함께 삭제" : "목록에서만 제거"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 새 프로젝트 추가 / 수정 원스톱 팝업 모달 */}
      <NewAppsScriptModal
        isOpen={isNewProjectModalOpen}
        initialProject={editTargetProject}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setEditTargetProject(null);
        }}
        onSuccess={() => {
          fetchAppsScriptData();
          setAlertMessage({
            type: "success",
            text: editTargetProject
              ? "Apps Script 프로젝트 기능이 성공적으로 수정 및 갱신 배포되었습니다!"
              : "새 Apps Script 프로젝트가 성공적으로 추가 및 주입되었습니다!"
          });
          setEditTargetProject(null);
        }}
      />
    </div>
  );
}


