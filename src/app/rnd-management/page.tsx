"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { 
  Award, Search, RefreshCw, FlaskConical, FileText, 
  CheckCircle2, AlertTriangle, ShieldCheck, DollarSign, Calendar, AlertCircle
} from "lucide-react";

interface RndProject {
  id: string;
  project_name: string;
  lead_researcher: string;
  budget: number;
  spent_budget: number;
  progress: number;
  patent_status: string;
  status: "진행중" | "완료" | "심사중";
}

export default function RndManagementPage() {
  const [projects, setProjects] = useState<RndProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(false);

  // 브라우저 sessionStorage 연동 상태 보존
  const [searchQuery, setSearchQuery] = usePersistedState<string>("rnd_search", "");
  const [activeFilter, setActiveFilter] = usePersistedState<string>("rnd_filter", "ALL");

  const fetchRndData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/rnd");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          const mapped: RndProject[] = data.projects.map((p: any, idx: number) => ({
            id: p.id || `RND-2026-0${idx + 1}`,
            project_name: p.title || p.project_name || "R&D 프로젝트",
            lead_researcher: p.leadResearcher || p.lead_researcher || "박연구원",
            budget: Number(p.budget || 150000000),
            spent_budget: Number(p.spentBudget || p.spent_budget || 80000000),
            progress: Number(p.progress || 50),
            patent_status: p.patentStatus || p.patent_status || "출원 진행중",
            status: (p.status === "COMPLETED" ? "완료" : p.status === "REVIEW" ? "심사중" : "진행중") as "진행중" | "완료" | "심사중"
          }));
          setProjects(mapped);
        } else {
          setProjects([
            { id: "RND-2026-01", project_name: "차세대 수입 통관 모듈 전자 센서 R&D", lead_researcher: "박박사", budget: 150000000, spent_budget: 82000000, progress: 65, patent_status: "출원 완료 (PAT-5421)", status: "진행중" },
            { id: "RND-2026-02", project_name: "프레스 예지보전 초고속 FFT AI 기술", lead_researcher: "이수석", budget: 200000000, spent_budget: 195000000, progress: 95, patent_status: "등록 승인 (PAT-1092)", status: "완료" },
            { id: "RND-2026-03", project_name: "친환경 저탄소 자재 신소재 개발", lead_researcher: "김책임", budget: 120000000, spent_budget: 45000000, progress: 35, patent_status: "특허 출원 준비중", status: "진행중" }
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch R&D data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRndData();
    setIsRestored(true);
  }, [fetchRndData]);

  // 검색 및 필터링
  const filteredProjects = projects.filter((p) => {
    if (activeFilter === "RUNNING" && p.status !== "진행중") return false;
    if (activeFilter === "COMPLETED" && p.status !== "완료") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.project_name.toLowerCase().includes(q) ||
      p.lead_researcher.toLowerCase().includes(q)
    );
  });

  const totalBudget = projects.reduce((acc, cur) => acc + cur.budget, 0);
  const totalSpent = projects.reduce((acc, cur) => acc + cur.spent_budget, 0);

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 bg-slate-50 min-h-screen text-left">
      {/* 헤더 타이틀 (NEW PAGE UI RULES 준수: 메뉴명과 타이틀명 100% 동일) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Award className="w-8 h-8 text-amber-550 shrink-0" />
            <span>연구소 관리 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            기업 부설 연구소 R&D 과제, 연구 개발비(국비/민간) 및 특허/인증 출원 실시간 관리 센터
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchRndData}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 font-bold text-xs"
          >
            <RefreshCw className="w-4 h-4 text-amber-550" />
            <span>과제 새로고침</span>
          </button>
        </div>
      </div>

      {/* 대형 KPI 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 R&D 과제</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{projects.length}건</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <FlaskConical className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 연구 개발 예산</span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">{totalBudget.toLocaleString()}원</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">집행 완료 연구비</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">{totalSpent.toLocaleString()}원</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">특허 출원/등록 건수</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">2건</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 메인 대장 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading && !isRestored ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
            <p className="text-xs font-bold">연구소 관리 AI 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">조회된 R&D 과제가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">과제 코드</th>
                  <th className="py-3.5 px-4">R&D 과제 프로젝트 명</th>
                  <th className="py-3.5 px-4">연구 책임자</th>
                  <th className="py-3.5 px-4 text-right">총 연구 예산</th>
                  <th className="py-3.5 px-4 text-center">연구 진척률</th>
                  <th className="py-3.5 px-4">특허/지식재산권 상태</th>
                  <th className="py-3.5 px-4 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-amber-700">{p.id}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-850">{p.project_name}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{p.lead_researcher}</td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-800">{p.budget.toLocaleString()}원</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px] mx-auto">
                        <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 mt-1 block">{p.progress}%</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700">{p.patent_status}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        p.status === "완료"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
