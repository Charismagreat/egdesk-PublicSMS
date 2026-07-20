"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { 
  FileText, Sparkles, Send, ArrowLeft, Loader2, CheckCircle2, AlertTriangle
} from "lucide-react";

export default function MobileDailyReportPage() {
  const router = useRouter();
  const [reportDate, setReportDate] = useState("");
  const [operatorName, setOperatorName] = useState("현장 임직원");
  const [reportContent, setReportContent] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

  // 오늘 날짜 기본값 세팅 (KST 기준)
  useEffect(() => {
    const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().substring(0, 10);
    setReportDate(kstDate);
    
    // 사원 정보 로드 (auth_token JWT 쿠키에 의거하므로, me API 호출을 통해 사원명 가져오기)
    const fetchMe = async () => {
      try {
        const res = await apiFetch("/api/employee/me");
        const data = await res.json();
        if (data.success && data.employee) {
          setOperatorName(data.employee.name || data.employee.username || "임직원");
        }
      } catch (e) {
        console.warn("Failed to fetch employee profile, fallback to guest");
      }
    };
    fetchMe();
  }, []);

  // 당일 날짜에 이미 제출한 일보가 있는지 조회
  useEffect(() => {
    if (!reportDate) return;
    
    const checkExistingReport = async () => {
      try {
        const res = await apiFetch("/api/governance?action=daily_reports");
        const data = await res.json();
        if (data.success && data.reports) {
          // KST 오늘 날짜와 현재 로그인된 사원의 기존 보고서가 있는지 검색
          const existing = data.reports.find(
            (r: any) => r.report_date === reportDate && r.operator === operatorName
          );
          if (existing) {
            setReportContent(existing.report_content);
            setAiSummary(existing.ai_summary || "{}");
            setIsAlreadySubmitted(true);
          } else {
            setReportContent("");
            setAiSummary("");
            setIsAlreadySubmitted(false);
          }
        }
      } catch (e) {
        console.warn("Failed to check existing daily report");
      }
    };
    checkExistingReport();
  }, [reportDate, operatorName]);

  // AI 일일 업무 보고서 초안 생성 요청
  const handleGenerateAiDraft = async () => {
    if (!reportDate) return;
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/governance?action=generate_report_draft&operator=${encodeURIComponent(operatorName)}&report_date=${reportDate}`);
      const data = await res.json();
      if (data.success) {
        setReportContent(data.draft_content || "");
        setAiSummary(data.ai_summary || "{}");
        alert("오늘의 활동 정보 및 수집 자료를 수집하여 AI 일보 초안을 생성했습니다.");
      } else {
        alert("AI 초안 생성 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 연결 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // 보고서 최종 제출
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportContent.trim()) {
      alert("보고서 본문 내용을 작성해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch("/api/governance?action=submit_report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_date: reportDate,
          report_content: reportContent,
          ai_summary: aiSummary
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsSubmitSuccess(true);
        setTimeout(() => {
          router.push("/m");
        }, 1500);
      } else {
        alert("제출 실패: " + data.error);
      }
    } catch (e) {
      alert("서버 통신 오류");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col w-full pb-8">
      {/* 모바일 헤더 */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-4 flex items-center gap-3 shrink-0">
        <button 
          onClick={() => router.push("/m")}
          className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 border-none bg-transparent cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h1 className="text-base font-black text-slate-800 tracking-tight">AI 일일 업무 보고</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto w-full flex-1">
        {isSubmitSuccess ? (
          <div className="bg-white border border-slate-200/85 rounded-3xl p-8 text-center shadow-sm space-y-4 py-16 animate-scale-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-800">일보 제출 완료</h2>
              <p className="text-xs text-slate-500 font-bold">보고서가 대표자 결재함에 정상 상신되었습니다.</p>
            </div>
            <span className="text-[10px] text-indigo-600 font-bold block pt-2 animate-pulse">잠시 후 포털 홈으로 이동합니다...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitReport} className="space-y-4 text-left">
            {/* 사원 정보 카드 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">사원 정보</span>
                <span className="text-sm font-black text-slate-800">{operatorName} 사원</span>
              </div>
              <div className="space-y-0.5 text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">보고 일자</span>
                <input 
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 이미 제출됨 정보 배너 */}
            {isAlreadySubmitted && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>오늘 일보가 이미 상신되었습니다. 수정 후 제출 시 덮어써집니다.</span>
              </div>
            )}

            {/* AI 초안 생성 가이드 영역 */}
            <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-3xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                <span className="text-xs font-black text-indigo-905">AI 지능형 일보 자동 작성</span>
              </div>
              <p className="text-[10.5px] text-slate-550 leading-relaxed font-semibold">
                오늘의 모바일 상신 내역과 태스크 폴더 업로드 문서를 바탕으로 AI가 보고서 초안을 자동으로 작성해 줍니다.
              </p>
              <button
                type="button"
                onClick={handleGenerateAiDraft}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border-none transition-colors shadow-xs cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>초안 요약 수집 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>🤖 AI 일일 업무 보고 초안 생성</span>
                  </>
                )}
              </button>
            </div>

            {/* 본문 편집 영역 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs space-y-2">
              <label className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider block">
                보고서 본문 (확인 후 수정/편집 가능)
              </label>
              <textarea
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="오늘 완료한 업무 명세나 특이사항을 적어주세요. 위의 AI 초안 생성 버튼을 누르면 자동으로 내용이 채워집니다."
                rows={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold text-slate-750 leading-relaxed placeholder-slate-400 outline-none focus:border-indigo-500 resize-none transition-colors"
              />
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isLoading || !reportContent.trim()}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-350 text-white font-extrabold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 border-none transition-colors shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>일일 업무 보고서 상신하기</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
