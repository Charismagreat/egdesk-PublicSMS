import React, { useState } from "react";
import { X, Sparkles, RefreshCw, AlertTriangle, ShieldCheck, FileText, ChevronRight, Link2, ExternalLink } from "lucide-react";
import { Partner } from "../types";

interface PartnerAnalysisModalProps {
  isAnalysisOpen: boolean;
  setIsAnalysisOpen: (open: boolean) => void;
  analysisPartner: Partner | null;
  partnerReports: any[];
  isAnalyzing: boolean;
  handleRunAiAnalysis: (type: 'NEWS' | 'REPUTATION' | 'FINANCIAL', payload: any) => Promise<void>;
}

export function PartnerAnalysisModal({
  isAnalysisOpen,
  setIsAnalysisOpen,
  analysisPartner,
  partnerReports,
  isAnalyzing,
  handleRunAiAnalysis
}: PartnerAnalysisModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'NEWS' | 'REPUTATION' | 'FINANCIAL'>('NEWS');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // 1. 평판 분석용 입력 폼 상태
  const [reviewText, setReviewText] = useState("");
  const [showManualReputation, setShowManualReputation] = useState(false);

  // 2. 재무 분석용 입력 폼 및 파일 업로드 상태
  const [revenue, setRevenue] = useState("");
  const [revenueGrowth, setRevenueGrowth] = useState("");
  const [operatingIncome, setOperatingIncome] = useState("");
  const [operatingIncomeGrowth, setOperatingIncomeGrowth] = useState("");
  const [debtRatio, setDebtRatio] = useState("");
  const [netIncome, setNetIncome] = useState("");
  const [financialNews, setFinancialNews] = useState("");
  const [showManualFinancial, setShowManualFinancial] = useState(false);
  const [fileBase64, setFileBase64] = useState("");
  const [fileMime, setFileMime] = useState("");
  const [fileName, setFileName] = useState("");

  if (!isAnalysisOpen || !analysisPartner) return null;

  // 분석 실행 트리거
  const handleExecute = async () => {
    let payload: any = {};
    if (activeSubTab === 'REPUTATION') {
      payload = { review_text: reviewText };
    } else if (activeSubTab === 'FINANCIAL') {
      payload = {
        revenue,
        revenue_growth: revenueGrowth,
        operating_income: operatingIncome,
        operating_income_growth: operatingIncomeGrowth,
        debt_ratio: debtRatio,
        net_income: netIncome,
        financial_news: financialNews,
        file_base64: fileBase64,
        file_mime: fileMime,
        file_name: fileName
      };
    }

    await handleRunAiAnalysis(activeSubTab, payload);
    
    // 입력 폼들 리셋
    setReviewText("");
    setRevenue("");
    setRevenueGrowth("");
    setOperatingIncome("");
    setOperatingIncomeGrowth("");
    setDebtRatio("");
    setNetIncome("");
    setFinancialNews("");
    setFileBase64("");
    setFileMime("");
    setFileName("");
  };

  // 파일 처리 헬퍼 함수
  const processFile = (file: File) => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      alert("경영 분석 문서 및 재무제표는 PDF 또는 이미지 파일(PNG, JPG, JPEG)만 업로드 가능합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      const base64String = resultStr.split(',')[1];
      setFileBase64(base64String);
      setFileMime(file.type);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // 결과 상세 파싱
  const currentReport = selectedReport || (partnerReports.length > 0 ? partnerReports[0] : null);
  let parsedResult: any = null;
  if (currentReport) {
    try {
      parsedResult = JSON.parse(currentReport.result_json);
    } catch (e) {
      console.error("JSON 파싱 에러:", e);
    }
  }

  // 위해도에 따른 등급 배지 렌더링 헬퍼
  const renderRiskBadge = (grade: string) => {
    const isDanger = grade === '위험' || grade === '주의';
    const isSafe = grade === '안정';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${
        isDanger 
          ? 'bg-rose-50 border-rose-200 text-rose-700' 
          : isSafe 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
          : 'bg-slate-55 border-slate-200 text-slate-600'
      }`}>
        {grade || '보통'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-5xl w-full p-6 md:p-8 shadow-2xl relative z-10 flex flex-col md:flex-row gap-6 max-h-[90vh] animate-scale-up">
        
        {/* 닫기 단추 */}
        <button 
          type="button" 
          onClick={() => {
            setIsAnalysisOpen(false);
            setSelectedReport(null);
          }} 
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors border-none bg-transparent cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ────────────────────────────────────────────────────────
            좌측 영역: 분석 제어판 및 폼 입력
            ──────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 space-y-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-1.5">
              <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
              <span>{analysisPartner.company_name} AI 위해 분석 관제</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-450">
              최신 실시간 구글 뉴스, 임직원 리뷰 감성, 분기 공시 재무 제표 수치를 마이닝하여 위해 요소를 종합 진단합니다.
            </p>
          </div>

          {/* 서브 탭 분기 */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-150 shadow-inner">
            {(['NEWS', 'REPUTATION', 'FINANCIAL'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveSubTab(tab);
                  setSelectedReport(null);
                }}
                className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all cursor-pointer border-none ${
                  activeSubTab === tab ? 'bg-emerald-600 text-white shadow' : 'bg-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'NEWS' ? '📰 뉴스/리스크' : tab === 'REPUTATION' ? '💬 익명 평판' : '📊 재무 건전성'}
              </button>
            ))}
          </div>

          {/* 템플릿별 입력 폼 분기 */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] md:max-h-none">
            {activeSubTab === 'NEWS' && (
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">실시간 뉴스 모니터링 가이드</span>
                <p className="text-xs leading-relaxed text-slate-600 font-medium">
                  부도설, 임금체불, 압류, 소송, 횡령, 세무조사 등 기업 존속에 치명적인 키워드 조합을 활용하여 **Google Search** 실시간 리스크 탐색을 기동합니다.
                </p>
                <div className="p-3 bg-white border border-slate-150 rounded-xl font-mono text-[10px] text-indigo-600 font-bold">
                  검색 키워드: &ldquo;{analysisPartner.company_name}&rdquo; + (부도 OR 소송 OR 압류 OR 임금체불 OR 세무조사 OR 횡령)
                </div>
              </div>
            )}

            {activeSubTab === 'REPUTATION' && (
              <div className="space-y-3">
                <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">실시간 평판 자율 마이닝 가이드</span>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">
                    잡플래닛, 블라인드, 잡코리아 등의 익명 리뷰와 온라인 커뮤니티 평판을 **Google Search** 실시간 수집을 통해 자동으로 마이닝하고 분석을 기동합니다.
                  </p>
                  <div className="p-3 bg-white border border-slate-150 rounded-xl font-mono text-[10px] text-indigo-600 font-bold">
                    검색 키워드: &ldquo;{analysisPartner.company_name}&rdquo; + (잡플래닛 OR 블라인드 OR 평판 OR 이직률 OR 임금체불)
                  </div>
                </div>

                {/* 접이식 추가 정보 입력 아코디언 */}
                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setShowManualReputation(!showManualReputation)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-black text-slate-700 border-none cursor-pointer transition-colors"
                  >
                    <span>➕ 보조 참고 텍스트 추가 입력 (선택)</span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {showManualReputation ? "접기" : "펼치기"}
                    </span>
                  </button>
                  {showManualReputation && (
                    <div className="p-3 border-t border-slate-150 bg-white space-y-2">
                      <label className="text-[9px] text-slate-400 font-bold block">
                        사내 비공개 정보나 직접 수집한 리뷰가 있다면 입력해 주세요. (구글 검색과 결합하여 분석)
                      </label>
                      <textarea
                        rows={4}
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        placeholder="예: 최근 회사 소문 외에 직접 들은 바로는 연구소 핵심 인력 3명이 경쟁사로 이직 준비 중이라고 함."
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white placeholder-slate-400 focus:border-emerald-500 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSubTab === 'FINANCIAL' && (
              <div className="space-y-3">
                <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">실시간 재무 건전성 자율 마이닝 가이드</span>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">
                    최근 분기 실적, 연간 재무제표 요약 및 공시 정보를 **Google Search** 실시간 수집을 통해 자동으로 마이닝하고 분석을 기동합니다.
                  </p>
                  <div className="p-3 bg-white border border-slate-150 rounded-xl font-mono text-[10px] text-indigo-600 font-bold">
                    검색 키워드: &ldquo;{analysisPartner.company_name}&rdquo; + (재무제표 OR 매출액 OR 영업이익 OR 부채비율 OR 공시)
                  </div>
                </div>

                {/* 📂 경영 자료 및 재무제표 파일 드롭존 */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold block">경영 분석 자료 / 재무제표 업로드 (선택)</label>
                  
                  {fileName ? (
                    <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-black text-slate-700 truncate max-w-[200px] md:max-w-xs">{fileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFileBase64("");
                          setFileMime("");
                          setFileName("");
                        }}
                        className="text-[10px] text-rose-500 font-black hover:underline cursor-pointer border-none bg-transparent"
                      >
                        삭제
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white relative group"
                    >
                      <input
                        type="file"
                        accept=".pdf, image/png, image/jpeg, image/jpg"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Sparkles className="w-6 h-6 text-slate-350 group-hover:text-emerald-500 mx-auto mb-2 transition-colors" />
                      <span className="text-xs font-black text-slate-655 block">여기에 PDF 또는 재무제표 이미지 파일을 끌어다 놓으세요.</span>
                      <span className="text-[9px] text-slate-400 block font-bold mt-1">또는 클릭하여 파일 브라우저 열기 (PDF, PNG, JPG, JPEG 지원)</span>
                    </div>
                  )}
                </div>

                {/* 📊 접이식 수동 참고 지표 입력 아코디언 */}
                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setShowManualFinancial(!showManualFinancial)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-black text-slate-700 border-none cursor-pointer transition-colors"
                  >
                    <span>➕ 보조 참고 재무 수치 직접 입력 (선택)</span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {showManualFinancial ? "접기" : "펼치기"}
                    </span>
                  </button>
                  {showManualFinancial && (
                    <div className="p-4 border-t border-slate-150 bg-white space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">매출액</label>
                          <input
                            type="text"
                            value={revenue}
                            onChange={e => setRevenue(e.target.value)}
                            placeholder="예: 250억원"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">매출 변동률 (전년비)</label>
                          <input
                            type="text"
                            value={revenueGrowth}
                            onChange={e => setRevenueGrowth(e.target.value)}
                            placeholder="예: -15%"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">영업이익</label>
                          <input
                            type="text"
                            value={operatingIncome}
                            onChange={e => setOperatingIncome(e.target.value)}
                            placeholder="예: -8억원"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">영업이익 변동률 (전년비)</label>
                          <input
                            type="text"
                            value={operatingIncomeGrowth}
                            onChange={e => setOperatingIncomeGrowth(e.target.value)}
                            placeholder="예: 적자전환"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">부채비율</label>
                          <input
                            type="text"
                            value={debtRatio}
                            onChange={e => setDebtRatio(e.target.value)}
                            placeholder="예: 280%"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">당기순이익</label>
                          <input
                            type="text"
                            value={netIncome}
                            onChange={e => setNetIncome(e.target.value)}
                            placeholder="예: -12억원"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">핵심 공시/재무 관련 뉴스</label>
                        <input
                          type="text"
                          value={financialNews}
                          onChange={e => setFinancialNews(e.target.value)}
                          placeholder="예: 감사인의 의견거절 공시 및 관리종목 지정 우려설 발생"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 실행 버튼 */}
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleExecute}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md border-none cursor-pointer disabled:opacity-50 transition-colors shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Gemini 리스크 마이닝 분석 진행 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>AI 자율 조사 분석 시작</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────
            우측 영역: 리포트 뷰어 및 분석 히스토리
            ──────────────────────────────────────────────────────── */}
        <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-5 flex flex-col space-y-4 min-h-[40vh] max-h-[50vh] md:max-h-none overflow-y-auto">
          
          {/* AI 분석 보고서 상세 카드 */}
          <div className="flex-1 flex flex-col min-h-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">분석 리포트 진단 결과</span>
            
            {isAnalyzing ? (
              // 🌀 분석 중 로딩 스켈레톤
              <div className="flex-1 border border-slate-105 bg-slate-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <div>
                  <span className="text-xs font-black text-slate-700 block">AI 애널리스트가 심층 분석을 집필 중입니다.</span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">실시간 Google Grounding 팩트 검증을 대조하고 있습니다.</span>
                </div>
              </div>
            ) : currentReport ? (
              // 📊 실제 리포트 카드 렌더링
              <div className="flex-1 border border-slate-100 bg-white rounded-2xl p-4.5 space-y-3.5 shadow-3xs overflow-y-auto max-h-[350px] md:max-h-[500px]">
                
                {/* 헤더: 위해 등급 */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100/50">
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    {currentReport.report_type === 'NEWS' 
                      ? '📰 실시간 뉴스 분석' 
                      : currentReport.report_type === 'REPUTATION' 
                      ? '💬 평판 감성 분석' 
                      : '📊 재무 건전성 분석'}
                  </span>
                  {renderRiskBadge(currentReport.risk_grade)}
                </div>

                {/* 요약 */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-450 font-extrabold block">진단 총평</span>
                  <p className="text-xs leading-relaxed text-slate-700 font-extrabold bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    {currentReport.summary}
                  </p>
                </div>

                {/* 검출 요인 렌더링 */}
                {parsedResult && (
                  <div className="space-y-3.5">
                    
                    {/* 뉴스 리스크 요인 */}
                    {currentReport.report_type === 'NEWS' && parsedResult.detected_risks && (
                      <div className="space-y-2">
                        <span className="text-[9px] text-slate-450 font-extrabold block">탐지된 위해 요인 ({parsedResult.detected_risks.length}건)</span>
                        <div className="space-y-2">
                          {parsedResult.detected_risks.map((risk: any, i: number) => (
                            <div key={i} className="p-3 bg-rose-50/30 border border-rose-100 rounded-xl space-y-1.5 leading-relaxed text-[11px] font-semibold text-slate-700">
                              <div className="flex items-center justify-between">
                                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[8px] font-black rounded">{risk.category}</span>
                                {risk.source_url && (
                                  <a href={risk.source_url} target="_blank" rel="noopener noreferrer" className="text-rose-600 flex items-center gap-0.5 hover:underline text-[9px] font-black">
                                    <ExternalLink className="w-3 h-3" />
                                    <span>출처 보기</span>
                                  </a>
                                )}
                              </div>
                              <div className="font-extrabold text-slate-850 text-xs">{risk.issue_title}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{risk.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 평판 레드플래그 */}
                    {currentReport.report_type === 'REPUTATION' && parsedResult.red_flags && (
                      <div className="space-y-2">
                        <span className="text-[9px] text-slate-450 font-extrabold block">조직 내부 위험 징후</span>
                        <div className="space-y-2">
                          {parsedResult.red_flags.map((flag: any, i: number) => (
                            <div key={i} className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl space-y-1.5 leading-relaxed text-[11px] font-semibold text-slate-700">
                              <div className="flex justify-between items-center">
                                <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded">{flag.signal_type}</span>
                                <span className="text-[9px] text-amber-600 font-black">빈도: {flag.frequency_level}</span>
                              </div>
                              <div className="text-[10px] text-slate-600 font-medium">{flag.details}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 평판 장단점 */}
                    {currentReport.report_type === 'REPUTATION' && parsedResult.pros_and_cons && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold leading-relaxed">
                        <div className="p-2.5 bg-emerald-50/20 border border-emerald-100 rounded-xl text-emerald-800">
                          <span className="font-black text-[9px] block text-emerald-700 mb-0.5">최대 강점</span>
                          {parsedResult.pros_and_cons.key_advantage}
                        </div>
                        <div className="p-2.5 bg-rose-50/20 border border-rose-100 rounded-xl text-rose-800">
                          <span className="font-black text-[9px] block text-rose-700 mb-0.5">치명 약점</span>
                          {parsedResult.pros_and_cons.key_weakness}
                        </div>
                      </div>
                    )}

                    {/* 재무 정밀 3대 지표 */}
                    {currentReport.report_type === 'FINANCIAL' && parsedResult.key_findings && (
                      <div className="space-y-2">
                        <span className="text-[9px] text-slate-450 font-extrabold block">재무 건전성 3대 속성 진단</span>
                        <div className="space-y-1.5 text-[10px] font-semibold leading-relaxed text-slate-700">
                          <div className="flex justify-between items-start gap-4">
                            <span className="text-slate-400 font-bold shrink-0">성장성</span>
                            <span className="text-right">{parsedResult.key_findings.growth}</span>
                          </div>
                          <div className="flex justify-between items-start gap-4 pt-1.5 border-t border-slate-50">
                            <span className="text-slate-400 font-bold shrink-0">안정성</span>
                            <span className="text-right">{parsedResult.key_findings.stability}</span>
                          </div>
                          <div className="flex justify-between items-start gap-4 pt-1.5 border-t border-slate-50">
                            <span className="text-slate-400 font-bold shrink-0">수익성</span>
                            <span className="text-right">{parsedResult.key_findings.profitability}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 여신 한도 제언 */}
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 leading-relaxed text-[10px] font-semibold text-slate-700">
                      <span className="font-black text-[8px] text-slate-400 block uppercase">실무자 조언 및 권고사항</span>
                      <div className="text-slate-800 font-black text-xs">
                        {currentReport.report_type === 'FINANCIAL' 
                          ? parsedResult.overall_evaluation 
                          : parsedResult.monitoring_recommendation}
                      </div>
                      {currentReport.report_type === 'FINANCIAL' && parsedResult.insolvency_probability && (
                        <div className="pt-1.5 mt-1 border-t border-slate-100 flex justify-between items-center text-[9px]">
                          <span className="text-slate-400 font-bold">1년 내 부실화 가능성</span>
                          <span className="text-rose-600 font-extrabold uppercase">{parsedResult.insolvency_probability}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 보고서 일자 및 작성자 */}
                <div className="text-right text-[9px] text-slate-400 font-mono pt-1.5 border-t border-slate-100/50">
                  분석일시: {currentReport.created_at}
                </div>
              </div>
            ) : (
              // 📁 이력이 전혀 없을 경우 안내 뷰
              <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300" />
                <span className="text-xs font-black text-slate-655 block">기록된 AI 조사 리포트가 없습니다.</span>
                <span className="text-[10px] text-slate-400 block font-semibold leading-relaxed">
                  좌측 기획판에서 리스크 조사를 시작하여 첫 번째 인공지능 신용 모니터링을 개시해 보세요.
                </span>
              </div>
            )}
          </div>

          {/* 📅 과거 리포트 조회 리스트 (히스토리 뷰어) */}
          <div className="shrink-0 h-40 flex flex-col min-h-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">과거 AI 진단 이력 ({partnerReports.length}건)</span>
            <div className="flex-1 overflow-y-auto border border-slate-100 bg-slate-50/50 rounded-2xl p-2 divide-y divide-slate-150 text-[10px] font-bold">
              {partnerReports.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[9px]">과거 이력이 없습니다.</div>
              ) : (
                partnerReports.map(rep => (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-2 flex items-center justify-between cursor-pointer transition-colors rounded-lg ${
                      currentReport?.id === rep.id 
                        ? 'bg-white text-emerald-700 shadow-3xs border border-slate-150' 
                        : 'text-slate-600 hover:bg-white/55'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] px-1 py-0.2 bg-slate-200 rounded text-slate-500 font-black">
                        {rep.report_type === 'NEWS' ? '뉴스' : rep.report_type === 'REPUTATION' ? '평판' : '재무'}
                      </span>
                      <span className="truncate max-w-[120px]">{rep.summary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      {renderRiskBadge(rep.risk_grade)}
                      <span className="text-[8px] text-slate-400 font-mono">{rep.created_at.slice(5, 10)}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-350" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
