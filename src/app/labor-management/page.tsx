"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { 
  Scale, Search, AlertTriangle, CheckCircle2, ShieldCheck, 
  RefreshCw, FileText, Upload, Clock, UserCheck, 
  Sparkles, ExternalLink, ShieldAlert, Award, FileSpreadsheet, AlertCircle
} from "lucide-react";

interface LaborItem {
  id: string | number;
  employee_id?: string;
  name: string;
  department: string;
  position: string;
  weekly_hours: number;
  overtime_hours: number;
  risk_level: "SAFE" | "WARNING" | "VIOLATION";
  toxic_clause_count: number;
  contract_date: string;
  status: string;
}

export default function LaborManagementPage() {
  const [laborItems, setLaborItems] = useState<LaborItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(false);

  // 브라우저 sessionStorage 연동 상태 보존
  const [searchQuery, setSearchQuery] = usePersistedState<string>("labor_search_query", "");
  const [activeFilter, setActiveFilter] = usePersistedState<string>("labor_active_filter", "ALL");

  // AI 독소조항 검수 & 계약서 파싱 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisReport, setAnalysisReport] = useState<any>(null);

  // 노무 리스크 데이터 패칭
  const fetchLaborData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/production/labor");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setLaborItems(data.items);
        } else {
          // 데모 기본 데이터 시딩 fallback
          setLaborItems([
            { id: 1, employee_id: "EMP-001", name: "김철수", department: "제조 1팀", position: "과장", weekly_hours: 42, overtime_hours: 2, risk_level: "SAFE", toxic_clause_count: 0, contract_date: "2026-01-02", status: "정상" },
            { id: 2, employee_id: "EMP-002", name: "박영희", department: "무역/통관팀", position: "대리", weekly_hours: 53, overtime_hours: 13, risk_level: "WARNING", toxic_clause_count: 1, contract_date: "2026-02-15", status: "주52시간 주의" },
            { id: 3, employee_id: "EMP-003", name: "이민수", department: "생산 물류팀", position: "사원", weekly_hours: 40, overtime_hours: 0, risk_level: "SAFE", toxic_clause_count: 0, contract_date: "2026-03-10", status: "정상" },
            { id: 4, employee_id: "EMP-004", name: "최동우", department: "품질 관리팀", position: "팀장", weekly_hours: 58, overtime_hours: 18, risk_level: "VIOLATION", toxic_clause_count: 2, contract_date: "2025-11-20", status: "근로시간 초과" }
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch labor data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLaborData();
    setIsRestored(true);
  }, [fetchLaborData]);

  // AI 근로계약서 독소조항 스캔
  const handleAnalyzeContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsAnalyzing(true);
    setAnalysisReport(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await apiFetch("/api/hr/contracts/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            fileData: base64
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAnalysisReport(data.report || data.data);
            alert("🎉 근로계약서 AI 독소조항 및 노무 리스크 정밀 진단이 완료되었습니다!");
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Contract Analysis Error:", err);
      alert("계약서 진단 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 검색 및 필터링
  const filteredItems = laborItems.filter((item) => {
    if (activeFilter === "VIOLATION" && item.risk_level !== "VIOLATION") return false;
    if (activeFilter === "WARNING" && item.risk_level !== "WARNING") return false;
    if (activeFilter === "SAFE" && item.risk_level !== "SAFE") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q) ||
      (item.employee_id || "").toLowerCase().includes(q) ||
      item.position.toLowerCase().includes(q)
    );
  });

  // KPI 수치 집계
  const totalEmployees = laborItems.length;
  const safeCount = laborItems.filter((i) => i.risk_level === "SAFE").length;
  const warningCount = laborItems.filter((i) => i.risk_level === "WARNING").length;
  const violationCount = laborItems.filter((i) => i.risk_level === "VIOLATION").length;

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 bg-slate-50 min-h-screen text-left">
      {/* 1. 헤더 타이틀 영역 (NEW PAGE UI RULES 준수) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Scale className="w-8 h-8 text-rose-600 shrink-0" />
            <span>노무 관리 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            대한민국 근로기준법 연동 실시간 근로시간 스캔, 독소조항 AI 검증 및 법정 수당 자율 관리 센터
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchLaborData}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 font-bold text-xs"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4 text-rose-600" />
            <span>노무 데이터 재진단</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer border-none"
          >
            <FileText className="w-4 h-4" />
            <span>근로계약서 AI 독소조항 스캔</span>
          </button>
        </div>
      </div>

      {/* 2. 대형 요약 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 근로자 수</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{totalEmployees}명</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">근로기준법 준수 (SAFE)</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{safeCount}명</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">주 52시간 임계 주의 (WARNING)</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{warningCount}명</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">법정 근로시간 위반 위험 (VIOLATION)</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{violationCount}명</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. 검색 바 및 세그먼트 필터 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 w-full md:w-auto">
          {[
            { id: "ALL", label: "전체 근로자" },
            { id: "VIOLATION", label: "🔴 위반 초과" },
            { id: "WARNING", label: "🟡 52시간 임계 주의" },
            { id: "SAFE", label: "🟢 정상 법 준수" },
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
            placeholder="이름, 부서, 직급 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-rose-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. 노무 대장 메인 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading && !isRestored ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-500 mb-2" />
            <p className="text-xs font-bold">노무 관리 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">조회된 노무 관리 대상 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">사번</th>
                  <th className="py-3.5 px-4">근로자 성명</th>
                  <th className="py-3.5 px-4">부서 / 직급</th>
                  <th className="py-3.5 px-4 text-right">주간 근로시간</th>
                  <th className="py-3.5 px-4 text-right">연장 근로시간</th>
                  <th className="py-3.5 px-4 text-center">AI 독소조항 감지</th>
                  <th className="py-3.5 px-4 text-center">근로기준법 준수 상태</th>
                  <th className="py-3.5 px-4">계약 갱신일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-slate-600">
                      {item.employee_id || `EMP-00${item.id}`}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-850">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {item.department} / {item.position}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-800">
                      {item.weekly_hours}시간
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-600">
                      {item.overtime_hours > 0 ? `+${item.overtime_hours}시간` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.toxic_clause_count > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg text-[11px] font-black">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>독소조항 {item.toxic_clause_count}건 발견</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>독소조항 없음</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        item.risk_level === "SAFE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.risk_level === "WARNING"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                      {item.contract_date || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. AI 근로계약서 독소조항 스캔 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-800">근로계약서 AI 독소조항 검수</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50/60 border border-dashed border-rose-200 rounded-2xl p-4 text-center space-y-2">
              <Upload className="w-6 h-6 text-rose-600 mx-auto" />
              <span className="text-xs font-black text-rose-900 block">근로계약서 PDF / 이미지 서류 업로드</span>
              <p className="text-[11px] text-rose-600/80 font-medium leading-relaxed">
                계약서를 업로드하시면 AI 노무 어드바이저가 최저임금 위반, 무급 연장근로 강요, 법정 퇴직금 삭감 등 독소조항을 자동으로 정밀 진단합니다.
              </p>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleAnalyzeContract}
                className="hidden"
                id="contract-file-input"
              />
              <label
                htmlFor="contract-file-input"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-3xs"
              >
                {isAnalyzing ? "AI 근로기준법 스캔 중..." : "서류 선택 & 정밀 진단"}
              </label>
            </div>

            {/* 진단 리포트 출력 */}
            {analysisReport && (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                <h4 className="font-black text-slate-800 flex items-center gap-1 text-sm">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  <span>AI 진단 결과 리포트</span>
                </h4>
                <div className="space-y-1.5 text-slate-700 font-medium">
                  <div>• 근로 형태: <span className="font-bold text-slate-900">{analysisReport.work_type || "정규직"}</span></div>
                  <div>• 책정 월급: <span className="font-bold text-slate-900">{analysisReport.salary ? `${Number(analysisReport.salary).toLocaleString()}원` : "3,200,000원"}</span></div>
                  <div>• 위법 독소조항 발견: <span className="font-bold text-rose-600">{analysisReport.toxic_clauses?.length || 0}건</span></div>
                </div>

                {analysisReport.toxic_clauses && analysisReport.toxic_clauses.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="font-extrabold text-rose-700 block">⚠️ 감지된 독소조항 및 수정 권고:</span>
                    {analysisReport.toxic_clauses.map((c: any, idx: number) => (
                      <div key={idx} className="bg-white border border-rose-200 p-3 rounded-xl space-y-1">
                        <span className="font-bold text-rose-800 block">{c.clause_name || "위조 수당 조항"}</span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{c.reason || c.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
