"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { 
  CheckSquare, Search, Plus, CheckCircle2, AlertTriangle, 
  RefreshCw, ShieldCheck, Award, FileText, Upload, AlertCircle
} from "lucide-react";

interface QualityInspectionItem {
  id: string;
  lot_number: string;
  product_name: string;
  inspector_name: string;
  total_inspected: number;
  passed_quantity: number;
  defective_quantity: number;
  defect_type?: string;
  pass_rate: number;
  status: "합격" | "불량감지" | "재검수필요";
  inspected_at: string;
}

export default function QualityControlPage() {
  const [inspections, setInspections] = useState<QualityInspectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(false);

  // 브라우저 sessionStorage 연동 상태 보존
  const [searchQuery, setSearchQuery] = usePersistedState<string>("qc_search_query", "");
  const [activeFilter, setActiveFilter] = usePersistedState<string>("qc_active_filter", "ALL");

  const fetchQualityData = useCallback(async () => {
    setLoading(true);
    try {
      setInspections([
        { id: "QC-2026-001", lot_number: "LOT-8841", product_name: "고정밀 전자 커넥터 모듈 A", inspector_name: "김품질 대리", total_inspected: 1000, passed_quantity: 994, defective_quantity: 6, defect_type: "미세 도금 박리", pass_rate: 99.4, status: "합격", inspected_at: "2026-07-28" },
        { id: "QC-2026-002", lot_number: "LOT-8842", product_name: "자동차용 와이어링 하네스 B", inspector_name: "박검수 과장", total_inspected: 500, passed_quantity: 470, defective_quantity: 30, defect_type: "압착 단자 헐거움", pass_rate: 94.0, status: "불량감지", inspected_at: "2026-07-29" },
        { id: "QC-2026-003", lot_number: "LOT-8843", product_name: "반도체 검사 소켓 C", inspector_name: "이품질 사원", total_inspected: 200, passed_quantity: 200, defective_quantity: 0, defect_type: "없음", pass_rate: 100.0, status: "합격", inspected_at: "2026-07-29" },
        { id: "QC-2026-004", lot_number: "LOT-8844", product_name: "수입 모듈 부품 D", inspector_name: "최기술 팀장", total_inspected: 300, passed_quantity: 275, defective_quantity: 25, defect_type: "치수 허용 오차 초과", pass_rate: 91.6, status: "재검수필요", inspected_at: "2026-07-27" }
      ]);
    } catch (err) {
      console.error("Failed to fetch quality data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQualityData();
    setIsRestored(true);
  }, [fetchQualityData]);

  // 검색 및 필터링
  const filteredInspections = inspections.filter((item) => {
    if (activeFilter === "PASS" && item.status !== "합격") return false;
    if (activeFilter === "DEFECT" && item.status === "합격") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.lot_number.toLowerCase().includes(q) ||
      item.product_name.toLowerCase().includes(q) ||
      (item.defect_type || "").toLowerCase().includes(q)
    );
  });

  const totalInspected = inspections.reduce((acc, cur) => acc + cur.total_inspected, 0);
  const totalPassed = inspections.reduce((acc, cur) => acc + cur.passed_quantity, 0);
  const totalDefective = inspections.reduce((acc, cur) => acc + cur.defective_quantity, 0);
  const avgPassRate = totalInspected > 0 ? ((totalPassed / totalInspected) * 100).toFixed(1) : "0";

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 bg-slate-50 min-h-screen text-left">
      {/* 헤더 타이틀 (프로젝트 원칙: 메뉴명과 타이틀명 100% 동일) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-8 h-8 text-indigo-600 shrink-0" />
            <span>품질 관리 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            AI 비전 OCR 불량 감지, 로트(LOT)별 전수 품질 검사 및 PPM 불량율 추적 대장
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchQualityData}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 font-bold text-xs"
          >
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 대형 KPI 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 검사 물량</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{totalInspected.toLocaleString()}개</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">전사 평균 합격률</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{avgPassRate}%</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">검사 합격 물량</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{totalPassed.toLocaleString()}개</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">감지된 불량 수량</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{totalDefective.toLocaleString()}개</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 검색 & 필터 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 w-full md:w-auto">
          {[
            { id: "ALL", label: "전체 검사" },
            { id: "PASS", label: "🟢 합격 로트" },
            { id: "DEFECT", label: "🔴 불량 감지" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap flex-1 md:flex-none ${
                activeFilter === tab.id
                  ? "bg-white text-indigo-600 shadow-2xs"
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
            placeholder="검사ID, LOT번호, 품명, 불량유형 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 대장 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading && !isRestored ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-xs font-bold">품질 관리 AI 검사 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">조회된 품질 검사 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">검사 ID</th>
                  <th className="py-3.5 px-4">LOT 번호</th>
                  <th className="py-3.5 px-4">검사 대상 제품명</th>
                  <th className="py-3.5 px-4 text-right">총 검사 / 합격 수량</th>
                  <th className="py-3.5 px-4 text-center">합격률</th>
                  <th className="py-3.5 px-4">감지된 주요 불량 유형</th>
                  <th className="py-3.5 px-4 text-center">상태</th>
                  <th className="py-3.5 px-4">검사 일자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredInspections.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-indigo-650">{item.id}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{item.lot_number}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-850">{item.product_name}</td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-800">
                      {item.total_inspected.toLocaleString()}개 / <span className="text-emerald-600">{item.passed_quantity.toLocaleString()}개</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-slate-800">
                      <span className={item.pass_rate >= 95 ? "text-emerald-600" : "text-rose-600"}>
                        {item.pass_rate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-rose-700">{item.defect_type || "없음"}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        item.status === "합격"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{item.inspected_at}</td>
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
