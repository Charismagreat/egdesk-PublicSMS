"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { 
  ShieldAlert, Search, Plus, AlertTriangle, ShieldCheck, 
  RefreshCw, Camera, Bell, CheckCircle2, Flame, AlertCircle
} from "lucide-react";

interface SafetyLogItem {
  id: string;
  zone_name: string;
  hazard_type: string;
  risk_score: number; // 0~100
  snapshot_url?: string;
  detected_at: string;
  status: "긴급대응필요" | "시정완료" | "모니터링중";
}

export default function SafetyDetectionPage() {
  const [logs, setLogs] = useState<SafetyLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(false);

  // 브라우저 sessionStorage 연동 상태 보존
  const [searchQuery, setSearchQuery] = usePersistedState<string>("safety_search_query", "");
  const [activeFilter, setActiveFilter] = usePersistedState<string>("safety_active_filter", "ALL");

  const fetchSafetyLogs = useCallback(async () => {
    setLoading(true);
    try {
      setLogs([
        { id: "HAZ-2026-001", zone_name: "시흥 1공장 프레스 A구역", hazard_type: "안전모 미착용 감지", risk_score: 85, detected_at: "2026-07-29 11:20", status: "긴급대응필요" },
        { id: "HAZ-2026-002", zone_name: "평택 2공장 위험물 저장소", hazard_type: "미세 고온 연기 감지", risk_score: 92, detected_at: "2026-07-29 10:45", status: "시정완료" },
        { id: "HAZ-2026-003", zone_name: "시흥 2공장 자재 수송통로", hazard_type: "작업자 쓰러짐/정지 감지", risk_score: 78, detected_at: "2026-07-28 16:30", status: "시정완료" },
        { id: "HAZ-2026-004", zone_name: "평택 1공장 조립 3라인", hazard_type: "통로 물품 적재 통행 차단", risk_score: 45, detected_at: "2026-07-27 14:15", status: "모니터링중" }
      ]);
    } catch (err) {
      console.error("Failed to fetch safety logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSafetyLogs();
    setIsRestored(true);
  }, [fetchSafetyLogs]);

  // 검색 및 필터링
  const filteredLogs = logs.filter((item) => {
    if (activeFilter === "URGENT" && item.status !== "긴급대응필요") return false;
    if (activeFilter === "DONE" && item.status !== "시정완료") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.zone_name.toLowerCase().includes(q) ||
      item.hazard_type.toLowerCase().includes(q)
    );
  });

  const totalCount = logs.length;
  const urgentCount = logs.filter((l) => l.status === "긴급대응필요").length;
  const doneCount = logs.filter((l) => l.status === "시정완료").length;

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 bg-slate-50 min-h-screen text-left">
      {/* 헤더 타이틀 (프로젝트 원칙: 메뉴명과 타이틀명 100% 동일) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0" />
            <span>위험 감지 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            CCTV 비전 AI 실시간 안전모 미착용, 작업자 쓰러짐 및 사업장 위험 요소 자동 관제 센터
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchSafetyLogs}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 font-bold text-xs"
          >
            <RefreshCw className="w-4 h-4 text-rose-600" />
            <span>CCTV 관제 갱신</span>
          </button>
        </div>
      </div>

      {/* 대형 KPI 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 관제 위험 감지건</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{totalCount}건</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">긴급 조치 필요건</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{urgentCount}건</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">안전 조치 조치 완료</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{doneCount}건</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">안전 지수 (Safety Index)</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">96.5점</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 검색 & 필터 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 w-full md:w-auto">
          {[
            { id: "ALL", label: "전체 알림" },
            { id: "URGENT", label: "🔴 긴급 대응 필요" },
            { id: "DONE", label: "🟢 조치 완료" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap flex-1 md:flex-none ${
                activeFilter === tab.id
                  ? "bg-white text-rose-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="감지ID, 공장구역, 위험유형 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* 메인 대장 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading && !isRestored ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-500 mb-2" />
            <p className="text-xs font-bold">위험 감지 AI CCTV 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">조회된 위험 감지 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">감지 ID</th>
                  <th className="py-3.5 px-4">감지 구역 (CCTV)</th>
                  <th className="py-3.5 px-4">감지된 위험 요소</th>
                  <th className="py-3.5 px-4 text-center">AI 위험 스점</th>
                  <th className="py-3.5 px-4 text-center">상태</th>
                  <th className="py-3.5 px-4">감지 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-rose-650">{item.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{item.zone_name}</td>
                    <td className="py-3.5 px-4 font-extrabold text-rose-700">{item.hazard_type}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                        item.risk_score >= 80 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {item.risk_score}점
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        item.status === "긴급대응필요"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{item.detected_at}</td>
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
