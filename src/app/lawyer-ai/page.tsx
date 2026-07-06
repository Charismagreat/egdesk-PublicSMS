"use client";

import React, { useState } from "react";
import {
  Scale,
  ShieldAlert,
  Search,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Activity,
  FileCheck,
  Briefcase,
  HelpCircle,
  BookOpen,
  AlertCircle,
  X,
  Coins
} from "lucide-react";
import {searchKoreanLaw,
  getKoreanLawText,
  getKoreanLawDecision, apiFetch} from "../../../egdesk-helpers";

// 유형 정의
interface LawSearchResult {
  id: string;
  title: string;
  subTitle?: string;
  source?: string;
}

export default function LawyerAiPage() {
  const [activeTab, setActiveTab] = useState<"labor" | "safety" | "litigation" | "precedent" | "tax">("labor");

  // 로딩 상태 및 API 검색 결과
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTarget, setSearchTarget] = useState<"law" | "prec" | "admrul" | "ordin">("prec");
  const [searchResults, setSearchResults] = useState<LawSearchResult[]>([]);
  const [selectedLawDetail, setSelectedLawDetail] = useState<string | null>(null);
  const [selectedLawTitle, setSelectedLawTitle] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // 1. 노무 자가진단 입력값 상태
  const [laborHours, setLaborHours] = useState(40);
  const [laborOvertime, setLaborOvertime] = useState(12);
  const [laborEmployees, setLaborEmployees] = useState(10);
  const [hasHolidayPay, setHasHolidayPay] = useState(true);
  const [hasIllegalClause, setHasIllegalClause] = useState(false);
  const [laborAuditResult, setLaborAuditResult] = useState<any | null>(null);

  // 2. 산업안전 자가진단 입력값 상태
  const [safetySector, setSafetySector] = useState("manufacturing");
  const [safetyEmployees, setSafetyEmployees] = useState(15);
  const [hasSafetyManager, setHasSafetyManager] = useState(true);
  const [hasSafetyEducation, setHasSafetyEducation] = useState(true);
  const [hasRiskAssessment, setHasRiskAssessment] = useState(false);
  const [safetyAuditResult, setSafetyAuditResult] = useState<any | null>(null);

  // 3. 소송 도움 센터 상태
  const [litigationType, setLitigationType] = useState<"civil" | "criminal" | "administrative">("civil");
  const [litigationFile, setLitigationFile] = useState<File | null>(null);
  const [litigationFileBase64, setLitigationFileBase64] = useState<string | null>(null);
  const [litigationAnalyzing, setLitigationAnalyzing] = useState(false);
  const [litigationReport, setLitigationReport] = useState<string | null>(null);
  const [litigationCalendarSaved, setLitigationCalendarSaved] = useState(false);
  const [litigationTaskId, setLitigationTaskId] = useState<string | null>(null);

  // ── 1. 노무 자가진단 연산 함수 ─────────────────────────────────────────────
  const handleLaborAudit = async () => {
    setLoading(true);
    try {
      const totalHours = Number(laborHours) + Number(laborOvertime);
      const isOver52 = totalHours > 52;
      const is5OrMore = Number(laborEmployees) >= 5;
      const hasHolidayRisk = !hasHolidayPay && is5OrMore;

      // 법제처 API 연동: 리스크 근거 법령 가져오기
      let relatedLaws: LawSearchResult[] = [];
      const lawSearch = await searchKoreanLaw("근로기준법", { target: "law", display: 10 });
      if (lawSearch && Array.isArray(lawSearch)) {
        relatedLaws = lawSearch.map((item: any) => ({
          id: item.mst || item.id || "",
          title: item.title || item.name || "근로기준법 조항",
          source: "법제처 법령"
        }));
      }

      setLaborAuditResult({
        totalHours,
        isOver52,
        hasHolidayRisk,
        hasIllegalClause,
        relatedLaws: relatedLaws.slice(0, 3)
      });
    } catch (e) {
      console.error(e);
      alert("노무 법령 대조 과정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ── 2. 산업안전 자가진단 연산 함수 ───────────────────────────────────────────
  const handleSafetyAudit = async () => {
    setLoading(true);
    try {
      const isCritLimit = Number(safetyEmployees) >= 50;
      const hasCritRisk = !hasRiskAssessment || !hasSafetyEducation;

      // 법제처 API 연동: 산업안전보건법 검색
      let safetyLaws: LawSearchResult[] = [];
      const lawSearch = await searchKoreanLaw("산업안전보건법", { target: "law", display: 10 });
      if (lawSearch && Array.isArray(lawSearch)) {
        safetyLaws = lawSearch.map((item: any) => ({
          id: item.mst || item.id || "",
          title: item.title || item.name || "산업안전보건법 조항",
          source: "법제처 법령"
        }));
      }

      setSafetyAuditResult({
        isCritLimit,
        hasCritRisk,
        hasSafetyManager,
        hasRiskAssessment,
        safetyLaws: safetyLaws.slice(0, 3)
      });
    } catch (e) {
      console.error(e);
      alert("산업안전 법령 대조 과정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ── 2.5. 소송 문서 AI 분석 및 일정 연동 ───────────────────────────────────────
  const handleLitigationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLitigationFile(file);
    setLitigationReport(null);
    setLitigationCalendarSaved(false);
    setLitigationTaskId(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLitigationFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeLitigation = async () => {
    if (!litigationFileBase64) {
      alert("분석할 소송 문서 이미지를 업로드해 주세요.");
      return;
    }

    setLitigationAnalyzing(true);
    setLitigationReport(null);
    try {
      const response = await apiFetch("/api/lawyer-ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: litigationFileBase64,
          mimeType: litigationFile?.type || "image/png"
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setLitigationReport(resData.report);
      } else {
        alert(resData.error || "소송 문서 분석에 실패했습니다.");
      }
    } catch (err: any) {
      alert("분석 서버 통신 오류: " + err.message);
    } finally {
      setLitigationAnalyzing(false);
    }
  };

  const handleSaveLitigationToCalendar = async () => {
    if (!litigationReport) return;

    // 마크다운 리포트에서 메타데이터 태그 [METADATA:CALENDAR_EVENT:deadline:caseNumber:docType] 파싱
    const metaMatch = litigationReport.match(/\[METADATA:CALENDAR_EVENT:([^:]*):([^:]*):([^\]]*)\]/);
    if (!metaMatch) {
      alert("일정 등록용 메타데이터가 식별되지 않았습니다. 분석 보고서가 온전하게 작성되었는지 확인해 주세요.");
      return;
    }

    const deadlineVal = metaMatch[1] === "null" ? null : metaMatch[1].trim();
    const caseNumber = metaMatch[2].trim();
    const documentType = metaMatch[3].trim();

    setLoading(true);
    try {
      const response = await apiFetch("/api/easybot/ocr/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: "LEGAL_DOCUMENT",
          data: {
            documentType,
            caseNumber,
            summary: litigationReport.split("## 3. ")[0] || litigationReport.slice(0, 400), // 리포트 앞부분 요약 전달
            deadline: deadlineVal,
            actions: [
              "법률 상담 AI 본 화면을 통한 대응 가이드 참조",
              "관련 입증 자료 실시간 취합 및 답변서 기안"
            ],
            pdfFilePath: ""
          }
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setLitigationCalendarSaved(true);
        setLitigationTaskId(resData.taskId);
        alert(resData.message || "회사 캘린더에 일정이 성공적으로 등록되었습니다.");
      } else {
        alert(resData.error || "일정 등록에 실패했습니다.");
      }
    } catch (err: any) {
      alert("일정 등록 통신 오류: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── 3. 실시간 판례 및 법령 검색 ─────────────────────────────────────────────
  const handleLawSearch = async (overrideQuery?: string, overrideTarget?: "law" | "prec" | "admrul" | "ordin") => {
    const q = overrideQuery || searchQuery;
    const t = overrideTarget || searchTarget;
    if (!q.trim()) return;

    setLoading(true);
    setSearchResults([]);
    try {
      const results = await searchKoreanLaw(q, { target: t, display: 20 });
      if (results && Array.isArray(results)) {
        setSearchResults(
          results.map((item: any) => ({
            id: item.id || item.mst || item.serial || "",
            title: item.title || item.name || item.evtNm || "검색 결과 항목",
            subTitle: item.subTitle || item.courtName || item.evtNo || "",
            source: t === "law" ? "법령" : t === "prec" ? "판례" : t === "admrul" ? "행정규칙" : "자치법규"
          }))
        );
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
      alert("법제처 API 검색 호출에 실패했습니다. 이지데스크 백엔드 구동 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // ── 4. 상세 텍스트(전문) 보기 ─────────────────────────────────────────────
  const handleViewDetail = async (id: string, title: string, source: string) => {
    setLoading(true);
    setSelectedLawTitle(title);
    setSelectedLawDetail(null);
    try {
      if (source === "판례") {
        const decision = await getKoreanLawDecision(id);
        if (decision) {
          setSelectedLawDetail(
            decision.content || decision.summary || JSON.stringify(decision, null, 2)
          );
        } else {
          setSelectedLawDetail("판례 전문을 찾을 수 없거나 불러오지 못했습니다.");
        }
      } else {
        const targetType = source === "법령" ? "law" : source === "행정규칙" ? "admrul" : "ordin";
        const lawText = await getKoreanLawText(id, targetType);
        if (lawText) {
          setSelectedLawDetail(
            lawText.content || lawText.text || JSON.stringify(lawText, null, 2)
          );
        } else {
          setSelectedLawDetail("법령 전문을 찾을 수 없거나 불러오지 못했습니다.");
        }
      }
      setDetailModalOpen(true);
    } catch (e) {
      console.error(e);
      alert("본문 상세 조회를 처리하는 도중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="법률 상담 AI: 계약서 전문을 업로드하여 불공정 조항을 색출하고 독소 특약 유무를 진단하는 법률 AI 지원처입니다.">
      {/* 최상단 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Scale className="w-8 h-8 text-amber-600 mr-3 shrink-0" />
            법률 상담 AI
            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold ml-2.5">
              CEO 전용 법률 관제
            </span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            법제처 Open API 연동망을 실시간 직결하여 노무·안전 리스크를 스캔하고 소송/판례 법률 의무를 통제합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 shrink-0">
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span className="text-slate-400 font-extrabold">법제처 API Gateway:</span>
          <span className="text-emerald-600 font-black">연동 활성화</span>
        </div>
      </div>

      {/* 탭 내비게이션 */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-3">
        <button
          onClick={() => setActiveTab("labor")}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "labor"
              ? "bg-amber-500 text-white shadow-sm scale-102"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          노무 자가진단 (근로기준법)
        </button>
        <button
          onClick={() => setActiveTab("safety")}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "safety"
              ? "bg-amber-500 text-white shadow-sm scale-102"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          산업안전 의무 (중대재해법)
        </button>
        <button
          onClick={() => setActiveTab("litigation")}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "litigation"
              ? "bg-amber-500 text-white shadow-sm scale-102"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          소송 도움 센터
        </button>
        <button
          onClick={() => setActiveTab("precedent")}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "precedent"
              ? "bg-amber-500 text-white shadow-sm scale-102"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          실시간 판례 검색
        </button>
        <button
          onClick={() => setActiveTab("tax")}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "tax"
              ? "bg-amber-500 text-white shadow-sm scale-102"
              : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          조세 세제 혜택 (특례법)
        </button>
      </div>

      {/* 메인 콘텐츠 바디 */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        {/* 아주 은은한 디자인 효과 블러 */}
        <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-amber-50/20 blur-[120px] pointer-events-none"></div>

        {/* ── 탭 1: 노무 자가진단 ────────────────────────────────────────────────── */}
        {activeTab === "labor" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                <Briefcase className="text-amber-550 shrink-0" />
                최신 노동법 기반 「실시간 노무 리스크 진단기」
              </h2>
              <p className="text-slate-400 text-[11px] mt-1 font-semibold">
                사내 근로 형태 및 조건을 입력하여 근로기준법 위반 소지가 있는지 실시간으로 판정합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 입력 폼 */}
              <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-550 border-b border-slate-100 pb-2 mb-3">사업장 현황 기입</h3>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-450 block">상시 근로자 수 (명)</label>
                  <input
                    type="number"
                    value={laborEmployees}
                    onChange={(e) => setLaborEmployees(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-450 block">주당 기본 소정 근로시간 (시간)</label>
                  <input
                    type="number"
                    value={laborHours}
                    onChange={(e) => setLaborHours(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-450 block">주당 평균 연장/휴일 근로시간 (시간)</label>
                  <input
                    type="number"
                    value={laborOvertime}
                    onChange={(e) => setLaborOvertime(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-4">
                  <span className="text-[11px] font-bold text-slate-450">주휴수당 및 주휴일 유급 보장 여부</span>
                  <input
                    type="checkbox"
                    checked={hasHolidayPay}
                    onChange={(e) => setHasHolidayPay(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-450 block">포괄임금 근로 대가 무단 미명시 여부</span>
                    <span className="text-[9px] text-slate-400">연장근로 대가가 명시되지 않은 독소 조항 존재 여부</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasIllegalClause}
                    onChange={(e) => setHasIllegalClause(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                </div>

                <button
                  onClick={handleLaborAudit}
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs transition-all mt-4 flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? "노무 데이터 분석 대조 중..." : "실시간 노무 진단 실행"}
                </button>
              </div>

              {/* 진단 결과 레포트 */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-550 border-b border-slate-100 pb-2 mb-4">진단 결과 리포트</h3>

                  {!laborAuditResult ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-450">
                      <HelpCircle className="w-10 h-10 mb-2 stroke-1" />
                      <p className="text-[11px] font-semibold">우측 사업장 현황 기입 후 진단 버튼을 눌러주세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      {/* 위험 지수 */}
                      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-[11px] text-slate-500 font-bold">총 주당 근로시간</span>
                        <span className="text-base font-black text-slate-800 font-mono">{laborAuditResult.totalHours}시간</span>
                      </div>

                      {/* 리스크 목록 */}
                      <div className="space-y-3">
                        {laborAuditResult.isOver52 && (
                          <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5">
                            <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-black text-rose-800">주 52시간 한도 초과 감지</h4>
                              <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                                근로기준법 제53조 위반 소지가 높습니다. 특별연장근로 인가 등의 조치 없이 연장근로 한도를 초과할 경우 사업주 형사 처벌 대상이 될 수 있습니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {laborAuditResult.hasHolidayRisk && (
                          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex items-start gap-2.5">
                            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-black text-amber-800">주휴수당 보장 위험 감지</h4>
                              <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                                5인 이상 사업장에서 주 15시간 이상 근무 시 반드시 주휴수당을 지급해야 합니다. 근로기준법 제55조 위반에 따른 임금 체불 소지가 있습니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {laborAuditResult.hasIllegalClause && (
                          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex items-start gap-2.5">
                            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-black text-amber-800">포괄임금계약 독소조항 감지</h4>
                              <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                                계약서 내에 연장근로 한도에 대가 산정이 무단 누락되어 있어 실근로시간 대비 법정 가산수당 미지급으로 인한 정산 임금체불 소지가 있습니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {!laborAuditResult.isOver52 && !laborAuditResult.hasHolidayRisk && !laborAuditResult.hasIllegalClause && (
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                            <CheckCircle className="w-5.5 h-5.5 text-emerald-550 shrink-0" />
                            <div>
                              <h4 className="text-xs font-black text-emerald-800">진단결과: 매우 안전</h4>
                              <p className="text-[10px] text-slate-650 mt-0.5">
                                입력된 조건을 기준으로 근로기준법 규정 위반 가능성이 낮습니다.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 법제처 API 연동 근거 */}
                {laborAuditResult && laborAuditResult.relatedLaws?.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <span className="text-[11px] font-bold text-slate-400 block mb-2">법적 근거 법령 (실시간 법제처 API 대조)</span>
                    <div className="space-y-1.5">
                      {laborAuditResult.relatedLaws.map((law: any) => (
                        <div
                          key={law.id}
                          onClick={() => handleViewDetail(law.id, law.title, "법령")}
                          className="flex items-center justify-between bg-white hover:bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-left cursor-pointer transition-colors shadow-sm"
                        >
                          <span className="text-[10px] font-extrabold text-slate-700 truncate max-w-[250px]">{law.title}</span>
                          <span className="text-[9px] text-amber-600 font-bold shrink-0 flex items-center gap-0.5">
                            조문 보기 <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 2: 산업안전 의무 자가진단 ────────────────────────────────────────── */}
        {activeTab === "safety" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                <ShieldAlert className="text-amber-550 shrink-0" />
                대표이사 사법 리스크 방지 「산업안전보건 의무 진단기」
              </h2>
              <p className="text-slate-400 text-[11px] mt-1 font-semibold">
                중대재해처벌법 및 산업안전보건법에 의거하여 대표이사가 준수해야 할 안전관리 조치 의무 상태를 체크합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 입력 폼 */}
              <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-550 border-b border-slate-100 pb-2 mb-3">안전보건 관리 여건 기입</h3>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-450 block">사업장 주된 업종</label>
                  <select
                    value={safetySector}
                    onChange={(e) => setSafetySector(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-850 focus:outline-none focus:border-amber-500"
                  >
                    <option value="manufacturing">제조업 (공장 및 가공)</option>
                    <option value="logistics">물류업 (창고 및 운송)</option>
                    <option value="construction">건설업</option>
                    <option value="other">기타 서비스/일반 사무</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-450 block">상시 근로자 수 (명)</label>
                  <input
                    type="number"
                    value={safetyEmployees}
                    onChange={(e) => setSafetyEmployees(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-4">
                  <span className="text-[11px] font-bold text-slate-450">안전보건관리책임자/담당자 선임 여부</span>
                  <input
                    type="checkbox"
                    checked={hasSafetyManager}
                    onChange={(e) => setHasSafetyManager(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-450">임직원 정기 안전보건 교육 실시 여부</span>
                  <input
                    type="checkbox"
                    checked={hasSafetyEducation}
                    onChange={(e) => setHasSafetyEducation(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-450 block">위험성 평가 년 1회 이상 정기 실시 여부</span>
                    <span className="text-[9px] text-slate-400">안전보건체계 구축 핵심 지표</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasRiskAssessment}
                    onChange={(e) => setHasRiskAssessment(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                </div>

                <button
                  onClick={handleSafetyAudit}
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs transition-all mt-4 flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? "안전보건 법령 분석 중..." : "실시간 안전보건 진단 실행"}
                </button>
              </div>

              {/* 진단 결과 레포트 */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-550 border-b border-slate-100 pb-2 mb-4">진단 결과 리포트</h3>

                  {!safetyAuditResult ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-455">
                      <HelpCircle className="w-10 h-10 mb-2 stroke-1" />
                      <p className="text-[11px] font-semibold">우측 안전보건 여건 기입 후 진단 버튼을 눌러주세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      {/* 위험 규모 등급 */}
                      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-[11px] text-slate-500 font-bold">중대재해법 전면 적용 여부</span>
                        <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-150 px-2 py-0.5 rounded">
                          5인 이상 전 사업장 적용
                        </span>
                      </div>

                      {/* 리스크 목록 */}
                      <div className="space-y-3">
                        {!safetyAuditResult.hasSafetyManager && (
                          <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5">
                            <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-black text-rose-800">안전보건관리 선임 의무 위반 가능성</h4>
                              <p className="text-[10px] text-slate-650 mt-1 leading-normal">
                                상시 근로자 50인 이상 사업장은 관리책임자 선임이 의무입니다. 미준수 시 산업안전보건법에 의거 500만원 이하의 과태료 처분을 받을 수 있습니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {!safetyAuditResult.hasRiskAssessment && (
                          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex items-start gap-2.5">
                            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-black text-amber-800">위험성 평가 미실시 리스크</h4>
                              <p className="text-[10px] text-slate-650 mt-1 leading-normal">
                                산업안전보건법 제36조에 의거 연 1회 위험성 평가를 시행하고 노사가 서명/보존해야 합니다. 사고 발생 시 대표이사의 안전 확보 의무 소홀 근거가 될 수 있습니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {safetyAuditResult.hasCritRisk && (
                          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex items-start gap-2.5">
                            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-black text-amber-800">안전보건교육 미실시 경고</h4>
                              <p className="text-[10px] text-slate-650 mt-1 leading-normal">
                                매 분기 정기적으로 근로자 안전보건교육을 이행하고 교육대장을 보관하여야 합니다. 위반 시 과태료 행정 처분 요건이 됩니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {safetyAuditResult.hasSafetyManager && safetyAuditResult.hasRiskAssessment && !safetyAuditResult.hasCritRisk && (
                          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                            <CheckCircle className="w-5.5 h-5.5 text-emerald-550 shrink-0" />
                            <div>
                              <h4 className="text-xs font-black text-emerald-800">안전관리 체계 정상</h4>
                              <p className="text-[10px] text-slate-650 mt-0.5">
                                법적 핵심 관리 기준(선임 및 평가 이행)을 준수하고 있어 대표이사 면책 요건 확보에 긍정적입니다.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 법제처 API 연동 근거 */}
                {safetyAuditResult && safetyAuditResult.safetyLaws?.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <span className="text-[11px] font-bold text-slate-400 block mb-2">법적 근거 법령 (산업안전보건법 실시간 대조)</span>
                    <div className="space-y-1.5">
                      {safetyAuditResult.safetyLaws.map((law: any) => (
                        <div
                          key={law.id}
                          onClick={() => handleViewDetail(law.id, law.title, "법령")}
                          className="flex items-center justify-between bg-white hover:bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-left cursor-pointer transition-colors shadow-sm"
                        >
                          <span className="text-[10px] font-extrabold text-slate-700 truncate max-w-[250px]">{law.title}</span>
                          <span className="text-[9px] text-amber-600 font-bold shrink-0 flex items-center gap-0.5">
                            조문 보기 <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 3: 소송 도움 센터 ────────────────────────────────────────────────── */}
        {activeTab === "litigation" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                <BookOpen className="text-amber-550 shrink-0" />
                CEO 소송 조력관 「민사·형사·행정 소송 대응 가이드」
              </h2>
              <p className="text-slate-400 text-[11px] mt-1 font-semibold">
                기업 간 채무, 지식재산권, 부당 처분 등 소송 국면에 직면한 CEO를 위해 절차와 입증 자료 준비 요령을 조력합니다.
              </p>
            </div>

            {/* 소송 유형 셀렉터 */}
            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-150 max-w-md">
              <button
                onClick={() => setLitigationType("civil")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  litigationType === "civil"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-450 hover:text-slate-850"
                }`}
              >
                민사 소송 (용역비/대금)
              </button>
              <button
                onClick={() => setLitigationType("criminal")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  litigationType === "criminal"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-455 hover:text-slate-850"
                }`}
              >
                형사 소송 (배임/횡령/고소)
              </button>
              <button
                onClick={() => setLitigationType("administrative")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  litigationType === "administrative"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-455 hover:text-slate-850"
                }`}
              >
                행정 소송 (처분/규제)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 소송 절차 로드맵 */}
              <div className="lg:col-span-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-5 text-left">
                <h3 className="text-xs font-extrabold text-slate-550 border-b border-slate-100 pb-2">소송 단계별 프로세스</h3>

                {litigationType === "civil" && (
                  <div className="space-y-4">
                    <div className="relative pl-6 border-l-2 border-amber-300 space-y-4">
                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">1단계: 증거 확보 및 내용증명 발송</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          계약서, 이체 내역서, 세금계산서, 이메일 및 카카오톡 대화 내용 등 원본 자료를 대조 및 확보합니다. 채무 불이행 사실 및 독촉 의사를 알리는 내용증명을 발송하여 법적 의사 표시를 공식 보존합니다.
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">2단계: 소장 제출 또는 지급명령 신청</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          상대방의 주소와 채권 금액이 명확하다면 법원에 신속한 「지급명령 신청」을 우선 제기할 수 있습니다. 이의제기 가능성이 높은 정식 사건인 경우, 청구취지와 원인을 기입하여 본안 소장을 법원에 접수합니다.
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">3단계: 변론 준비 및 증명책임</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          민사소송에서는 주장하는 자에게 입증책임(증명책임)이 있습니다. 피고의 반박 서면(답변서)에 대해 준비서면을 작성하여 증거 서류를 조목조목 입증 제출해야 승소할 수 있습니다.
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">4단계: 판결 확보 및 채권 집행</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          판결이 확정되면 집행문을 부여받아 가압류해 둔 상대 자산(은행 예금, 부동산, 매출 채권 등)에 대해 압류 및 강제집행 절차에 착수합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {litigationType === "criminal" && (
                  <div className="space-y-4">
                    <div className="relative pl-6 border-l-2 border-amber-300 space-y-4">
                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">1단계: 고소장 작성 및 혐의 특정</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          사내 배임, 횡령, 기밀 유출 혐의 시 사실 관계를 일시, 방법, 피해액 위주로 육하원칙에 입각해 기재한 고소장을 작성합니다. 계좌이체 내역이나 감사보고서 등 명확한 물증을 첨부해야 수사가 신속 개시됩니다.
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">2단계: 고소인 진술조사 참여</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          경찰에 출석하여 고소장 내용에 대한 구체적 진술을 진행합니다. 피고소인의 혐의점을 뒷받침하는 입증자료를 소명하고 일관성 있게 설명해야 합니다.
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">3단계: 검찰 송치 및 재판(기소)</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          경찰 수사에서 혐의가 인정(기소 의견)되면 사건이 검찰로 송치되며, 검사는 피고인을 법원에 재판 청구(기소)합니다. 피해 보상을 받기 위해서는 형사 재판 과정에서 배상명령을 신청하거나 민사 소송을 별개 병행 제기할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {litigationType === "administrative" && (
                  <div className="space-y-4">
                    <div className="relative pl-6 border-l-2 border-amber-300 space-y-4">
                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">1단계: 행정처분 통지 수령 및 처분 확인</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          국세청, 고용노동부, 지자체 등으로부터 위반 처분 및 과태료 고지서를 수령한 경우, 처분의 위법성이나 절차적 하자(의견 진술 기회 부여 여부 등)를 검토합니다.
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">2단계: 행정심판 청구 또는 소장 제기 (기한 확인)</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          처분이 있음을 안 날로부터 90일(처분이 있은 날로부터 180일) 이내에 관할 행정심판위원회에 행정심판을 청구하거나, 행정소송 소장을 관할 행정법원에 접수해야 합니다. 기한 경과 시 소제기 자체가 불가능합니다.
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-29px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white"></div>
                        <h4 className="text-xs font-extrabold text-slate-800">3단계: 집행정지 신청서 병행 제출</h4>
                        <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1">
                          본안 소송 판결 시까지 행정처분의 효력을 일시 중단하지 않으면 돌이킬 수 없는 중대한 손해가 발생하는 경우, 소장과 함께 「처분 효력 집행정지 신청서」를 반드시 병행 제출해 안전을 확보해야 합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 소송 문서 AI 분석기 (신규 추가) */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4 text-left">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    소송 문서 AI 실시간 분석기
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    소장, 지급명령 송달장, 판결문 이미지를 등록하여 주요 기한과 조치 사항을 진단합니다.
                  </p>
                </div>

                <div className="space-y-3">
                  {!litigationReport ? (
                    <div className="border-2 border-dashed border-slate-200 hover:border-amber-500/50 rounded-2xl p-5 bg-white transition-colors text-center cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLitigationFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={litigationAnalyzing}
                      />
                      <div className="space-y-1.5">
                        <span className="text-2xl block">📄</span>
                        {litigationFile ? (
                          <p className="text-xs font-black text-slate-800 truncate">{litigationFile.name}</p>
                        ) : (
                          <>
                            <p className="text-xs font-extrabold text-slate-600">소송 문서 이미지 등록</p>
                            <p className="text-[9px] text-slate-400 font-medium">클릭하거나 이미지 파일을 끌어다 놓으세요</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white border border-slate-150 p-4 rounded-xl text-left text-[10.5px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto font-medium shadow-inner">
                        {litigationReport.replace(/\[METADATA:CALENDAR_EVENT:[^\]]*\]/g, "")}
                      </div>
                      
                      {litigationCalendarSaved ? (
                        <div className="py-2 bg-emerald-50 border border-emerald-155 rounded-xl text-center text-[10.5px] text-emerald-800 font-black flex items-center justify-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 캘린더 및 이지봇 일정 연동 완료
                        </div>
                      ) : (
                        <button
                          onClick={handleSaveLitigationToCalendar}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          📥 회사 캘린더에 대응 기한 등록
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setLitigationFile(null);
                          setLitigationFileBase64(null);
                          setLitigationReport(null);
                          setLitigationCalendarSaved(false);
                          setLitigationTaskId(null);
                        }}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[10px] transition-all"
                      >
                        다른 문서 새로 분석하기
                      </button>
                    </div>
                  )}

                  {!litigationReport && litigationFile && (
                    <button
                      onClick={handleAnalyzeLitigation}
                      disabled={litigationAnalyzing}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {litigationAnalyzing ? "⚡ 소송 문서 분석 중..." : "⚖️ 소송 문서 AI 분석 개시"}
                    </button>
                  )}
                </div>
              </div>

              {/* 필수 증빙 자료 & 서식 준비 가이드 */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4 text-left">
                <h3 className="text-xs font-extrabold text-slate-555 border-b border-slate-100 pb-2">필수 서식 및 증빙 체크리스트</h3>

                <div className="space-y-3">
                  <div className="p-3.5 bg-white border border-slate-150 rounded-xl shadow-sm">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">소송 핵심 서식 가이드</span>
                    <h4 className="text-xs font-bold text-slate-800 mt-1">내용증명서 및 최고장</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      상대방의 채무 미이행에 대해 7일 이내 지급하지 않을 시 민형사상 법적 소송 및 계약 해지를 예고하는 공식 문서로 발송합니다.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-150 rounded-xl shadow-sm">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">소송 제출 필수 입증 서류</span>
                    <h4 className="text-xs font-bold text-slate-800 mt-1">원인 계약서 및 계좌 거래 내역서</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      양사의 날인이 된 거래 계약서 및 실제 자금 집행을 증명하는 주거래 은행 금융 거래 원장 내역을 반드시 서증으로 등록해야 합니다.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-150 rounded-xl shadow-sm">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">신속 절차 가이드</span>
                    <h4 className="text-xs font-bold text-slate-800 mt-1">지급명령 신청서</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      상대방이 채무 액수를 인정하지만 주지 않고 버티는 경우 정식 소송 대비 1/10 비용으로 신속하게 판결 효력을 확보하는 독촉 절차입니다.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setActiveTab("precedent");
                      setSearchQuery(litigationType === "civil" ? "대금 청구" : litigationType === "criminal" ? "업무상 배임" : "행정처분 취소");
                      handleLawSearch(litigationType === "civil" ? "대금 청구" : litigationType === "criminal" ? "업무상 배임" : "행정처분 취소", "prec");
                    }}
                    className="w-full py-2 bg-white hover:bg-slate-50 text-amber-700 font-extrabold rounded-xl text-[11px] transition-all border border-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <span>해당 소송 유형 유사 판례 즉시 검색</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 4: 실시간 판례 검색 ──────────────────────────────────────────────── */}
        {activeTab === "precedent" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                <Search className="text-amber-550 shrink-0" />
                법제처 Open API 연동 「실시간 판례·법령 검색기」
              </h2>
              <p className="text-slate-400 text-[11px] mt-1 font-semibold">
                법제처 공공 데이터 포털 API와 실시간 직결하여 최신 판결례 및 법령 전문을 정확하게 서칭합니다.
              </p>
            </div>

            {/* 검색바 컨트롤러 */}
            <div className="flex flex-col md:flex-row gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-150">
              <div className="w-full md:w-48">
                <select
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="prec">판례 검색 (prec)</option>
                  <option value="law">법령 검색 (law)</option>
                  <option value="admrul">행정규칙 검색 (admrul)</option>
                  <option value="ordin">자치법규 검색 (ordin)</option>
                </select>
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={
                    searchTarget === "prec"
                      ? "예: 손해배상(기), 대금 청구, 업무상 횡령 등 법적 키워드 입력"
                      : "예: 근로기준법, 세법, 산업안전보건기준 등 법령명 입력"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLawSearch()}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              </div>

              <button
                onClick={() => handleLawSearch()}
                disabled={loading}
                className="py-2 px-6 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs transition-all shrink-0"
              >
                {loading ? "검색 요청 중..." : "실시간 검색"}
              </button>
            </div>

            {/* 퀵 추천 키워드 태그 */}
            <div className="flex flex-wrap gap-2 items-center text-xs justify-start">
              <span className="text-slate-450 font-bold">CEO 추천 검색어:</span>
              <button
                onClick={() => {
                  setSearchQuery("손해배상(기)");
                  setSearchTarget("prec");
                  handleLawSearch("손해배상(기)", "prec");
                }}
                className="bg-white hover:bg-slate-50 border border-slate-150 px-3 py-0.5 rounded-full text-slate-600 transition-colors shadow-sm"
              >
                손해배상(기)
              </button>
              <button
                onClick={() => {
                  setSearchQuery("업무상 횡령");
                  setSearchTarget("prec");
                  handleLawSearch("업무상 횡령", "prec");
                }}
                className="bg-white hover:bg-slate-50 border border-slate-150 px-3 py-0.5 rounded-full text-slate-600 transition-colors shadow-sm"
              >
                업무상 횡령/배임
              </button>
              <button
                onClick={() => {
                  setSearchQuery("용역 대금");
                  setSearchTarget("prec");
                  handleLawSearch("용역 대금", "prec");
                }}
                className="bg-white hover:bg-slate-50 border border-slate-150 px-3 py-0.5 rounded-full text-slate-600 transition-colors shadow-sm"
              >
                용역 대금 청구
              </button>
              <button
                onClick={() => {
                  setSearchQuery("중소기업기본법");
                  setSearchTarget("law");
                  handleLawSearch("중소기업기본법", "law");
                }}
                className="bg-white hover:bg-slate-50 border border-slate-150 px-3 py-0.5 rounded-full text-slate-600 transition-colors shadow-sm"
              >
                중소기업기본법
              </button>
            </div>

            {/* 검색 결과 리스트 */}
            <div className="bg-slate-50/30 rounded-2xl border border-slate-100 p-4 min-h-[300px] text-left">
              {loading && searchResults.length === 0 ? (
                <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs font-bold">
                  <span>법제처 Open API 연동 데이터 로드 중...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400">
                  <Search className="w-10 h-10 mb-2 stroke-1" />
                  <p className="text-xs font-bold">검색어가 비어있거나 결과가 존재하지 않습니다.</p>
                  <p className="text-[10px] text-slate-450 mt-1">정확한 법률 용어를 사용하여 검색을 실행해 주세요.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-450 font-extrabold">
                        <th className="pb-3 pl-2 w-16">분류</th>
                        <th className="pb-3 pl-2">제목 / 판결명</th>
                        <th className="pb-3 pl-2 w-36">사건번호 / 구분</th>
                        <th className="pb-3 pr-2 text-right w-24">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="py-3 pl-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              item.source === "판례"
                                ? "bg-purple-50 text-purple-700 border border-purple-100"
                                : item.source === "법령"
                                  ? "bg-blue-50 text-blue-700 border border-blue-100"
                                  : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {item.source}
                            </span>
                          </td>
                          <td className="py-3 pl-2 font-bold text-slate-800">
                            {item.title}
                          </td>
                          <td className="py-3 pl-2 text-slate-500 font-mono text-[11px]">
                            {item.subTitle || "-"}
                          </td>
                          <td className="py-3 pr-2 text-right">
                            <button
                              onClick={() => handleViewDetail(item.id, item.title, item.source || "법령")}
                              className="px-3 py-1 bg-white hover:bg-slate-50 text-amber-700 font-black rounded-lg text-[10px] border border-slate-200 transition-colors"
                            >
                              전문 보기
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 탭 5: 조세 세제 혜택 ────────────────────────────────────────────────── */}
        {activeTab === "tax" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                <Coins className="text-amber-550 shrink-0" />
                놓치기 쉬운 중소기업 「조세특례제한법 세제 혜택 조회」
              </h2>
              <p className="text-slate-400 text-[11px] mt-1 font-semibold">
                대표이사가 절세를 위해 알아두어야 할 핵심 세액공제 및 세법 조항을 법제처에서 조회하여 매치합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 카드 1 */}
              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4 hover:border-amber-300 transition-all flex flex-col justify-between text-left">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">조세특례제한법 제29조의7</span>
                  <h3 className="text-xs font-black text-slate-800">고용증대 세액공제</h3>
                  <p className="text-[10px] text-slate-550 leading-normal">
                    전년 대비 상시 근로자 수가 증가한 중소기업에 대해 청년 등은 1인당 최대 1,200만원, 일반 근로자는 1인당 최대 700만원까지 3년간 소득세 또는 법인세를 공제해 줍니다.
                  </p>
                </div>
                <button
                  onClick={() => handleViewDetail("134954", "조세특례제한법 제29조의7", "법령")}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-amber-700 font-bold rounded-xl text-xs transition-colors mt-2"
                >
                  상세 법령 조항 보기
                </button>
              </div>

              {/* 카드 2 */}
              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4 hover:border-amber-300 transition-all flex flex-col justify-between text-left">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">조세특례제한법 제24조</span>
                  <h3 className="text-xs font-black text-slate-800">통합 투자 세액공제</h3>
                  <p className="text-[10px] text-slate-550 leading-normal">
                    중소기업이 공장 기계 설비나 연구 시설, 안전 설비 등에 신규 투자한 금액의 10%(신산업/원천기술 등은 최대 18%)를 당해 연도 소득세/법인세에서 공제하여 투자 부담을 줄입니다.
                  </p>
                </div>
                <button
                  onClick={() => handleViewDetail("134954", "조세특례제한법 제24조", "법령")}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-amber-700 font-bold rounded-xl text-xs transition-colors mt-2"
                >
                  상세 법령 조항 보기
                </button>
              </div>

              {/* 카드 3 */}
              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4 hover:border-amber-300 transition-all flex flex-col justify-between text-left">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">조세특례제한법 제10조</span>
                  <h3 className="text-xs font-black text-slate-800">연구·인력개발비(R&D) 세액공제</h3>
                  <p className="text-[10px] text-slate-550 leading-normal">
                    사내 연구소 설립 및 연구 인력 인건비, 신제품 설계비로 지출한 연구개발 총 비용의 최대 25%를 소득세/법인세에서 직접 차감 공제해 주는 강력한 혜택입니다.
                  </p>
                </div>
                <button
                  onClick={() => handleViewDetail("134954", "조세특례제한법 제10조", "법령")}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-amber-700 font-bold rounded-xl text-xs transition-colors mt-2"
                >
                  상세 법령 조항 보기
                </button>
              </div>
            </div>

            {/* 퀵 돋보기 검색 링크 */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 mt-6 text-left">
              <div className="flex items-center gap-3">
                <FileCheck className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">더 자세한 세제 법률 조문 검색을 원하시나요?</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                    버튼 클릭 시 실시간 법제처 법령 검색으로 이동하여 조세 세제 개정 법안을 상세히 확인합니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab("precedent");
                  setSearchTarget("law");
                  setSearchQuery("조세특례제한법");
                  handleLawSearch("조세특례제한법", "law");
                }}
                className="py-2 bg-white hover:bg-slate-50 text-amber-700 font-extrabold border border-slate-200 rounded-xl text-xs transition-all shrink-0 px-4"
              >
                조세특례제한법 전문 검색 실행
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 법령/판례 전문 팝업 모달 ── */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)}></div>
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl relative z-10 overflow-hidden flex flex-col">
            
            {/* 모달 헤더 */}
            <div className="p-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-amber-600" />
                <h3 className="text-xs font-extrabold text-slate-800 truncate max-w-[500px]">
                  {selectedLawTitle}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* 모달 바디 (본문 스크롤) */}
            <div className="p-6 overflow-y-auto text-slate-700 font-mono text-xs leading-relaxed space-y-4 max-h-[60vh] bg-slate-50/30 whitespace-pre-wrap text-left">
              {selectedLawDetail ? (
                selectedLawDetail
              ) : (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  데이터를 가공하여 표시하는 중입니다...
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
