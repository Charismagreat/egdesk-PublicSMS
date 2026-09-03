"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Code, Play, Clock, RefreshCw, Layers, CheckCircle2, AlertCircle, FileCode, Wrench, Sparkles, ArrowRight } from "lucide-react";
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

                  {p.isTrashed ? (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md shrink-0 flex items-center gap-1">
                      <span>🗑️ 휴지통 (삭제됨)</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>정상 연결 (Active)</span>
                    </span>
                  )}
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
        )}
      </div>
    </div>
  );
}
