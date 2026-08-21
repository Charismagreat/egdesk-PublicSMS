"use client";

import React, { useState, useEffect } from "react";
import { Code, Play, Clock, RefreshCw, Layers, CheckCircle2, AlertCircle, FileCode, Wrench } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function DriveAppsScriptManager() {
  const [projects, setProjects] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppsScriptData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/google-drive/apps-script");
      const data = await res.json();
      if (data.success) {
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

  return (
    <div className="space-y-6">
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
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">연동된 Google Apps Script 프로젝트가 없습니다.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              구글 시트나 드라이브에 연결된 앱스 스크립트를 이지데스크 MCP를 통해 원격 실행 및 자동화할 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((p, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">{p.title || p.name || `Project-${idx}`}</h5>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {p.scriptId || p.id}</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                  활성
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
