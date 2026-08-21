"use client";

import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, Globe, ExternalLink, RefreshCw, CheckCircle2, 
  ArrowRight, ShieldCheck, Database, Layers, Sparkles 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl } from "@/lib/google-sheets-storage";

export default function DriveSheetsManager() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const domainMappings = [
    { title: "🏢 회사 프로필", tabHint: "회사정보", path: "/settings", desc: "회사명, 대표자, 사업자등록번호, 주소 등" },
    { title: "👥 거래처 관리 AI", tabHint: "거래처", path: "/partners", desc: "고객사/협력사 마스터, 사업자번호, 대표자명" },
    { title: "👤 직원/계정 관리", tabHint: "직원목록", path: "/employees", desc: "임직원 명부, 부서, 직급, 연락처, 입사일" },
    { title: "📦 재고/품목 관리", tabHint: "재고품목", path: "/inventory", desc: "마스터 품목코드, 품명, 규격, 단가, 초기재고" },
    { title: "👔 HR 인사/근태", tabHint: "근태관리", path: "/hr/attendance", desc: "일자별 출퇴근 기록, 근무유형, 비고" },
    { title: "💰 국세청 홈택스", tabHint: "홈택스매입/매출", path: "/finance-management", desc: "전자세금계산서 매입/매출 및 면세 계산서" },
    { title: "🏛️ 인터넷뱅킹 거래내역", tabHint: "은행거래내역", path: "/finance-management", desc: "법인 통장 입출금 내역 및 잔액 실시간 동기화" },
    { title: "💳 신용카드 승인내역", tabHint: "신용카드", path: "/finance-management", desc: "법인카드 승인/취소 내역 및 가맹점 명세" },
  ];

  useEffect(() => {
    const saved = getSavedGoogleSheetUrl();
    if (saved) {
      setSheetUrl(saved);
      handleFetchSheetInfo(saved);
    }
  }, []);

  const handleFetchSheetInfo = async (targetUrl?: string) => {
    const urlToFetch = targetUrl || sheetUrl;
    if (!urlToFetch.trim()) return;

    setIsLoading(true);
    setStatusMsg(null);

    try {
      setSavedGoogleSheetUrl(urlToFetch);

      const res = await apiFetch("/api/shared/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToFetch.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setSpreadsheetTitle(data.spreadsheetTitle || "연동된 구글 스프레드시트");
        setAvailableSheets(data.availableSheets || []);
        setStatusMsg({
          type: "success",
          text: `✅ [${data.spreadsheetTitle}] 스프레드시트와 성공적으로 연결되었습니다. (총 ${data.availableSheets?.length || 0}개 탭 감지)`
        });
      } else {
        setStatusMsg({ type: "error", text: data.error || "시트 정보를 가져오지 못했습니다." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `연결 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 전사 공통 연동 시트 마스터 설정 카드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">전사 통합 구글 스프레드시트 마스터 연동</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                등록된 구글 스프레드시트 한 권으로 거래처, 직원, 재고, 근태, 홈택스, 금융 자료를 원터치 일괄 연동합니다.
              </p>
            </div>
          </div>

          {spreadsheetTitle && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{spreadsheetTitle}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
          <label className="text-xs font-bold text-slate-700 block">
            전사 구글 스프레드시트 URL 또는 Spreadsheet ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <button
              onClick={() => handleFetchSheetInfo()}
              disabled={isLoading || !sheetUrl.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>시트 연결 및 탭 조회</span>
            </button>
          </div>

          {statusMsg && (
            <div className={`p-2.5 rounded-xl text-xs font-medium ${
              statusMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}>
              {statusMsg.text}
            </div>
          )}

          {availableSheets.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-xs font-bold text-slate-600 block mb-2">
                감지된 시트 탭 목록 ({availableSheets.length}개):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableSheets.map((tab, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-3xs">
                    {tab}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. 전사 8대 핵심 업무 도메인 연동 현황 그리드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            전사 도메인별 구글 시트 탭 매핑 현황 (8대 핵심 업무)
          </h4>
          <span className="text-[11px] text-slate-400">각 업무 페이지에서 '🌐 구글 시트 연동' 모달을 바로 실행할 수 있습니다.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {domainMappings.map((domain, idx) => (
            <div key={idx} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-slate-800 text-xs">{domain.title}</h5>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                    탭: {domain.tabHint}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {domain.desc}
                </p>
              </div>

              <a
                href={domain.path}
                className="inline-flex items-center justify-between w-full px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-xl text-[11px] font-bold transition-all"
              >
                <span>해당 업무 바로가기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
